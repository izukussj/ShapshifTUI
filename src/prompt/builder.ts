/**
 * Prompt builder for AI code generation
 */

import type { AIPrompt, RetryContext } from '../ai/types.js';
import { getSystemPrompt } from './templates/system.js';
import { getRelevantExamples } from './templates/examples.js';

/**
 * Options for building a prompt
 */
export interface PromptOptions {
  /** Terminal width */
  width?: number;
  /** Terminal height */
  height?: number;
  /** Include examples */
  includeExamples?: boolean;
}

/**
 * Build a complete prompt for AI code generation
 */
export function buildPrompt(
  userRequest: string,
  options?: PromptOptions,
  retryContext?: RetryContext
): AIPrompt {
  const terminalContext = options?.width || options?.height
    ? { width: options.width, height: options.height }
    : undefined;

  const systemPrompt = getSystemPrompt(terminalContext);

  // Build user prompt
  let userPrompt = `Generate blessed TUI code for: ${userRequest}`;

  // Add terminal context to user prompt if available
  if (terminalContext) {
    userPrompt += `\n\nTerminal size: ${terminalContext.width || 'auto'}x${terminalContext.height || 'auto'}`;
  }

  // Get relevant examples unless disabled
  const includeExamples = options?.includeExamples !== false;
  const examples = includeExamples ? getRelevantExamples(userRequest) : undefined;

  // Add retry context if this is a retry
  if (retryContext) {
    userPrompt += `\n\n---\n\n**RETRY ATTEMPT ${retryContext.attemptNumber}**\n\n`;
    userPrompt += `Your previous code had an error:\n${retryContext.error}\n\n`;
    userPrompt += `Previous code:\n\`\`\`javascript\n${retryContext.previousCode}\n\`\`\`\n\n`;
    userPrompt += `Please fix the error and generate corrected code.`;
  }

  return {
    systemPrompt,
    userPrompt,
    examples,
    retryContext,
  };
}

/**
 * Build a retry prompt with error context
 */
export function buildRetryPrompt(
  originalRequest: string,
  previousCode: string,
  error: string,
  attemptNumber: number,
  options?: PromptOptions
): AIPrompt {
  return buildPrompt(originalRequest, options, {
    previousCode,
    error,
    attemptNumber,
  });
}

/**
 * Format examples as part of the prompt
 */
export function formatExamplesForPrompt(examples: AIPrompt['examples']): string {
  if (!examples || examples.length === 0) {
    return '';
  }

  let formatted = '\n\n## Examples\n\n';

  for (const example of examples) {
    formatted += `**Request:** ${example.request}\n\n`;
    formatted += `**Code:**\n\`\`\`javascript\n${example.code}\n\`\`\`\n\n`;
  }

  return formatted;
}
