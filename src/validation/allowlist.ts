/**
 * Allowlist validation - ensure only approved blessed APIs are used
 */

import type { AllowlistCheckResult, InternalValidationError, AllowedAPI } from './types.js';

/**
 * Allowed blessed widget constructors
 */
export const ALLOWED_WIDGETS: AllowedAPI[] = [
  { name: 'blessed.screen', path: ['blessed', 'screen'], description: 'Create screen instance' },
  { name: 'blessed.box', path: ['blessed', 'box'], description: 'Create box container' },
  { name: 'blessed.text', path: ['blessed', 'text'], description: 'Create text element' },
  { name: 'blessed.list', path: ['blessed', 'list'], description: 'Create list element' },
  { name: 'blessed.table', path: ['blessed', 'table'], description: 'Create table element' },
  { name: 'blessed.form', path: ['blessed', 'form'], description: 'Create form container' },
  { name: 'blessed.input', path: ['blessed', 'input'], description: 'Create input field' },
  { name: 'blessed.button', path: ['blessed', 'button'], description: 'Create button element' },
  { name: 'blessed.textarea', path: ['blessed', 'textarea'], description: 'Create textarea element' },
  { name: 'blessed.checkbox', path: ['blessed', 'checkbox'], description: 'Create checkbox element' },
  { name: 'blessed.radioset', path: ['blessed', 'radioset'], description: 'Create radio button set' },
  { name: 'blessed.radiobutton', path: ['blessed', 'radiobutton'], description: 'Create radio button' },
  { name: 'blessed.progressbar', path: ['blessed', 'progressbar'], description: 'Create progress bar' },
  { name: 'blessed.loading', path: ['blessed', 'loading'], description: 'Create loading indicator' },
  { name: 'blessed.message', path: ['blessed', 'message'], description: 'Create message dialog' },
  { name: 'blessed.question', path: ['blessed', 'question'], description: 'Create question dialog' },
  { name: 'blessed.prompt', path: ['blessed', 'prompt'], description: 'Create prompt dialog' },
  { name: 'blessed.log', path: ['blessed', 'log'], description: 'Create log widget' },
  { name: 'blessed.layout', path: ['blessed', 'layout'], description: 'Create layout container' },
];

/**
 * Allowed screen methods
 */
export const ALLOWED_SCREEN_METHODS: string[] = [
  'append',
  'prepend',
  'insert',
  'remove',
  'render',
  'key',
  'onceKey',
  'unkey',
  'focus',
  'saveFocus',
  'restoreFocus',
  'rewindFocus',
  'destroy',
  'setEffects',
];

/**
 * Allowed element methods
 */
export const ALLOWED_ELEMENT_METHODS: string[] = [
  'on',
  'once',
  'off',
  'emit',
  'setContent',
  'getContent',
  'setText',
  'getText',
  'setLabel',
  'setHover',
  'focus',
  'hide',
  'show',
  'toggle',
  'enable',
  'disable',
  'setIndex',
  'setFront',
  'setBack',
  'clearPos',
  'setScroll',
  'getScroll',
  'scroll',
  'resetScroll',
  'enableDrag',
  'disableDrag',
  'enableKeys',
  'enableMouse',
  'enableInput',
  'submit',
  'cancel',
  'reset',
  'clearInput',
  'setValue',
  'getValue',
  'select',
  'add',
  'addItem',
  'removeItem',
  'setItems',
  'clearItems',
  'insertItem',
  'getItem',
  'setData',
  'setProgress',
  'progress',
  'filled',
  'render',
];

/**
 * Allowed process methods (limited)
 */
const ALLOWED_PROCESS_PATTERNS = [
  /process\s*\.\s*exit\s*\(/,  // process.exit() for quit handlers
  /process\s*\.\s*stdout/,     // process.stdout for blessed
  /process\s*\.\s*stdin/,      // process.stdin for blessed
];

/**
 * Check code against allowlist
 *
 * Note: This is a permissive check that looks for known-good patterns.
 * The security check handles blocking bad patterns.
 */
export function checkAllowlist(code: string): AllowlistCheckResult {
  const violations: InternalValidationError[] = [];

  // Check for blessed require - this is required
  const hasBlessedRequire = /require\s*\(\s*['"]blessed['"]\s*\)/.test(code);

  // If the code uses require for something other than blessed, the security check will catch it
  // The allowlist check is more about ensuring proper usage of blessed APIs

  // For now, we'll do a permissive check that passes most blessed code
  // The security check is the primary defense against malicious code

  // Check for obviously non-blessed code patterns that might slip through security
  const suspiciousPatterns = [
    { pattern: /\.\s*writeFile\s*\(/, message: 'writeFile is not a blessed API' },
    { pattern: /\.\s*readFile\s*\(/, message: 'readFile is not a blessed API' },
    { pattern: /\.\s*spawn\s*\(/, message: 'spawn is not a blessed API' },
    { pattern: /\.\s*exec\s*\(/, message: 'exec is not a blessed API' },
    { pattern: /\.\s*fetch\s*\(/, message: 'fetch is not a blessed API' },
    { pattern: /XMLHttpRequest/, message: 'XMLHttpRequest is not a blessed API' },
    { pattern: /WebSocket/, message: 'WebSocket is not a blessed API' },
  ];

  const lines = code.split('\n');

  for (const { pattern, message } of suspiciousPatterns) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        violations.push({
          type: 'allowlist',
          message: `Allowlist violation: ${message}`,
          line: i + 1,
          code: lines[i].trim(),
        });
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Get list of allowed APIs as documentation
 */
export function getAllowedAPIsDescription(): string {
  let description = '## Allowed Blessed APIs\n\n';

  description += '### Widgets\n';
  for (const widget of ALLOWED_WIDGETS) {
    description += `- \`${widget.name}()\` - ${widget.description}\n`;
  }

  description += '\n### Screen Methods\n';
  for (const method of ALLOWED_SCREEN_METHODS) {
    description += `- \`screen.${method}()\`\n`;
  }

  description += '\n### Element Methods\n';
  for (const method of ALLOWED_ELEMENT_METHODS) {
    description += `- \`element.${method}()\`\n`;
  }

  return description;
}
