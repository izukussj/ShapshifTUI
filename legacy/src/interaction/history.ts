/**
 * Interaction History for TUI Interaction Flow
 *
 * Manages a rolling window buffer of recent user interactions.
 */

import type { InteractionEvent } from '../types/index.js';

/**
 * Configuration for InteractionHistory
 */
export interface InteractionHistoryConfig {
  /** Maximum number of events to retain (default: 50) */
  maxSize?: number;
}

/**
 * InteractionHistory - Rolling window buffer of recent interactions
 */
export class InteractionHistory {
  private events: InteractionEvent[] = [];
  private maxSize: number;

  constructor(config: InteractionHistoryConfig = {}) {
    this.maxSize = config.maxSize ?? 50;
  }

  /**
   * Add an interaction event to the history
   * Implements FIFO eviction when at capacity
   *
   * @param event - The interaction event to add
   */
  add(event: InteractionEvent): void {
    // Add the new event
    this.events.push(event);

    // Evict oldest events if over capacity (FIFO)
    while (this.events.length > this.maxSize) {
      this.events.shift();
    }

    // Keep events sorted by timestamp (ascending)
    this.events.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get recent events from the history
   *
   * @param count - Optional limit on number of events to return (defaults to all)
   * @returns Array of recent interaction events
   */
  getRecent(count?: number): InteractionEvent[] {
    if (count === undefined || count >= this.events.length) {
      return [...this.events];
    }

    // Return the most recent events
    return this.events.slice(-count);
  }

  /**
   * Get all events in the history
   */
  getAll(): InteractionEvent[] {
    return [...this.events];
  }

  /**
   * Clear all events from the history
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Get the current number of events in history
   */
  size(): number {
    return this.events.length;
  }

  /**
   * Get the maximum history size
   */
  getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Check if history is at capacity
   */
  isFull(): boolean {
    return this.events.length >= this.maxSize;
  }

  /**
   * Get the most recent event, if any
   */
  getLatest(): InteractionEvent | undefined {
    return this.events.length > 0 ? this.events[this.events.length - 1] : undefined;
  }
}
