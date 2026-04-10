/**
 * Interaction Capture for TUI Interaction Flow
 *
 * Captures user interactions with TUI widgets and stores them in history.
 */

import type {
  InteractionEvent,
  InteractionElementType,
  InteractionEventType,
  WidgetInteractionEvent,
} from '../types/index.js';
import { getEventBus } from '../events/index.js';
import { Debouncer } from './debounce.js';
import { InteractionHistory } from './history.js';

/** Debug logging - enabled with DEBUG=moltui:interaction */
const DEBUG = process.env.DEBUG?.includes('moltui:interaction') ?? false;
function debug(message: string, ...args: unknown[]): void {
  if (DEBUG) {
    process.stderr.write(`[moltui:interaction] ${message}\n`);
    if (args.length > 0) {
      process.stderr.write(`  ${JSON.stringify(args)}\n`);
    }
  }
}

/**
 * Configuration for InteractionCapture
 */
export interface InteractionCaptureConfig {
  /** Debounce threshold in milliseconds (default: 300) */
  debounceMs?: number;
  /** Maximum history size (default: 50) */
  historySize?: number;
}

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `evt-${timestamp}-${random}`;
}

/**
 * InteractionCapture - Captures and normalizes widget interactions
 */
export class InteractionCapture {
  private debouncer: Debouncer;
  private history: InteractionHistory;
  private eventBus = getEventBus();
  private isListening = false;

  constructor(config: InteractionCaptureConfig = {}) {
    this.debouncer = new Debouncer({ thresholdMs: config.debounceMs ?? 300 });
    this.history = new InteractionHistory({ maxSize: config.historySize ?? 50 });
  }

  /**
   * Start listening for widget interactions
   */
  start(): void {
    if (this.isListening) return;

    this.eventBus.on('widget:interaction', this.handleWidgetInteraction.bind(this));
    this.isListening = true;
  }

  /**
   * Stop listening for widget interactions
   */
  stop(): void {
    if (!this.isListening) return;

    this.eventBus.off('widget:interaction', this.handleWidgetInteraction.bind(this));
    this.isListening = false;
  }

  /**
   * Handle a widget interaction event
   */
  private handleWidgetInteraction(event: WidgetInteractionEvent): void {
    debug(`Received widget:interaction: ${event.widgetId} ${event.eventType}`);

    // Apply debouncing
    if (!this.debouncer.shouldProcess(event.widgetId, event.eventType)) {
      debug(`Debounced: ${event.widgetId} ${event.eventType}`);
      return;
    }

    // Normalize to InteractionEvent
    const interactionEvent = this.normalizeEvent(event);
    debug(`Normalized event: ${interactionEvent.id}`, interactionEvent);

    // Add to history
    this.history.add(interactionEvent);
    debug(`History size: ${this.history.size()}`);

    // Emit captured event for debugging/logging
    this.eventBus.emit('interaction:captured', {
      event: interactionEvent,
      historySize: this.history.size(),
      wasDebounced: false,
    });
  }

  /**
   * Normalize a widget interaction event to InteractionEvent format
   */
  private normalizeEvent(event: WidgetInteractionEvent): InteractionEvent {
    return {
      id: generateEventId(),
      timestamp: event.timestamp || Date.now(),
      elementId: event.widgetId,
      elementType: this.normalizeElementType(event.widgetType),
      eventType: this.normalizeEventType(event.eventType),
      data: {
        label: event.data?.label,
        value: event.data?.value,
        previousValue: event.data?.previousValue,
        index: event.data?.index,
      },
    };
  }

  /**
   * Normalize widget type to InteractionElementType
   */
  private normalizeElementType(widgetType: string): InteractionElementType {
    const typeMap: Record<string, InteractionElementType> = {
      button: 'button',
      list: 'list',
      input: 'input',
      textbox: 'input',
      textarea: 'input',
      checkbox: 'checkbox',
      form: 'form',
      table: 'table',
    };
    return typeMap[widgetType.toLowerCase()] || 'button';
  }

  /**
   * Normalize event type to InteractionEventType
   */
  private normalizeEventType(eventType: string): InteractionEventType {
    const typeMap: Record<string, InteractionEventType> = {
      click: 'click',
      select: 'select',
      submit: 'submit',
      toggle: 'toggle',
      change: 'change',
      focus: 'focus',
      blur: 'blur',
    };
    return typeMap[eventType.toLowerCase()] || 'click';
  }

  /**
   * Get the interaction history
   */
  getHistory(): InteractionHistory {
    return this.history;
  }

  /**
   * Get recent interactions
   */
  getRecentInteractions(count?: number): InteractionEvent[] {
    return this.history.getRecent(count);
  }

  /**
   * Clear all captured interactions
   */
  clear(): void {
    this.history.clear();
    this.debouncer.clear();
  }
}

/**
 * Singleton instance
 */
let interactionCaptureInstance: InteractionCapture | null = null;

/**
 * Get the singleton InteractionCapture instance
 */
export function getInteractionCapture(config?: InteractionCaptureConfig): InteractionCapture {
  if (!interactionCaptureInstance) {
    interactionCaptureInstance = new InteractionCapture(config);
  }
  return interactionCaptureInstance;
}
