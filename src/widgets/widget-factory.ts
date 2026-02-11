import type { Widget as WidgetDef, WidgetType } from '../types/index.js';
import { BaseWidget } from './base-widget.js';
import { ContainerWidget } from './container-widget.js';
import { TextWidget } from './text-widget.js';
import { ButtonWidget } from './button-widget.js';
import { PanelWidget } from './panel-widget.js';
import { InputWidget } from './input-widget.js';
import { ListWidget } from './list-widget.js';
import { FormWidget } from './form-widget.js';
import { TableWidget } from './table-widget.js';
import { PlaceholderWidget } from './placeholder-widget.js';

/**
 * Widget constructor type
 */
type WidgetConstructor = new (definition: WidgetDef) => BaseWidget;

/**
 * Registry of widget types to constructors
 */
const widgetRegistry = new Map<WidgetType, WidgetConstructor>([
  ['container', ContainerWidget],
  ['text', TextWidget],
  ['button', ButtonWidget],
  ['panel', PanelWidget],
  ['input', InputWidget],
  ['list', ListWidget],
  ['form', FormWidget],
  ['table', TableWidget],
]);

/**
 * Register a widget constructor for a type
 */
export function registerWidget(type: WidgetType, constructor: WidgetConstructor): void {
  widgetRegistry.set(type, constructor);
}

/**
 * Create a widget from a definition
 */
export function createWidget(definition: WidgetDef): BaseWidget {
  const Constructor = widgetRegistry.get(definition.type);

  if (Constructor) {
    return new Constructor(definition);
  }

  // Return placeholder for unknown widget types
  console.warn(`Unknown widget type: ${definition.type}, using placeholder`);
  return new PlaceholderWidget(definition);
}

/**
 * Create a widget tree from a root definition
 */
export function createWidgetTree(root: WidgetDef): BaseWidget {
  return createWidget(root);
}

/**
 * Check if a widget type is registered
 */
export function isWidgetTypeSupported(type: WidgetType): boolean {
  return widgetRegistry.has(type);
}

/**
 * Get all registered widget types
 */
export function getRegisteredWidgetTypes(): WidgetType[] {
  return Array.from(widgetRegistry.keys());
}
