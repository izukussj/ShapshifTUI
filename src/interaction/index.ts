/**
 * MoltUI Interaction Module
 *
 * Provides interaction capture, history management, and context building
 * for bidirectional communication between the TUI and AI.
 */

// Re-export types from types module for convenience
export type {
  InteractionElementType,
  InteractionEventType,
  InteractionData,
  InteractionEvent,
  InteractionHistoryState,
  InteractionContext,
  WidgetInteractionEvent,
} from '../types/index.js';

// Export classes
export { Debouncer, type DebouncerConfig } from './debounce.js';
export { InteractionHistory, type InteractionHistoryConfig } from './history.js';
export { InteractionCapture, getInteractionCapture, type InteractionCaptureConfig } from './capture.js';
export {
  InteractionContextBuilder,
  getInteractionContextBuilder,
  type InteractionContextBuilderConfig,
} from './context.js';
