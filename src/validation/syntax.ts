/**
 * Syntax validation using @babel/parser
 */

import { parse } from '@babel/parser';
import type { SyntaxCheckResult, InternalValidationError } from './types.js';

/**
 * Check JavaScript code for syntax errors
 */
export function checkSyntax(code: string): SyntaxCheckResult {
  // Empty code is technically valid syntax
  if (!code || code.trim().length === 0) {
    return {
      valid: true,
      errors: [],
    };
  }

  try {
    parse(code, {
      sourceType: 'script',
      plugins: [],
      errorRecovery: false,
    });

    return {
      valid: true,
      errors: [],
    };
  } catch (error: unknown) {
    const syntaxError = error as SyntaxErrorWithLocation;
    const validationError: InternalValidationError = {
      type: 'syntax',
      message: syntaxError.message || 'Syntax error in code',
      line: syntaxError.loc?.line,
      column: syntaxError.loc?.column,
    };

    // Try to extract the problematic code snippet
    if (syntaxError.loc && code) {
      const lines = code.split('\n');
      const lineIndex = syntaxError.loc.line - 1;
      if (lineIndex >= 0 && lineIndex < lines.length) {
        validationError.code = lines[lineIndex];
      }
    }

    return {
      valid: false,
      errors: [validationError],
    };
  }
}

/**
 * Babel syntax error type
 */
interface SyntaxErrorWithLocation extends Error {
  loc?: {
    line: number;
    column: number;
  };
}

/**
 * Get a human-readable description of syntax errors
 */
export function describeSyntaxErrors(errors: InternalValidationError[]): string {
  if (errors.length === 0) {
    return 'No syntax errors';
  }

  return errors.map(error => {
    let description = `Syntax error: ${error.message}`;
    if (error.line !== undefined) {
      description += ` at line ${error.line}`;
      if (error.column !== undefined) {
        description += `, column ${error.column}`;
      }
    }
    if (error.code) {
      description += `\n  > ${error.code}`;
    }
    return description;
  }).join('\n');
}
