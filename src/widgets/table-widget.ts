import blessed from 'blessed';
import type { Widget as WidgetDef, TableColumn } from '../types/index.js';
import { BaseWidget, type RenderContext } from './base-widget.js';

/**
 * Table widget props
 */
interface TableWidgetProps {
  columns: TableColumn[];
  data: unknown[][];
  selectable?: boolean | 'single' | 'multiple';
  selectedRows?: number[];
  headerFixed?: boolean;
}

/**
 * Table widget - data table with optional selection (INPUT & OUTPUT)
 * - OUTPUT: displays tabular data with columns
 * - INPUT: user can select rows, triggers 'select' events
 */
export class TableWidget extends BaseWidget {
  private selectedRows: Set<number> = new Set();

  render(context: RenderContext): blessed.Widgets.BlessedElement {
    const props = this.definition.props as TableWidgetProps | undefined;
    const layout = this.definition.layout;
    const style = this.definition.style;

    const styleOptions = this.getStyleOptions(style);
    const columns = props?.columns || [];
    const data = props?.data || [];
    const selectable = props?.selectable;

    // Initialize selected rows
    if (props?.selectedRows) {
      this.selectedRows = new Set(props.selectedRows);
    }

    // Create table using listtable
    this.element = blessed.listtable({
      parent: context.parent,
      ...this.getLayoutOptions(layout),
      data: this.formatTableData(columns, data),
      mouse: true,
      keys: true,
      vi: true,
      interactive: !!selectable,
      border: { type: 'line' },
      align: 'left',
      style: {
        fg: styleOptions.fg as string || 'white',
        bg: styleOptions.bg as string || 'black',
        border: { fg: 'gray' },
        header: {
          fg: 'black',
          bg: 'cyan',
          bold: true,
        },
        cell: {
          fg: styleOptions.fg as string || 'white',
          selected: {
            fg: 'black',
            bg: 'yellow',
          },
        },
      },
      tags: true,
      scrollbar: {
        ch: '█',
        track: { bg: 'gray' },
        style: { bg: 'white' },
      },
    });

    // Handle row selection
    if (selectable) {
      (this.element as NodeJS.EventEmitter).on('select', (_item: unknown, index: number) => {
        // Index 0 is header, so actual row is index - 1
        const rowIndex = index - 1;
        if (rowIndex < 0) return;

        const rowData = data[rowIndex];

        if (selectable === 'multiple') {
          if (this.selectedRows.has(rowIndex)) {
            this.selectedRows.delete(rowIndex);
          } else {
            this.selectedRows.add(rowIndex);
          }
        } else {
          this.selectedRows.clear();
          this.selectedRows.add(rowIndex);
        }

        this.eventBus.emit('widget:event', {
          sessionId: context.sessionId,
          layoutId: context.layoutId,
          widgetId: this.definition.id,
          eventType: 'select',
          data: {
            rowIndex,
            rowData,
            selectedRows: Array.from(this.selectedRows),
          },
          timestamp: Date.now(),
        });
      });
    }

    // Attach custom event handlers
    this.attachEventHandlers(this.element, this.definition.events, context);

    return this.element;
  }

  private formatTableData(columns: TableColumn[], data: unknown[][]): string[][] {
    // Header row
    const header = columns.map(col => col.label);

    // Data rows
    const rows = data.map((row, rowIdx) => {
      return columns.map((col, colIdx) => {
        const value = row[colIdx];
        const str = value != null ? String(value) : '';

        // Add selection indicator
        if (colIdx === 0 && this.selectedRows.has(rowIdx)) {
          return `{yellow-fg}► ${str}{/yellow-fg}`;
        }
        return str;
      });
    });

    return [header, ...rows];
  }

  update(definition: WidgetDef): void {
    super.update(definition);
  }
}
