/**
 * Interface manager - lifecycle management for rendered interfaces
 */

import { v4 as uuidv4 } from 'uuid';
import type { Widgets } from 'blessed';
import type {
  RenderedInterface,
  InterfaceStatus,
  EventType,
  EventCallback,
  ElementUpdate,
  ElementInfo,
} from '../specs-types.js';
import type { ElementEntry, InterfaceState, CreateInterfaceOptions } from './types.js';
import { ElementRegistry } from '../core/sandbox-bridge.js';

/**
 * Create a rendered interface from executed code
 */
export function createInterface(
  registry: ElementRegistry,
  options: CreateInterfaceOptions
): RenderedInterface {
  const id = uuidv4();
  const screen = registry.getScreen();

  if (!screen) {
    throw new Error('No screen found in registry');
  }

  const state: InterfaceState = {
    id,
    requestId: options.requestId,
    screen,
    elements: registry.getAll(),
    status: 'initializing',
    createdAt: Date.now(),
  };

  // Create the interface object
  const interfaceObj: RenderedInterface = {
    get id() {
      return state.id;
    },

    get status() {
      return state.status;
    },

    on(elementId: string, eventType: EventType, callback: EventCallback): void {
      const entry = state.elements.get(elementId);
      if (!entry) {
        console.warn(`Element ${elementId} not found`);
        return;
      }

      // Get or create callback set for this event type
      let callbacks = entry.callbacks.get(eventType);
      if (!callbacks) {
        callbacks = new Set();
        entry.callbacks.set(eventType, callbacks);
      }
      callbacks.add(callback);

      // Map event type to blessed event name
      const blessedEvent = mapEventType(eventType);

      // Add listener to blessed element
      entry.element.on(blessedEvent, (...args: unknown[]) => {
        const event = {
          interfaceId: state.id,
          elementId,
          eventType,
          data: extractEventData(eventType, args),
          timestamp: Date.now(),
        };
        callback(event);
      });
    },

    off(elementId: string, eventType: EventType, callback?: EventCallback): void {
      const entry = state.elements.get(elementId);
      if (!entry) return;

      const callbacks = entry.callbacks.get(eventType);
      if (!callbacks) return;

      if (callback) {
        callbacks.delete(callback);
      } else {
        callbacks.clear();
      }

      // Note: Blessed doesn't easily support removing specific listeners
      // For full cleanup, we'd need to track the wrapped listeners
    },

    update(elementId: string, properties: ElementUpdate): void {
      const entry = state.elements.get(elementId);
      if (!entry) {
        console.warn(`Element ${elementId} not found`);
        return;
      }

      const prevStatus = state.status;
      state.status = 'updating';

      try {
        applyUpdate(entry.element, properties);
        state.screen.render();
      } finally {
        state.status = prevStatus === 'destroyed' ? 'destroyed' : 'active';
      }
    },

    getElementIds(): string[] {
      return Array.from(state.elements.keys());
    },

    getElement(elementId: string): ElementInfo | undefined {
      const entry = state.elements.get(elementId);
      if (!entry) return undefined;

      return {
        id: elementId,
        type: entry.type,
        content: getElementContent(entry.element),
        focusable: isFocusable(entry.element),
      };
    },

    destroy(): void {
      if (state.status === 'destroyed') return;

      state.status = 'destroyed';

      // Clear all callbacks
      for (const entry of state.elements.values()) {
        entry.callbacks.clear();
      }

      // Destroy the screen
      try {
        state.screen.destroy();
      } catch {
        // Ignore errors during cleanup
      }

      state.elements.clear();
    },
  };

  // Mark as active
  state.status = 'active';

  return interfaceObj;
}

/**
 * Map EventType to blessed event name
 */
function mapEventType(eventType: EventType): string {
  switch (eventType) {
    case 'click':
      return 'click';
    case 'submit':
      return 'submit';
    case 'change':
      return 'action';
    case 'focus':
      return 'focus';
    case 'blur':
      return 'blur';
    case 'keypress':
      return 'keypress';
    case 'select':
      return 'select';
    default:
      return eventType;
  }
}

/**
 * Extract event data from blessed event arguments
 */
function extractEventData(eventType: EventType, args: unknown[]): Record<string, unknown> {
  switch (eventType) {
    case 'select':
      return { selected: args[0], index: args[1] };
    case 'change':
      return { value: args[0] };
    case 'keypress':
      return { key: args[0], ch: args[1] };
    default:
      return {};
  }
}

/**
 * Apply update to element
 */
function applyUpdate(element: Widgets.BlessedElement, properties: ElementUpdate): void {
  if (properties.content !== undefined) {
    if ('setContent' in element && typeof element.setContent === 'function') {
      element.setContent(properties.content);
    }
  }

  if (properties.hidden !== undefined) {
    if (properties.hidden) {
      element.hide();
    } else {
      element.show();
    }
  }

  if (properties.focus) {
    element.focus();
  }

  if (properties.style) {
    // Apply style updates
    if (element.style) {
      Object.assign(element.style, properties.style);
    }
  }
}

/**
 * Get element content if available
 */
function getElementContent(element: Widgets.BlessedElement): string | undefined {
  if ('getContent' in element && typeof element.getContent === 'function') {
    return element.getContent();
  }
  if ('content' in element && typeof element.content === 'string') {
    return element.content;
  }
  return undefined;
}

/**
 * Check if element is focusable
 */
function isFocusable(element: Widgets.BlessedElement): boolean {
  const options = element.options as Record<string, unknown>;
  return options?.focusable === true ||
    options?.inputOnFocus === true ||
    options?.keyable === true;
}
