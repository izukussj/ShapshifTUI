# Implementation Plan: MoltUI - Decoupled TUI Shapeshifting Interface

**Branch**: `001-moltui-tui-framework` | **Date**: 2026-02-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-moltui-tui-framework/spec.md`

## Summary

MoltUI is a chat-integrated Terminal User Interface (TUI) framework that enables AI assistants to present information through dynamically-generated interactive interfaces. The system consists of two main panels: a chat history panel (left, 30-40%) and a shapeshifting layout renderer (right, 60-70%) that displays widgets like tables, forms, dashboards, and charts. Communication with AI backends occurs via WebSocket using a JSON-RPC 2.0 style protocol, with the backend URL configured via `MOLTUI_BACKEND` environment variable.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS
**Primary Dependencies**:
- blessed (TUI rendering)
- ws (WebSocket client)
- ajv (JSON Schema validation)
**Storage**: N/A (stateless client; AI backend manages chat history)
**Testing**: Vitest (unit/integration), blessed-contrib for TUI testing
**Target Platform**: Cross-platform terminal (macOS, Linux, Windows WSL), SSH-compatible
**Project Type**: Single CLI application (monorepo with packages)
**Performance Goals**:
- Render dashboard in <500ms (SC-002)
- 60 updates/sec scrolling (SC-004)
- <100ms scroll response for 10k rows (SC-005)
**Constraints**:
- <50MB memory (SC-008)
- 30-second AI response timeout
- 80x24 minimum terminal size
**Scale/Scope**: Single-user TUI client connecting to one AI backend per session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Project constitution (`constitution.md`) contains template placeholders and has not been customized for MoltUI. Proceeding with industry-standard best practices:

| Principle | Status | Notes |
|-----------|--------|-------|
| Test-First Development | WILL COMPLY | Vitest for unit/integration tests |
| Type Safety | WILL COMPLY | TypeScript strict mode |
| Documentation | WILL COMPLY | JSDoc + quickstart guide |
| Simplicity | WILL COMPLY | Single package initially, split only if needed |

**Gate Status**: PASS (no custom constitution constraints to violate)

## Project Structure

### Documentation (this feature)

```text
specs/001-moltui-tui-framework/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (JSON schemas, protocol definitions)
│   ├── layout-definition.schema.json
│   ├── widget.schema.json
│   ├── event.schema.json
│   └── protocol.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── cli/                 # CLI entry point and argument parsing
│   └── index.ts
├── client/              # WebSocket client and session management
│   ├── connection.ts
│   ├── session.ts
│   └── protocol.ts
├── renderer/            # TUI rendering engine
│   ├── app.ts           # Main blessed application
│   ├── layout.ts        # Layout calculation (flexbox-style)
│   └── theme.ts         # Color and style management
├── widgets/             # Widget implementations
│   ├── base.ts          # Base widget class
│   ├── table.ts
│   ├── list.ts
│   ├── form.ts
│   ├── chart.ts
│   ├── panel.ts
│   ├── tabs.ts
│   ├── text.ts
│   ├── modal.ts
│   ├── progress-bar.ts
│   ├── status-bar.ts
│   └── notification.ts
├── chat/                # Chat panel implementation
│   ├── history.ts
│   ├── input.ts
│   └── message.ts
├── events/              # Event handling and serialization
│   ├── handler.ts
│   ├── serializer.ts
│   └── queue.ts
├── validation/          # JSON Schema validation
│   ├── validator.ts
│   └── schemas/
└── types/               # TypeScript type definitions
    ├── layout.ts
    ├── widget.ts
    ├── event.ts
    └── protocol.ts

tests/
├── unit/                # Unit tests for individual modules
│   ├── widgets/
│   ├── validation/
│   └── events/
├── integration/         # Integration tests
│   ├── protocol/
│   └── rendering/
└── fixtures/            # Test fixtures (sample layouts, events)
    ├── layouts/
    └── events/
```

**Structure Decision**: Single project structure with logical module separation. The `src/` directory is organized by responsibility (client, renderer, widgets, chat, events, validation). This keeps the codebase simple while allowing clear separation of concerns. A monorepo with separate packages may be considered post-v1.0 if schema/protocol needs to be shared with backend implementations.

## Complexity Tracking

No constitution violations to justify. Design follows simplicity principles with:
- Single entry point (`src/cli/index.ts`)
- No external database or persistence layer
- Stateless rendering (AI backend owns state)
- Standard WebSocket for transport (no custom protocols)
