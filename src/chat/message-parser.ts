/**
 * Message Parser for TUI Interaction Flow
 *
 * Parses AI responses to separate conversational text from TUI layout code blocks.
 * Only ```moltui fenced code blocks are extracted and stripped from the text.
 */

import type { ParsedResponse } from '../types/index.js';
import type { LayoutDefinition } from '../types/index.js';

/** Debug logging - enabled with DEBUG=moltui:parser */
const DEBUG = process.env.DEBUG?.includes('moltui:parser') ?? false;
function debug(message: string): void {
  if (DEBUG) {
    process.stderr.write(`[moltui:parser] ${message}\n`);
  }
}

/**
 * Regex pattern to match ```moltui code blocks
 * Captures the content inside the fenced block
 */
const MOLTUI_CODE_BLOCK_REGEX = /```moltui\s*([\s\S]*?)```/g;

/**
 * MessageParser - Separates conversational text from TUI layouts in AI responses
 */
export class MessageParser {
  /**
   * Parse an AI response to extract text and layout
   *
   * @param content - The raw AI response content
   * @returns ParsedResponse with separated text and layout
   */
  parse(content: string): ParsedResponse {
    debug(`Parsing content (${content.length} chars)`);

    if (!content || content.trim() === '') {
      debug('Empty content, returning empty result');
      return {
        text: '',
        layout: null,
        hasLayout: false,
      };
    }

    let layout: LayoutDefinition | null = null;
    let hasLayout = false;

    // Find all moltui code blocks
    const matches = content.matchAll(MOLTUI_CODE_BLOCK_REGEX);
    const blocks: string[] = [];

    for (const match of matches) {
      blocks.push(match[0]); // Full match including fences
      debug(`Found moltui block (${match[0].length} chars)`);

      // Try to parse the first valid layout
      if (!layout) {
        const layoutJson = match[1].trim();
        const parsedLayout = this.tryParseLayout(layoutJson);
        if (parsedLayout) {
          layout = parsedLayout;
          hasLayout = true;
          debug(`Parsed layout: ${layout.id}`);
        }
      }
    }

    debug(`Found ${blocks.length} code blocks, hasLayout: ${hasLayout}`);

    // Strip all moltui code blocks from the text
    let text = content;
    for (const block of blocks) {
      text = text.replace(block, '');
    }

    // Clean up the text: trim and normalize whitespace
    text = this.cleanText(text);
    debug(`Extracted text (${text.length} chars): "${text.substring(0, 100)}..."`);

    return {
      text,
      layout,
      hasLayout,
    };
  }

  /**
   * Try to parse JSON as a layout definition
   *
   * @param json - The JSON string to parse
   * @returns LayoutDefinition if valid, null otherwise
   */
  private tryParseLayout(json: string): LayoutDefinition | null {
    try {
      const parsed = JSON.parse(json);

      // Basic validation: must have id and root
      if (parsed && typeof parsed.id === 'string' && parsed.root) {
        return parsed as LayoutDefinition;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Clean up text after removing code blocks
   *
   * @param text - The text to clean
   * @returns Cleaned text
   */
  private cleanText(text: string): string {
    // Replace multiple consecutive newlines with at most two
    text = text.replace(/\n{3,}/g, '\n\n');

    // Trim leading/trailing whitespace
    text = text.trim();

    return text;
  }
}

/**
 * Singleton instance of MessageParser
 */
let messageParserInstance: MessageParser | null = null;

/**
 * Get the singleton MessageParser instance
 */
export function getMessageParser(): MessageParser {
  if (!messageParserInstance) {
    messageParserInstance = new MessageParser();
  }
  return messageParserInstance;
}
