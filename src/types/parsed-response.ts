/**
 * Parsed Response Types for Message Parsing
 *
 * Types for parsing AI responses to separate conversational text from TUI layouts.
 */

import type { LayoutDefinition } from './layout.js';

/**
 * Result of parsing an AI response to separate text from layout
 */
export interface ParsedResponse {
  /** Conversational text (code blocks removed) */
  text: string;
  /** Extracted TUI layout definition, if any */
  layout: LayoutDefinition | null;
  /** Whether a layout was found */
  hasLayout: boolean;
}
