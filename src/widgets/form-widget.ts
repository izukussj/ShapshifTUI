import blessed from 'blessed';
import type { Widget as WidgetDef, FormField } from '../types/index.js';
import { BaseWidget, type RenderContext } from './base-widget.js';

/**
 * Form widget props
 */
interface FormWidgetProps {
  fields: FormField[];
  values?: Record<string, unknown>;
  submitLabel?: string;
  cancelLabel?: string;
}

/**
 * Form widget - input form with multiple fields (INPUT & OUTPUT)
 * - OUTPUT: displays form fields with current values
 * - INPUT: user fills fields, triggers 'submit' events
 */
export class FormWidget extends BaseWidget {
  private fieldElements: Map<string, blessed.Widgets.Node> = new Map();
  private currentValues: Record<string, unknown> = {};

  render(context: RenderContext): blessed.Widgets.BlessedElement {
    const props = this.definition.props as FormWidgetProps | undefined;
    const layout = this.definition.layout;
    const style = this.definition.style;

    const styleOptions = this.getStyleOptions(style);
    const fields = props?.fields || [];
    this.currentValues = props?.values ? { ...props.values } : {};

    // Create form container
    this.element = blessed.form({
      parent: context.parent,
      keys: true,
      mouse: true,
      ...this.getLayoutOptions(layout),
      style: {
        fg: styleOptions.fg as string || 'white',
        bg: styleOptions.bg as string || 'black',
      },
    });

    let yOffset = 0;

    // Render each field
    for (const field of fields) {
      // Label
      blessed.text({
        parent: this.element,
        content: `${field.label}${field.required ? ' *' : ''}:`,
        top: yOffset,
        left: 0,
        style: { fg: 'white' },
      });
      yOffset += 1;

      // Field input based on type
      const fieldElement = this.createFieldElement(field, yOffset, context);
      if (fieldElement) {
        this.fieldElements.set(field.id, fieldElement);
      }
      yOffset += 2;
    }

    // Submit button
    const submitBtn = blessed.button({
      parent: this.element,
      content: props?.submitLabel || '[ Submit ]',
      top: yOffset + 1,
      left: 0,
      shrink: true,
      mouse: true,
      keys: true,
      padding: { left: 1, right: 1 },
      style: {
        fg: 'white',
        bg: 'green',
        focus: { fg: 'white', bg: 'cyan' },
        hover: { fg: 'white', bg: 'cyan' },
      },
    });

    submitBtn.on('press', () => {
      this.collectAndSubmit(context);
    });

    // Cancel button if label provided
    if (props?.cancelLabel) {
      const cancelBtn = blessed.button({
        parent: this.element,
        content: props.cancelLabel,
        top: yOffset + 1,
        left: (props?.submitLabel?.length || 10) + 4,
        shrink: true,
        mouse: true,
        keys: true,
        padding: { left: 1, right: 1 },
        style: {
          fg: 'white',
          bg: 'red',
          focus: { fg: 'white', bg: 'cyan' },
        },
      });

      cancelBtn.on('press', () => {
        this.eventBus.emit('widget:event', {
          sessionId: context.sessionId,
          layoutId: context.layoutId,
          widgetId: this.definition.id,
          eventType: 'cancel',
          data: {},
          timestamp: Date.now(),
        });
      });
    }

    // Attach custom event handlers
    this.attachEventHandlers(this.element, this.definition.events, context);

    return this.element;
  }

  private createFieldElement(
    field: FormField,
    yOffset: number,
    context: RenderContext
  ): blessed.Widgets.Node | null {
    const initialValue = this.currentValues[field.id] ?? field.value ?? '';

    switch (field.type) {
      case 'text':
      case 'password':
      case 'number':
        const textbox = blessed.textbox({
          parent: this.element!,
          top: yOffset,
          left: 0,
          width: '80%',
          height: 1,
          inputOnFocus: true,
          mouse: true,
          keys: true,
          value: String(initialValue),
          censor: field.type === 'password',
          style: {
            fg: field.disabled ? 'gray' : 'white',
            bg: 'black',
            focus: { bg: 'blue' },
            border: { fg: 'gray' },
          },
          border: { type: 'line' },
        });

        textbox.on('submit', () => {
          this.currentValues[field.id] = textbox.getValue();
        });

        return textbox;

      case 'checkbox':
        const checkbox = blessed.checkbox({
          parent: this.element!,
          top: yOffset,
          left: 0,
          checked: Boolean(initialValue),
          mouse: true,
          style: {
            fg: field.disabled ? 'gray' : 'white',
          },
        });

        checkbox.on('check', () => {
          this.currentValues[field.id] = true;
        });
        checkbox.on('uncheck', () => {
          this.currentValues[field.id] = false;
        });

        return checkbox;

      case 'select':
        const options = field.options || [];
        const radioset = blessed.radioset({
          parent: this.element!,
          top: yOffset,
          left: 0,
          width: '80%',
          height: options.length + 1,
        });

        options.forEach((opt, idx) => {
          const radio = blessed.radiobutton({
            parent: radioset,
            top: idx,
            left: 0,
            content: opt.label,
            checked: initialValue === opt.value,
            mouse: true,
          });

          radio.on('check', () => {
            this.currentValues[field.id] = opt.value;
          });
        });

        return radioset;

      case 'textarea':
        const textarea = blessed.textarea({
          parent: this.element!,
          top: yOffset,
          left: 0,
          width: '80%',
          height: 4,
          inputOnFocus: true,
          mouse: true,
          keys: true,
          value: String(initialValue),
          style: {
            fg: field.disabled ? 'gray' : 'white',
            bg: 'black',
            focus: { bg: 'blue' },
            border: { fg: 'gray' },
          },
          border: { type: 'line' },
        });

        textarea.on('submit', () => {
          this.currentValues[field.id] = textarea.getValue();
        });

        return textarea;

      default:
        return null;
    }
  }

  private collectAndSubmit(context: RenderContext): void {
    // Collect all field values
    const props = this.definition.props as FormWidgetProps | undefined;
    const fields = props?.fields || [];

    for (const field of fields) {
      const element = this.fieldElements.get(field.id);
      if (element && 'getValue' in element) {
        this.currentValues[field.id] = (element as { getValue(): string }).getValue();
      }
    }

    // Emit submit event
    this.eventBus.emit('widget:event', {
      sessionId: context.sessionId,
      layoutId: context.layoutId,
      widgetId: this.definition.id,
      eventType: 'submit',
      data: { fields: this.currentValues },
      timestamp: Date.now(),
    });
  }

  update(definition: WidgetDef): void {
    super.update(definition);
  }

  destroy(): void {
    this.fieldElements.clear();
    super.destroy();
  }
}
