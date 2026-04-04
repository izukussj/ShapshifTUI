/**
 * Event callback system for interface interactions
 */

import type { EventType, EventCallback, InteractionEvent } from '../specs-types.js';

/**
 * Event emitter for interface events
 */
export class InterfaceEventEmitter {
  private listeners: Map<string, Map<EventType, Set<EventCallback>>> = new Map();

  /**
   * Register a callback for element events
   */
  on(elementId: string, eventType: EventType, callback: EventCallback): void {
    let elementListeners = this.listeners.get(elementId);
    if (!elementListeners) {
      elementListeners = new Map();
      this.listeners.set(elementId, elementListeners);
    }

    let callbacks = elementListeners.get(eventType);
    if (!callbacks) {
      callbacks = new Set();
      elementListeners.set(eventType, callbacks);
    }

    callbacks.add(callback);
  }

  /**
   * Unregister a callback
   */
  off(elementId: string, eventType: EventType, callback?: EventCallback): void {
    const elementListeners = this.listeners.get(elementId);
    if (!elementListeners) return;

    const callbacks = elementListeners.get(eventType);
    if (!callbacks) return;

    if (callback) {
      callbacks.delete(callback);
    } else {
      callbacks.clear();
    }

    // Cleanup empty maps
    if (callbacks.size === 0) {
      elementListeners.delete(eventType);
    }
    if (elementListeners.size === 0) {
      this.listeners.delete(elementId);
    }
  }

  /**
   * Emit an event to all registered callbacks
   */
  emit(event: InteractionEvent): void {
    const elementListeners = this.listeners.get(event.elementId);
    if (!elementListeners) return;

    const callbacks = elementListeners.get(event.eventType);
    if (!callbacks) return;

    for (const callback of callbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error(`Event callback error for ${event.elementId}:${event.eventType}:`, error);
      }
    }
  }

  /**
   * Check if there are any listeners for an element/event
   */
  hasListeners(elementId: string, eventType?: EventType): boolean {
    const elementListeners = this.listeners.get(elementId);
    if (!elementListeners) return false;

    if (eventType) {
      const callbacks = elementListeners.get(eventType);
      return callbacks !== undefined && callbacks.size > 0;
    }

    return elementListeners.size > 0;
  }

  /**
   * Get all registered event types for an element
   */
  getEventTypes(elementId: string): EventType[] {
    const elementListeners = this.listeners.get(elementId);
    if (!elementListeners) return [];

    return Array.from(elementListeners.keys()).filter(
      eventType => (elementListeners.get(eventType)?.size ?? 0) > 0
    );
  }

  /**
   * Clear all listeners for an element
   */
  clearElement(elementId: string): void {
    this.listeners.delete(elementId);
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear();
  }
}

/**
 * Create an interaction event
 */
export function createInteractionEvent(
  interfaceId: string,
  elementId: string,
  eventType: EventType,
  data: Record<string, unknown> = {}
): InteractionEvent {
  return {
    interfaceId,
    elementId,
    eventType,
    data,
    timestamp: Date.now(),
  };
}

/**
 * Type guard for event types
 */
export function isValidEventType(type: string): type is EventType {
  return ['click', 'submit', 'change', 'focus', 'blur', 'keypress', 'select'].includes(type);
}
