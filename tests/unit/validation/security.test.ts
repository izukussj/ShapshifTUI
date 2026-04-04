import { describe, it, expect } from 'vitest';
import { checkSecurity } from '../../../src/validation/security.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const fixturesDir = join(__dirname, '../../fixtures');

describe('Security Validator', () => {
  it('should pass code without security violations', () => {
    const code = readFileSync(join(fixturesDir, 'valid-code/simple-box.js'), 'utf8');
    const result = checkSecurity(code);

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should detect fs module usage', () => {
    const code = readFileSync(join(fixturesDir, 'invalid-code/fs-access.js'), 'utf8');
    const result = checkSecurity(code);

    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.message.includes('fs'))).toBe(true);
  });

  it('should detect child_process usage', () => {
    const code = readFileSync(join(fixturesDir, 'invalid-code/child-process.js'), 'utf8');
    const result = checkSecurity(code);

    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.message.includes('child_process'))).toBe(true);
  });

  it('should detect network module usage', () => {
    const code = readFileSync(join(fixturesDir, 'invalid-code/network-access.js'), 'utf8');
    const result = checkSecurity(code);

    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.message.includes('http'))).toBe(true);
  });

  it('should detect eval usage', () => {
    const code = readFileSync(join(fixturesDir, 'invalid-code/eval-usage.js'), 'utf8');
    const result = checkSecurity(code);

    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.message.includes('eval'))).toBe(true);
  });

  it('should detect prototype pollution attempts', () => {
    const code = readFileSync(join(fixturesDir, 'invalid-code/prototype-pollution.js'), 'utf8');
    const result = checkSecurity(code);

    expect(result.passed).toBe(false);
    expect(result.violations.some(v =>
      v.message.includes('__proto__') || v.message.includes('constructor')
    )).toBe(true);
  });
});
