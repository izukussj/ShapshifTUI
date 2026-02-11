# MoltUI Protocol Specification

**Version**: 1.0
**Transport**: WebSocket
**Message Format**: JSON-RPC 2.0

## Overview

MoltUI uses a bidirectional WebSocket connection for communication between the TUI client and AI backend. Messages follow the JSON-RPC 2.0 specification.

## Connection

### Endpoint Configuration

The WebSocket URL is read from the `MOLTUI_BACKEND` environment variable:

```bash
export MOLTUI_BACKEND="ws://localhost:8080/moltui"
moltui
```

### Connection Lifecycle

```
1. Client reads MOLTUI_BACKEND env var
2. Client connects to WebSocket endpoint
3. Client sends "ready" message with capabilities
4. Server sends initial layout or chat history
5. Bidirectional communication begins
```

### Reconnection

On disconnection:
1. Client shows "Disconnected" status
2. Client attempts reconnection every 5 seconds
3. After 3 failed attempts, client shows error with retry option
4. On successful reconnect, client sends "ready" again
5. Server restores session state (chat history, current layout)

---

## Messages: AI Backend → MoltUI Client

### layout

Send a complete layout to render.

```json
{
  "jsonrpc": "2.0",
  "method": "layout",
  "params": {
    "sessionId": "session-abc123",
    "layout": {
      "version": "1.0",
      "id": "layout-xyz",
      "type": "single",
      "root": { ... }
    }
  }
}
```

**Behavior**:
- If user is NOT interacting: render immediately
- If user IS interacting: queue layout, apply after submission
- If version doesn't match "1.0": reject with error display

### patch

Update part of an existing layout.

```json
{
  "jsonrpc": "2.0",
  "method": "patch",
  "params": {
    "sessionId": "session-abc123",
    "layoutId": "layout-xyz",
    "patches": [
      {
        "op": "replace",
        "path": "/root/props/data/0/1",
        "value": "Updated Value"
      },
      {
        "op": "add",
        "path": "/root/children/-",
        "value": { "id": "new-widget", "type": "text", ... }
      }
    ]
  }
}
```

**Patch Operations** (RFC 6902):
- `add`: Add value at path
- `remove`: Remove value at path
- `replace`: Replace value at path
- `move`: Move value from one path to another
- `copy`: Copy value from one path to another
- `test`: Test that value at path matches

### message

Add a message to chat history.

```json
{
  "jsonrpc": "2.0",
  "method": "message",
  "params": {
    "sessionId": "session-abc123",
    "message": {
      "id": "msg-123",
      "sender": "ai",
      "content": "Here's the data you requested:",
      "timestamp": 1706918400000,
      "layoutId": "layout-xyz"
    }
  }
}
```

### history

Restore chat history (typically on reconnection).

```json
{
  "jsonrpc": "2.0",
  "method": "history",
  "params": {
    "sessionId": "session-abc123",
    "messages": [
      { "id": "msg-1", "sender": "user", "content": "Hello", ... },
      { "id": "msg-2", "sender": "ai", "content": "Hi there!", ... }
    ],
    "currentLayoutId": "layout-xyz"
  }
}
```

### notify

Show a temporary notification.

```json
{
  "jsonrpc": "2.0",
  "method": "notify",
  "params": {
    "type": "success",
    "message": "Operation completed successfully",
    "duration": 3000
  }
}
```

**Notification Types**: `success`, `error`, `warning`, `info`

### confirm

Request user confirmation (modal dialog).

```json
{
  "jsonrpc": "2.0",
  "id": "confirm-1",
  "method": "confirm",
  "params": {
    "message": "Are you sure you want to delete this item?",
    "confirmLabel": "Delete",
    "cancelLabel": "Cancel",
    "type": "danger"
  }
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "confirm-1",
  "result": {
    "confirmed": true
  }
}
```

### error

Report an error to the client.

```json
{
  "jsonrpc": "2.0",
  "method": "error",
  "params": {
    "code": "LAYOUT_INVALID",
    "message": "Layout validation failed",
    "details": { ... }
  }
}
```

---

## Messages: MoltUI Client → AI Backend

### ready

Sent immediately after WebSocket connection opens.

```json
{
  "jsonrpc": "2.0",
  "method": "ready",
  "params": {
    "sessionId": "session-abc123",
    "capabilities": {
      "mouse": true,
      "colors": 256,
      "unicode": true,
      "width": 120,
      "height": 40
    },
    "version": "1.0"
  }
}
```

### event

User interaction with a widget.

```json
{
  "jsonrpc": "2.0",
  "method": "event",
  "params": {
    "sessionId": "session-abc123",
    "layoutId": "layout-xyz",
    "widgetId": "table-1",
    "eventType": "select",
    "data": {
      "rowIndex": 5,
      "rowId": "row-abc",
      "rowData": { "name": "Item 5", "value": 100 }
    },
    "timestamp": 1706918400000
  }
}
```

### chat

User sends a chat message.

```json
{
  "jsonrpc": "2.0",
  "method": "chat",
  "params": {
    "sessionId": "session-abc123",
    "content": "Show me a table of all items"
  }
}
```

### state

Report client state changes.

```json
{
  "jsonrpc": "2.0",
  "method": "state",
  "params": {
    "sessionId": "session-abc123",
    "dimensions": {
      "width": 120,
      "height": 40
    },
    "focus": "widget-id",
    "interacting": true
  }
}
```

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid Request | Not valid JSON-RPC |
| -32601 | Method not found | Unknown method |
| -32602 | Invalid params | Invalid method parameters |
| -32603 | Internal error | Internal server error |
| -32000 | Layout invalid | LayoutDefinition failed validation |
| -32001 | Version mismatch | Schema version not supported |
| -32002 | Session expired | Session has timed out |
| -32003 | Widget not found | Target widget ID doesn't exist |
| -32004 | Patch failed | JSON Patch operation failed |

---

## Timeouts

| Timeout | Duration | Behavior |
|---------|----------|----------|
| AI Response | 30 seconds | Show error, offer retry |
| Session Idle | Configurable | Session expires, reconnect creates new |
| Reconnection | 5 seconds | Retry interval between attempts |
| Notification | Default 3 seconds | Auto-dismiss duration |

---

## Example Session

```
[Client connects to ws://localhost:8080/moltui]

→ Client: ready
{
  "jsonrpc": "2.0",
  "method": "ready",
  "params": {
    "sessionId": null,
    "capabilities": { "mouse": true, "colors": 256, ... },
    "version": "1.0"
  }
}

← Server: history (new session, assigns ID)
{
  "jsonrpc": "2.0",
  "method": "history",
  "params": {
    "sessionId": "session-new-abc",
    "messages": [],
    "currentLayoutId": null
  }
}

→ Client: chat
{
  "jsonrpc": "2.0",
  "method": "chat",
  "params": {
    "sessionId": "session-new-abc",
    "content": "Show me a list of files"
  }
}

← Server: message
{
  "jsonrpc": "2.0",
  "method": "message",
  "params": {
    "sessionId": "session-new-abc",
    "message": {
      "id": "msg-1",
      "sender": "ai",
      "content": "Here are your files:",
      "timestamp": 1706918400000,
      "layoutId": "layout-files"
    }
  }
}

← Server: layout
{
  "jsonrpc": "2.0",
  "method": "layout",
  "params": {
    "sessionId": "session-new-abc",
    "layout": {
      "version": "1.0",
      "id": "layout-files",
      "type": "single",
      "root": {
        "id": "file-table",
        "type": "table",
        "props": {
          "columns": [...],
          "data": [...]
        }
      }
    }
  }
}

[User clicks a row]

→ Client: event
{
  "jsonrpc": "2.0",
  "method": "event",
  "params": {
    "sessionId": "session-new-abc",
    "layoutId": "layout-files",
    "widgetId": "file-table",
    "eventType": "select",
    "data": { "rowIndex": 2, "rowId": "file-3" },
    "timestamp": 1706918410000
  }
}

← Server: patch (update detail view)
{
  "jsonrpc": "2.0",
  "method": "patch",
  "params": {
    "sessionId": "session-new-abc",
    "layoutId": "layout-files",
    "patches": [
      { "op": "replace", "path": "/root/children/1/props/content", "value": "Details for file-3..." }
    ]
  }
}
```
