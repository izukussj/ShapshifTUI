/**
 * MoltUI - AI-Generated TUI Rendering
 *
 * Generate terminal user interfaces from natural language descriptions.
 * MoltUI uses AI to generate blessed library code from plain English,
 * validates the code for safety, and executes it in a sandboxed environment.
 *
 * @example
 * ```typescript
 * import { createMoltUI } from 'moltui';
 *
 * const moltui = createMoltUI({
 *   ai: {
 *     provider: 'openai',
 *     apiKey: process.env.OPENAI_API_KEY!,
 *     model: 'gpt-4',
 *   },
 * });
 *
 * const result = await moltui.render('Show a centered box with "Hello World"');
 *
 * if (result.success) {
 *   // Interface is now displayed in the terminal
 *   result.interface.on('box-1', 'click', (event) => {
 *     console.log('Box clicked!', event);
 *   });
 * } else {
 *   console.error('Render failed:', result.error?.message);
 * }
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// AI Code Rendering API
// ============================================================================

/**
 * Configuration types for MoltUI instances
 *
 * @remarks
 * These types define how MoltUI connects to AI services,
 * handles retries, and validates generated code.
 */
export type {
  /** Main configuration object for creating a MoltUI instance */
  MoltUIConfig,
  /** AI service connection settings (provider, API key, model) */
  AIConfig,
  /** Sandboxed execution limits (memory, timeout) */
  SandboxConfig,
  /** Retry behavior configuration (max attempts, error context) */
  RetryConfig,
  /** Code validation settings (blocked patterns, strict mode) */
  ValidationConfig,
} from './specs-types.js';

/**
 * Request and response types for render operations
 */
export type {
  /** Options for a render request (terminal size, etc.) */
  RenderOptions,
  /** Result of a render operation (success/failure, interface, errors) */
  RenderResult,
  /** Error details when rendering fails */
  RenderError,
} from './specs-types.js';

/**
 * Interface management types for interacting with rendered TUIs
 *
 * @remarks
 * Once a TUI is rendered, use these types to handle user interactions,
 * update element properties, and manage the interface lifecycle.
 */
export type {
  /** Handle to a rendered interface with event and update methods */
  RenderedInterface,
  /** Interface lifecycle status */
  InterfaceStatus,
  /** Supported event types for user interactions */
  EventType,
  /** Callback function type for event handling */
  EventCallback,
  /** Event object passed to callbacks */
  InteractionEvent,
  /** Properties that can be updated on elements */
  ElementUpdate,
  /** Style properties for elements */
  ElementStyle,
  /** Information about an element in the interface */
  ElementInfo,
} from './specs-types.js';

/**
 * Main MoltUI interface
 */
export type {
  /** MoltUI instance interface with render, getActiveInterface, destroy methods */
  MoltUI,
} from './specs-types.js';

/**
 * Creates a new MoltUI instance for generating TUI interfaces.
 *
 * @param config - Configuration for AI service, sandbox, retry, and validation
 * @returns A MoltUI instance ready to render interfaces
 *
 * @example
 * ```typescript
 * const moltui = createMoltUI({
 *   ai: {
 *     provider: 'anthropic',
 *     apiKey: process.env.ANTHROPIC_API_KEY!,
 *     model: 'claude-3-opus',
 *   },
 *   retry: {
 *     maxAttempts: 5, // Override default of 3
 *   },
 *   validation: {
 *     strictMode: true, // Only allow blessed APIs
 *   },
 * });
 * ```
 *
 * @throws {Error} If required configuration is missing (ai.apiKey, ai.provider, ai.model)
 */
export { createMoltUI } from './core/renderer.js';

// ============================================================================
// Legacy API (preserved for backwards compatibility)
// ============================================================================

// Re-export types
export * from './types/index.js';

// Re-export modules
export { Application, type ApplicationConfig } from './app/index.js';
export { WebSocketClient, type WebSocketClientEvents } from './connection/index.js';
export { EventBus, getEventBus, type AppEvents } from './events/index.js';
export { LayoutManager, getLayoutManager } from './layout/index.js';
export { ThemeManager, getThemeManager } from './theme/index.js';
export { ChatPanel, type ChatPanelConfig } from './chat/index.js';
export {
  validateLayout,
  validateEvent,
  getValidator,
  type ValidationResult,
  type ValidationError,
} from './validation/index.js';
export {
  BaseWidget,
  createWidget,
  createWidgetTree,
  registerWidget,
  type RenderContext,
} from './widgets/index.js';
