/**
 * Code validation orchestrator - combines all validation checks for AI-generated code
 */

import { checkSyntax, describeSyntaxErrors } from './syntax.js';
import { checkSecurity, describeSecurityViolations } from './security.js';
import { checkAllowlist } from './allowlist.js';
import type { ValidationResult, ValidatorOptions, InternalValidationError } from './types.js';

/**
 * Validate AI-generated code before execution
 *
 * Runs all validation checks in order:
 * 1. Syntax check (must pass for other checks to work)
 * 2. Security check (blocked patterns)
 * 3. Allowlist check (approved APIs only)
 */
export function validateCode(code: string, options?: ValidatorOptions): ValidationResult {
  const errors: InternalValidationError[] = [];

  // 1. Syntax check
  const syntaxResult = checkSyntax(code);
  if (!syntaxResult.valid) {
    errors.push(...syntaxResult.errors);
    // Return early - can't do AST-based checks with invalid syntax
    return {
      passed: false,
      syntaxValid: false,
      securityPassed: false,
      allowlistPassed: false,
      errors,
    };
  }

  // 2. Security check
  const securityResult = checkSecurity(code);
  errors.push(...securityResult.violations);

  // 3. Allowlist check (if strict mode enabled, default true)
  const strictMode = options?.strictMode !== false;
  let allowlistResult = { passed: true, violations: [] as InternalValidationError[] };

  if (strictMode) {
    allowlistResult = checkAllowlist(code);
    errors.push(...allowlistResult.violations);
  }

  // Add any additional custom blocked patterns
  if (options?.additionalBlockedPatterns) {
    for (const pattern of options.additionalBlockedPatterns) {
      const regex = typeof pattern.pattern === 'string'
        ? new RegExp(pattern.pattern)
        : pattern.pattern;
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          errors.push({
            type: 'security',
            message: `Custom pattern violation: ${pattern.reason}`,
            line: i + 1,
            code: lines[i].trim(),
          });
        }
      }
    }
  }

  const passed = syntaxResult.valid && securityResult.passed && allowlistResult.passed;

  return {
    passed,
    syntaxValid: syntaxResult.valid,
    securityPassed: securityResult.passed,
    allowlistPassed: allowlistResult.passed,
    errors,
  };
}

/**
 * Get human-readable validation report
 */
export function getCodeValidationReport(result: ValidationResult): string {
  if (result.passed) {
    return '✓ Code validation passed';
  }

  const lines: string[] = ['✗ Code validation failed:', ''];

  if (!result.syntaxValid) {
    lines.push('Syntax Errors:');
    const syntaxErrors = result.errors.filter(e => e.type === 'syntax');
    lines.push(describeSyntaxErrors(syntaxErrors));
    lines.push('');
  }

  if (!result.securityPassed) {
    lines.push('Security Violations:');
    const securityErrors = result.errors.filter(e => e.type === 'security');
    lines.push(describeSecurityViolations(securityErrors));
    lines.push('');
  }

  if (!result.allowlistPassed) {
    lines.push('Allowlist Violations:');
    const allowlistErrors = result.errors.filter(e => e.type === 'allowlist');
    for (const error of allowlistErrors) {
      lines.push(`  - ${error.message}${error.line ? ` (line ${error.line})` : ''}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Quick validation check - returns boolean only
 */
export function isCodeValid(code: string, options?: ValidatorOptions): boolean {
  return validateCode(code, options).passed;
}

/**
 * Validate and throw if invalid
 */
export function validateCodeOrThrow(code: string, options?: ValidatorOptions): void {
  const result = validateCode(code, options);
  if (!result.passed) {
    throw new CodeValidationError(result);
  }
}

/**
 * Custom error class for code validation failures
 */
export class CodeValidationError extends Error {
  public readonly result: ValidationResult;

  constructor(result: ValidationResult) {
    super(getCodeValidationReport(result));
    this.name = 'CodeValidationError';
    this.result = result;
  }
}
