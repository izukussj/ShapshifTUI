/**
 * Anthropic (Claude) provider implementation
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AIConfig } from '../../specs-types.js';
import type { AIClient, AIPrompt, AIResponse } from '../types.js';
import { BaseAIClient, formatPromptForAPI } from '../base-client.js';

/**
 * Create an Anthropic client
 */
export function createAnthropicClient(config: AIConfig): AIClient {
  return new AnthropicClient(config);
}

/**
 * Anthropic client implementation
 */
class AnthropicClient extends BaseAIClient {
  private client: Anthropic;

  constructor(config: AIConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  async generate(prompt: AIPrompt): Promise<AIResponse> {
    const { system, user } = formatPromptForAPI(prompt);

    const { result, latencyMs } = await this.measureLatency(async () => {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 4096,
        system,
        messages: [
          { role: 'user', content: user },
        ],
      });

      return response;
    });

    // Extract text content from response
    let content = '';
    for (const block of result.content) {
      if (block.type === 'text') {
        content += block.text;
      }
    }

    return {
      content,
      metadata: this.createMetadata(
        latencyMs,
        result.usage?.input_tokens || 0,
        result.usage?.output_tokens || 0
      ),
    };
  }
}
