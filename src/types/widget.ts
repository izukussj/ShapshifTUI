import type { LayoutProps, StyleProps } from './style.js';
import type { Action } from './action.js';

/**
 * All supported widget types
 */
export type WidgetType =
  | 'container'
  | 'table'
  | 'list'
  | 'tree'
  | 'form'
  | 'input'
  | 'button'
  | 'text'
  | 'chart'
  | 'panel'
  | 'tabs'
  | 'modal'
  | 'scrollable'
  | 'progressbar'
  | 'statusbar'
  | 'menu'
  | 'notification';

/**
 * Event types that widgets can handle
 */
export type WidgetEventType =
  | 'click'
  | 'dblclick'
  | 'mouseover'
  | 'mouseout'
  | 'mousewheel'
  | 'keypress'
  | 'focus'
  | 'blur'
  | 'select'
  | 'change'
  | 'submit'
  | 'cancel';

/**
 * Event handler attached to a widget
 */
export interface EventHandler {
  on: WidgetEventType;
  action: Action;
  debounce?: number;
  throttle?: number;
}

/**
 * Base widget definition
 */
export interface Widget {
  /** Unique identifier within the layout */
  id: string;

  /** Widget type determining render behavior */
  type: WidgetType;

  /** Layout properties (positioning, sizing) */
  layout?: LayoutProps;

  /** Visual style properties */
  style?: StyleProps;

  /** Type-specific configuration */
  props?: Record<string, unknown>;

  /** Child widgets (for containers) */
  children?: Widget[];

  /** Event handlers attached to this widget */
  events?: EventHandler[];
}

/**
 * Table column definition
 */
export interface TableColumn {
  id: string;
  label: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
}

/**
 * Table widget props
 */
export interface TableProps {
  columns: TableColumn[];
  data: unknown[][];
  sortable?: boolean;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  filterable?: boolean;
  filterValue?: string;
  selectable?: boolean | 'single' | 'multiple';
  selectedRows?: string[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
  headerFixed?: boolean;
  zebra?: boolean;
}

/**
 * List item definition
 */
export interface ListItem {
  id: string;
  label: string;
  icon?: string;
  subtitle?: string;
  disabled?: boolean;
  group?: string;
}

/**
 * List widget props
 */
export interface ListProps {
  items: ListItem[];
  selectable?: boolean | 'single' | 'multiple';
  selectedItems?: string[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  grouped?: boolean;
  virtualized?: boolean;
}

/**
 * Form field validation rule
 */
export interface ValidationRule {
  type: 'required' | 'email' | 'number' | 'regex' | 'min' | 'max' | 'minLength' | 'maxLength';
  params?: unknown;
  message?: string;
}

/**
 * Form field definition
 */
export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea' | 'date' | 'password';
  value?: unknown;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ label: string; value: unknown }>;
  validation?: ValidationRule[];
}

/**
 * Form widget props
 */
export interface FormProps {
  fields: FormField[];
  values?: Record<string, unknown>;
  errors?: Record<string, string>;
  submitLabel?: string;
  cancelLabel?: string;
  layout?: 'horizontal' | 'vertical';
}

/**
 * Chart data structure
 */
export interface ChartData {
  labels?: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
  }>;
}

/**
 * Chart widget props
 */
export interface ChartProps {
  chartType: 'bar' | 'line' | 'sparkline' | 'gauge';
  data: ChartData;
  options?: {
    title?: string;
    showLegend?: boolean;
    showAxis?: boolean;
    min?: number;
    max?: number;
    colors?: string[];
  };
}

/**
 * Panel widget props
 */
export interface PanelProps {
  title?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  closeable?: boolean;
}

/**
 * Tabs widget props
 */
export interface TabsProps {
  tabs: Array<{ id: string; label: string }>;
  activeTab?: string;
}

/**
 * Progress bar widget props
 */
export interface ProgressBarProps {
  value?: number;
  max?: number;
  indeterminate?: boolean;
  label?: string;
}

/**
 * Container widget props
 */
export interface ContainerProps {
  orientation?: 'horizontal' | 'vertical';
  resizable?: boolean;
  dividers?: boolean;
  sizes?: number[];
}
