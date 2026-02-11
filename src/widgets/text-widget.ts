import blessed from 'blessed';
import type { Widget as WidgetDef } from '../types/index.js';
import { BaseWidget, type RenderContext } from './base-widget.js';

/**
 * Text widget props
 */
interface TextProps {
  content?: string;
  align?: 'left' | 'center' | 'right';
  wrap?: boolean;
  shrink?: boolean;
}

/**
 * Text widget - displays static or dynamic text content
 */
export class TextWidget extends BaseWidget {
  render(context: RenderContext): blessed.Widgets.BlessedElement {
    const props = this.definition.props as TextProps | undefined;
    const layout = this.definition.layout;
    const style = this.definition.style;

    this.element = blessed.text({
      parent: context.parent,
      content: props?.content || '',
      align: props?.align || 'left',
      wrap: props?.wrap !== false,
      shrink: props?.shrink ?? true,
      ...this.getLayoutOptions(layout),
      ...this.getStyleOptions(style),
      tags: true,
    });

    this.attachEventHandlers(this.element, this.definition.events, context);

    return this.element;
  }

  update(definition: WidgetDef): void {
    super.update(definition);

    if (this.element) {
      const props = definition.props as TextProps | undefined;
      this.element.setContent(props?.content || '');
    }
  }
}
