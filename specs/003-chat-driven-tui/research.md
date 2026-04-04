# Research: Chat-Driven TUI

**Feature**: 003-chat-driven-tui
**Date**: 2026-02-11

## Research Questions Resolved

### 1. How to bridge ChatPanel with AI Code Generation?

**Decision**: Replace JSON-RPC WebSocketClient with direct MoltUI renderer integration in Application class.

**Rationale**:
- The existing `WebSocketClient` in `src/connection/` expects a specific JSON-RPC protocol with `init`, `layout`, `message` notifications
- The `chatgpt-websocket` backend uses a simpler `{type: "chat", message}` → `{type: "chunk/done/error"}` protocol
- The `MoltUI` class in `src/core/renderer.ts` already handles the full flow: prompt building → AI call → validation → sandbox execution

**Alternatives Considered**:
- Adapter pattern to make chatgpt-websocket speak JSON-RPC: Rejected - adds complexity, changes backend
- Create new WebSocket client specific to chat-driven mode: Rejected - duplicates existing MoltUI renderer logic

**Implementation**: Modify `src/app/application.ts` to:
1. Remove dependency on JSON-RPC `WebSocketClient`
2. Create `MoltUI` instance with websocket provider config
3. On `chat:send` event, call `moltui.render(message)` with accumulated context
4. Parse response to extract chat text vs interface code

### 2. How to maintain conversation context for AI?

**Decision**: Build conversation history into AI prompts using existing prompt builder with context extension.

**Rationale**:
- AI needs to know: previous messages, current interface state, recent interactions
- The `buildPrompt()` function in `src/prompt/builder.ts` already supports context
- Chat history can be serialized and included in system prompt

**Alternatives Considered**:
- Store context on backend: Rejected - chatgpt-websocket is stateless per connection
- Use separate context API: Rejected - over-engineering for local app

**Implementation**:
1. Extend `PromptOptions` to accept `conversationHistory: ChatMessage[]`
2. Extend `PromptOptions` to accept `currentInterface: string` (serialized)
3. Extend `PromptOptions` to accept `recentInteractions: InteractionEvent[]`
4. Modify system prompt template to include these

### 3. How to detect chat-only vs interface-generation responses?

**Decision**: Use existing `isCodeResponse()` and `parseResponse()` from `src/prompt/parser.ts`.

**Rationale**:
- Already implemented: detects code blocks, extracts code vs text
- Returns `{ hasCode, code, explanation }` structure
- Can show explanation in chat, render code in interface

**Alternatives Considered**:
- Ask AI to use structured JSON response: Rejected - reduces naturalness
- Always regenerate interface: Rejected - wasteful for clarifying questions

**Implementation**: No changes needed to parser. Application flow:
1. Get AI response
2. Call `parseResponse(response)`
3. If `hasCode`: validate and render code, show explanation in chat
4. If no code: show full response in chat, keep current interface

### 4. How to persist chat history to local file?

**Decision**: JSON file at `~/.moltui/history.json` with debounced writes.

**Rationale**:
- Simple, portable, human-readable
- Debounced writes prevent excessive I/O
- Standard location for CLI app data

**Alternatives Considered**:
- SQLite: Rejected - overkill for chat history
- Session-only: Rejected - user requested persistence

**Implementation**:
```typescript
interface ChatHistoryStore {
  messages: ChatMessage[];
  lastUpdated: number;
}

// Functions:
// - loadChatHistory(): Promise<ChatMessage[]>
// - saveChatHistory(messages: ChatMessage[]): Promise<void> // debounced
// - clearChatHistory(): Promise<void>
```

### 5. How to save/load interfaces by name?

**Decision**: JSON files at `~/.moltui/interfaces/{name}.json` containing serialized interface state.

**Rationale**:
- One file per saved interface, easy to list/manage
- Contains: name, generated code, chat context at save time
- Natural language parsing for commands: "save as dashboard", "load dashboard"

**Alternatives Considered**:
- Single file with all interfaces: Rejected - harder to manage, larger file
- Store in chat history: Rejected - conflates concerns

**Implementation**:
```typescript
interface SavedInterface {
  name: string;
  code: string;
  chatContext: ChatMessage[]; // messages leading to this interface
  savedAt: number;
}

// Functions:
// - saveInterface(name: string, state: SavedInterface): Promise<void>
// - loadInterface(name: string): Promise<SavedInterface | null>
// - listInterfaces(): Promise<string[]>
// - deleteInterface(name: string): Promise<void>
```

### 6. How to communicate interactions to AI?

**Decision**: Track recent interactions in memory, include in prompt context.

**Rationale**:
- AI needs to know what user did to provide contextual help
- Keep last N interactions (e.g., 10) to avoid prompt bloat
- Format as natural language: "User selected 'Item 3' in list 'todo-list'"

**Alternatives Considered**:
- Send interactions immediately to backend: Rejected - chatgpt-websocket doesn't support streaming context
- Store all interactions: Rejected - unbounded growth

**Implementation**:
```typescript
interface InteractionEvent {
  elementId: string;
  elementType: string;
  eventType: string; // click, select, input, submit
  value?: unknown;
  timestamp: number;
}

// Track in Application class, include in prompt
```

## Technology Decisions

| Area | Decision | Reason |
|------|----------|--------|
| Chat-AI Bridge | Direct MoltUI renderer | Reuses existing validated flow |
| Context Management | Prompt extension | Stateless, simple |
| Response Parsing | Existing parser | Already handles code detection |
| Chat Persistence | JSON file + debounce | Simple, portable |
| Interface Persistence | Per-name JSON files | Easy management |
| Interaction Tracking | In-memory ring buffer | Bounded, recent-only |

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| AI response too slow | Show streaming indicator, partial responses in chat |
| Context too large for prompt | Summarize old messages, limit interaction history |
| Invalid code crashes app | Existing validation + sandbox already handles this |
| File I/O errors | Graceful fallback, log warnings, continue without persistence |
