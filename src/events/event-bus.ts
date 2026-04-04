import { EventEmitter } from 'events';
import type {
  EventType,
  EventParams,
  LayoutDefinition,
  Message,
  SessionState,
  InteractionEvent,
  WidgetInteractionEvent,
} from '../types/index.js';

/**
 * Application-wide event types
 */
export interface AppEvents {
  // Connection events
  'connection:state': (state: SessionState) => void;
  'connection:error': (error: Error) => void;

  // Layout events
  'layout:received': (layout: LayoutDefinition) => void;
  'layout:applied': (layoutId: string) => void;
  'layout:queued': (layout: LayoutDefinition) => void;
  'layout:error': (error: Error) => void;

  // Widget events
  'widget:event': (params: EventParams) => void;
  'widget:focus': (widgetId: string) => void;
  'widget:blur': (widgetId: string) => void;

  // Chat events
  'chat:message': (message: Message) => void;
  'chat:history': (messages: Message[]) => void;
  'chat:send': (content: string) => void;
  'chat:submit': () => void;
  'chat:layout': (layout: LayoutDefinition) => void;

  // User interaction
  'user:interacting': (isInteracting: boolean) => void;
  'user:submit': () => void;

  // Terminal events
  'terminal:resize': (width: number, height: number) => void;
  'terminal:key': (key: string, ctrl: boolean, meta: boolean, shift: boolean) => void;

  // TUI render events
  'tui:render:success': (params: { layoutId: string; widgetCount: number; renderTimeMs: number }) => void;
  'tui:render:error': (params: { layoutId: string; error: string; preservedLayoutId: string | null }) => void;

  // Interaction events
  'widget:interaction': (event: WidgetInteractionEvent) => void;
  'interaction:captured': (params: { event: InteractionEvent; historySize: number; wasDebounced: boolean }) => void;
  'interaction:debounced': (params: { widgetId: string; eventType: string; timeSinceLastMs: number }) => void;
}

/**
 * Debounce function for rate-limiting events
 */
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Throttle function for rate-limiting events
 */
function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = ms - (now - lastCall);
    if (remaining <= 0) {
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, remaining);
    }
  };
}

/**
 * Application event bus - central hub for all events
 */
export class EventBus extends EventEmitter {
  private static instance: EventBus | null = null;

  private constructor() {
    super();
    this.setMaxListeners(100); // Allow many listeners for widget events
  }

  /**
   * Get the singleton event bus instance
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Subscribe to an event with optional debounce
   */
  onDebounced<K extends keyof AppEvents>(
    event: K,
    listener: AppEvents[K],
    ms: number
  ): this {
    return this.on(event, debounce(listener as (...args: unknown[]) => void, ms) as AppEvents[K]);
  }

  /**
   * Subscribe to an event with optional throttle
   */
  onThrottled<K extends keyof AppEvents>(
    event: K,
    listener: AppEvents[K],
    ms: number
  ): this {
    return this.on(event, throttle(listener as (...args: unknown[]) => void, ms) as AppEvents[K]);
  }

  /**
   * Reset the event bus (mainly for testing)
   */
  reset(): void {
    this.removeAllListeners();
  }
}

// Type augmentation for EventEmitter
export interface EventBus {
  on<K extends keyof AppEvents>(event: K, listener: AppEvents[K]): this;
  once<K extends keyof AppEvents>(event: K, listener: AppEvents[K]): this;
  off<K extends keyof AppEvents>(event: K, listener: AppEvents[K]): this;
  emit<K extends keyof AppEvents>(event: K, ...args: Parameters<AppEvents[K]>): boolean;
}

/**
 * Get the global event bus instance
 */
export function getEventBus(): EventBus {
  return EventBus.getInstance();
}
