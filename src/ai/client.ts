/**
 * Provider-agnostic AI client interface
 */

import type { AIConfig } from '../specs-types.js';
import type { AIProvider } from './types.js';
import { createOpenAIClient } from './providers/openai.js';
import { createAnthropicClient } from './providers/anthropic.js';
import { createWebSocketClient } from './providers/websocket.js';

// Re-export base client utilities
export { BaseAIClient, formatPromptForAPI } from './base-client.js';

/**
 * Create an AI client for the specified provider
 */
export function createAIClient(config: AIConfig) {
  const provider = config.provider.toLowerCase() as AIProvider;

  switch (provider) {
    case 'openai':
      return createOpenAIClient(config);

    case 'anthropic':
      return createAnthropicClient(config);

    case 'websocket':
      return createWebSocketClient(config);

    case 'custom':
      if (!config.baseUrl) {
        throw new Error('Custom provider requires baseUrl');
      }
      // For custom providers, use OpenAI-compatible API
      return createOpenAIClient(config);

    default:
      throw new Error(`Unknown AI provider: ${config.provider}. Supported: openai, anthropic, websocket, custom`);
  }
}
