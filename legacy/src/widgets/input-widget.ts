import blessed from 'blessed';
import type { Widget as WidgetDef } from '../types/index.js';
import { BaseWidget, type RenderContext } from './base-widget.js';

/**
 * Input widget props
 */
interface InputProps {
  value?: string;
  placeholder?: string;
  label?: string;
  password?: boolean;
  disabled?: boolean;
}

/**
 * Input widget - text input field (INPUT & OUTPUT)
 * - OUTPUT: displays current value
 * - INPUT: user can type, triggers 'change' events
 */
export class InputWidget extends BaseWidget {
  render(context: RenderContext): blessed.Widgets.BlessedElement {
    const props = this.definition.props as InputProps | undefined;
    const layout = this.definition.layout;
    const style = this.definition.style;

    const styleOptions = this.getStyleOptions(style);

    // Create a container for label + input
    this.element = blessed.box({
      parent: context.parent,
      ...this.getLayoutOptions(layout),
      height: layout?.height || 3,
    });

    // Add label if present
    if (props?.label) {
      blessed.text({
        parent: this.element,
        content: props.label,
        top: 0,
        left: 0,
        style: { fg: styleOptions.fg as string || 'white' },
      });
    }

    // Create the actual input
    const input = blessed.textbox({
      parent: this.element,
      top: props?.label ? 1 : 0,
      left: 0,
      width: '100%-2',
      height: 1,
      inputOnFocus: true,
      mouse: true,
      keys: true,
      clickable: true,
      value: props?.value || '',
      censor: props?.password,
      style: {
        fg: styleOptions.fg as string || 'white',
        bg: styleOptions.bg as string || 'black',
        focus: {
          fg: 'white',
          bg: 'blue',
        },
        border: {
          fg: 'gray',
        },
      },
      border: {
        type: 'line',
      },
    });

    // Show placeholder when empty
    if (!props?.value && props?.placeholder) {
      input.setValue(props.placeholder);
      input.style.fg = 'gray';
    }

    // Handle focus - clear placeholder
    input.on('focus', () => {
      if (input.getValue() === props?.placeholder) {
        input.setValue('');
        input.style.fg = styleOptions.fg as string || 'white';
      }
    });

    // Handle blur - restore placeholder if empty
    input.on('blur', () => {
      if (!input.getValue() && props?.placeholder) {
        input.setValue(props.placeholder);
        input.style.fg = 'gray';
      }
    });

    // Emit change events
    input.on('submit', () => {
      const value = input.getValue();
      this.eventBus.emit('widget:event', {
        sessionId: context.sessionId,
        layoutId: context.layoutId,
        widgetId: this.definition.id,
        eventType: 'change',
        data: { value },
        timestamp: Date.now(),
      });
    });

    // Attach custom event handlers
    this.attachEventHandlers(input, this.definition.events, context);

    return this.element;
  }

  update(definition: WidgetDef): void {
    super.update(definition);
    // Update input value if element exists
  }
}
