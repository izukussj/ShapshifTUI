import blessed from 'blessed';
import type { Widget as WidgetDef } from '../types/index.js';
import { BaseWidget, type RenderContext } from './base-widget.js';

/**
 * Placeholder widget - displayed for unknown/unimplemented widget types
 */
export class PlaceholderWidget extends BaseWidget {
  render(context: RenderContext): blessed.Widgets.BlessedElement {
    const layout = this.definition.layout;

    this.element = blessed.box({
      parent: context.parent,
      content: `[${this.definition.type}]\n(not implemented)`,
      align: 'center',
      valign: 'middle',
      ...this.getLayoutOptions(layout),
      style: {
        fg: 'gray',
        bg: 'black',
        border: {
          fg: 'gray',
        },
      },
      border: {
        type: 'line',
      },
    });

    return this.element;
  }

  update(definition: WidgetDef): void {
    super.update(definition);

    if (this.element) {
      this.element.setContent(`[${definition.type}]\n(not implemented)`);
    }
  }
}
