# MoltUI Quickstart Guide

## What is MoltUI?

MoltUI is a terminal-based chat interface that connects to AI backends and renders dynamic, interactive interfaces. Instead of text-only responses, AI can send rich layouts with tables, forms, charts, and more.

```
┌─ MoltUI ──────────────────────────────────────────────────────────┐
│                              │                                     │
│  ┌─ Chat History ─────────┐ │  ┌─ Current Layout ──────────────┐ │
│  │                        │ │  │                               │ │
│  │ You: Show me files     │ │  │  ┌─────────────────────────┐  │ │
│  │                        │ │  │  │ Name      │ Size │ Date │  │ │
│  │ AI: Here are your      │ │  │  ├─────────────────────────┤  │ │
│  │     files:             │ │  │  │ file1.txt │ 1KB  │ Jan  │  │ │
│  │                        │ │  │  │ file2.txt │ 2KB  │ Feb  │  │ │
│  │                        │ │  │  │ file3.txt │ 3KB  │ Mar  │  │ │
│  │                        │ │  │  └─────────────────────────┘  │ │
│  └────────────────────────┘ │  └───────────────────────────────┘ │
│  ┌─ Input ────────────────┐ │                                     │
│  │ > _                    │ │                                     │
│  └────────────────────────┘ │                                     │
└──────────────────────────────┴─────────────────────────────────────┘
```

## Installation

```bash
npm install -g moltui
```

## Quick Start

### 1. Set Up Your AI Backend

MoltUI connects to any WebSocket server that implements the MoltUI protocol. Set the endpoint:

```bash
export MOLTUI_BACKEND="ws://localhost:8080/moltui"
```

### 2. Launch MoltUI

```bash
moltui
```

### 3. Start Chatting

Type in the input field and press Enter. Your AI backend will respond with messages and optional layouts.

## For AI Backend Developers

### Minimal Server Example (Node.js)

```javascript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  let sessionId = null;

  ws.on('message', (data) => {
    const msg = JSON.parse(data);

    // Handle ready message
    if (msg.method === 'ready') {
      sessionId = `session-${Date.now()}`;
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'history',
        params: { sessionId, messages: [], currentLayoutId: null }
      }));
    }

    // Handle chat message
    if (msg.method === 'chat') {
      // Send AI response
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'message',
        params: {
          sessionId,
          message: {
            id: `msg-${Date.now()}`,
            sender: 'ai',
            content: 'Hello! Here is a simple table:',
            timestamp: Date.now(),
            layoutId: 'layout-1'
          }
        }
      }));

      // Send layout
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'layout',
        params: {
          sessionId,
          layout: {
            version: '1.0',
            id: 'layout-1',
            type: 'single',
            root: {
              id: 'table-1',
              type: 'table',
              props: {
                columns: [
                  { id: 'name', label: 'Name', width: '50%' },
                  { id: 'value', label: 'Value', width: '50%' }
                ],
                data: [
                  ['Item 1', '100'],
                  ['Item 2', '200'],
                  ['Item 3', '300']
                ],
                selectable: 'single'
              },
              events: [{
                on: 'select',
                action: { type: 'emit', data: { event: 'row_selected' } }
              }]
            }
          }
        }
      }));
    }

    // Handle widget events
    if (msg.method === 'event') {
      console.log('User event:', msg.params);
      // Process and respond...
    }
  });
});

console.log('MoltUI backend running on ws://localhost:8080');
```

### Sending a Layout

Layouts are JSON documents describing the UI:

```json
{
  "version": "1.0",
  "id": "my-layout",
  "type": "single",
  "root": {
    "id": "main-panel",
    "type": "panel",
    "props": { "title": "Dashboard" },
    "children": [
      {
        "id": "my-chart",
        "type": "chart",
        "props": {
          "chartType": "bar",
          "data": {
            "labels": ["Jan", "Feb", "Mar"],
            "datasets": [{ "label": "Sales", "data": [10, 20, 30] }]
          }
        }
      }
    ]
  }
}
```

### Available Widgets

| Widget | Description | Key Props |
|--------|-------------|-----------|
| `table` | Data table with sorting/selection | `columns`, `data`, `sortable`, `selectable` |
| `list` | Searchable list | `items`, `searchable`, `selectable` |
| `form` | Input form with validation | `fields`, `submitLabel` |
| `chart` | Bar, line, sparkline, gauge | `chartType`, `data` |
| `panel` | Container with title | `title`, `collapsible` |
| `tabs` | Tabbed container | `tabs`, `activeTab` |
| `text` | Formatted text | `content`, `scrollable` |
| `progressbar` | Progress indicator | `value`, `max`, `indeterminate` |
| `modal` | Overlay dialog | `title`, `visible` |

### Handling Events

When users interact with widgets, MoltUI sends events:

```json
{
  "jsonrpc": "2.0",
  "method": "event",
  "params": {
    "sessionId": "session-123",
    "layoutId": "layout-1",
    "widgetId": "table-1",
    "eventType": "select",
    "data": {
      "rowIndex": 2,
      "rowId": "row-2",
      "rowData": ["Item 3", "300"]
    },
    "timestamp": 1706918400000
  }
}
```

### Updating Layouts

Use JSON Patch to update specific parts:

```json
{
  "jsonrpc": "2.0",
  "method": "patch",
  "params": {
    "sessionId": "session-123",
    "layoutId": "layout-1",
    "patches": [
      { "op": "replace", "path": "/root/props/data/0/1", "value": "150" }
    ]
  }
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Move focus to next widget |
| `Shift+Tab` | Move focus to previous widget |
| `Enter` | Select/activate focused item |
| `Arrow keys` | Navigate within widgets |
| `Escape` | Close modals, cancel forms |
| `Ctrl+C` | Exit MoltUI |

## Mouse Support

- **Click** to focus and select
- **Double-click** to activate
- **Scroll** to navigate lists/tables
- **Drag** divider to resize panels

## Troubleshooting

### "Cannot connect to backend"

1. Check `MOLTUI_BACKEND` is set: `echo $MOLTUI_BACKEND`
2. Verify the server is running
3. Check firewall/network settings

### "Unsupported version X.Y"

The AI backend is sending layouts with a different schema version. Update MoltUI or the backend to use matching versions.

### "Layout validation failed"

The AI backend sent an invalid layout. Check the layout JSON against the schema at `contracts/layout-definition.schema.json`.

## Next Steps

- Read the full [Protocol Specification](./contracts/protocol.md)
- See [Data Model](./data-model.md) for entity details
- Check [JSON Schemas](./contracts/) for validation
