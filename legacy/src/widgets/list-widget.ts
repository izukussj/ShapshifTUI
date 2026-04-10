import blessed from 'blessed';
import type { Widget as WidgetDef, ListItem } from '../types/index.js';
import { BaseWidget, type RenderContext } from './base-widget.js';

/**
 * List widget props
 */
interface ListWidgetProps {
  items: ListItem[];
  selected?: number;
  selectable?: boolean;
  label?: string;
}

/**
 * List widget - selectable list of items (INPUT & OUTPUT)
 * - OUTPUT: displays list of items
 * - INPUT: user can select items, triggers 'select' events
 */
export class ListWidget extends BaseWidget {
  render(context: RenderContext): blessed.Widgets.BlessedElement {
    const props = this.definition.props as ListWidgetProps | undefined;
    const layout = this.definition.layout;
    const style = this.definition.style;

    const styleOptions = this.getStyleOptions(style);
    const items = props?.items || [];

    this.element = blessed.list({
      parent: context.parent,
      label: props?.label ? ` ${props.label} ` : undefined,
      items: items.map(item => {
        let text = item.label;
        if (item.icon) text = `${item.icon} ${text}`;
        if (item.subtitle) text = `${text} - ${item.subtitle}`;
        if (item.disabled) text = `{gray-fg}${text}{/gray-fg}`;
        return text;
      }),
      mouse: true,
      keys: true,
      vi: true,
      clickable: true,
      interactive: props?.selectable !== false,
      selected: props?.selected || 0,
      ...this.getLayoutOptions(layout),
      border: {
        type: 'line',
      },
      style: {
        fg: styleOptions.fg as string || 'white',
        bg: styleOptions.bg as string || 'black',
        border: {
          fg: 'gray',
        },
        selected: {
          fg: 'black',
          bg: 'cyan',
        },
        item: {
          fg: styleOptions.fg as string || 'white',
        },
      },
      tags: true,
      scrollbar: {
        ch: '█',
        track: { bg: 'gray' },
        style: { bg: 'white' },
      },
    });

    // Handle selection
    (this.element as NodeJS.EventEmitter).on('select', (_item: unknown, index: number) => {
      const selectedItem = items[index];
      if (selectedItem && !selectedItem.disabled) {
        this.eventBus.emit('widget:event', {
          sessionId: context.sessionId,
          layoutId: context.layoutId,
          widgetId: this.definition.id,
          eventType: 'select',
          data: {
            index,
            itemId: selectedItem.id,
            label: selectedItem.label,
            item: selectedItem,
          },
          timestamp: Date.now(),
        });
      }
    });

    // Attach custom event handlers
    this.attachEventHandlers(this.element, this.definition.events, context);

    return this.element;
  }

  update(definition: WidgetDef): void {
    super.update(definition);
  }
}
