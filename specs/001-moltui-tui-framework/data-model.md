# Data Model: MoltUI

**Feature**: 001-moltui-tui-framework
**Date**: 2026-02-03

## Overview

MoltUI is a stateless TUI client. Data flows from AI backend → MoltUI for rendering, and from MoltUI → AI backend for events. The AI backend owns all persistent state including chat history. This document defines the data structures exchanged between components.

## Core Entities

### 1. LayoutDefinition

The complete description of an interface sent from AI to MoltUI.

```typescript
interface LayoutDefinition {
  // Schema version - must match client's supported version exactly
  version: "1.0";

  // Unique identifier for this layout instance
  id: string;

  // Layout type determining root behavior
  type: "single" | "split" | "tabs" | "stack";

  // Optional metadata
  metadata?: {
    title?: string;
    description?: string;
    createdBy?: string;
    timestamp?: number;
    tags?: string[];
  };

  // Root widget tree
  root: Widget;

  // Global keybindings for this layout
  keybindings?: KeyBinding[];

  // Theme overrides
  theme?: Theme;
}
```

**Validation Rules**:
- `version` must equal "1.0" (strict matching per clarification)
- `id` must be non-empty string
- `root` must be a valid Widget

**Lifecycle**:
1. AI sends LayoutDefinition via `layout` method
2. Client validates against schema
3. If valid, client renders (or queues if user is interacting)
4. Layout remains until replaced by new LayoutDefinition

---

### 2. Widget

A self-contained UI component in the widget tree.

```typescript
interface Widget {
  // Unique identifier within the layout
  id: string;

  // Widget type determining render behavior
  type: WidgetType;

  // Layout properties (positioning, sizing)
  layout?: LayoutProps;

  // Visual style properties
  style?: StyleProps;

  // Type-specific configuration
  props?: Record<string, unknown>;

  // Child widgets (for containers)
  children?: Widget[];

  // Event handlers attached to this widget
  events?: EventHandler[];
}

type WidgetType =
  | "container"
  | "table"
  | "list"
  | "tree"
  | "form"
  | "input"
  | "button"
  | "text"
  | "chart"
  | "panel"
  | "tabs"
  | "modal"
  | "scrollable"
  | "progressbar"
  | "statusbar"
  | "menu"
  | "notification";
```

**Validation Rules**:
- `id` must be unique within the LayoutDefinition
- `type` must be a known widget type (unknown types render as placeholder)
- `children` only valid for container-type widgets

---

### 3. LayoutProps

Flexbox-style layout properties.

```typescript
interface LayoutProps {
  // Positioning mode
  position?: "relative" | "absolute";

  // Position (absolute only)
  top?: string | number;    // "10%", 5
  left?: string | number;
  right?: string | number;
  bottom?: string | number;

  // Sizing
  width?: string | number;  // "100%", 40, "shrink"
  height?: string | number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;

  // Spacing
  padding?: number | [number, number] | [number, number, number, number];
  margin?: number | [number, number] | [number, number, number, number];

  // Flex container properties
  flexDirection?: "row" | "column";
  justifyContent?: "start" | "end" | "center" | "space-between" | "space-around";
  alignItems?: "start" | "end" | "center" | "stretch";
  gap?: number;

  // Flex item properties
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string | number;
}
```

---

### 4. StyleProps

Visual styling properties.

```typescript
interface StyleProps {
  // Colors (named colors or hex)
  fg?: string;           // foreground/text color
  bg?: string;           // background color

  // Text formatting
  bold?: boolean;
  underline?: boolean;
  italic?: boolean;
  inverse?: boolean;
  blink?: boolean;

  // Border
  border?: {
    type: "line" | "bg" | "none";
    fg?: string;
    bg?: string;
    ch?: string;         // custom border character
  };

  // Scrollbar styling
  scrollbar?: {
    track?: string;
    thumb?: string;
  };

  // Focus state overrides
  focus?: Partial<StyleProps>;

  // Hover state overrides (mouse)
  hover?: Partial<StyleProps>;

  // Selected state overrides
  selected?: Partial<StyleProps>;
}
```

**Named Colors**: black, red, green, yellow, blue, magenta, cyan, white, default, and 256-color palette (color0-color255).

---

### 5. Message

A chat message in the conversation history.

```typescript
interface Message {
  // Unique message identifier
  id: string;

  // Message sender
  sender: "user" | "ai" | "system";

  // Message content (plain text or markdown-like)
  content: string;

  // Timestamp (Unix ms)
  timestamp: number;

  // Optional associated layout (for AI messages)
  layoutId?: string;

  // Message status
  status?: "sending" | "sent" | "error";
}
```

**Notes**:
- Chat history is NOT persisted by MoltUI
- AI backend restores history via `history` method on reconnection
- `system` sender used for connection status, errors, etc.

---

### 6. Event

A serialized user interaction sent from MoltUI to AI.

```typescript
interface Event {
  // JSON-RPC style
  jsonrpc: "2.0";
  method: "event";
  id?: string;           // for events expecting response

  params: {
    // Session context
    sessionId: string;
    layoutId: string;

    // Event source
    widgetId: string;

    // Event type
    eventType: EventType;

    // Event-specific data
    data: Record<string, unknown>;

    // Timestamp
    timestamp: number;
  };
}

type EventType =
  | "click"
  | "dblclick"
  | "mouseover"
  | "mouseout"
  | "mousewheel"
  | "keypress"
  | "focus"
  | "blur"
  | "select"
  | "change"
  | "submit"
  | "cancel"
  | "resize"
  | "scroll";
```

**Event Data Examples**:
```typescript
// Table row selection
{ rowIndex: 5, rowId: "row-abc", rowData: {...} }

// Form submission
{ fields: { name: "John", email: "john@example.com" } }

// Keypress
{ key: "enter", ctrl: false, shift: false, meta: false }

// Click
{ x: 10, y: 25, button: "left" }
```

---

### 7. Action

What happens in response to an event (defined in LayoutDefinition).

```typescript
interface Action {
  // Action type
  type: "emit" | "navigate" | "update" | "execute";

  // Target widget or route (for navigate/update)
  target?: string;

  // Data to send or update
  data?: Record<string, unknown>;

  // Condition for executing action
  condition?: string;  // Simple expression, e.g., "$event.rowId != null"
}
```

---

### 8. Session

Runtime session state (client-side only, not persisted).

```typescript
interface Session {
  // Session identifier (from AI backend)
  id: string;

  // Connection state
  state: "connecting" | "connected" | "disconnected" | "reconnecting";

  // Current layout
  currentLayoutId?: string;

  // Queued layouts (waiting for user to finish interaction)
  queuedLayouts: LayoutDefinition[];

  // User interaction state
  isUserInteracting: boolean;

  // Terminal capabilities
  capabilities: {
    mouse: boolean;
    colors: 16 | 256 | "truecolor";
    unicode: boolean;
    width: number;
    height: number;
  };

  // Timers
  lastActivityTime: number;
  reconnectAttempts: number;
}
```

---

## Widget-Specific Props

### TableProps
```typescript
interface TableProps {
  columns: Column[];
  data: unknown[][];
  sortable?: boolean;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  filterable?: boolean;
  filterValue?: string;
  selectable?: boolean | "single" | "multiple";
  selectedRows?: string[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
  headerFixed?: boolean;
  zebra?: boolean;
}

interface Column {
  id: string;
  label: string;
  width?: string | number;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  filterable?: boolean;
}
```

### FormProps
```typescript
interface FormProps {
  fields: FormField[];
  values?: Record<string, unknown>;
  errors?: Record<string, string>;
  submitLabel?: string;
  cancelLabel?: string;
  layout?: "horizontal" | "vertical";
}

interface FormField {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "checkbox" | "textarea" | "date" | "password";
  value?: unknown;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ label: string; value: unknown }>;  // for select
  validation?: ValidationRule[];
}

interface ValidationRule {
  type: "required" | "email" | "number" | "regex" | "min" | "max" | "minLength" | "maxLength";
  params?: unknown;
  message?: string;
}
```

### ChartProps
```typescript
interface ChartProps {
  chartType: "bar" | "line" | "sparkline" | "gauge";
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

interface ChartData {
  labels?: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
  }>;
}
```

### ListProps
```typescript
interface ListProps {
  items: ListItem[];
  selectable?: boolean | "single" | "multiple";
  selectedItems?: string[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  grouped?: boolean;
  virtualized?: boolean;
}

interface ListItem {
  id: string;
  label: string;
  icon?: string;
  subtitle?: string;
  disabled?: boolean;
  group?: string;
}
```

---

## State Transitions

### Session State Machine

```
[Start] → connecting
    ↓
connecting → connected (on WebSocket open + ready handshake)
    ↓
connected → disconnected (on WebSocket close/error)
    ↓
disconnected → reconnecting (automatic, up to 3 attempts)
    ↓
reconnecting → connected (on successful reconnect)
reconnecting → disconnected (after 3 failed attempts)
```

### Layout Queue State

```
[User idle] → Layout received → Render immediately
    ↓
[User interacting] → Layout received → Queue layout
    ↓
[User submits] → Apply queued layout → Render
```

---

## Relationships

```
Session (1) ────────────────── (0..1) LayoutDefinition (current)
    │                                       │
    │                                       │
    └── (0..*) Message                      └── (1..*) Widget
                                                    │
                                                    └── (0..*) Widget (children)
                                                    │
                                                    └── (0..*) EventHandler
```
