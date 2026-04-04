# Implementation Plan: Chat-Driven TUI

**Branch**: `003-chat-driven-tui` | **Date**: 2026-02-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-chat-driven-tui/spec.md`

## Summary

Build a split-panel TUI application where users chat with an AI on the left panel, and the AI generates/updates a blessed TUI interface on the right panel in real-time. The system bridges the existing chat panel, layout system, and AI code generation components into a unified conversational interface builder.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS
**Primary Dependencies**: blessed (TUI), ws (WebSocket), @babel/parser (validation), isolated-vm (sandbox)
**Storage**: Local JSON files for chat history and saved interfaces
**Testing**: Vitest
**Target Platform**: Terminal (Node.js CLI)
**Project Type**: Single project (existing structure)
**Performance Goals**: <2s AI response start, <1s interface render after generation
**Constraints**: Must work with chatgpt-websocket backend, terminal ≥80x24
**Scale/Scope**: Single user, local execution

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution is a template without defined principles. No specific gates to enforce.

**Status**: ✅ PASS (no active constraints)

## Project Structure

### Documentation (this feature)

```text
specs/003-chat-driven-tui/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (internal events, no external API)
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── ai/                  # AI client providers (exists)
│   ├── base-client.ts
│   ├── client.ts
│   ├── providers/
│   │   ├── websocket.ts # chatgpt-websocket integration (exists)
│   │   ├── openai.ts
│   │   └── anthropic.ts
│   └── types.ts
├── app/                 # Application shell (modify)
│   ├── application.ts   # Main app - needs integration work
│   └── index.ts
├── chat/                # Chat panel (exists, minor modifications)
│   ├── chat-panel.ts
│   └── index.ts
├── connection/          # WebSocket client (exists - for JSON-RPC)
├── core/                # Core systems (exists)
│   ├── renderer.ts      # AI code generation orchestrator
│   ├── sandbox.ts       # Sandboxed execution
│   └── sandbox-bridge.ts
├── events/              # Event bus (exists)
├── interface/           # Interface management (exists)
│   ├── manager.ts
│   ├── events.ts
│   └── updates.ts
├── layout/              # Layout management (exists)
├── prompt/              # AI prompt engineering (exists)
├── storage/             # NEW: Persistence layer
│   ├── chat-history.ts  # Chat history persistence
│   └── interface-store.ts # Saved interfaces
├── theme/               # Theming (exists)
├── types/               # Type definitions (exists)
├── validation/          # Code validation (exists)
├── widgets/             # Widget system (exists)
├── cli.ts               # CLI entry point (modify)
├── index.ts             # Library exports
└── specs-types.ts       # Public API types

tests/
├── unit/
│   ├── storage/         # NEW: Storage tests
│   └── ... (existing)
├── integration/
│   └── chat-driven-flow.test.ts  # NEW: E2E chat flow tests
└── fixtures/
```

**Structure Decision**: Single project structure. Extends existing `src/` with new `storage/` module for persistence. Main integration work in `src/app/application.ts` to bridge chat panel with AI code generation.

## Key Integration Points

### 1. Bridge Chat Panel → AI Code Generation

The existing `Application` class expects a JSON-RPC backend. Need to replace with direct AI code generation:

```
User types in chat → ChatPanel emits 'chat:send' →
Application intercepts → Calls MoltUI.render() →
AI generates code → Validate → Execute in sandbox →
Render interface in right panel → Show AI response in chat
```

### 2. Event Flow for Interaction Awareness

```
User interacts with interface → Element event fires →
Event captured and serialized → Added to AI context →
Next AI request includes interaction history →
AI can reference "You clicked X" in responses
```

### 3. Persistence Layer

- **Chat History**: JSON file at `~/.moltui/history.json`
- **Saved Interfaces**: JSON files at `~/.moltui/interfaces/{name}.json`
- Load on startup, save on change (debounced)

## Complexity Tracking

No constitution violations to justify.

## Implementation Strategy

### Phase 1: Core Integration (P1 - Conversational Interface Creation)

1. Create unified Application that uses MoltUI renderer instead of JSON-RPC client
2. Wire ChatPanel to AI code generation flow
3. Display AI responses in chat while rendering interface
4. Handle validation failures gracefully

### Phase 2: Interaction Awareness (P2)

1. Capture interface element events
2. Build interaction context for AI
3. Include interaction history in prompts

### Phase 3: Persistence (P3)

1. Implement chat history storage
2. Implement interface save/load commands
3. Parse natural language commands ("save as X", "load X")

### Phase 4: Polish (P4)

1. Focus management and visual indicators
2. Keyboard shortcuts
3. Terminal resize handling
