/**
 * Public API types - copied from contracts/api.ts for runtime use
 * These types define the public interface of MoltUI
 */

/**
 * Configuration for MoltUI instance
 */
export interface MoltUIConfig {
  /** AI service configuration */
  ai: AIConfig;

  /** Sandbox execution settings */
  sandbox?: SandboxConfig;

  /** Retry behavior settings */
  retry?: RetryConfig;

  /** Validation settings */
  validation?: ValidationConfig;
}

export interface AIConfig {
  /** AI provider: 'openai' | 'anthropic' | 'custom' */
  provider: string;

  /** API key for the AI service */
  apiKey: string;

  /** Model identifier (e.g., 'gpt-4', 'claude-3-opus') */
  model: string;

  /** Optional base URL for custom providers */
  baseUrl?: string;
}

export interface SandboxConfig {
  /** Memory limit in MB (default: 64) */
  memoryLimitMB?: number;

  /** Execution timeout in ms (default: 5000) */
  timeoutMs?: number;
}

export interface RetryConfig {
  /** Maximum retry attempts (default: 3) */
  maxAttempts?: number;

  /** Whether to include error context in retry prompts (default: true) */
  includeErrorContext?: boolean;
}

export interface ValidationConfig {
  /** Additional blocked patterns (regex strings) */
  additionalBlockedPatterns?: string[];

  /** Strict mode: reject any non-allowlisted API (default: true) */
  strictMode?: boolean;
}

/**
 * Options for render request
 */
export interface RenderOptions {
  /** Terminal width override */
  width?: number;

  /** Terminal height override */
  height?: number;

  /** Previous request for iterative refinement */
  previousRequest?: string;
}

/**
 * Result of a render operation
 */
export interface RenderResult {
  /** Whether rendering succeeded */
  success: boolean;

  /** Rendered interface (if success) */
  interface?: RenderedInterface;

  /** Error details (if failure) */
  error?: RenderError;

  /** Number of attempts made */
  attempts: number;

  /** Total time in ms */
  durationMs: number;
}

export interface RenderError {
  /** Error type */
  type: 'validation' | 'execution' | 'ai_service' | 'timeout';

  /** Human-readable message */
  message: string;

  /** Detailed errors (for validation) */
  details?: ValidationError[];

  /** Whether retry is possible */
  retryable: boolean;
}

export interface ValidationError {
  /** Error category */
  type: 'syntax' | 'security' | 'allowlist';

  /** Error description */
  message: string;

  /** Source location */
  line?: number;
  column?: number;

  /** Offending code snippet */
  code?: string;
}

/**
 * Handle to a rendered interface
 */
export interface RenderedInterface {
  /** Unique interface identifier */
  readonly id: string;

  /** Current status */
  readonly status: InterfaceStatus;

  /** Register event callback for an element */
  on(elementId: string, eventType: EventType, callback: EventCallback): void;

  /** Remove event callback */
  off(elementId: string, eventType: EventType, callback?: EventCallback): void;

  /** Update element properties */
  update(elementId: string, properties: ElementUpdate): void;

  /** Get element IDs in the interface */
  getElementIds(): string[];

  /** Get element info by ID */
  getElement(elementId: string): ElementInfo | undefined;

  /** Destroy the interface and cleanup */
  destroy(): void;
}

export type InterfaceStatus = 'initializing' | 'active' | 'updating' | 'destroyed';

export type EventType =
  | 'click'
  | 'submit'
  | 'change'
  | 'focus'
  | 'blur'
  | 'keypress'
  | 'select';

export interface InteractionEvent {
  /** Interface that generated the event */
  interfaceId: string;

  /** Element that triggered the event */
  elementId: string;

  /** Type of interaction */
  eventType: EventType;

  /** Event-specific data */
  data: Record<string, unknown>;

  /** Event timestamp */
  timestamp: number;
}

export type EventCallback = (event: InteractionEvent) => void;

export interface ElementUpdate {
  /** New content/text */
  content?: string;

  /** Style updates */
  style?: Partial<ElementStyle>;

  /** Visibility */
  hidden?: boolean;

  /** Focus this element */
  focus?: boolean;
}

export interface ElementStyle {
  fg?: string;
  bg?: string;
  bold?: boolean;
  underline?: boolean;
  border?: { fg?: string; bg?: string };
}

export interface ElementInfo {
  /** Element ID */
  id: string;

  /** Element type */
  type: string;

  /** Current content */
  content?: string;

  /** Whether element is focusable */
  focusable: boolean;
}

/**
 * MoltUI main class
 */
export interface MoltUI {
  /**
   * Render a TUI from natural language description
   */
  render(description: string, options?: RenderOptions): Promise<RenderResult>;

  /**
   * Get currently active interface (if any)
   */
  getActiveInterface(): RenderedInterface | undefined;

  /**
   * Destroy active interface and cleanup
   */
  destroy(): void;
}
