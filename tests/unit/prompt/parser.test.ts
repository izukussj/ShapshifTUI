import { describe, it, expect } from 'vitest';
import { parseResponse, isCodeResponse, cleanCode } from '../../../src/prompt/parser.js';

describe('Response Parser', () => {
  describe('parseResponse', () => {
    it('should extract code from markdown fenced blocks', () => {
      const response = `Here is the code:

\`\`\`javascript
const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });
screen.render();
\`\`\`

This will create a screen.`;

      const result = parseResponse(response);

      expect(result.success).toBe(true);
      expect(result.code).toContain("const blessed = require('blessed')");
      expect(result.code).not.toContain('```');
    });

    it('should handle response with just code (no fences)', () => {
      const response = `const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });
screen.render();`;

      const result = parseResponse(response);

      expect(result.success).toBe(true);
      expect(result.code).toContain('blessed');
    });

    it('should return error for empty responses', () => {
      const result = parseResponse('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should return error for whitespace-only responses', () => {
      const result = parseResponse('   \n\n   ');

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should extract code from generic fenced blocks', () => {
      const response = `\`\`\`
const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });
\`\`\``;

      const result = parseResponse(response);

      expect(result.success).toBe(true);
      expect(result.code).toContain('blessed');
    });

    it('should return error for conversational responses', () => {
      const response = "Sure, I'd be happy to help you with that! What would you like?";

      const result = parseResponse(response);

      expect(result.success).toBe(false);
      expect(result.error).toContain('conversational text');
    });
  });

  describe('isCodeResponse - non-code detection (FR-012)', () => {
    it('should detect conversational responses without code', () => {
      const conversationalResponses = [
        "Sure, I'd be happy to help you with that! What kind of interface would you like?",
        "I can help you create a TUI. Would you like a simple box or something more complex?",
        "Let me explain how to create a blessed interface...",
        "Here is what I suggest for your interface design:",
        "I would recommend using the following approach...",
      ];

      for (const response of conversationalResponses) {
        expect(isCodeResponse(response)).toBe(false);
      }
    });

    it('should detect code responses with fences', () => {
      const response = `\`\`\`javascript
const blessed = require('blessed');
\`\`\``;

      expect(isCodeResponse(response)).toBe(true);
    });

    it('should detect code responses with blessed require', () => {
      const response = `const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });`;

      expect(isCodeResponse(response)).toBe(true);
    });

    it('should detect code based on code indicators', () => {
      const response = `const box = blessed.box({
  top: 'center',
  left: 'center',
  width: '50%',
  height: '50%'
});
screen.append(box);`;

      expect(isCodeResponse(response)).toBe(true);
    });

    it('should handle mixed content leaning towards conversational', () => {
      const response = `I can help you with that. Here's what you need to know:
The blessed library is great for TUI applications.
Would you like me to show you how to use it?`;

      expect(isCodeResponse(response)).toBe(false);
    });

    it('should handle mixed content leaning towards code', () => {
      const response = `const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });
// This creates a box
const box = blessed.box({ width: '50%', height: '50%' });
screen.append(box);
screen.render();`;

      expect(isCodeResponse(response)).toBe(true);
    });
  });

  describe('cleanCode', () => {
    it('should remove leading markdown fences', () => {
      const code = '```javascript\nconst x = 1;';
      expect(cleanCode(code)).toBe('const x = 1;');
    });

    it('should remove trailing markdown fences', () => {
      const code = 'const x = 1;\n```';
      expect(cleanCode(code)).toBe('const x = 1;');
    });

    it('should remove HTML comments', () => {
      const code = '<!-- comment -->\nconst x = 1;';
      expect(cleanCode(code)).toBe('const x = 1;');
    });

    it('should trim whitespace', () => {
      const code = '  \n  const x = 1;  \n  ';
      expect(cleanCode(code)).toBe('const x = 1;');
    });
  });
});
