/**
 * Base AI client with common functionality
 */

import type { AIConfig } from '../specs-types.js';
import type { AIClient, AIPrompt, AIResponse } from './types.js';

/**
 * Format prompt for API request
 */
export function formatPromptForAPI(prompt: AIPrompt): { system: string; user: string } {
  let systemContent = prompt.systemPrompt;

  // Add examples to system prompt
  if (prompt.examples && prompt.examples.length > 0) {
    systemContent += '\n\n## Examples\n\n';
    for (const example of prompt.examples) {
      systemContent += `**Request:** ${example.request}\n\n`;
      systemContent += `**Code:**\n\`\`\`javascript\n${example.code}\n\`\`\`\n\n`;
    }
  }

  return {
    system: systemContent,
    user: prompt.userPrompt,
  };
}

/**
 * Abstract base for AI clients with common functionality
 */
export abstract class BaseAIClient implements AIClient {
  protected config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  abstract generate(prompt: AIPrompt): Promise<AIResponse>;

  /**
   * Measure latency of an async operation
   */
  protected async measureLatency<T>(operation: () => Promise<T>): Promise<{ result: T; latencyMs: number }> {
    const start = Date.now();
    const result = await operation();
    const latencyMs = Date.now() - start;
    return { result, latencyMs };
  }

  /**
   * Create default metadata
   */
  protected createMetadata(latencyMs: number, promptTokens = 0, completionTokens = 0): AIResponse['metadata'] {
    return {
      model: this.config.model,
      promptTokens,
      completionTokens,
      latencyMs,
      attemptNumber: 1,
    };
  }
}
