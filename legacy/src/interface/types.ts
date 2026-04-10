/**
 * Interface management type definitions
 */

import type { Widgets } from 'blessed';
import type {
  EventCallback,
  EventType,
  InterfaceStatus,
  ElementInfo,
  ElementUpdate,
} from '../specs-types.js';

// Re-export public types
export type {
  EventCallback,
  EventType,
  InterfaceStatus,
  InteractionEvent,
  ElementInfo,
  ElementUpdate,
  ElementStyle,
} from '../specs-types.js';

/**
 * Entry in the element registry
 */
export interface ElementEntry {
  /** The blessed element instance */
  element: Widgets.BlessedElement;

  /** Element type (box, text, list, etc.) */
  type: string;

  /** Assigned element ID */
  id: string;

  /** Registered callbacks by event type */
  callbacks: Map<EventType, Set<EventCallback>>;
}

/**
 * Internal interface state
 */
export interface InterfaceState {
  /** Unique interface identifier */
  id: string;

  /** Reference to the request that created this interface */
  requestId: string;

  /** The blessed screen instance */
  screen: Widgets.Screen;

  /** Element registry */
  elements: Map<string, ElementEntry>;

  /** Current lifecycle status */
  status: InterfaceStatus;

  /** Creation timestamp */
  createdAt: number;
}

/**
 * Result of element lookup
 */
export interface ElementLookupResult {
  found: boolean;
  entry?: ElementEntry;
  error?: string;
}

/**
 * Options for creating a new interface
 */
export interface CreateInterfaceOptions {
  /** Request ID for tracking */
  requestId: string;

  /** Terminal width */
  width?: number;

  /** Terminal height */
  height?: number;
}
