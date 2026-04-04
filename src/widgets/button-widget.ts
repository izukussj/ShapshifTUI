import blessed from 'blessed';
import type { Widget as WidgetDef } from '../types/index.js';
import { BaseWidget, type RenderContext } from './base-widget.js';

/**
 * Button widget props
 */
interface ButtonProps {
  label?: string;
  disabled?: boolean;
  align?: 'left' | 'center' | 'right';
}

/**
 * Button widget - clickable button element
 */
export class ButtonWidget extends BaseWidget {
  render(context: RenderContext): blessed.Widgets.BlessedElement {
    const props = this.definition.props as ButtonProps | undefined;
    const layout = this.definition.layout;
    const style = this.definition.style;

    const styleOptions = this.getStyleOptions(style);

    this.element = blessed.button({
      parent: context.parent,
      content: props?.label || '',
      align: props?.align || 'center',
      mouse: true,
      keys: true,
      shrink: true,
      ...this.getLayoutOptions(layout),
      style: {
        fg: styleOptions.fg as string || 'white',
        bg: styleOptions.bg as string || 'blue',
        focus: {
          fg: 'white',
          bg: 'cyan',
          ...(styleOptions.focus as Record<string, unknown> || {}),
        },
        hover: {
          fg: 'white',
          bg: 'cyan',
          ...(styleOptions.hover as Record<string, unknown> || {}),
        },
      },
      border: styleOptions.border ? {
        type: 'line',
        ...(styleOptions.border as Record<string, unknown>),
      } : undefined,
      padding: {
        left: 1,
        right: 1,
      },
    });

    // Handle disabled state
    if (props?.disabled) {
      this.element.style.fg = 'gray';
      this.element.style.bg = 'black';
    }

    this.attachEventHandlers(this.element, this.definition.events, context);

    return this.element;
  }

  update(definition: WidgetDef): void {
    super.update(definition);

    if (this.element) {
      const props = definition.props as ButtonProps | undefined;
      this.element.setContent(props?.label || '');
    }
  }
}
