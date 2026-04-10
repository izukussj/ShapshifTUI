import blessed from 'blessed';
import type { Widget as WidgetDef, ContainerProps, LayoutProps } from '../types/index.js';
import { BaseWidget, type RenderContext } from './base-widget.js';

/**
 * Container widget - holds and arranges child widgets
 */
export class ContainerWidget extends BaseWidget {
  render(context: RenderContext): blessed.Widgets.BlessedElement {
    const props = this.definition.props as ContainerProps | undefined;
    const layout = this.definition.layout;
    const style = this.definition.style;

    // Create box element with default 100% size
    this.element = blessed.box({
      parent: context.parent,
      width: '100%',
      height: '100%',
      ...this.getLayoutOptions(layout),
      ...this.getStyleOptions(style),
      tags: true,
    });

    // Attach event handlers
    this.attachEventHandlers(this.element, this.definition.events, context);

    // Render children
    if (this.definition.children) {
      this.renderChildren(context, props, layout);
    }

    return this.element;
  }

  private renderChildren(context: RenderContext, props?: ContainerProps, layout?: LayoutProps): void {
    if (!this.element || !this.definition.children) return;

    // Check both props.orientation and layout.flexDirection
    let orientation: 'horizontal' | 'vertical' = 'vertical';
    if (props?.orientation) {
      orientation = props.orientation;
    } else if (layout?.flexDirection === 'row') {
      orientation = 'horizontal';
    } else if (layout?.flexDirection === 'column') {
      orientation = 'vertical';
    }

    const sizes = props?.sizes;
    const childCount = this.definition.children.length;

    // Import createWidget here to avoid circular dependency
    const { createWidget } = require('./widget-factory.js');

    this.definition.children.forEach((childDef: WidgetDef, index: number) => {
      const childWidget = createWidget(childDef) as BaseWidget;
      this.children.push(childWidget);

      // Calculate child position based on orientation
      const childLayout = this.calculateChildLayout(
        index,
        childCount,
        orientation,
        sizes
      );

      // Merge calculated layout with child's own layout
      const mergedDef = {
        ...childDef,
        layout: {
          ...childLayout,
          ...childDef.layout,
        },
      };

      // Update child definition with merged layout
      childWidget.update(mergedDef);

      // Render child with container as parent
      childWidget.render({
        ...context,
        parent: this.element!,
      });
    });
  }

  private calculateChildLayout(
    index: number,
    total: number,
    orientation: 'horizontal' | 'vertical',
    sizes?: number[]
  ): Record<string, unknown> {
    const layout: Record<string, unknown> = {};

    if (sizes && sizes[index] !== undefined) {
      // Use explicit sizes (percentages)
      const size = `${sizes[index]}%`;
      if (orientation === 'horizontal') {
        layout.width = size;
        layout.height = '100%';
        // Calculate left position
        const leftOffset = sizes.slice(0, index).reduce((a, b) => a + b, 0);
        layout.left = `${leftOffset}%`;
        layout.top = 0;
      } else {
        layout.width = '100%';
        layout.height = size;
        // Calculate top position
        const topOffset = sizes.slice(0, index).reduce((a, b) => a + b, 0);
        layout.top = `${topOffset}%`;
        layout.left = 0;
      }
    } else {
      // Distribute evenly
      const sizePercent = Math.floor(100 / total);
      if (orientation === 'horizontal') {
        layout.width = `${sizePercent}%`;
        layout.height = '100%';
        layout.left = `${index * sizePercent}%`;
        layout.top = 0;
      } else {
        layout.width = '100%';
        layout.height = `${sizePercent}%`;
        layout.top = `${index * sizePercent}%`;
        layout.left = 0;
      }
    }

    return layout;
  }

  update(definition: WidgetDef): void {
    super.update(definition);
    // Container updates would need to reconcile children
    // For now, a full re-render is simpler
  }
}
