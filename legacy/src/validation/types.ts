/**
 * Validation type definitions
 */

import type { ValidationError } from '../specs-types.js';

// Re-export public type
export type { ValidationError } from '../specs-types.js';

/**
 * Internal validation error with additional context
 */
export interface InternalValidationError extends ValidationError {
  /** AST node type that triggered the error */
  nodeType?: string;

  /** Full path to the problematic property */
  path?: string;
}

/**
 * Blocked pattern definition
 */
export interface BlockedPattern {
  /** Pattern name for error messages */
  name: string;

  /** Regex or string pattern to match */
  pattern: RegExp | string;

  /** Why this pattern is blocked */
  reason: string;

  /** Error category */
  category: 'security' | 'allowlist';
}

/**
 * Allowed API definition
 */
export interface AllowedAPI {
  /** API name (e.g., 'blessed.box') */
  name: string;

  /** Object path segments */
  path: string[];

  /** Description of the API */
  description: string;
}

/**
 * Syntax check result
 */
export interface SyntaxCheckResult {
  valid: boolean;
  errors: InternalValidationError[];
}

/**
 * Security check result
 */
export interface SecurityCheckResult {
  passed: boolean;
  violations: InternalValidationError[];
}

/**
 * Allowlist check result
 */
export interface AllowlistCheckResult {
  passed: boolean;
  violations: InternalValidationError[];
}

/**
 * Combined validation result
 */
export interface ValidationResult {
  /** Overall pass/fail */
  passed: boolean;

  /** Syntax check passed */
  syntaxValid: boolean;

  /** Security check passed */
  securityPassed: boolean;

  /** Allowlist check passed */
  allowlistPassed: boolean;

  /** All errors collected */
  errors: InternalValidationError[];
}

/**
 * Options for the validator
 */
export interface ValidatorOptions {
  /** Additional blocked patterns */
  additionalBlockedPatterns?: BlockedPattern[];

  /** Strict mode - reject non-allowlisted APIs */
  strictMode?: boolean;
}
