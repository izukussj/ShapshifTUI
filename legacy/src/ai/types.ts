/**
 * AI-related type definitions
 */

import type { AIConfig } from '../specs-types.js';

/**
 * Code example for few-shot prompting
 */
export interface CodeExample {
  request: string;
  code: string;
}

/**
 * Context for retry attempts
 */
export interface RetryContext {
  previousCode: string;
  error: string;
  attemptNumber: number;
}

/**
 * Constructed prompt sent to AI service
 */
export interface AIPrompt {
  systemPrompt: string;
  userPrompt: string;
  examples?: CodeExample[];
  retryContext?: RetryContext;
}

/**
 * Metadata about code generation
 */
export interface GenerationMetadata {
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  attemptNumber: number;
}

/**
 * Response from AI service
 */
export interface AIResponse {
  content: string;
  metadata: GenerationMetadata;
}

/**
 * AI client interface for provider-agnostic implementation
 */
export interface AIClient {
  /**
   * Generate code from a prompt
   */
  generate(prompt: AIPrompt): Promise<AIResponse>;
}

/**
 * Factory function type for creating AI clients
 */
export type AIClientFactory = (config: AIConfig) => AIClient;

/**
 * Supported AI providers
 */
export type AIProvider = 'openai' | 'anthropic' | 'websocket' | 'custom';
