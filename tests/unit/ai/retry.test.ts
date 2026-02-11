import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RetryOrchestrator,
  createRetryOrchestrator,
  isRetryableError,
  calculateBackoffDelay,
  DEFAULT_RETRY_CONFIG,
  type RetryOrchestratorContext,
} from '../../../src/ai/retry.js';
import type { AIClient, AIResponse, AIPrompt } from '../../../src/ai/types.js';
import type { ValidationResult } from '../../../src/validation/types.js';

// Mock AI client
function createMockAIClient(responses: Array<AIResponse | Error>): AIClient {
  let callIndex = 0;

  return {
    generate: vi.fn(async () => {
      const response = responses[callIndex];
      callIndex++;

      if (response instanceof Error) {
        throw response;
      }
      return response;
    }),
  };
}

// Create a successful AI response
function createSuccessResponse(code: string): AIResponse {
  return {
    content: `\`\`\`javascript\n${code}\n\`\`\``,
    metadata: {
      model: 'test-model',
      promptTokens: 100,
      completionTokens: 50,
      latencyMs: 500,
      attemptNumber: 1,
    },
  };
}

// Create a conversational response (no code)
function createConversationalResponse(): AIResponse {
  return {
    content: "Sure, I'd be happy to help you with that! What kind of interface would you like me to create?",
    metadata: {
      model: 'test-model',
      promptTokens: 100,
      completionTokens: 50,
      latencyMs: 500,
      attemptNumber: 1,
    },
  };
}

// Valid code for tests
const VALID_CODE = `const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });
const box = blessed.box({ content: 'Hello' });
screen.append(box);
screen.key(['q'], () => process.exit(0));
screen.render();`;

// Invalid code (security violation)
const INVALID_CODE_SECURITY = `const fs = require('fs');
const blessed = require('blessed');
fs.readFileSync('/etc/passwd');`;

// Invalid code (syntax error)
const INVALID_CODE_SYNTAX = `const blessed = require('blessed'
const screen = blessed.screen({ smartCSR: true });`;

// Mock prompt
const mockPrompt: AIPrompt = {
  systemPrompt: 'You are a TUI generator',
  userPrompt: 'Create a hello world box',
};

describe('RetryOrchestrator', () => {
  let mockValidateCode: (code: string) => ValidationResult;

  beforeEach(() => {
    // Default validation that passes
    mockValidateCode = vi.fn((code: string) => {
      if (code.includes('require(\'fs\')') || code.includes('require("fs")')) {
        return {
          passed: false,
          syntaxValid: true,
          securityPassed: false,
          allowlistPassed: true,
          errors: [
            { type: 'security', message: 'Blocked import: fs module' },
          ],
        };
      }
      return {
        passed: true,
        syntaxValid: true,
        securityPassed: true,
        allowlistPassed: true,
        errors: [],
      };
    });
  });

  describe('successful generation', () => {
    it('should succeed on first attempt with valid code', async () => {
      const client = createMockAIClient([createSuccessResponse(VALID_CODE)]);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode: mockValidateCode,
      });

      const result = await orchestrator.executeWithRetry('Create a box', mockPrompt);

      expect(result.success).toBe(true);
      expect(result.code).toContain('blessed');
      expect(result.totalAttempts).toBe(1);
      expect(client.generate).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry on AI service errors', () => {
    it('should retry on network error and succeed', async () => {
      const client = createMockAIClient([
        new Error('Network error'),
        createSuccessResponse(VALID_CODE),
      ]);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode: mockValidateCode,
      });

      const result = await orchestrator.executeWithRetry('Create a box', mockPrompt);

      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBe(2);
      expect(result.attemptHistory[0].errorType).toBe('ai_service');
      expect(result.attemptHistory[0].shouldRetry).toBe(true);
    });

    it('should fail after max attempts with persistent network errors', async () => {
      const client = createMockAIClient([
        new Error('Network error 1'),
        new Error('Network error 2'),
        new Error('Network error 3'),
      ]);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode: mockValidateCode,
        config: { maxAttempts: 3, includeErrorContext: true },
      });

      const result = await orchestrator.executeWithRetry('Create a box', mockPrompt);

      expect(result.success).toBe(false);
      expect(result.totalAttempts).toBe(3);
      expect(result.error).toContain('Network error');
    });
  });

  describe('retry on non-code responses (FR-012)', () => {
    it('should detect and retry when AI returns conversational text', async () => {
      const client = createMockAIClient([
        createConversationalResponse(),
        createSuccessResponse(VALID_CODE),
      ]);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode: mockValidateCode,
      });

      const result = await orchestrator.executeWithRetry('Create a box', mockPrompt);

      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBe(2);
      expect(result.attemptHistory[0].errorType).toBe('non_code');
    });
  });

  describe('retry on validation errors', () => {
    it('should retry when code fails security validation', async () => {
      const client = createMockAIClient([
        createSuccessResponse(INVALID_CODE_SECURITY),
        createSuccessResponse(VALID_CODE),
      ]);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode: mockValidateCode,
      });

      const result = await orchestrator.executeWithRetry('Create a box', mockPrompt);

      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBe(2);
      expect(result.attemptHistory[0].errorType).toBe('validation');
    });
  });

  describe('max attempts configuration', () => {
    it('should respect custom max attempts', async () => {
      const client = createMockAIClient([
        new Error('Error 1'),
        new Error('Error 2'),
      ]);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode: mockValidateCode,
        config: { maxAttempts: 2, includeErrorContext: true },
      });

      const result = await orchestrator.executeWithRetry('Create a box', mockPrompt);

      expect(result.success).toBe(false);
      expect(result.totalAttempts).toBe(2);
      expect(client.generate).toHaveBeenCalledTimes(2);
    });
  });

  describe('attempt history tracking', () => {
    it('should track all attempt results', async () => {
      const client = createMockAIClient([
        new Error('First error'),
        createConversationalResponse(),
        createSuccessResponse(VALID_CODE),
      ]);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode: mockValidateCode,
      });

      const result = await orchestrator.executeWithRetry('Create a box', mockPrompt);

      expect(result.attemptHistory).toHaveLength(3);
      expect(result.attemptHistory[0].errorType).toBe('ai_service');
      expect(result.attemptHistory[1].errorType).toBe('non_code');
      expect(result.attemptHistory[2].success).toBe(true);
    });
  });
});

describe('isRetryableError', () => {
  it('should return true for retryable error types', () => {
    expect(isRetryableError('ai_service')).toBe(true);
    expect(isRetryableError('parse')).toBe(true);
    expect(isRetryableError('validation')).toBe(true);
    expect(isRetryableError('non_code')).toBe(true);
  });

  it('should return false for unknown error types', () => {
    expect(isRetryableError('unknown')).toBe(false);
    expect(isRetryableError('fatal')).toBe(false);
  });
});

describe('calculateBackoffDelay', () => {
  it('should calculate exponential backoff', () => {
    const delay1 = calculateBackoffDelay(1, 1000, 10000);
    const delay2 = calculateBackoffDelay(2, 1000, 10000);
    const delay3 = calculateBackoffDelay(3, 1000, 10000);

    // With jitter, values should be approximately:
    // attempt 1: ~1000ms (±250)
    // attempt 2: ~2000ms (±500)
    // attempt 3: ~4000ms (±1000)
    expect(delay1).toBeGreaterThan(700);
    expect(delay1).toBeLessThan(1300);
    expect(delay2).toBeGreaterThan(1400);
    expect(delay2).toBeLessThan(2600);
    expect(delay3).toBeGreaterThan(2800);
    expect(delay3).toBeLessThan(5200);
  });

  it('should cap delay at maxDelay', () => {
    const delay = calculateBackoffDelay(10, 1000, 5000);
    // Should be capped at 5000 ± jitter
    expect(delay).toBeLessThan(6500);
  });
});

describe('DEFAULT_RETRY_CONFIG', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_RETRY_CONFIG.maxAttempts).toBe(3);
    expect(DEFAULT_RETRY_CONFIG.includeErrorContext).toBe(true);
  });
});
