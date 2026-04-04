# Quickstart: TUI Interaction Flow

**Feature**: 004-tui-interaction-flow
**Date**: 2026-02-13

## Overview

This feature implements bidirectional interaction between chat and TUI:
- Chat shows only conversational text (code blocks hidden)
- TUI renders silently in the right panel
- User interactions are captured and sent to AI as context
- AI can reference what the user did in the TUI

## Prerequisites

- MoltUI built and running (`npm run build`)
- Bridge server running (`npm run bridge`)
- Backend WebSocket server (mock or chatgpt-websocket)

## Quick Test

```bash
# Terminal 1: Start backend
npm run mock-server

# Terminal 2: Run MoltUI
npm run demo
```

## Testing the Feature

### 1. Clean Chat Display (P1)

Ask the AI to create an interface and verify the code block is hidden:

```
You: "Create a simple form with a submit button"
AI: "Here's a form for you." ← Only this text appears in chat
TUI: [Form renders in right panel]
```

The `moltui` code block should NOT appear in the chat.

### 2. Silent TUI Rendering (P2)

Verify no status messages appear when TUI updates:

```
You: "Add a cancel button"
AI: "Done, I've added a cancel button."
TUI: [Form updates with cancel button - no "Loading..." message]
```

### 3. Interaction Capture (P3)

Click buttons in the TUI, then ask:

```
[Click "Submit" button in TUI]
You: "What did I just click?"
AI: "You clicked the Submit button."
```

### 4. AI Interaction Awareness (P4)

Make multiple interactions, then ask for a summary:

```
[Select several items in a list]
[Toggle some checkboxes]
You: "What have I selected so far?"
AI: "You've selected items A, B, and D, and toggled checkboxes 1 and 3."
```

## Key Files

| File | Purpose |
|------|---------|
| `src/chat/message-parser.ts` | Extracts text and layout from AI responses |
| `src/interaction/capture.ts` | Captures widget interaction events |
| `src/interaction/history.ts` | Manages rolling window of events |
| `src/interaction/context.ts` | Builds context for AI messages |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Debounce threshold | 300ms | Minimum time between same-element interactions |
| History size | 50 events | Maximum interactions to include in context |

## Debugging

Enable debug logging to see interaction capture:

```bash
DEBUG=moltui:interaction npm run demo
```

This shows:
- Each captured interaction
- Debounced (filtered) interactions
- Context sent with messages

## Common Issues

### TUI not updating

Check that the layout is valid JSON in the `moltui` code block. Invalid layouts preserve the previous TUI and show an error indicator.

### AI not aware of interactions

Ensure:
1. Bridge is forwarding `interactionContext` field
2. Backend system prompt includes instructions to use context
3. Interactions are being captured (check debug logs)

### Rapid clicks ignored

This is intentional - 300ms debounce filters accidental double-clicks. Only the last interaction within the debounce window is captured.
