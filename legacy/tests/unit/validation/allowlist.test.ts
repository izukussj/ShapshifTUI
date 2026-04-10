import { describe, it, expect } from 'vitest';
import { checkAllowlist } from '../../../src/validation/allowlist.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const fixturesDir = join(__dirname, '../../fixtures');

describe('Allowlist Validator', () => {
  it('should pass code using only allowed blessed APIs', () => {
    const code = readFileSync(join(fixturesDir, 'valid-code/simple-box.js'), 'utf8');
    const result = checkAllowlist(code);

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should allow blessed.screen()', () => {
    const code = `const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });`;
    const result = checkAllowlist(code);

    expect(result.passed).toBe(true);
  });

  it('should allow blessed.box()', () => {
    const code = `const blessed = require('blessed');
const box = blessed.box({ content: 'hello' });`;
    const result = checkAllowlist(code);

    expect(result.passed).toBe(true);
  });

  it('should allow blessed.list()', () => {
    const code = `const blessed = require('blessed');
const list = blessed.list({ items: ['a', 'b', 'c'] });`;
    const result = checkAllowlist(code);

    expect(result.passed).toBe(true);
  });

  it('should allow blessed.table()', () => {
    const code = `const blessed = require('blessed');
const table = blessed.table({ data: [['a', 'b']] });`;
    const result = checkAllowlist(code);

    expect(result.passed).toBe(true);
  });

  it('should allow screen.append()', () => {
    const code = `screen.append(box);`;
    const result = checkAllowlist(code);

    expect(result.passed).toBe(true);
  });

  it('should allow screen.render()', () => {
    const code = `screen.render();`;
    const result = checkAllowlist(code);

    expect(result.passed).toBe(true);
  });

  it('should allow screen.key()', () => {
    const code = `screen.key(['q'], () => process.exit(0));`;
    const result = checkAllowlist(code);

    expect(result.passed).toBe(true);
  });

  it('should allow element.on()', () => {
    const code = `button.on('press', () => {});`;
    const result = checkAllowlist(code);

    expect(result.passed).toBe(true);
  });

  it('should allow element.setContent()', () => {
    const code = `box.setContent('new content');`;
    const result = checkAllowlist(code);

    expect(result.passed).toBe(true);
  });

  it('should pass complex valid code', () => {
    const code = readFileSync(join(fixturesDir, 'valid-code/form-input.js'), 'utf8');
    const result = checkAllowlist(code);

    expect(result.passed).toBe(true);
  });
});
