/**
 * Programmatic update API for interface elements
 */

import type { Widgets } from 'blessed';
import type { ElementUpdate, ElementStyle } from '../specs-types.js';
import type { ElementEntry } from './types.js';

/**
 * Apply a batch of updates to an element
 */
export function applyElementUpdate(
  entry: ElementEntry,
  update: ElementUpdate,
  screen: Widgets.Screen
): void {
  const { element } = entry;

  // Content update
  if (update.content !== undefined) {
    setElementContent(element, update.content);
  }

  // Style update
  if (update.style) {
    applyStyleUpdate(element, update.style);
  }

  // Visibility update
  if (update.hidden !== undefined) {
    if (update.hidden) {
      element.hide();
    } else {
      element.show();
    }
  }

  // Focus update
  if (update.focus) {
    element.focus();
  }

  // Re-render screen to show changes
  screen.render();
}

/**
 * Set element content based on element type
 */
function setElementContent(element: Widgets.BlessedElement, content: string): void {
  // Use setContent if available (most elements)
  if ('setContent' in element && typeof element.setContent === 'function') {
    element.setContent(content);
    return;
  }

  // For progress bars, parse as number
  if ('setProgress' in element && typeof element.setProgress === 'function') {
    const value = parseFloat(content);
    if (!isNaN(value)) {
      (element as Widgets.ProgressBarElement).setProgress(value);
    }
    return;
  }

  // For lists, handle as items if array-like
  if ('setItems' in element && typeof element.setItems === 'function') {
    try {
      const items = JSON.parse(content);
      if (Array.isArray(items)) {
        (element as unknown as { setItems: (items: string[]) => void }).setItems(items);
        return;
      }
    } catch {
      // Not JSON, treat as single item
    }
  }

  // Fallback: set content property directly
  (element as unknown as Record<string, unknown>).content = content;
}

/**
 * Apply style updates to element
 */
function applyStyleUpdate(element: Widgets.BlessedElement, style: Partial<ElementStyle>): void {
  const elementStyle = element.style as Record<string, unknown>;

  if (style.fg !== undefined) {
    elementStyle.fg = style.fg;
  }

  if (style.bg !== undefined) {
    elementStyle.bg = style.bg;
  }

  if (style.bold !== undefined) {
    elementStyle.bold = style.bold;
  }

  if (style.underline !== undefined) {
    elementStyle.underline = style.underline;
  }

  if (style.border) {
    if (!elementStyle.border) {
      elementStyle.border = {};
    }
    const borderStyle = elementStyle.border as Record<string, unknown>;
    if (style.border.fg !== undefined) {
      borderStyle.fg = style.border.fg;
    }
    if (style.border.bg !== undefined) {
      borderStyle.bg = style.border.bg;
    }
  }
}

/**
 * Batch update multiple elements
 */
export function batchUpdate(
  entries: Map<string, ElementEntry>,
  updates: Map<string, ElementUpdate>,
  screen: Widgets.Screen
): void {
  for (const [elementId, update] of updates) {
    const entry = entries.get(elementId);
    if (entry) {
      // Apply update without re-rendering
      applyElementUpdateWithoutRender(entry, update);
    }
  }

  // Single render call after all updates
  screen.render();
}

/**
 * Apply update without triggering render
 */
function applyElementUpdateWithoutRender(
  entry: ElementEntry,
  update: ElementUpdate
): void {
  const { element } = entry;

  if (update.content !== undefined) {
    setElementContent(element, update.content);
  }

  if (update.style) {
    applyStyleUpdate(element, update.style);
  }

  if (update.hidden !== undefined) {
    if (update.hidden) {
      element.hide();
    } else {
      element.show();
    }
  }

  if (update.focus) {
    element.focus();
  }
}

/**
 * Get current element state
 */
export function getElementState(entry: ElementEntry): {
  content?: string;
  hidden: boolean;
  focused: boolean;
} {
  const { element } = entry;

  let content: string | undefined;
  if ('getContent' in element && typeof element.getContent === 'function') {
    content = element.getContent();
  } else if ('content' in element) {
    content = String((element as unknown as Record<string, unknown>).content);
  }

  return {
    content,
    hidden: element.hidden,
    focused: (element as unknown as { focused?: boolean }).focused ?? false,
  };
}
