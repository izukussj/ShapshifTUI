import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../../../src/prompt/builder.js';

describe('Prompt Builder', () => {
  it('should build a prompt with system and user components', () => {
    const prompt = buildPrompt('Show a centered box with "Hello World"');

    expect(prompt.systemPrompt).toBeDefined();
    expect(prompt.systemPrompt).toContain('blessed');
    expect(prompt.userPrompt).toContain('Hello World');
  });

  it('should include few-shot examples by default', () => {
    const prompt = buildPrompt('Show a table');

    expect(prompt.examples).toBeDefined();
    expect(prompt.examples!.length).toBeGreaterThan(0);
  });

  it('should include terminal context when provided', () => {
    const prompt = buildPrompt('Show a box', {
      width: 120,
      height: 40,
    });

    expect(prompt.userPrompt).toContain('120');
    expect(prompt.userPrompt).toContain('40');
  });

  it('should include retry context when provided', () => {
    const prompt = buildPrompt('Show a box', undefined, {
      previousCode: 'const x = 1;',
      error: 'Syntax error',
      attemptNumber: 2,
    });

    expect(prompt.retryContext).toBeDefined();
    expect(prompt.retryContext!.attemptNumber).toBe(2);
  });
});
