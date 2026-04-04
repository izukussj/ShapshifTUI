/**
 * Interaction Event Types for TUI Interaction Flow
 *
 * Types for capturing and managing user interactions with TUI elements.
 */

/**
 * Types of TUI elements that can be interacted with
 */
export type InteractionElementType =
  | 'button'
  | 'list'
  | 'input'
  | 'checkbox'
  | 'form'
  | 'table';

/**
 * Types of interaction events
 */
export type InteractionEventType =
  | 'click'
  | 'select'
  | 'submit'
  | 'toggle'
  | 'change'
  | 'focus'
  | 'blur';

/**
 * Event-specific payload containing interaction details
 */
export interface InteractionData {
  /** Human-readable label (button text, item text) */
  label?: string;
  /** The value associated with the interaction */
  value?: unknown;
  /** Previous value (for toggle/change events) */
  previousValue?: unknown;
  /** Index in list (for select events) */
  index?: number;
}

/**
 * Represents a single user interaction with a TUI element
 */
export interface InteractionEvent {
  /** Unique event identifier (format: evt-{timestamp}-{random}) */
  id: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Widget ID from the TUI layout */
  elementId: string;
  /** Type of widget interacted with */
  elementType: InteractionElementType;
  /** Type of interaction performed */
  eventType: InteractionEventType;
  /** Event-specific data */
  data: InteractionData;
}

/**
 * Rolling window buffer of recent interactions
 */
export interface InteractionHistoryState {
  /** Array of events, max size defined by maxSize */
  events: InteractionEvent[];
  /** Maximum events to retain (default: 50) */
  maxSize: number;
}

/**
 * The context payload sent with chat messages
 */
export interface InteractionContext {
  /** Recent events to include in AI context */
  events: InteractionEvent[];
  /** Current TUI layout ID (if any) */
  layoutId?: string;
  /** Brief description of current TUI */
  layoutSummary?: string;
}

/**
 * Widget interaction event emitted by widgets
 */
export interface WidgetInteractionEvent {
  /** Current layout ID */
  layoutId: string;
  /** Widget that was interacted with */
  widgetId: string;
  /** Widget type (button, list, input, etc.) */
  widgetType: string;
  /** Event type (click, select, submit, toggle) */
  eventType: string;
  /** Event-specific data */
  data: InteractionData;
  /** Timestamp of the interaction */
  timestamp: number;
}
