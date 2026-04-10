/**
 * Error message formatter for human-readable validation errors
 *
 * Implements FR-009: Clear error messages when validation fails
 * Implements US3: Human-readable explanations of what went wrong
 */

import type { ValidationResult, InternalValidationError } from '../validation/types.js';

/**
 * Error categories with user-friendly descriptions
 */
const ERROR_CATEGORIES = {
  syntax: {
    title: 'Syntax Error',
    description: 'The generated code has invalid JavaScript syntax.',
    suggestion: 'Please ensure the code follows valid JavaScript syntax.',
  },
  security: {
    title: 'Security Violation',
    description: 'The code attempts to use blocked operations.',
    suggestion: 'Only use blessed library APIs for UI rendering. Do not access files, network, or system processes.',
  },
  allowlist: {
    title: 'Restricted API Usage',
    description: 'The code uses APIs that are not in the allowed list.',
    suggestion: 'Only use blessed widget methods: screen, box, text, list, table, form, input, button, textarea, checkbox, radioset, progressbar.',
  },
};

/**
 * Format a validation result into a human-readable error message
 */
export function formatValidationError(result: ValidationResult): string {
  if (result.passed) {
    return 'No errors';
  }

  const lines: string[] = [];

  // Group errors by type
  const syntaxErrors = result.errors.filter(e => e.type === 'syntax');
  const securityErrors = result.errors.filter(e => e.type === 'security');
  const allowlistErrors = result.errors.filter(e => e.type === 'allowlist');

  // Add syntax errors
  if (syntaxErrors.length > 0) {
    lines.push(formatErrorGroup('syntax', syntaxErrors));
  }

  // Add security errors
  if (securityErrors.length > 0) {
    lines.push(formatErrorGroup('security', securityErrors));
  }

  // Add allowlist errors
  if (allowlistErrors.length > 0) {
    lines.push(formatErrorGroup('allowlist', allowlistErrors));
  }

  return lines.join('\n\n');
}

/**
 * Format a group of errors of the same type
 */
function formatErrorGroup(
  type: 'syntax' | 'security' | 'allowlist',
  errors: InternalValidationError[]
): string {
  const category = ERROR_CATEGORIES[type];
  const lines: string[] = [];

  lines.push(`${category.title}:`);
  lines.push(`  ${category.description}`);
  lines.push('');

  // List specific errors
  for (const error of errors) {
    let errorLine = `  • ${error.message}`;
    if (error.line) {
      errorLine += ` (line ${error.line}`;
      if (error.column) {
        errorLine += `, column ${error.column}`;
      }
      errorLine += ')';
    }
    lines.push(errorLine);

    // Show offending code snippet if available
    if (error.code) {
      lines.push(`    Code: ${truncate(error.code, 60)}`);
    }
  }

  lines.push('');
  lines.push(`  Suggestion: ${category.suggestion}`);

  return lines.join('\n');
}

/**
 * Format a retry message with context from previous attempt
 */
export function formatRetryMessage(
  attemptNumber: number,
  previousError: string,
  maxAttempts: number
): string {
  const remainingAttempts = maxAttempts - attemptNumber;

  const lines: string[] = [
    `Attempt ${attemptNumber} of ${maxAttempts} failed.`,
    '',
    'Previous error:',
    indent(previousError, 2),
    '',
    remainingAttempts > 0
      ? `Retrying... (${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining)`
      : 'Maximum retry attempts reached.',
  ];

  return lines.join('\n');
}

/**
 * Format a final failure message after all retries exhausted
 */
export function formatFinalFailureMessage(
  totalAttempts: number,
  lastError: string
): string {
  return [
    `Code generation failed after ${totalAttempts} attempt${totalAttempts > 1 ? 's' : ''}.`,
    '',
    'Final error:',
    indent(lastError, 2),
    '',
    'Suggestions:',
    '  • Try simplifying your request',
    '  • Be more specific about the interface you want',
    '  • Check that your request only involves TUI elements',
  ].join('\n');
}

/**
 * Format error for AI retry prompt (machine-readable)
 */
export function formatErrorForRetry(error: string): string {
  // Clean up the error for AI consumption
  return error
    .replace(/\n\s+•/g, '\n-') // Replace bullet points
    .replace(/\s+Suggestion:.*$/gm, '') // Remove suggestions (AI doesn't need them)
    .trim();
}

/**
 * Create a user-friendly error message for common scenarios
 */
export function createUserFriendlyError(
  errorType: string,
  details?: string
): string {
  const messages: Record<string, string> = {
    ai_service: 'Unable to reach the AI service. Please check your connection and API key.',
    parse: 'The AI response could not be processed. Please try again.',
    validation: 'The generated code did not pass security validation.',
    non_code: 'The AI did not return code. Please try rephrasing your request.',
    execution: 'The generated code failed to execute. Please try a simpler request.',
    timeout: 'The request took too long. Please try a simpler interface.',
  };

  let message = messages[errorType] || 'An unexpected error occurred.';

  if (details) {
    message += `\n\nDetails: ${details}`;
  }

  return message;
}

/**
 * Truncate a string to a maximum length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Indent a multi-line string
 */
function indent(str: string, spaces: number): string {
  const padding = ' '.repeat(spaces);
  return str.split('\n').map(line => padding + line).join('\n');
}

/**
 * MoltUI-specific error class
 */
export class MoltUIError extends Error {
  public readonly type: string;
  public readonly details?: Record<string, unknown>;

  constructor(type: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'MoltUIError';
    this.type = type;
    this.details = details;
  }
}

/**
 * Create a MoltUI error with context
 */
export function createMoltUIError(
  type: string,
  context: {
    message: string;
    cause?: Error;
    details?: Record<string, unknown>;
  }
): MoltUIError {
  const error = new MoltUIError(type, context.message, context.details);
  if (context.cause) {
    error.cause = context.cause;
  }
  return error;
}
