import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AIClient, AIPrompt, AIResponse } from '../../src/ai/types.js';
import type { ValidationResult } from '../../src/validation/types.js';
import {
  RetryOrchestrator,
  createRetryOrchestrator,
  DEFAULT_RETRY_CONFIG,
} from '../../src/ai/retry.js';

/**
 * Integration tests for the complete retry flow
 *
 * Tests US3: Error Recovery and Feedback Loop
 * - FR-011: Configurable retry behavior (default 3 attempts)
 * - FR-012: Non-code response detection and re-prompting
 *
 * These tests verify the retry orchestrator integrates correctly with
 * AI clients and validation without requiring actual sandbox execution.
 */

// Valid blessed code that passes validation
const VALID_BLESSED_CODE = `const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });
const box = blessed.box({
  top: 'center',
  left: 'center',
  width: '50%',
  height: '50%',
  content: 'Hello World',
  border: { type: 'line' }
});
screen.append(box);
screen.key(['q', 'escape'], () => process.exit(0));
screen.render();`;

// Code with security violation
const SECURITY_VIOLATION_CODE = `const fs = require('fs');
const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });
fs.readFileSync('/etc/passwd');
screen.render();`;

// Conversational response (no code)
const CONVERSATIONAL_RESPONSE = `Sure, I'd be happy to help you create a TUI interface!

To create a nice looking box, you'll want to use the blessed library.
Would you like me to show you how to do that?`;

// Create mock AI response
function createResponse(content: string): AIResponse {
  return {
    content,
    metadata: {
      model: 'test-model',
      promptTokens: 100,
      completionTokens: 50,
      latencyMs: 200,
      attemptNumber: 1,
    },
  };
}

// Create mock AI client
function createMockClient(
  responseSequence: Array<string | Error>
): { client: AIClient; calls: AIPrompt[] } {
  const calls: AIPrompt[] = [];
  let callIndex = 0;

  const client: AIClient = {
    generate: vi.fn(async (prompt: AIPrompt) => {
      calls.push(prompt);
      const response = responseSequence[callIndex];
      callIndex++;

      if (response instanceof Error) {
        throw response;
      }
      return createResponse(response);
    }),
  };

  return { client, calls };
}

// Create mock validation function
function createMockValidator(
  resultSequence: Array<'pass' | 'fail-security' | 'fail-syntax'>
): (code: string) => ValidationResult {
  let callIndex = 0;

  return (_code: string) => {
    const result = resultSequence[callIndex] || 'pass';
    callIndex++;

    if (result === 'pass') {
      return {
        passed: true,
        syntaxValid: true,
        securityPassed: true,
        allowlistPassed: true,
        errors: [],
      };
    } else if (result === 'fail-security') {
      return {
        passed: false,
        syntaxValid: true,
        securityPassed: false,
        allowlistPassed: true,
        errors: [{ type: 'security', message: 'Blocked import: fs module' }],
      };
    } else {
      return {
        passed: false,
        syntaxValid: false,
        securityPassed: false,
        allowlistPassed: false,
        errors: [{ type: 'syntax', message: 'Syntax error' }],
      };
    }
  };
}

// Mock prompt for testing
const mockPrompt: AIPrompt = {
  systemPrompt: 'You are a TUI generator',
  userPrompt: 'Create a hello world box',
};

describe('Retry Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful generation without retry', () => {
    it('should succeed on first attempt with valid code', async () => {
      const { client, calls } = createMockClient([
        `\`\`\`javascript\n${VALID_BLESSED_CODE}\n\`\`\``,
      ]);
      const validateCode = createMockValidator(['pass']);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode,
      });

      const result = await orchestrator.executeWithRetry(
        'Show a hello world box',
        mockPrompt
      );

      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBe(1);
      expect(calls).toHaveLength(1);
      expect(result.code).toContain('blessed');
    });
  });

  describe('retry on AI service errors', () => {
    it('should retry and succeed after transient error', async () => {
      const { client, calls } = createMockClient([
        new Error('Service temporarily unavailable'),
        `\`\`\`javascript\n${VALID_BLESSED_CODE}\n\`\`\``,
      ]);
      const validateCode = createMockValidator(['pass']);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode,
      });

      const result = await orchestrator.executeWithRetry(
        'Show a hello world box',
        mockPrompt
      );

      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBe(2);
      expect(calls).toHaveLength(2);
    });

    it('should fail after max retries with persistent errors', async () => {
      const { client } = createMockClient([
        new Error('Error 1'),
        new Error('Error 2'),
        new Error('Error 3'),
      ]);
      const validateCode = createMockValidator(['pass']);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode,
        config: { maxAttempts: 3, includeErrorContext: true },
      });

      const result = await orchestrator.executeWithRetry(
        'Show a hello world box',
        mockPrompt
      );

      expect(result.success).toBe(false);
      expect(result.totalAttempts).toBe(3);
      expect(result.error).toContain('Error');
    });
  });

  describe('retry on validation failures', () => {
    it('should retry when code fails security validation', async () => {
      const { client, calls } = createMockClient([
        `\`\`\`javascript\n${SECURITY_VIOLATION_CODE}\n\`\`\``,
        `\`\`\`javascript\n${VALID_BLESSED_CODE}\n\`\`\``,
      ]);
      const validateCode = createMockValidator(['fail-security', 'pass']);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode,
      });

      const result = await orchestrator.executeWithRetry(
        'Show a hello world box',
        mockPrompt
      );

      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBe(2);
      expect(calls).toHaveLength(2);

      // First attempt should have failed with security error
      expect(result.attemptHistory[0].errorType).toBe('validation');
      expect(result.attemptHistory[0].success).toBe(false);

      // Second attempt should succeed
      expect(result.attemptHistory[1].success).toBe(true);
    });

    it('should include error context in retry prompts', async () => {
      const { client, calls } = createMockClient([
        `\`\`\`javascript\n${SECURITY_VIOLATION_CODE}\n\`\`\``,
        `\`\`\`javascript\n${VALID_BLESSED_CODE}\n\`\`\``,
      ]);
      const validateCode = createMockValidator(['fail-security', 'pass']);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode,
        config: { maxAttempts: 3, includeErrorContext: true },
      });

      const result = await orchestrator.executeWithRetry(
        'Show a hello world box',
        mockPrompt
      );

      expect(result.success).toBe(true);
      expect(calls).toHaveLength(2);

      // Second call should have retry context in prompt
      const secondPrompt = calls[1];
      expect(secondPrompt.userPrompt).toContain('RETRY ATTEMPT');
    });
  });

  describe('non-code response detection (FR-012)', () => {
    it('should detect conversational responses and retry', async () => {
      const { client, calls } = createMockClient([
        CONVERSATIONAL_RESPONSE,
        `\`\`\`javascript\n${VALID_BLESSED_CODE}\n\`\`\``,
      ]);
      const validateCode = createMockValidator(['pass']);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode,
      });

      const result = await orchestrator.executeWithRetry(
        'Show a hello world box',
        mockPrompt
      );

      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBe(2);
      expect(calls).toHaveLength(2);

      // First attempt should detect non-code response
      expect(result.attemptHistory[0].errorType).toBe('non_code');
      expect(result.attemptHistory[0].error).toContain('conversational');
    });

    it('should fail after max retries with persistent conversational responses', async () => {
      const { client } = createMockClient([
        CONVERSATIONAL_RESPONSE,
        'I understand you want a box. Let me explain...',
        'Would you like me to show you how?',
      ]);
      const validateCode = createMockValidator(['pass']);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode,
        config: { maxAttempts: 3, includeErrorContext: true },
      });

      const result = await orchestrator.executeWithRetry(
        'Show a hello world box',
        mockPrompt
      );

      expect(result.success).toBe(false);
      expect(result.totalAttempts).toBe(3);
      expect(result.errorType).toBe('non_code');
    });
  });

  describe('custom retry configuration (FR-011)', () => {
    it('should respect custom max attempts', async () => {
      const { client } = createMockClient([
        new Error('Error 1'),
        new Error('Error 2'),
        new Error('Error 3'),
        new Error('Error 4'),
        new Error('Error 5'),
      ]);
      const validateCode = createMockValidator(['pass']);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode,
        config: { maxAttempts: 5, includeErrorContext: true },
      });

      const result = await orchestrator.executeWithRetry(
        'Show a hello world box',
        mockPrompt
      );

      expect(result.success).toBe(false);
      expect(result.totalAttempts).toBe(5);
    });

    it('should work with single attempt (no retries)', async () => {
      const { client } = createMockClient([new Error('Error')]);
      const validateCode = createMockValidator(['pass']);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode,
        config: { maxAttempts: 1, includeErrorContext: true },
      });

      const result = await orchestrator.executeWithRetry(
        'Show a hello world box',
        mockPrompt
      );

      expect(result.success).toBe(false);
      expect(result.totalAttempts).toBe(1);
    });

    it('should use default config when not specified', async () => {
      const { client } = createMockClient([
        new Error('Error 1'),
        new Error('Error 2'),
        new Error('Error 3'),
        `\`\`\`javascript\n${VALID_BLESSED_CODE}\n\`\`\``, // 4th attempt (won't be reached)
      ]);
      const validateCode = createMockValidator(['pass']);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode,
      });

      const result = await orchestrator.executeWithRetry(
        'Show a hello world box',
        mockPrompt
      );

      // Default is 3 attempts
      expect(result.success).toBe(false);
      expect(result.totalAttempts).toBe(DEFAULT_RETRY_CONFIG.maxAttempts);
    });
  });

  describe('attempt history tracking', () => {
    it('should track all attempt results', async () => {
      const { client } = createMockClient([
        new Error('Network error'),
        CONVERSATIONAL_RESPONSE,
        `\`\`\`javascript\n${VALID_BLESSED_CODE}\n\`\`\``,
      ]);
      const validateCode = createMockValidator(['pass']);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode,
      });

      const result = await orchestrator.executeWithRetry(
        'Show a hello world box',
        mockPrompt
      );

      expect(result.success).toBe(true);
      expect(result.attemptHistory).toHaveLength(3);

      // First: AI service error
      expect(result.attemptHistory[0].errorType).toBe('ai_service');
      expect(result.attemptHistory[0].success).toBe(false);

      // Second: Non-code response
      expect(result.attemptHistory[1].errorType).toBe('non_code');
      expect(result.attemptHistory[1].success).toBe(false);

      // Third: Success
      expect(result.attemptHistory[2].success).toBe(true);
      expect(result.attemptHistory[2].code).toBeTruthy();
    });
  });

  describe('error messages', () => {
    it('should provide descriptive error messages for validation failures', async () => {
      const { client } = createMockClient([
        `\`\`\`javascript\n${SECURITY_VIOLATION_CODE}\n\`\`\``,
        `\`\`\`javascript\n${SECURITY_VIOLATION_CODE}\n\`\`\``,
        `\`\`\`javascript\n${SECURITY_VIOLATION_CODE}\n\`\`\``,
      ]);
      const validateCode = createMockValidator([
        'fail-security',
        'fail-security',
        'fail-security',
      ]);

      const orchestrator = createRetryOrchestrator({
        aiClient: client,
        validateCode,
        config: { maxAttempts: 3, includeErrorContext: true },
      });

      const result = await orchestrator.executeWithRetry(
        'Show a hello world box',
        mockPrompt
      );

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.error).toBeTruthy();
      expect(result.error?.toLowerCase()).toContain('security');
    });
  });
});
