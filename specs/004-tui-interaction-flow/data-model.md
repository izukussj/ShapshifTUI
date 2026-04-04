# Data Model: TUI Interaction Flow

**Feature**: 004-tui-interaction-flow
**Date**: 2026-02-13

## Entities

### InteractionEvent

Represents a single user interaction with a TUI element.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique event identifier (format: `evt-{timestamp}-{random}`) |
| timestamp | number | Yes | Unix timestamp in milliseconds |
| elementId | string | Yes | Widget ID from the TUI layout |
| elementType | InteractionElementType | Yes | Type of widget interacted with |
| eventType | InteractionEventType | Yes | Type of interaction performed |
| data | InteractionData | Yes | Event-specific data |

**Identity**: `id` field is globally unique within a session.

**Lifecycle**: Created on user interaction → Stored in history → Eventually evicted by rolling window.

### InteractionData

Event-specific payload containing interaction details.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| label | string | No | Human-readable label (button text, item text) |
| value | unknown | No | The value associated with the interaction |
| previousValue | unknown | No | Previous value (for toggle/change events) |
| index | number | No | Index in list (for select events) |

### InteractionHistory

Rolling window buffer of recent interactions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| events | InteractionEvent[] | Yes | Array of events, max 50 |
| maxSize | number | Yes | Maximum events to retain (default: 50) |

**State Transitions**:
- Empty → Has events: First interaction captured
- Has events → Full: 50th event added
- Full → Full: New event added, oldest evicted (FIFO)

### InteractionContext

The context payload sent with chat messages.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| events | InteractionEvent[] | Yes | Recent events to include in AI context |
| layoutId | string | No | Current TUI layout ID (if any) |
| layoutSummary | string | No | Brief description of current TUI |

### ParsedResponse

Result of parsing an AI response to separate text from layout.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| text | string | Yes | Conversational text (code blocks removed) |
| layout | TUILayout | null | No | Extracted TUI layout definition, if any |
| hasLayout | boolean | Yes | Whether a layout was found |

## Enumerations

### InteractionElementType

```
button    - Clickable button widget
list      - Selection list widget
input     - Text input widget
checkbox  - Toggle checkbox widget
form      - Form container widget
table     - Data table widget (row selection)
```

### InteractionEventType

```
click     - Button click, list item click
select    - List item selection, table row selection
submit    - Form submission, input submission
toggle    - Checkbox toggle
change    - Input value change
focus     - Element gained focus
blur      - Element lost focus
```

## Relationships

```
┌─────────────────┐
│ InteractionEvent│
└────────┬────────┘
         │ 0..*
         ▼
┌─────────────────┐
│InteractionHistory│
└────────┬────────┘
         │ builds
         ▼
┌─────────────────┐
│InteractionContext│──────► Sent with ChatMessage
└─────────────────┘

┌─────────────────┐
│   AI Response   │
└────────┬────────┘
         │ parsed by
         ▼
┌─────────────────┐
│ ParsedResponse  │
└────────┬────────┘
    ┌────┴────┐
    ▼         ▼
  text      layout
 (chat)     (TUI)
```

## Validation Rules

### InteractionEvent
- `id` must be non-empty string
- `timestamp` must be positive integer
- `elementId` must be non-empty string
- `elementType` must be valid enum value
- `eventType` must be valid enum value

### InteractionHistory
- `events.length` must not exceed `maxSize`
- Events must be ordered by timestamp (ascending)

### ParsedResponse
- `text` may be empty string if response was only a layout
- If `hasLayout` is true, `layout` must be non-null
- If `hasLayout` is false, `layout` must be null

## Data Volume Estimates

| Metric | Estimate | Basis |
|--------|----------|-------|
| Events per interaction | 1 | One event per user action |
| Interaction size | ~200 bytes | JSON serialized event |
| History size | ~10 KB | 50 events × 200 bytes |
| Events per minute | 1-20 | Typical user interaction rate |
| Session duration | 5-60 min | Typical conversation length |
| Events per session | 50-500 | With rolling window cap at 50 retained |
