# Research: TUI Interaction Flow

**Feature**: 004-tui-interaction-flow
**Date**: 2026-02-13

## Research Topics

### 1. Response Parsing Strategy

**Decision**: Use regex-based extraction of code blocks from AI responses

**Rationale**:
- Simple and fast for the expected format (markdown code blocks)
- AI responses use consistent ```moltui or ```json fencing
- No need for full markdown AST parsing
- Already have similar logic in bridge.js `extractLayout()`

**Alternatives Considered**:
- Full markdown parser (remark/unified) - Overkill for code block extraction
- State machine parser - More complex, no benefit for this use case

### 2. Interaction Event Structure

**Decision**: Normalize all interactions to a common event structure

```typescript
interface InteractionEvent {
  id: string;              // Unique event ID
  timestamp: number;       // Unix timestamp
  elementId: string;       // Widget ID
  elementType: string;     // button, list, input, checkbox
  eventType: string;       // click, select, submit, toggle
  data: {
    label?: string;        // Button label, item text
    value?: unknown;       // Input value, selected value
    previousValue?: unknown; // For toggles/changes
  };
}
```

**Rationale**:
- Consistent structure simplifies history management
- Captures enough detail for AI to understand context
- Extensible for future widget types

**Alternatives Considered**:
- Widget-specific event shapes - Would complicate history management
- Minimal events (just ID + type) - Insufficient context for AI

### 3. Debounce Implementation

**Decision**: Use trailing-edge debounce with 300ms threshold per element

**Rationale**:
- Prevents context flooding from rapid clicks
- 300ms is fast enough to feel responsive but filters accidental double-clicks
- Per-element debounce allows different elements to be interacted with simultaneously

**Alternatives Considered**:
- Global debounce - Would block legitimate rapid interactions on different elements
- Leading-edge debounce - Would miss the "final" state after rapid changes

### 4. History Window Management

**Decision**: Fixed-size circular buffer of 50 events, FIFO eviction

**Rationale**:
- 50 events covers typical conversation context needs
- Fixed size prevents memory growth
- FIFO ensures most recent events are always available
- Simple implementation with array slice

**Alternatives Considered**:
- Time-based window (last 5 minutes) - Unpredictable size, could grow large
- Dynamic sizing based on token count - Complex, requires token estimation
- LRU cache - Unnecessary complexity for sequential access pattern

### 5. Context Metadata Format

**Decision**: Send interaction context as separate `interactionContext` field in message payload

```json
{
  "jsonrpc": "2.0",
  "method": "chat",
  "params": {
    "sessionId": "...",
    "content": "What did I select?",
    "interactionContext": [
      {
        "id": "evt-123",
        "timestamp": 1707868800000,
        "elementId": "btn-submit",
        "elementType": "button",
        "eventType": "click",
        "data": { "label": "Submit" }
      }
    ]
  }
}
```

**Rationale**:
- Clean separation from message content
- AI can distinguish user text from system context
- Backwards compatible (field can be ignored by older backends)
- Clarified in spec session: structured metadata, not appended text

**Alternatives Considered**:
- Append to message text - Pollutes conversation history, confuses AI
- System prompt injection - Would repeat with every message, wasteful

### 6. Error Indicator Design

**Decision**: Status bar at bottom of TUI panel with dismissible error message

**Rationale**:
- Non-intrusive location (doesn't cover content)
- Consistent with terminal UI conventions
- User can see error without losing previous interface
- Clarified in spec session: error in TUI panel, not chat

**Alternatives Considered**:
- Modal overlay - Blocks interaction, poor UX
- Chat message - Disrupts conversation flow
- Toast notification - blessed doesn't support this pattern well

## Existing Code Analysis

### Current Message Flow

From `src/chat/chat-panel.ts`:
- Messages are added via `addMessage()` which handles streaming updates
- Content is displayed as-is with blessed tags

From `mock-server/bridge.js`:
- `extractLayout()` already parses ```moltui blocks
- Sends both message and layout notifications separately
- Has `finishMessage()` that extracts layout from buffer

### Current Widget Events

From `src/widgets/base-widget.ts`:
- `attachEventHandlers()` maps widget events to blessed events
- Events emit via `eventBus.emit('widget:event', ...)`
- Event data includes layoutId, widgetId, eventType, data

### Current WebSocket Protocol

From `src/connection/websocket-client.ts`:
- `sendChat()` sends `{ sessionId, content }` via notify
- No existing support for metadata fields
- Easy to extend params object

## Dependencies

No new dependencies required. All functionality can be implemented with:
- Existing blessed widget system
- Existing event bus infrastructure
- Standard TypeScript/Node.js APIs

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Bridge doesn't forward metadata | Update bridge to pass through interactionContext field |
| AI ignores interaction context | Ensure system prompt instructs AI to use context |
| Debounce loses important events | Log debounced events for debugging, adjust threshold if needed |
| History overflow edge cases | Implement strict size cap with clear eviction policy |
