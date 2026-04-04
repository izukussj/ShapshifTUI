/**
 * Retry prompt templates for error recovery
 *
 * These prompts guide the AI to fix errors from previous attempts.
 * Implements US3: Error Recovery and Feedback Loop
 */

import type { RetryContext } from '../../ai/types.js';

/**
 * Template for retry prompts with error context
 */
export const RETRY_PROMPT_TEMPLATE = `
**RETRY ATTEMPT {attemptNumber}**

Your previous code generation attempt failed with the following error:

{errorSection}

Please fix the error and generate corrected code. Remember:

1. Output ONLY valid JavaScript code in \`\`\`javascript fences
2. Do NOT include any explanations or conversational text
3. Use ONLY blessed library APIs (no file I/O, network, or process operations)
4. Follow the exact structure shown in the system prompt

{previousCodeSection}

Generate the corrected code now:
`;

/**
 * Template for non-code response retry
 */
export const NON_CODE_RETRY_TEMPLATE = `
**RETRY ATTEMPT {attemptNumber}**

Your previous response was conversational text instead of code.

IMPORTANT: You must output ONLY JavaScript code. Do not include:
- Greetings or introductions ("Sure, I can help...")
- Explanations of what the code does
- Questions asking for clarification
- Any text outside the code block

Just output the code directly in a \`\`\`javascript code fence.

Original request: {originalRequest}

Generate ONLY the code now:
`;

/**
 * Build a retry prompt section from error details
 */
export function buildRetryPromptSection(retryContext: RetryContext): string {
  const template = retryContext.error.includes('conversational text')
    ? NON_CODE_RETRY_TEMPLATE
    : RETRY_PROMPT_TEMPLATE;

  let prompt = template
    .replace('{attemptNumber}', String(retryContext.attemptNumber))
    .replace('{errorSection}', formatErrorSection(retryContext.error));

  // Add previous code section if available
  if (retryContext.previousCode && !retryContext.error.includes('conversational text')) {
    const previousCodeSection = `
Previous code (that failed):
\`\`\`javascript
${retryContext.previousCode}
\`\`\`

Fix the errors shown above and regenerate.
`;
    prompt = prompt.replace('{previousCodeSection}', previousCodeSection);
  } else {
    prompt = prompt.replace('{previousCodeSection}', '');
  }

  return prompt.trim();
}

/**
 * Format error message for inclusion in prompt
 */
function formatErrorSection(error: string): string {
  // Clean up error for AI consumption
  const lines = error.split('\n').filter(line => line.trim());

  // Remove suggestion lines (AI doesn't need human suggestions)
  const cleanedLines = lines.filter(line => !line.includes('Suggestion:'));

  return cleanedLines.map(line => `> ${line}`).join('\n');
}

/**
 * Get additional instructions based on error type
 */
export function getErrorSpecificInstructions(errorType: string): string {
  const instructions: Record<string, string> = {
    syntax: `
Pay special attention to:
- Matching braces and parentheses
- Proper semicolons
- Correct string quotes
- Valid variable declarations
`,
    security: `
CRITICAL: The following are FORBIDDEN and will be blocked:
- require() for anything except 'blessed'
- import statements
- fs, path, net, http, child_process modules
- eval(), new Function()
- process.env, global, globalThis
- __proto__, constructor.constructor

Use ONLY blessed APIs for UI creation.
`,
    allowlist: `
Only these blessed APIs are allowed:
- blessed.screen(), .box(), .text(), .list()
- blessed.table(), .form(), .input(), .button()
- blessed.textarea(), .checkbox(), .radioset(), .progressbar()
- screen.append(), screen.render(), screen.key()
- Element event methods: .on(), .focus()

Do NOT use any other APIs.
`,
    non_code: `
You MUST return JavaScript code, not conversational text.
Output format:
\`\`\`javascript
const blessed = require('blessed');
// your code here
\`\`\`
`,
  };

  return instructions[errorType] || '';
}

/**
 * Build a complete retry prompt
 */
export function buildCompleteRetryPrompt(
  originalRequest: string,
  retryContext: RetryContext,
  errorType?: string
): string {
  const parts: string[] = [];

  // Main retry section
  parts.push(buildRetryPromptSection(retryContext));

  // Error-specific instructions
  if (errorType) {
    const instructions = getErrorSpecificInstructions(errorType);
    if (instructions) {
      parts.push(instructions);
    }
  }

  // Reminder of original request
  parts.push(`\nOriginal request: "${originalRequest}"`);

  return parts.join('\n');
}
