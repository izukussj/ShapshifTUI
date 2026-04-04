/**
 * WebSocket provider for chatgpt-websocket backend
 *
 * Usage:
 * 1. Start the backend: npx chatgpt-websocket token=YOUR_TOKEN port=8080
 * 2. Connect MoltUI with provider: 'websocket' and baseUrl: 'ws://localhost:8080'
 */

import WebSocket from 'ws';
import type { AIConfig } from '../../specs-types.js';
import type { AIClient, AIPrompt, AIResponse } from '../types.js';
import { formatPromptForAPI } from '../base-client.js';

/**
 * Create a WebSocket client for chatgpt-websocket backend
 */
export function createWebSocketClient(config: AIConfig): AIClient {
  return new WebSocketAIClient(config);
}

/**
 * WebSocket AI client implementation
 */
class WebSocketAIClient implements AIClient {
  private config: AIConfig;
  private wsUrl: string;

  constructor(config: AIConfig) {
    this.config = config;
    this.wsUrl = config.baseUrl || 'ws://localhost:8080';
  }

  async generate(prompt: AIPrompt): Promise<AIResponse> {
    const { system, user } = formatPromptForAPI(prompt);

    // Combine system and user prompt for the message
    const message = `${system}\n\n---\n\nUser Request:\n${user}`;

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      let fullContent = '';
      let resolved = false;

      const cleanup = () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };

      // Timeout after 60 seconds
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(new Error('WebSocket request timeout'));
        }
      }, 60000);

      ws.on('open', () => {
        // Send chat message
        ws.send(JSON.stringify({
          type: 'chat',
          message,
        }));
      });

      ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());

          switch (msg.type) {
            case 'chunk':
              fullContent += msg.content || '';
              break;

            case 'done':
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                cleanup();
                resolve({
                  content: fullContent,
                  metadata: {
                    model: 'gpt-5',
                    promptTokens: 0,  // Not available from this API
                    completionTokens: 0,
                    latencyMs: Date.now() - startTime,
                    attemptNumber: 1,
                  },
                });
              }
              break;

            case 'error':
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                cleanup();
                reject(new Error(msg.error || 'Unknown WebSocket error'));
              }
              break;
          }
        } catch (e) {
          // Ignore non-JSON messages
        }
      });

      ws.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          cleanup();
          reject(new Error(`WebSocket error: ${err.message}`));
        }
      });

      ws.on('close', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          // If we have content, consider it successful
          if (fullContent) {
            resolve({
              content: fullContent,
              metadata: {
                model: 'gpt-5',
                promptTokens: 0,
                completionTokens: 0,
                latencyMs: Date.now() - startTime,
                attemptNumber: 1,
              },
            });
          } else {
            reject(new Error('WebSocket closed without response'));
          }
        }
      });
    });
  }
}
