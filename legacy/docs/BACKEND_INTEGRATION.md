# MoltUI Backend Integration Guide

Build an LLM-powered backend that serves dynamic TUI interfaces through MoltUI.

## Overview

MoltUI is a terminal UI client that connects to your backend via WebSocket. Your backend receives chat messages and events, then responds with layouts and messages. This enables LLMs to present rich, interactive terminal interfaces.

```
┌─────────────────┐         WebSocket          ┌─────────────────┐
│                 │  ◄───── JSON-RPC ─────►   │                 │
│     MoltUI      │                            │   Your Backend  │
│   (TUI Client)  │   layouts, messages ──►    │   (LLM + Logic) │
│                 │   ◄── events, chat         │                 │
└─────────────────┘                            └─────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
npm install ws
# For LLM integration (pick one):
npm install @anthropic-ai/sdk   # Claude
npm install openai              # OpenAI
```

### 2. Minimal Backend

```javascript
import { WebSocketServer } from 'ws';
import Anthropic from '@anthropic-ai/sdk';

const wss = new WebSocketServer({ port: 8080 });
const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an AI assistant with a TUI interface.
When responding, you can include a layout to display rich UI.
Output layouts as JSON in <layout>...</layout> tags.`;

wss.on('connection', (ws) => {
  let sessionId = null;

  ws.on('message', async (data) => {
    const msg = JSON.parse(data);

    // Handle init
    if (msg.method === 'init') {
      sessionId = `session-${Date.now()}`;
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        result: { sessionId },
        id: msg.id,
      }));
      return;
    }

    // Handle chat
    if (msg.method === 'chat') {
      const userMessage = msg.params.content;

      // Call LLM
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });

      const aiText = response.content[0].text;

      // Extract layout if present
      const layoutMatch = aiText.match(/<layout>([\s\S]*?)<\/layout>/);
      const messageText = aiText.replace(/<layout>[\s\S]*?<\/layout>/, '').trim();

      // Send AI message
      sendMessage(ws, sessionId, 'ai', messageText);

      // Send layout if present
      if (layoutMatch) {
        const layout = JSON.parse(layoutMatch[1]);
        sendLayout(ws, sessionId, layout);
      }
    }
  });
});

function sendMessage(ws, sessionId, sender, content) {
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    method: 'message',
    params: {
      sessionId,
      message: { id: `msg-${Date.now()}`, sender, content, timestamp: Date.now() },
    },
  }));
}

function sendLayout(ws, sessionId, layout) {
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    method: 'layout',
    params: { sessionId, layout },
  }));
}
```

### 3. Run

```bash
# Terminal 1: Start your backend
node your-backend.js

# Terminal 2: Start MoltUI
MOLTUI_BACKEND=ws://localhost:8080 npx moltui
```

---

## Protocol Reference

MoltUI uses JSON-RPC 2.0 over WebSocket.

### Client → Backend Messages

#### `init` - Initialize Session

```json
{
  "jsonrpc": "2.0",
  "method": "init",
  "params": {
    "version": "1.0.0",
    "capabilities": {
      "mouse": true,
      "colors": 256,
      "unicode": true,
      "width": 120,
      "height": 40
    }
  },
  "id": 1
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": { "sessionId": "session-123" },
  "id": 1
}
```

#### `chat` - User Message

```json
{
  "jsonrpc": "2.0",
  "method": "chat",
  "params": {
    "sessionId": "session-123",
    "content": "Show me the dashboard"
  }
}
```

#### `event` - Widget Interaction

```json
{
  "jsonrpc": "2.0",
  "method": "event",
  "params": {
    "sessionId": "session-123",
    "layoutId": "dashboard-1",
    "widgetId": "refresh-btn",
    "eventType": "click",
    "data": { "x": 10, "y": 5 },
    "timestamp": 1699900000000
  }
}
```

### Backend → Client Messages

#### `message` - Chat Message

```json
{
  "jsonrpc": "2.0",
  "method": "message",
  "params": {
    "sessionId": "session-123",
    "message": {
      "id": "msg-456",
      "sender": "ai",
      "content": "Here's your dashboard:",
      "timestamp": 1699900000000
    }
  }
}
```

#### `layout` - Display Layout

```json
{
  "jsonrpc": "2.0",
  "method": "layout",
  "params": {
    "sessionId": "session-123",
    "layout": {
      "version": "1.0",
      "id": "dashboard-1",
      "type": "single",
      "root": { ... }
    }
  }
}
```

#### `history` - Restore Chat History

```json
{
  "jsonrpc": "2.0",
  "method": "history",
  "params": {
    "sessionId": "session-123",
    "messages": [ ... ],
    "currentLayoutId": "dashboard-1"
  }
}
```

---

## Layout Schema

### Basic Structure

```json
{
  "version": "1.0",
  "id": "unique-layout-id",
  "type": "single",
  "root": {
    "id": "root",
    "type": "container",
    "children": [ ... ]
  }
}
```

### Widget Types

| Type | Description | Key Props |
|------|-------------|-----------|
| `container` | Layout container | `orientation`: "horizontal" \| "vertical" |
| `text` | Static text | `content`: string (supports {color-fg} tags) |
| `button` | Clickable button | `label`: string |
| `panel` | Bordered box | `title`: string, `collapsible`: boolean |
| `table` | Data table | `columns`: array, `data`: array |
| `list` | Item list | `items`: array |
| `form` | Input form | `fields`: array |
| `chart` | Data chart | `chartType`: "bar" \| "line", `data`: object |
| `progressbar` | Progress indicator | `value`: number, `max`: number |
| `input` | Text input | `placeholder`: string |
| `tabs` | Tab container | `tabs`: array, `activeTab`: string |
| `modal` | Modal dialog | `title`: string |

### Layout Props (Flexbox-style)

```json
{
  "layout": {
    "width": "50%",
    "height": 10,
    "flexDirection": "row",
    "justifyContent": "center",
    "alignItems": "center",
    "padding": 1,
    "gap": 1
  }
}
```

### Style Props

```json
{
  "style": {
    "fg": "white",
    "bg": "blue",
    "bold": true,
    "border": { "type": "line", "fg": "cyan" }
  }
}
```

### Colors

Named: `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`

Bright: `brightred`, `brightgreen`, etc.

256-palette: `color0` - `color255`

Hex: `#ff0000` (auto-converted based on terminal capability)

### Text Formatting Tags

```
{bold}Bold text{/bold}
{red-fg}Red text{/red-fg}
{blue-bg}Blue background{/blue-bg}
{underline}Underlined{/underline}
```

### Event Handlers

```json
{
  "id": "my-button",
  "type": "button",
  "props": { "label": "Click Me" },
  "events": [
    {
      "on": "click",
      "action": {
        "type": "emit",
        "data": { "action": "submit", "value": 42 }
      }
    }
  ]
}
```

---

## Example Layouts

### Dashboard

```json
{
  "version": "1.0",
  "id": "dashboard",
  "type": "split",
  "root": {
    "id": "root",
    "type": "container",
    "layout": { "flexDirection": "row" },
    "children": [
      {
        "id": "stats",
        "type": "panel",
        "props": { "title": "Statistics" },
        "layout": { "width": "50%" },
        "children": [
          {
            "id": "stats-text",
            "type": "text",
            "props": {
              "content": "{green-fg}Users:{/green-fg} 1,234\n{yellow-fg}Active:{/yellow-fg} 567"
            }
          }
        ]
      },
      {
        "id": "actions",
        "type": "panel",
        "props": { "title": "Actions" },
        "layout": { "width": "50%" },
        "children": [
          {
            "id": "refresh-btn",
            "type": "button",
            "props": { "label": "[ Refresh ]" },
            "events": [{ "on": "click", "action": { "type": "emit", "data": { "action": "refresh" } } }]
          }
        ]
      }
    ]
  }
}
```

### Form

```json
{
  "version": "1.0",
  "id": "user-form",
  "type": "single",
  "root": {
    "id": "root",
    "type": "panel",
    "props": { "title": "New User" },
    "children": [
      {
        "id": "form",
        "type": "form",
        "props": {
          "fields": [
            { "id": "name", "label": "Name", "type": "text", "required": true },
            { "id": "email", "label": "Email", "type": "text" },
            { "id": "role", "label": "Role", "type": "select", "options": [
              { "label": "Admin", "value": "admin" },
              { "label": "User", "value": "user" }
            ]}
          ],
          "submitLabel": "Create User"
        },
        "events": [{ "on": "submit", "action": { "type": "emit" } }]
      }
    ]
  }
}
```

### Data Table

```json
{
  "version": "1.0",
  "id": "users-table",
  "type": "single",
  "root": {
    "id": "table",
    "type": "table",
    "props": {
      "columns": [
        { "id": "id", "label": "ID", "width": 5 },
        { "id": "name", "label": "Name", "width": 20 },
        { "id": "status", "label": "Status", "width": 10 }
      ],
      "data": [
        ["1", "Alice", "Active"],
        ["2", "Bob", "Pending"],
        ["3", "Carol", "Active"]
      ],
      "selectable": "single"
    },
    "events": [{ "on": "select", "action": { "type": "emit" } }]
  }
}
```

---

## LLM Integration Patterns

### 1. Tool-Based Layout Generation

Give your LLM a tool to generate layouts:

```javascript
const tools = [
  {
    name: "display_layout",
    description: "Display a TUI layout to the user",
    input_schema: {
      type: "object",
      properties: {
        layout: {
          type: "object",
          description: "MoltUI layout definition"
        }
      }
    }
  }
];

// When LLM calls the tool, send the layout
if (toolCall.name === 'display_layout') {
  sendLayout(ws, sessionId, toolCall.input.layout);
}
```

### 2. Template-Based Layouts

Pre-define layout templates, let LLM fill in data:

```javascript
const templates = {
  table: (title, columns, data) => ({
    version: '1.0',
    id: `table-${Date.now()}`,
    type: 'single',
    root: {
      id: 'root',
      type: 'panel',
      props: { title },
      children: [{
        id: 'table',
        type: 'table',
        props: { columns, data }
      }]
    }
  })
};

// LLM outputs: {"template": "table", "title": "Users", "columns": [...], "data": [...]}
```

### 3. Streaming Responses

Send partial messages as they stream:

```javascript
let buffer = '';
for await (const chunk of stream) {
  buffer += chunk;
  sendMessage(ws, sessionId, 'ai', buffer);
}
```

---

## Event Handling

### Event Types

| Event | Trigger | Data |
|-------|---------|------|
| `click` | Mouse click | `{ x, y, button }` |
| `select` | Row/item selected | `{ rowIndex, rowId, rowData }` |
| `change` | Form field changed | `{ fieldId, value }` |
| `submit` | Form submitted | `{ fields: { ... } }` |
| `keypress` | Key pressed | `{ key, ctrl, shift, meta }` |

### Handling Events

```javascript
ws.on('message', (data) => {
  const msg = JSON.parse(data);

  if (msg.method === 'event') {
    const { widgetId, eventType, data } = msg.params;

    // Pass to LLM as context
    const context = `User clicked "${widgetId}" button with data: ${JSON.stringify(data)}`;

    // Or handle directly
    if (data.action === 'refresh') {
      sendLayout(ws, sessionId, generateDashboard());
    }
  }
});
```

---

## Best Practices

1. **Always validate layouts** before sending - invalid layouts are rejected
2. **Use semantic widget IDs** - they appear in events
3. **Keep layouts focused** - one primary task per layout
4. **Provide feedback** - send messages confirming actions
5. **Handle reconnection** - send `history` to restore state
6. **Use themes** - respect user's terminal colors

---

## Full Example: Claude-Powered Backend

See `mock-server/llm-backend.js` for a complete example with:
- Claude integration
- Tool-based layout generation
- Event handling
- Session management
- Error handling

```bash
# Run the example
ANTHROPIC_API_KEY=your-key node mock-server/llm-backend.js
```
