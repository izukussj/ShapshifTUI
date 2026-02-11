/**
 * Main renderer orchestrator - ties together the full rendering pipeline
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  MoltUIConfig,
  MoltUI,
  RenderOptions,
  RenderResult,
  RenderError,
  RenderedInterface,
  ValidationError,
} from '../specs-types.js';
import type { AIClient, AIResponse } from '../ai/types.js';
import type { UserRequest, GeneratedCode } from './types.js';
import { createAIClient } from '../ai/client.js';
import { buildPrompt, buildRetryPrompt } from '../prompt/builder.js';
import { parseResponse, isCodeResponse } from '../prompt/parser.js';
import { validateCode, getCodeValidationReport } from '../validation/code-validator.js';
import { ElementRegistry, executeBlessedCode } from './sandbox-bridge.js';
import { createInterface } from '../interface/manager.js';

/**
 * Default configuration values
 */
const DEFAULTS = {
  maxRetries: 3,
  includeErrorContext: true,
  strictMode: true,
};

/**
 * MoltUI implementation
 */
class MoltUIImpl implements MoltUI {
  private config: MoltUIConfig;
  private aiClient: AIClient;
  private activeInterface: RenderedInterface | undefined;

  constructor(config: MoltUIConfig) {
    this.config = config;
    this.aiClient = createAIClient(config.ai);
  }

  async render(description: string, options?: RenderOptions): Promise<RenderResult> {
    const startTime = Date.now();
    const requestId = uuidv4();

    const maxAttempts = this.config.retry?.maxAttempts ?? DEFAULTS.maxRetries;
    let attempts = 0;
    let lastError: RenderError | undefined;
    let lastCode: string | undefined;
    let lastErrorMessage: string | undefined;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        // Build prompt
        const prompt = attempts === 1
          ? buildPrompt(description, {
              width: options?.width,
              height: options?.height,
            })
          : buildRetryPrompt(
              description,
              lastCode || '',
              lastErrorMessage || 'Unknown error',
              attempts,
              { width: options?.width, height: options?.height }
            );

        // Call AI service
        let aiResponse: AIResponse;
        try {
          aiResponse = await this.aiClient.generate(prompt);
        } catch (error) {
          lastError = {
            type: 'ai_service',
            message: error instanceof Error ? error.message : 'AI service error',
            retryable: true,
          };
          continue;
        }

        // Parse response
        const parseResult = parseResponse(aiResponse.content);
        if (!parseResult.success) {
          lastError = {
            type: 'ai_service',
            message: parseResult.error || 'Failed to extract code from response',
            retryable: true,
          };
          lastErrorMessage = parseResult.error;

          // Check if AI returned chat instead of code
          if (!isCodeResponse(aiResponse.content)) {
            lastErrorMessage = 'AI returned conversational text instead of code';
          }

          continue;
        }

        const code = parseResult.code!;
        lastCode = code;

        // Validate code
        const validationResult = validateCode(code, {
          strictMode: this.config.validation?.strictMode ?? DEFAULTS.strictMode,
          additionalBlockedPatterns: this.config.validation?.additionalBlockedPatterns?.map(p => ({
            name: 'custom',
            pattern: new RegExp(p),
            reason: 'Blocked by custom pattern',
            category: 'security' as const,
          })),
        });

        if (!validationResult.passed) {
          const validationErrors: ValidationError[] = validationResult.errors.map(e => ({
            type: e.type,
            message: e.message,
            line: e.line,
            column: e.column,
            code: e.code,
          }));

          lastError = {
            type: 'validation',
            message: getCodeValidationReport(validationResult),
            details: validationErrors,
            retryable: true,
          };
          lastErrorMessage = validationResult.errors.map(e => e.message).join('; ');
          continue;
        }

        // Execute code
        const registry = new ElementRegistry();
        const executionResult = executeBlessedCode(code, registry);

        if (executionResult.error || !executionResult.screen) {
          lastError = {
            type: 'execution',
            message: executionResult.error || 'Failed to execute code',
            retryable: true,
          };
          lastErrorMessage = executionResult.error;
          continue;
        }

        // Create interface
        const iface = createInterface(registry, {
          requestId,
          width: options?.width,
          height: options?.height,
        });

        // Store as active interface
        this.activeInterface = iface;

        return {
          success: true,
          interface: iface,
          attempts,
          durationMs: Date.now() - startTime,
        };
      } catch (error) {
        lastError = {
          type: 'execution',
          message: error instanceof Error ? error.message : 'Unexpected error',
          retryable: false,
        };
      }
    }

    // All attempts failed
    return {
      success: false,
      error: lastError || {
        type: 'execution',
        message: 'Maximum retry attempts exceeded',
        retryable: false,
      },
      attempts,
      durationMs: Date.now() - startTime,
    };
  }

  getActiveInterface(): RenderedInterface | undefined {
    return this.activeInterface;
  }

  destroy(): void {
    if (this.activeInterface) {
      this.activeInterface.destroy();
      this.activeInterface = undefined;
    }
  }
}

/**
 * Create a MoltUI instance
 */
export function createMoltUI(config: MoltUIConfig): MoltUI {
  // Validate required config
  if (!config.ai) {
    throw new Error('AI configuration is required');
  }
  if (!config.ai.apiKey) {
    throw new Error('AI API key is required');
  }
  if (!config.ai.provider) {
    throw new Error('AI provider is required');
  }
  if (!config.ai.model) {
    throw new Error('AI model is required');
  }

  return new MoltUIImpl(config);
}
