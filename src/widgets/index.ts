/**
 * MoltUI Widgets Module
 *
 * Provides the widget system for rendering UI components.
 */

export { BaseWidget, type RenderContext } from './base-widget.js';
export { ContainerWidget } from './container-widget.js';
export { TextWidget } from './text-widget.js';
export { ButtonWidget } from './button-widget.js';
export { PanelWidget } from './panel-widget.js';
export { InputWidget } from './input-widget.js';
export { ListWidget } from './list-widget.js';
export { FormWidget } from './form-widget.js';
export { TableWidget } from './table-widget.js';
export { PlaceholderWidget } from './placeholder-widget.js';
export {
  createWidget,
  createWidgetTree,
  registerWidget,
  isWidgetTypeSupported,
  getRegisteredWidgetTypes,
} from './widget-factory.js';
