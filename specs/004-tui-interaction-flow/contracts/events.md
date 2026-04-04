# Event Contracts: TUI Interaction Flow

**Feature**: 004-tui-interaction-flow
**Date**: 2026-02-13

## Internal Events

These events flow through the internal event bus.

### widget:interaction

Emitted when a user interacts with a TUI widget.

**Source**: Widget classes (ButtonWidget, ListWidget, etc.)
**Consumers**: InteractionCapture module

```typescript
eventBus.emit('widget:interaction', {
  layoutId: string,      // Current layout ID
  widgetId: string,      // Widget that was interacted with
  widgetType: string,    // button, list, input, etc.
  eventType: string,     // click, select, submit, toggle
  data: {
    label?: string,
    value?: unknown,
    previousValue?: unknown,
    index?: number
  },
  timestamp: number
});
```

### interaction:captured

Emitted after an interaction is processed and added to history.

**Source**: InteractionCapture module
**Consumers**: Debug/logging (optional)

```typescript
eventBus.emit('interaction:captured', {
  event: InteractionEvent,
  historySize: number,
  wasDebounced: boolean
});
```

### interaction:debounced

Emitted when an interaction is filtered by debounce.

**Source**: Debounce module
**Consumers**: Debug/logging (optional)

```typescript
eventBus.emit('interaction:debounced', {
  widgetId: string,
  eventType: string,
  timeSinceLastMs: number
});
```

### tui:render:error

Emitted when TUI rendering fails.

**Source**: Application/Layout renderer
**Consumers**: TUI panel error indicator

```typescript
eventBus.emit('tui:render:error', {
  layoutId: string,
  error: string,
  preservedLayoutId: string | null  // Previous layout that remains visible
});
```

### tui:render:success

Emitted when TUI rendering succeeds.

**Source**: Application/Layout renderer
**Consumers**: Clear error indicator, logging

```typescript
eventBus.emit('tui:render:success', {
  layoutId: string,
  widgetCount: number,
  renderTimeMs: number
});
```

## WebSocket Protocol Extensions

### chat Method (Extended)

The existing `chat` method is extended to include interaction context.

**Request** (Client → Bridge → Backend):

```json
{
  "jsonrpc": "2.0",
  "method": "chat",
  "params": {
    "sessionId": "session-123",
    "content": "What did I click?",
    "interactionContext": {
      "events": [
        {
          "id": "evt-1707868800000-abc",
          "timestamp": 1707868800000,
          "elementId": "btn-submit",
          "elementType": "button",
          "eventType": "click",
          "data": {
            "label": "Submit"
          }
        }
      ],
      "layoutId": "dashboard-1",
      "layoutSummary": "Dashboard with submit and cancel buttons"
    }
  }
}
```

**Backwards Compatibility**: The `interactionContext` field is optional. Backends that don't support it can ignore the field.

### message Method (Unchanged)

Messages from backend continue to use the existing format. The client parses the content to extract layouts.

```json
{
  "jsonrpc": "2.0",
  "method": "message",
  "params": {
    "sessionId": "session-123",
    "message": {
      "id": "msg-456",
      "sender": "ai",
      "content": "I see you clicked the Submit button. Here's a form:\n\n```moltui\n{...layout...}\n```",
      "timestamp": 1707868801000,
      "status": "sent"
    }
  }
}
```

The client is responsible for:
1. Parsing `content` to extract text (for chat) and layout (for TUI)
2. Displaying only text in chat
3. Rendering layout in TUI panel

## Event Flow Diagrams

### Interaction Capture Flow

```
User clicks button
        │
        ▼
┌───────────────────┐
│ ButtonWidget      │
│ emits             │
│ 'widget:interaction'│
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ InteractionCapture │
│ receives event    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Debouncer         │
│ checks timing     │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
 Passed      Filtered
    │           │
    ▼           ▼
┌──────────┐ ┌──────────────┐
│ History  │ │ emit         │
│ .add()   │ │ 'interaction:│
└────┬─────┘ │ debounced'   │
     │       └──────────────┘
     ▼
┌───────────────────┐
│ emit              │
│ 'interaction:     │
│ captured'         │
└───────────────────┘
```

### Response Parsing Flow

```
Backend sends message
        │
        ▼
┌───────────────────┐
│ WebSocketClient   │
│ receives 'message'│
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ MessageParser     │
│ .parse(content)   │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
  text       layout
    │           │
    ▼           ▼
┌──────────┐ ┌──────────────┐
│ ChatPanel │ │ LayoutManager│
│ .addMsg() │ │ .handleLayout│
└──────────┘ └──────────────┘
```
