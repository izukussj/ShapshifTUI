/**
 * Core type definitions for MoltUI
 */

// Re-export public API types from contracts
export type {
  MoltUIConfig,
  AIConfig,
  SandboxConfig,
  RetryConfig,
  ValidationConfig,
  RenderOptions,
  RenderResult,
  RenderError,
  ValidationError,
  MoltUI,
} from '../specs-types.js';

/**
 * Internal request context for prompt enrichment
 */
export interface RequestContext {
  terminalWidth?: number;
  terminalHeight?: number;
  previousRequest?: string;
}

/**
 * User request for TUI generation
 */
export interface UserRequest {
  id: string;
  text: string;
  context?: RequestContext;
  timestamp: number;
}

/**
 * Metadata about AI code generation
 */
export interface GenerationMetadata {
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  attemptNumber: number;
}

/**
 * Generated code from AI service
 */
export interface GeneratedCode {
  id: string;
  requestId: string;
  rawResponse: string;
  extractedCode?: string;
  metadata: GenerationMetadata;
}

/**
 * Internal validation result with detailed breakdown
 */
export interface InternalValidationResult {
  codeId: string;
  passed: boolean;
  syntaxValid: boolean;
  securityPassed: boolean;
  allowlistPassed: boolean;
  errors: import('../validation/types.js').InternalValidationError[];
}
