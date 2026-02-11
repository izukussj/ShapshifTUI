/**
 * OpenAI provider implementation
 */

import OpenAI from 'openai';
import type { AIConfig } from '../../specs-types.js';
import type { AIClient, AIPrompt, AIResponse } from '../types.js';
import { BaseAIClient, formatPromptForAPI } from '../base-client.js';

/**
 * Create an OpenAI client
 */
export function createOpenAIClient(config: AIConfig): AIClient {
  return new OpenAIClient(config);
}

/**
 * OpenAI client implementation
 */
class OpenAIClient extends BaseAIClient {
  private client: OpenAI;

  constructor(config: AIConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async generate(prompt: AIPrompt): Promise<AIResponse> {
    const { system, user } = formatPromptForAPI(prompt);

    const { result, latencyMs } = await this.measureLatency(async () => {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.2, // Lower temperature for more consistent code
        max_tokens: 4096,
      });

      return response;
    });

    const content = result.choices[0]?.message?.content || '';
    const usage = result.usage;

    return {
      content,
      metadata: this.createMetadata(
        latencyMs,
        usage?.prompt_tokens || 0,
        usage?.completion_tokens || 0
      ),
    };
  }
}
