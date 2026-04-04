/**
 * Response parser for extracting code from AI responses
 */

/**
 * Result of parsing an AI response
 */
export interface ParseResult {
  success: boolean;
  code?: string;
  error?: string;
}

/**
 * Extract code from AI response
 *
 * Handles:
 * - Code in ```javascript fences
 * - Code in ``` fences (no language)
 * - Raw code without fences
 */
export function parseResponse(response: string): ParseResult {
  // Handle empty response
  if (!response || response.trim().length === 0) {
    return {
      success: false,
      error: 'AI returned empty response',
    };
  }

  const trimmed = response.trim();

  // Try to extract from javascript fenced code block
  const jsMatch = trimmed.match(/```(?:javascript|js)\s*\n([\s\S]*?)\n```/);
  if (jsMatch) {
    return {
      success: true,
      code: jsMatch[1].trim(),
    };
  }

  // Try to extract from generic fenced code block
  const genericMatch = trimmed.match(/```\s*\n([\s\S]*?)\n```/);
  if (genericMatch) {
    return {
      success: true,
      code: genericMatch[1].trim(),
    };
  }

  // If no fences but looks like code (contains blessed require), treat as raw code
  if (trimmed.includes("require('blessed')") || trimmed.includes('require("blessed")')) {
    return {
      success: true,
      code: trimmed,
    };
  }

  // Check if response looks like conversational text
  if (!isCodeResponse(response)) {
    return {
      success: false,
      error: 'AI returned conversational text instead of code. Response does not contain valid JavaScript code.',
    };
  }

  // Last resort: treat entire response as code if it has code-like structure
  if (hasCodeStructure(trimmed)) {
    return {
      success: true,
      code: trimmed,
    };
  }

  return {
    success: false,
    error: 'Could not extract code from AI response. Expected code in ```javascript fences.',
  };
}

/**
 * Check if response appears to be code rather than conversational text
 */
export function isCodeResponse(response: string): boolean {
  const trimmed = response.trim();

  // Contains code fence
  if (trimmed.includes('```')) {
    return true;
  }

  // Contains blessed require
  if (trimmed.includes("require('blessed')") || trimmed.includes('require("blessed")')) {
    return true;
  }

  // Check ratio of code-like characters
  const codeIndicators = [
    'const ', 'let ', 'var ', 'function ', '=>', '===', '!==',
    '{', '}', '(', ')', ';', 'blessed.', 'screen.', '.append('
  ];

  let codeScore = 0;
  for (const indicator of codeIndicators) {
    if (trimmed.includes(indicator)) {
      codeScore++;
    }
  }

  // Conversational indicators
  const chatIndicators = [
    'I can help', 'Here is', 'Sure,', 'Would you like', 'Let me',
    'I\'ll', 'You can', 'This will', 'I would', 'I suggest'
  ];

  let chatScore = 0;
  for (const indicator of chatIndicators) {
    if (trimmed.includes(indicator)) {
      chatScore++;
    }
  }

  // More code indicators than chat indicators
  return codeScore > chatScore && codeScore >= 3;
}

/**
 * Check if text has basic code structure
 */
function hasCodeStructure(text: string): boolean {
  // Must have some basic JavaScript structures
  const hasVariable = /\b(const|let|var)\s+\w+/.test(text);
  const hasFunction = /\bfunction\s*\w*\s*\(/.test(text) || /=>\s*{/.test(text) || /=>\s*\w/.test(text);
  const hasObject = /{[\s\S]*}/.test(text);
  const hasSemicolons = text.includes(';');

  return (hasVariable || hasFunction) && (hasObject || hasSemicolons);
}

/**
 * Clean extracted code (remove common issues)
 */
export function cleanCode(code: string): string {
  let cleaned = code.trim();

  // Remove any leading/trailing markdown artifacts
  cleaned = cleaned.replace(/^```[\w]*\n?/, '');
  cleaned = cleaned.replace(/\n?```$/, '');

  // Remove any HTML-like comments that AI sometimes adds
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  return cleaned.trim();
}
