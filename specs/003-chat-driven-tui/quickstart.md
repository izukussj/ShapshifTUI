# Quickstart: Chat-Driven TUI

**Feature**: 003-chat-driven-tui
**Date**: 2026-02-11

## Prerequisites

1. Node.js 20 LTS or later
2. Terminal with TUI support (most modern terminals work)
3. ChatGPT access token (from Codex CLI auth)

## Installation

```bash
# Clone and install
git clone <repo>
cd MoltUI
npm install

# Build
npm run build
```

## Running the Application

### 1. Start the AI Backend

```bash
# Get your token from Codex CLI auth
TOKEN=$(node -e "console.log(require('$HOME/.codex/auth.json').tokens.access_token)")

# Start the WebSocket backend
npx chatgpt-websocket token=$TOKEN port=8181
```

### 2. Start MoltUI

In a separate terminal:

```bash
# Run with default backend (ws://localhost:8181)
npx tsx src/cli.ts

# Or specify a different backend
npx tsx src/cli.ts ws://localhost:8080
```

## Usage

### Basic Interface Creation

Type natural language descriptions to create interfaces:

```
> Create a dashboard with a centered hello world message
```

The AI will generate and display the interface on the right panel.

### Modifying Interfaces

Continue the conversation to modify the interface:

```
> Add a border around the box
> Change the color to blue
> Add a clock in the top right corner
```

### Interacting with Elements

Generated interfaces are interactive:

```
> Create a todo list with 3 items
```

Then interact with the list (select items, add new ones). The AI knows about your interactions:

```
> What did I just select?
```

### Saving and Loading

Save your interface for later:

```
> Save this as my-dashboard
```

Load it in a future session:

```
> Load my-dashboard
```

List saved interfaces:

```
> What interfaces do I have saved?
```

### Navigation

- **Tab**: Switch focus between chat and interface panels
- **Enter**: Send chat message (when focused on chat input)
- **q** or **Ctrl+C**: Quit application

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MOLTUI_BACKEND` | WebSocket backend URL | `ws://localhost:8181` |

### Storage Locations

| Data | Location |
|------|----------|
| Chat history | `~/.moltui/history.json` |
| Saved interfaces | `~/.moltui/interfaces/*.json` |

## Troubleshooting

### "Backend connection failed"

1. Ensure the chatgpt-websocket backend is running
2. Check the port matches (default 8181)
3. Verify your token is valid

### "Interface generation failed"

The AI sometimes generates invalid code. It will automatically retry up to 3 times. If it still fails, try:

1. Simplify your request
2. Be more specific about what you want
3. Ask "What went wrong?" for details

### "Terminal too small"

MoltUI requires at least 80x24 terminal size. Resize your terminal window.

## Development

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

### Type Checking

```bash
npm run typecheck
```
