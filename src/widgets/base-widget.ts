import blessed from 'blessed';
import type {
  Widget as WidgetDef,
  WidgetType,
  LayoutProps,
  StyleProps,
  EventHandler,
} from '../types/index.js';
import { getThemeManager } from '../theme/index.js';
import { getEventBus } from '../events/index.js';

/**
 * Widget render context
 */
export interface RenderContext {
  parent: blessed.Widgets.Node;
  screen: blessed.Widgets.Screen;
  layoutId: string;
  sessionId: string;
}

/**
 * Base widget class that all widgets extend
 */
export abstract class BaseWidget {
  protected definition: WidgetDef;
  protected element: blessed.Widgets.BlessedElement | null = null;
  protected children: BaseWidget[] = [];
  protected eventBus = getEventBus();
  protected themeManager = getThemeManager();

  constructor(definition: WidgetDef) {
    this.definition = definition;
  }

  /**
   * Get the widget ID
   */
  getId(): string {
    return this.definition.id;
  }

  /**
   * Get the widget type
   */
  getType(): WidgetType {
    return this.definition.type;
  }

  /**
   * Get the underlying blessed element
   */
  getElement(): blessed.Widgets.BlessedElement | null {
    return this.element;
  }

  /**
   * Render the widget
   */
  abstract render(context: RenderContext): blessed.Widgets.BlessedElement;

  /**
   * Update the widget with new definition
   */
  update(definition: WidgetDef): void {
    this.definition = definition;
    // Subclasses should override to handle specific updates
  }

  /**
   * Destroy the widget and clean up
   */
  destroy(): void {
    for (const child of this.children) {
      child.destroy();
    }
    this.children = [];

    if (this.element) {
      this.element.destroy();
      this.element = null;
    }
  }

  /**
   * Focus this widget
   */
  focus(): void {
    if (this.element && 'focus' in this.element) {
      (this.element as blessed.Widgets.BlessedElement).focus();
    }
  }

  /**
   * Convert layout props to blessed options
   */
  protected getLayoutOptions(layout?: LayoutProps): Record<string, unknown> {
    if (!layout) return {};

    const options: Record<string, unknown> = {};

    // Position
    if (layout.position === 'absolute') {
      if (layout.top !== undefined) options.top = layout.top;
      if (layout.left !== undefined) options.left = layout.left;
      if (layout.right !== undefined) options.right = layout.right;
      if (layout.bottom !== undefined) options.bottom = layout.bottom;
    }

    // Size
    if (layout.width !== undefined) options.width = layout.width;
    if (layout.height !== undefined) options.height = layout.height;

    // Padding
    if (layout.padding !== undefined) {
      if (typeof layout.padding === 'number') {
        options.padding = layout.padding;
      } else if (Array.isArray(layout.padding)) {
        options.padding = {
          top: layout.padding[0],
          right: layout.padding[1] ?? layout.padding[0],
          bottom: layout.padding[2] ?? layout.padding[0],
          left: layout.padding[3] ?? layout.padding[1] ?? layout.padding[0],
        };
      }
    }

    return options;
  }

  /**
   * Convert style props to blessed options
   */
  protected getStyleOptions(style?: StyleProps): Record<string, unknown> {
    return this.themeManager.resolveStyle(style);
  }

  /**
   * Attach event handlers to the element
   */
  protected attachEventHandlers(
    element: blessed.Widgets.BlessedElement,
    handlers: EventHandler[] | undefined,
    context: RenderContext
  ): void {
    if (!handlers) return;

    for (const handler of handlers) {
      const eventName = this.mapEventName(handler.on);
      if (!eventName) continue;

      let listener = (...args: unknown[]) => {
        this.handleWidgetEvent(handler, context, args);
      };

      // Apply debounce/throttle
      if (handler.debounce) {
        listener = this.debounce(listener, handler.debounce);
      } else if (handler.throttle) {
        listener = this.throttle(listener, handler.throttle);
      }

      element.on(eventName, listener);
    }
  }

  /**
   * Map widget event type to blessed event name
   */
  private mapEventName(eventType: string): string | null {
    const mapping: Record<string, string> = {
      click: 'click',
      dblclick: 'dblclick',
      mouseover: 'mouseover',
      mouseout: 'mouseout',
      mousewheel: 'wheeldown',
      keypress: 'keypress',
      focus: 'focus',
      blur: 'blur',
      select: 'select',
      change: 'change',
      submit: 'submit',
      cancel: 'cancel',
    };
    return mapping[eventType] || null;
  }

  /**
   * Handle a widget event
   */
  private handleWidgetEvent(
    handler: EventHandler,
    context: RenderContext,
    args: unknown[]
  ): void {
    const action = handler.action;

    // Check condition if present
    if (action.condition) {
      // Simple condition evaluation (expand as needed)
      // For now, just skip if condition is truthy string
    }

    switch (action.type) {
      case 'emit':
        // Emit event to backend
        this.eventBus.emit('widget:event', {
          sessionId: context.sessionId,
          layoutId: context.layoutId,
          widgetId: this.definition.id,
          eventType: handler.on,
          data: action.data || {},
          timestamp: Date.now(),
        });
        break;

      case 'update':
        // Local state update (handled by specific widgets)
        break;

      case 'navigate':
        // Navigation (if applicable)
        break;

      case 'execute':
        // Execute command
        break;
    }
  }

  /**
   * Debounce helper
   */
  private debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    ms: number
  ): T {
    let timeoutId: NodeJS.Timeout | null = null;
    return ((...args: unknown[]) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), ms);
    }) as T;
  }

  /**
   * Throttle helper
   */
  private throttle<T extends (...args: unknown[]) => void>(
    fn: T,
    ms: number
  ): T {
    let lastCall = 0;
    return ((...args: unknown[]) => {
      const now = Date.now();
      if (now - lastCall >= ms) {
        lastCall = now;
        fn(...args);
      }
    }) as T;
  }
}
