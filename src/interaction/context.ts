/**
 * Interaction Context Builder for TUI Interaction Flow
 *
 * Builds the context payload sent with chat messages to inform the AI
 * about recent user interactions with the TUI.
 */

import type { InteractionContext, InteractionEvent } from '../types/index.js';
import type { InteractionHistory } from './history.js';

/**
 * Configuration for InteractionContextBuilder
 */
export interface InteractionContextBuilderConfig {
  /** Maximum events to include in context (default: 50) */
  maxEvents?: number;
}

/**
 * InteractionContextBuilder - Builds context for AI messages
 */
export class InteractionContextBuilder {
  private maxEvents: number;

  constructor(config: InteractionContextBuilderConfig = {}) {
    this.maxEvents = config.maxEvents ?? 50;
  }

  /**
   * Build an InteractionContext from the history
   *
   * @param history - The interaction history to build context from
   * @param layoutId - Optional current layout ID
   * @param layoutSummary - Optional brief description of current TUI
   * @returns InteractionContext to send with chat message
   */
  build(
    history: InteractionHistory,
    layoutId?: string,
    layoutSummary?: string
  ): InteractionContext {
    // Get recent events (limited by maxEvents)
    const events = history.getRecent(this.maxEvents);

    return {
      events,
      layoutId,
      layoutSummary,
    };
  }

  /**
   * Build context from raw events array
   *
   * @param events - Array of interaction events
   * @param layoutId - Optional current layout ID
   * @param layoutSummary - Optional brief description of current TUI
   * @returns InteractionContext to send with chat message
   */
  buildFromEvents(
    events: InteractionEvent[],
    layoutId?: string,
    layoutSummary?: string
  ): InteractionContext {
    // Limit to maxEvents
    const limitedEvents = events.slice(-this.maxEvents);

    return {
      events: limitedEvents,
      layoutId,
      layoutSummary,
    };
  }

  /**
   * Generate a brief summary of the current layout
   * Can be expanded to provide more detailed descriptions
   *
   * @param layoutId - The layout ID
   * @param widgetCount - Number of widgets in the layout
   * @returns A brief description of the layout
   */
  generateLayoutSummary(layoutId: string, widgetCount?: number): string {
    if (widgetCount !== undefined) {
      return `Layout ${layoutId} with ${widgetCount} widget${widgetCount === 1 ? '' : 's'}`;
    }
    return `Layout ${layoutId}`;
  }

  /**
   * Format context as a human-readable summary for debugging
   *
   * @param context - The interaction context to format
   * @returns Human-readable string
   */
  formatForDebug(context: InteractionContext): string {
    const lines: string[] = [];

    if (context.layoutId) {
      lines.push(`Layout: ${context.layoutId}`);
    }

    if (context.layoutSummary) {
      lines.push(`Summary: ${context.layoutSummary}`);
    }

    if (context.events.length > 0) {
      lines.push(`Recent interactions (${context.events.length}):`);
      for (const event of context.events) {
        const label = event.data.label ? ` "${event.data.label}"` : '';
        lines.push(`  - ${event.eventType} on ${event.elementType}${label}`);
      }
    } else {
      lines.push('No recent interactions');
    }

    return lines.join('\n');
  }
}

/**
 * Singleton instance
 */
let contextBuilderInstance: InteractionContextBuilder | null = null;

/**
 * Get the singleton InteractionContextBuilder instance
 */
export function getInteractionContextBuilder(
  config?: InteractionContextBuilderConfig
): InteractionContextBuilder {
  if (!contextBuilderInstance) {
    contextBuilderInstance = new InteractionContextBuilder(config);
  }
  return contextBuilderInstance;
}
