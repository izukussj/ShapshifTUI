import blessed from 'blessed';
import type { Widget as WidgetDef, PanelProps } from '../types/index.js';
import { BaseWidget, type RenderContext } from './base-widget.js';

/**
 * Panel widget - bordered container with optional title
 */
export class PanelWidget extends BaseWidget {
  private collapsed = false;

  render(context: RenderContext): blessed.Widgets.BlessedElement {
    const props = this.definition.props as PanelProps | undefined;
    const layout = this.definition.layout;
    const style = this.definition.style;

    this.collapsed = props?.collapsed ?? false;

    const styleOptions = this.getStyleOptions(style);

    this.element = blessed.box({
      parent: context.parent,
      label: props?.title ? ` ${props.title} ` : undefined,
      border: {
        type: 'line',
      },
      ...this.getLayoutOptions(layout),
      style: {
        fg: styleOptions.fg as string || 'white',
        bg: styleOptions.bg as string || 'black',
        border: {
          fg: (styleOptions.border as Record<string, unknown>)?.fg as string || 'white',
        },
        label: {
          fg: styleOptions.fg as string || 'white',
          bold: true,
        },
      },
    });

    // Handle collapsible panels
    if (props?.collapsible) {
      this.setupCollapsible();
    }

    this.attachEventHandlers(this.element, this.definition.events, context);

    // Render children
    if (this.definition.children && !this.collapsed) {
      this.renderChildren(context);
    }

    return this.element;
  }

  private setupCollapsible(): void {
    if (!this.element) return;

    // Toggle collapse on click of title area
    this.element.on('click', (data) => {
      // Check if click is in the title/border area (top row)
      if (data && data.y === 0) {
        this.toggleCollapse();
      }
    });
  }

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;

    if (this.element) {
      if (this.collapsed) {
        // Collapse: hide children, reduce height
        for (const child of this.children) {
          child.getElement()?.hide();
        }
        this.element.height = 3; // Just title bar
      } else {
        // Expand: show children, restore height
        for (const child of this.children) {
          child.getElement()?.show();
        }
        // Restore original height from layout
        const originalHeight = this.definition.layout?.height;
        if (originalHeight) {
          this.element.height = originalHeight as number;
        }
      }
      this.element.screen.render();
    }
  }

  private renderChildren(context: RenderContext): void {
    if (!this.element || !this.definition.children) return;

    const { createWidget } = require('./widget-factory.js');

    for (const childDef of this.definition.children) {
      const childWidget = createWidget(childDef) as BaseWidget;
      this.children.push(childWidget);

      childWidget.render({
        ...context,
        parent: this.element,
      });
    }
  }

  update(definition: WidgetDef): void {
    super.update(definition);

    if (this.element) {
      const props = definition.props as PanelProps | undefined;
      if (props?.title) {
        this.element.setLabel(` ${props.title} `);
      }
    }
  }
}
