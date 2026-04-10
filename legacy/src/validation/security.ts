/**
 * Security validation - detect dangerous patterns in code
 */

import { parse } from '@babel/parser';
import type { Node } from '@babel/types';
import type { SecurityCheckResult, InternalValidationError, BlockedPattern } from './types.js';

/**
 * Blocked require modules
 */
const BLOCKED_MODULES: BlockedPattern[] = [
  { name: 'fs', pattern: /require\s*\(\s*['"]fs['"]\s*\)/, reason: 'File system access is not allowed', category: 'security' },
  { name: 'path', pattern: /require\s*\(\s*['"]path['"]\s*\)/, reason: 'Path module access is not allowed', category: 'security' },
  { name: 'child_process', pattern: /require\s*\(\s*['"]child_process['"]\s*\)/, reason: 'Process spawning is not allowed', category: 'security' },
  { name: 'net', pattern: /require\s*\(\s*['"]net['"]\s*\)/, reason: 'Network access is not allowed', category: 'security' },
  { name: 'http', pattern: /require\s*\(\s*['"]https?['"]\s*\)/, reason: 'HTTP access is not allowed', category: 'security' },
  { name: 'dgram', pattern: /require\s*\(\s*['"]dgram['"]\s*\)/, reason: 'UDP socket access is not allowed', category: 'security' },
  { name: 'cluster', pattern: /require\s*\(\s*['"]cluster['"]\s*\)/, reason: 'Cluster module is not allowed', category: 'security' },
  { name: 'worker_threads', pattern: /require\s*\(\s*['"]worker_threads['"]\s*\)/, reason: 'Worker threads are not allowed', category: 'security' },
  { name: 'vm', pattern: /require\s*\(\s*['"]vm['"]\s*\)/, reason: 'VM module is not allowed', category: 'security' },
  { name: 'os', pattern: /require\s*\(\s*['"]os['"]\s*\)/, reason: 'OS module is not allowed', category: 'security' },
];

/**
 * Blocked global patterns
 */
const BLOCKED_GLOBALS: BlockedPattern[] = [
  { name: 'eval', pattern: /\beval\s*\(/, reason: 'eval() is not allowed for security reasons', category: 'security' },
  { name: 'Function constructor', pattern: /new\s+Function\s*\(/, reason: 'new Function() is not allowed for security reasons', category: 'security' },
  { name: 'process.env', pattern: /process\s*\.\s*env/, reason: 'Environment variable access is not allowed', category: 'security' },
  { name: 'global', pattern: /\bglobal\b(?!\s*\.)/, reason: 'Global object access is not allowed', category: 'security' },
  { name: 'globalThis', pattern: /\bglobalThis\b/, reason: 'globalThis access is not allowed', category: 'security' },
];

/**
 * Blocked prototype patterns
 */
const BLOCKED_PROTOTYPE: BlockedPattern[] = [
  { name: '__proto__', pattern: /__proto__/, reason: 'Prototype manipulation via __proto__ is not allowed', category: 'security' },
  { name: 'constructor.constructor', pattern: /constructor\s*\.\s*constructor/, reason: 'Constructor chain access is not allowed', category: 'security' },
];

/**
 * Blocked import patterns
 */
const BLOCKED_IMPORTS: BlockedPattern[] = [
  { name: 'import statement', pattern: /\bimport\s+/, reason: 'ES6 imports are not allowed, use require("blessed") only', category: 'security' },
  { name: 'dynamic import', pattern: /\bimport\s*\(/, reason: 'Dynamic imports are not allowed', category: 'security' },
];

/**
 * All blocked patterns combined
 */
export const BLOCKED_PATTERNS: BlockedPattern[] = [
  ...BLOCKED_MODULES,
  ...BLOCKED_GLOBALS,
  ...BLOCKED_PROTOTYPE,
  ...BLOCKED_IMPORTS,
];

/**
 * Check code for security violations
 */
export function checkSecurity(code: string): SecurityCheckResult {
  const violations: InternalValidationError[] = [];

  // Quick regex-based checks for common patterns
  for (const pattern of BLOCKED_PATTERNS) {
    const regex = typeof pattern.pattern === 'string'
      ? new RegExp(pattern.pattern)
      : pattern.pattern;

    if (regex.test(code)) {
      // Find the line number
      const lines = code.split('\n');
      let line: number | undefined;
      let matchedCode: string | undefined;

      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          line = i + 1;
          matchedCode = lines[i].trim();
          break;
        }
      }

      violations.push({
        type: 'security',
        message: `Security violation: ${pattern.reason} (found: ${pattern.name})`,
        line,
        code: matchedCode,
      });
    }
  }

  // AST-based checks for more complex patterns
  try {
    const ast = parse(code, {
      sourceType: 'script',
      errorRecovery: true,
    });

    // Walk AST to find dangerous patterns
    walkAST(ast.program, (node, parent) => {
      // Check for require() calls with non-blessed modules
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require'
      ) {
        const arg = node.arguments[0];
        if (arg && arg.type === 'StringLiteral' && arg.value !== 'blessed') {
          violations.push({
            type: 'security',
            message: `Security violation: require('${arg.value}') is not allowed. Only require('blessed') is permitted.`,
            line: node.loc?.start.line,
          });
        }
      }

      // Check for setTimeout/setInterval with string arguments
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        (node.callee.name === 'setTimeout' || node.callee.name === 'setInterval')
      ) {
        const firstArg = node.arguments[0];
        if (firstArg && firstArg.type === 'StringLiteral') {
          violations.push({
            type: 'security',
            message: `Security violation: ${node.callee.name} with string argument is not allowed (equivalent to eval)`,
            line: node.loc?.start.line,
          });
        }
      }
    });
  } catch {
    // AST parsing failed - syntax errors will be caught by syntax checker
  }

  // Remove duplicates based on line number and message
  const unique = violations.filter((v, i, arr) =>
    arr.findIndex(x => x.line === v.line && x.message === v.message) === i
  );

  return {
    passed: unique.length === 0,
    violations: unique,
  };
}

/**
 * Simple AST walker
 */
function walkAST(node: Node, callback: (node: Node, parent?: Node) => void, parent?: Node): void {
  callback(node, parent);

  for (const key of Object.keys(node)) {
    const child = (node as unknown as Record<string, unknown>)[key];

    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in item) {
            walkAST(item as Node, callback, node);
          }
        }
      } else if ('type' in child) {
        walkAST(child as Node, callback, node);
      }
    }
  }
}

/**
 * Get human-readable description of security violations
 */
export function describeSecurityViolations(violations: InternalValidationError[]): string {
  if (violations.length === 0) {
    return 'No security violations';
  }

  return violations.map(v => {
    let description = v.message;
    if (v.line !== undefined) {
      description += ` (line ${v.line})`;
    }
    return description;
  }).join('\n');
}
