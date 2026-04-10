/**
 * All supported event types
 */
export type EventType =
  | 'click'
  | 'dblclick'
  | 'mouseover'
  | 'mouseout'
  | 'mousewheel'
  | 'keypress'
  | 'focus'
  | 'blur'
  | 'select'
  | 'change'
  | 'submit'
  | 'cancel'
  | 'resize'
  | 'scroll';

/**
 * Event parameters sent to AI backend
 */
export interface EventParams {
  /** Current session identifier */
  sessionId: string;

  /** Current layout identifier */
  layoutId: string;

  /** Widget that triggered the event */
  widgetId: string;

  /** Type of event */
  eventType: EventType;

  /** Event-specific data */
  data: Record<string, unknown>;

  /** Unix timestamp in milliseconds */
  timestamp: number;
}

/**
 * JSON-RPC style event message sent to AI backend
 */
export interface Event {
  jsonrpc: '2.0';
  method: 'event';
  id?: string;
  params: EventParams;
}

/**
 * Click event data
 */
export interface ClickEventData {
  x: number;
  y: number;
  button: 'left' | 'right' | 'middle';
}

/**
 * Keypress event data
 */
export interface KeypressEventData {
  key: string;
  ctrl: boolean;
  shift: boolean;
  meta: boolean;
  alt: boolean;
}

/**
 * Select event data (for tables, lists)
 */
export interface SelectEventData {
  rowIndex?: number;
  rowId?: string;
  rowData?: Record<string, unknown>;
  selectedItems?: string[];
}

/**
 * Change event data (for forms)
 */
export interface ChangeEventData {
  fieldId: string;
  value: unknown;
  previousValue?: unknown;
}

/**
 * Submit event data (for forms)
 */
export interface SubmitEventData {
  fields: Record<string, unknown>;
}

/**
 * Scroll event data
 */
export interface ScrollEventData {
  scrollTop: number;
  scrollLeft: number;
  direction: 'up' | 'down' | 'left' | 'right';
}

/**
 * Resize event data
 */
export interface ResizeEventData {
  width: number;
  height: number;
}
