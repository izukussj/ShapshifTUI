/**
 * Retry orchestrator for handling AI code generation failures
 *
 * Implements FR-011: Configurable retry behavior with default of 3 retry attempts
 * Implements FR-012: Detection and re-prompting for conversational responses
 */

import type { AIClient, AIResponse, AIPrompt, RetryContext } from './types.js';
import type { ValidationResult } from '../validation/types.js';
import { parseResponse, isCodeResponse } from '../prompt/parser.js';
import { buildRetryPrompt } from '../prompt/builder.js';
import { formatValidationError, formatRetryMessage } from '../core/errors.js';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum retry attempts (default: 3) */
  maxAttempts: number;
  /** Include error context in retry prompts (default: true) */
  includeErrorContext: boolean;
  /** Delay between retries in ms (default: 0) */
  retryDelayMs?: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  includeErrorContext: true,
  retryDelayMs: 0,
};

/**
 * Result of a retry attempt
 */
export interface RetryAttemptResult {
  success: boolean;
  code?: string;
  response?: AIResponse;
  error?: string;
  errorType?: 'ai_service' | 'parse' | 'validation' | 'non_code';
  attemptNumber: number;
  shouldRetry: boolean;
}

/**
 * Final result after all retry attempts
 */
export interface RetryResult {
  success: boolean;
  code?: string;
  response?: AIResponse;
  error?: string;
  errorType?: string;
  totalAttempts: number;
  attemptHistory: RetryAttemptResult[];
}

/**
 * Context provided to the retry orchestrator
 */
export interface RetryOrchestratorContext {
  aiClient: AIClient;
  config: RetryConfig;
  validateCode: (code: string) => ValidationResult;
  terminalContext?: { width?: number; height?: number };
}

/**
 * Retry orchestrator - manages retry logic with error context injection
 */
export class RetryOrchestrator {
  private context: RetryOrchestratorContext;

  constructor(context: RetryOrchestratorContext) {
    this.context = context;
  }

  /**
   * Execute code generation with automatic retry on failure
   */
  async executeWithRetry(
    userRequest: string,
    initialPrompt: AIPrompt
  ): Promise<RetryResult> {
    const attemptHistory: RetryAttemptResult[] = [];
    let currentPrompt = initialPrompt;
    let lastCode: string | undefined;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= this.context.config.maxAttempts; attempt++) {
      // Apply retry delay if configured and not first attempt
      if (attempt > 1 && this.context.config.retryDelayMs) {
        await this.delay(this.context.config.retryDelayMs);
      }

      const result = await this.attemptGeneration(
        currentPrompt,
        attempt,
        lastCode
      );

      attemptHistory.push(result);

      if (result.success && result.code) {
        return {
          success: true,
          code: result.code,
          response: result.response,
          totalAttempts: attempt,
          attemptHistory,
        };
      }

      // Store for next retry
      lastCode = result.code;
      lastError = result.error;

      // Check if we should retry
      if (!result.shouldRetry || attempt >= this.context.config.maxAttempts) {
        break;
      }

      // Build retry prompt with error context
      if (this.context.config.includeErrorContext && lastError) {
        currentPrompt = buildRetryPrompt(
          userRequest,
          lastCode || '',
          lastError,
          attempt + 1,
          this.context.terminalContext
        );
      }
    }

    // All attempts failed
    return {
      success: false,
      error: lastError || 'Maximum retry attempts exceeded',
      errorType: attemptHistory[attemptHistory.length - 1]?.errorType,
      totalAttempts: attemptHistory.length,
      attemptHistory,
    };
  }

  /**
   * Execute a single generation attempt
   */
  private async attemptGeneration(
    prompt: AIPrompt,
    attemptNumber: number,
    previousCode?: string
  ): Promise<RetryAttemptResult> {
    // 1. Call AI service
    let response: AIResponse;
    try {
      response = await this.context.aiClient.generate(prompt);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AI service error',
        errorType: 'ai_service',
        attemptNumber,
        shouldRetry: true, // Network/service errors are retryable
      };
    }

    // 2. Check for non-code response (FR-012)
    if (!isCodeResponse(response.content)) {
      return {
        success: false,
        response,
        error: 'AI returned conversational text instead of code. Expected JavaScript code in markdown fences.',
        errorType: 'non_code',
        attemptNumber,
        shouldRetry: true, // Can retry with explicit code-only instruction
      };
    }

    // 3. Parse response
    const parseResult = parseResponse(response.content);
    if (!parseResult.success) {
      return {
        success: false,
        response,
        error: parseResult.error || 'Failed to extract code from response',
        errorType: 'parse',
        attemptNumber,
        shouldRetry: true,
      };
    }

    const code = parseResult.code!;

    // 4. Validate code
    const validationResult = this.context.validateCode(code);
    if (!validationResult.passed) {
      const errorMessage = formatValidationError(validationResult);
      return {
        success: false,
        code,
        response,
        error: errorMessage,
        errorType: 'validation',
        attemptNumber,
        shouldRetry: true, // Validation errors can be fixed by AI
      };
    }

    // Success!
    return {
      success: true,
      code,
      response,
      attemptNumber,
      shouldRetry: false,
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a retry orchestrator with default configuration
 */
export function createRetryOrchestrator(
  context: Omit<RetryOrchestratorContext, 'config'> & { config?: Partial<RetryConfig> }
): RetryOrchestrator {
  return new RetryOrchestrator({
    ...context,
    config: {
      ...DEFAULT_RETRY_CONFIG,
      ...context.config,
    },
  });
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(errorType: string): boolean {
  const retryableTypes = ['ai_service', 'parse', 'validation', 'non_code'];
  return retryableTypes.includes(errorType);
}

/**
 * Calculate backoff delay for retries (exponential backoff with jitter)
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 10000
): number {
  // Exponential backoff: baseDelay * 2^(attempt-1)
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter (±25%)
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);

  return Math.floor(cappedDelay + jitter);
}
