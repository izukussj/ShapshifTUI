# Implementation Plan: TUI Interaction Flow

**Branch**: `004-tui-interaction-flow` | **Date**: 2026-02-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-tui-interaction-flow/spec.md`

## Summary

Implement a bidirectional interaction flow between chat and TUI panels. The chat displays only conversational text (hiding code blocks), while the TUI panel silently renders AI-generated interfaces. User interactions with the TUI (clicks, selections, inputs) are captured and sent to the AI as structured metadata, enabling the AI to reference user actions in subsequent responses.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS
**Primary Dependencies**: blessed (TUI), ws (WebSocket), existing MoltUI widget system
**Storage**: In-memory interaction history (session-only, rolling window of 50 events)
**Testing**: Vitest
**Target Platform**: Terminal (Node.js CLI)
**Project Type**: Single project (extends existing MoltUI structure)
**Performance Goals**: <100ms interaction capture, <1s response parsing, <500ms TUI render
**Constraints**: Must integrate with existing bridge/backend architecture, 300ms debounce on interactions
**Scale/Scope**: Single user, 50+ messages per session, 20+ interactions per minute

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution is a template without defined principles. No specific gates to enforce.

**Status**: ✅ PASS (no active constraints)

## Project Structure

### Documentation (this feature)

```text
specs/004-tui-interaction-flow/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── events.md        # Interaction event contract
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── application.ts      # MODIFY: Add interaction context to messages
├── chat/
│   ├── chat-panel.ts       # MODIFY: Strip code blocks from display
│   ├── message-parser.ts   # NEW: Parse AI responses, extract text vs layout
│   └── index.ts
├── interaction/            # NEW: Interaction capture system
│   ├── capture.ts          # Event capture and normalization
│   ├── history.ts          # Rolling window history management
│   ├── debounce.ts         # Interaction debouncing
│   ├── context.ts          # Build context for AI messages
│   └── index.ts
├── widgets/
│   └── base-widget.ts      # MODIFY: Emit structured interaction events
├── connection/
│   └── websocket-client.ts # MODIFY: Include interaction metadata in messages
└── types/
    └── interaction.ts      # NEW: Interaction event types

tests/
├── unit/
│   ├── interaction/        # NEW: Interaction module tests
│   │   ├── capture.test.ts
│   │   ├── history.test.ts
│   │   └── debounce.test.ts
│   └── chat/
│       └── message-parser.test.ts  # NEW: Parser tests
└── integration/
    └── interaction-flow.test.ts    # NEW: E2E interaction tests
```

**Structure Decision**: Single project structure. Adds new `src/interaction/` module for interaction capture and context building. Modifies existing chat panel for message parsing, and widgets for event emission.

## Key Integration Points

### 1. Response Parsing Flow

```
AI Response (text + ```moltui block) →
MessageParser.parse() →
  - Extract conversational text (strip code blocks)
  - Extract TUI layout (if present)
→ Chat displays text only
→ TUI renders layout silently
```

### 2. Interaction Capture Flow

```
User clicks button/selects item/submits input →
Widget emits 'widget:interaction' event →
InteractionCapture normalizes event →
Debouncer filters rapid repeats →
InteractionHistory stores event (rolling window) →
Ready for next AI message
```

### 3. Context Injection Flow

```
User sends chat message →
InteractionContext.build() collects recent history →
WebSocketClient sends message with metadata:
  {
    content: "user message",
    interactionContext: [ ...recent events ]
  }
→ AI receives full context
```

### 4. Error Display Flow

```
TUI render fails →
Keep previous TUI visible →
Show error indicator in TUI panel status bar →
No chat message (silent failure)
```

## Complexity Tracking

No constitution violations to justify.

## Implementation Strategy

### Phase 1: Response Parsing (P1 - Clean Chat Display)

1. Create MessageParser to separate text from layout blocks
2. Update ChatPanel to use parsed text only
3. Update bridge to handle layout extraction separately
4. Test with responses containing both text and layouts

### Phase 2: Silent Rendering (P2)

1. Remove any chat notifications for TUI renders
2. Add error indicator component to TUI panel
3. Implement graceful failure with previous TUI preservation
4. Test seamless updates and error handling

### Phase 3: Interaction Capture (P3)

1. Create interaction module with capture, history, debounce
2. Update widgets to emit structured interaction events
3. Implement rolling window history (50 events max)
4. Add 300ms debounce for rapid interactions
5. Test capture for all widget types

### Phase 4: AI Context Integration (P4)

1. Create InteractionContext builder
2. Update WebSocketClient to include metadata field
3. Update bridge to forward interaction context to backend
4. Test AI awareness of interactions
