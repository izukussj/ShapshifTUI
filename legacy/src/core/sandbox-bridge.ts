/**
 * Blessed API bridge for sandbox execution
 *
 * This module provides the blessed library access within the sandbox
 * while maintaining element tracking for events and updates.
 */

import blessed, { Widgets } from 'blessed';
import { v4 as uuidv4 } from 'uuid';
import type { ElementEntry } from '../interface/types.js';

/**
 * Element registry for tracking created elements
 */
export class ElementRegistry {
  private elements: Map<string, ElementEntry> = new Map();
  private screen: Widgets.Screen | null = null;

  /**
   * Set the screen reference
   */
  setScreen(screen: Widgets.Screen): void {
    this.screen = screen;
  }

  /**
   * Get the screen reference
   */
  getScreen(): Widgets.Screen | null {
    return this.screen;
  }

  /**
   * Register a new element
   */
  register(element: Widgets.BlessedElement, type: string): string {
    const id = uuidv4();
    this.elements.set(id, {
      element,
      type,
      id,
      callbacks: new Map(),
    });
    return id;
  }

  /**
   * Get element by ID
   */
  get(id: string): ElementEntry | undefined {
    return this.elements.get(id);
  }

  /**
   * Get all element entries
   */
  getAll(): Map<string, ElementEntry> {
    return new Map(this.elements);
  }

  /**
   * Get all element IDs
   */
  getIds(): string[] {
    return Array.from(this.elements.keys());
  }

  /**
   * Clear all elements
   */
  clear(): void {
    this.elements.clear();
    this.screen = null;
  }
}

/**
 * Create a wrapped blessed API that tracks elements
 */
export function createTrackedBlessed(registry: ElementRegistry): typeof blessed {
  // Create wrapper functions for each widget type
  const wrapWidget = <T extends Widgets.BlessedElement>(
    creator: (opts: Record<string, unknown>) => T,
    typeName: string
  ) => {
    return (opts: Record<string, unknown> = {}): T => {
      const element = creator(opts);
      const id = registry.register(element, typeName);

      // Attach ID to element for later reference
      (element as Record<string, unknown>).__moltui_id = id;

      return element;
    };
  };

  // Wrap screen creation
  const screenWrapper = (opts: Record<string, unknown> = {}): Widgets.Screen => {
    const screen = blessed.screen(opts as Widgets.IScreenOptions);
    registry.setScreen(screen);
    return screen;
  };

  // Create the wrapped blessed object
  return {
    ...blessed,
    screen: screenWrapper,
    box: wrapWidget((opts) => blessed.box(opts as Widgets.BoxOptions), 'box'),
    text: wrapWidget((opts) => blessed.text(opts as Widgets.TextOptions), 'text'),
    list: wrapWidget((opts) => blessed.list(opts as Widgets.ListOptions<Widgets.ListElementStyle>), 'list'),
    table: wrapWidget((opts) => blessed.table(opts as Widgets.TableOptions), 'table'),
    form: wrapWidget((opts) => blessed.form(opts as Widgets.FormOptions), 'form'),
    input: wrapWidget((opts) => blessed.textbox(opts as Widgets.TextboxOptions), 'input'),
    button: wrapWidget((opts) => blessed.button(opts as Widgets.ButtonOptions), 'button'),
    textarea: wrapWidget((opts) => blessed.textarea(opts as Widgets.TextareaOptions), 'textarea'),
    checkbox: wrapWidget((opts) => blessed.checkbox(opts as Widgets.CheckboxOptions), 'checkbox'),
    radioset: wrapWidget((opts) => blessed.radioset(opts as Widgets.RadioSetOptions), 'radioset'),
    progressbar: wrapWidget((opts) => blessed.progressbar(opts as Widgets.ProgressBarOptions), 'progressbar'),
  } as typeof blessed;
}

/**
 * Execute blessed code and capture the created elements
 */
export function executeBlessedCode(
  code: string,
  registry: ElementRegistry
): { screen: Widgets.Screen | null; error?: string } {
  try {
    // Create the tracked blessed instance
    const trackedBlessed = createTrackedBlessed(registry);

    // Create a function that executes the code with tracked blessed
    const executeCode = new Function(
      'blessed',
      'require',
      'process',
      code
    );

    // Provide a require that returns our tracked blessed
    const mockRequire = (module: string) => {
      if (module === 'blessed') {
        return trackedBlessed;
      }
      throw new Error(`require("${module}") is not allowed`);
    };

    // Provide a mock process
    const mockProcess = {
      exit: () => {
        // No-op
      },
      stdout: process.stdout,
      stdin: process.stdin,
    };

    // Execute the code
    executeCode(trackedBlessed, mockRequire, mockProcess);

    return {
      screen: registry.getScreen(),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      screen: null,
      error: `Code execution failed: ${message}`,
    };
  }
}
