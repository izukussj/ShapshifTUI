/**
 * Debouncer for TUI Interaction Events
 *
 * Implements per-element debouncing to prevent flooding the context
 * with rapid repeated interactions.
 */

import { getEventBus } from '../events/index.js';

/**
 * Configuration for the Debouncer
 */
export interface DebouncerConfig {
  /** Debounce threshold in milliseconds (default: 300) */
  thresholdMs?: number;
}

/**
 * Debouncer - Filters rapid repeated interactions on the same element
 */
export class Debouncer {
  private lastInteractions: Map<string, number> = new Map();
  private thresholdMs: number;
  private eventBus = getEventBus();

  constructor(config: DebouncerConfig = {}) {
    this.thresholdMs = config.thresholdMs ?? 300;
  }

  /**
   * Check if an interaction should be processed
   * Returns true if the interaction should proceed, false if it should be filtered
   *
   * @param elementId - The widget ID that was interacted with
   * @param eventType - The type of interaction event
   * @returns boolean - true if interaction should be processed
   */
  shouldProcess(elementId: string, eventType: string): boolean {
    const key = `${elementId}:${eventType}`;
    const now = Date.now();
    const lastTime = this.lastInteractions.get(key);

    if (lastTime !== undefined) {
      const timeSinceLastMs = now - lastTime;

      if (timeSinceLastMs < this.thresholdMs) {
        // Emit debounced event for debugging
        this.eventBus.emit('interaction:debounced', {
          widgetId: elementId,
          eventType,
          timeSinceLastMs,
        });
        return false;
      }
    }

    // Update last interaction time
    this.lastInteractions.set(key, now);
    return true;
  }

  /**
   * Clear all tracked interactions
   */
  clear(): void {
    this.lastInteractions.clear();
  }

  /**
   * Get the current debounce threshold
   */
  getThreshold(): number {
    return this.thresholdMs;
  }

  /**
   * Set a new debounce threshold
   */
  setThreshold(thresholdMs: number): void {
    this.thresholdMs = thresholdMs;
  }
}
