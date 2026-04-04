# Implementation Plan: AI-Generated Code Rendering

**Branch**: `002-ai-code-render` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-ai-code-render/spec.md`

## Summary

MoltUI enables developers to create TUI interfaces by describing them in natural language. Instead of pre-built widgets, the system sends optimized prompts to an AI service which generates blessed (TUI library) code. The generated code is validated for safety (no file I/O, network, or process spawning) and correctness before being executed in a sandboxed environment. Rendered interfaces are fully interactive with event callbacks for user actions and support programmatic updates without regeneration.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS
**Primary Dependencies**: blessed (TUI rendering), vm2 or isolated-vm (sandboxing), AI SDK (provider-agnostic)
**Storage**: N/A (stateless rendering, no persistence required)
**Testing**: vitest (unit/integration tests)
**Target Platform**: Node.js CLI applications (terminal environments)
**Project Type**: single (library with CLI interface)
**Performance Goals**: <10s end-to-end for basic interface, <2s validation feedback
**Constraints**: Sandboxed execution must block all I/O operations, 3 retry attempts default
**Scale/Scope**: Single-user CLI tool, interfaces up to ~50 elements

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> **Note**: Project constitution (`constitution.md`) contains placeholder template. Proceeding with standard best practices:

| Principle | Status | Notes |
|-----------|--------|-------|
| Library-First | PASS | MoltUI is a standalone library, independently testable |
| CLI Interface | PASS | Exposes functionality via programmatic API and CLI |
| Test-First | ADVISORY | Tests will be written alongside implementation |
| Security | PASS | Sandboxed execution addresses code execution risks |
| Simplicity | PASS | Single library, no unnecessary abstractions |

**Gate Status**: PASS - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/002-ai-code-render/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── renderer.ts          # Main orchestrator
│   ├── sandbox.ts           # Sandboxed code execution
│   └── types.ts             # Shared type definitions
├── prompt/
│   ├── builder.ts           # Prompt construction
│   ├── templates/           # Prompt templates
│   └── parser.ts            # Response parsing (code extraction)
├── validation/
│   ├── validator.ts         # Code validation orchestrator
│   ├── syntax.ts            # Syntax checking
│   ├── security.ts          # Security rules (blocked operations)
│   └── allowlist.ts         # Approved TUI constructs
├── ai/
│   ├── client.ts            # AI service client (provider-agnostic)
│   ├── retry.ts             # Retry logic with error context
│   └── types.ts             # AI-related types
├── interface/
│   ├── manager.ts           # Rendered interface lifecycle
│   ├── events.ts            # Event callback system
│   └── updates.ts           # Programmatic update API
└── index.ts                 # Public API exports

tests/
├── unit/
│   ├── validation/          # Validator unit tests
│   ├── prompt/              # Prompt builder tests
│   └── sandbox/             # Sandbox isolation tests
├── integration/
│   ├── render-flow.test.ts  # End-to-end render tests
│   ├── ai-client.test.ts    # AI integration tests (mocked)
│   └── events.test.ts       # Event callback tests
└── fixtures/
    ├── valid-code/          # Sample valid blessed code
    └── invalid-code/        # Sample invalid/malicious code
```

**Structure Decision**: Single project structure selected. MoltUI is a library exposing a programmatic API for TUI generation. The structure separates concerns: prompt engineering, validation, sandboxed execution, and interface management.

## Complexity Tracking

No violations requiring justification. Structure follows single-library principle with clear module boundaries.
