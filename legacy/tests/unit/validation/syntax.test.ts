import { describe, it, expect } from 'vitest';
import { checkSyntax } from '../../../src/validation/syntax.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const fixturesDir = join(__dirname, '../../fixtures');

describe('Syntax Validator', () => {
  it('should pass valid JavaScript code', () => {
    const code = readFileSync(join(fixturesDir, 'valid-code/simple-box.js'), 'utf8');
    const result = checkSyntax(code);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect syntax errors', () => {
    const code = readFileSync(join(fixturesDir, 'invalid-code/syntax-error.js'), 'utf8');
    const result = checkSyntax(code);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].type).toBe('syntax');
  });

  it('should provide line and column for syntax errors', () => {
    const code = `const x = {
      broken`;
    const result = checkSyntax(code);

    expect(result.valid).toBe(false);
    expect(result.errors[0].line).toBeDefined();
    expect(result.errors[0].column).toBeDefined();
  });

  it('should handle empty code', () => {
    const result = checkSyntax('');

    expect(result.valid).toBe(true);
  });
});
