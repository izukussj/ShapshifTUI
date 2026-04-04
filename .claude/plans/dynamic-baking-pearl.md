# Plan: Chat-Driven TUI (003-chat-driven-tui)

## Summary

Build a split-panel TUI where users chat with AI on the left, and the AI generates/updates a blessed interface on the right in real-time. Bridges existing chat panel, layout system, and AI code generation into a unified conversational interface builder.

## Key Files to Modify

1. **`src/app/application.ts`** - Replace JSON-RPC client with MoltUI renderer integration
2. **`src/cli.ts`** - Already updated, minor refinements for persistence
3. **`src/chat/chat-panel.ts`** - Minor: add loading indicator support
4. **`src/prompt/builder.ts`** - Extend to accept conversation context
5. **`src/prompt/templates/system.ts`** - Add conversation context to prompt

## New Files to Create

1. **`src/storage/chat-history.ts`** - Chat persistence to ~/.moltui/history.json
2. **`src/storage/interface-store.ts`** - Save/load interfaces to ~/.moltui/interfaces/
3. **`src/storage/index.ts`** - Storage module exports
4. **`tests/unit/storage/`** - Storage unit tests
5. **`tests/integration/chat-driven-flow.test.ts`** - E2E flow test

## Implementation Phases

### Phase 1: Core Integration (P1)
- Wire ChatPanel → MoltUI.render() flow
- Show AI responses in chat while rendering interface
- Handle validation failures gracefully

### Phase 2: Interaction Awareness (P2)
- Capture interface element events
- Build interaction context ring buffer
- Include interaction history in prompts

### Phase 3: Persistence (P3)
- Chat history storage (debounced writes)
- Interface save/load commands
- Natural language command parsing

### Phase 4: Polish (P4)
- Focus management and visual indicators
- Keyboard shortcut refinements
- Terminal resize handling

## Verification

1. Start backend: `TOKEN=$(...) npx chatgpt-websocket token=$TOKEN port=8181`
2. Run app: `npx tsx src/cli.ts`
3. Type: "Create a hello world box" → interface appears on right
4. Type: "Add a border" → interface updates
5. Type: "Save as test" → saved to disk
6. Restart, type: "Load test" → interface restored

## Generated Artifacts

- `/specs/003-chat-driven-tui/plan.md` - Implementation plan
- `/specs/003-chat-driven-tui/research.md` - Technical decisions
- `/specs/003-chat-driven-tui/data-model.md` - Entity definitions
- `/specs/003-chat-driven-tui/contracts/events.md` - Internal event contracts
- `/specs/003-chat-driven-tui/quickstart.md` - User guide
