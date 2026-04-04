# Tasks: AI-Generated Code Rendering

**Input**: Design documents from `/specs/002-ai-code-render/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests included alongside implementation (vitest).

**Organization**: Tasks grouped by user story. US1 and US2 are combined (both P1, tightly coupled).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [x] T001 Create project directory structure per plan.md layout in src/
- [x] T002 Initialize package.json with TypeScript 5.x and Node.js 20 LTS engine requirement
- [x] T003 [P] Install core dependencies: blessed, isolated-vm, @babel/parser, uuid
- [x] T004 [P] Install dev dependencies: vitest, typescript, @types/node, @types/blessed
- [x] T005 [P] Configure tsconfig.json with strict mode and ES2022 target
- [x] T006 [P] Configure vitest.config.ts for unit and integration tests
- [x] T007 [P] Add .gitignore for node_modules, dist, coverage

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and shared infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Define core type definitions in src/core/types.ts (UserRequest, GeneratedCode, ValidationResult, RenderResult, MoltUIConfig)
- [x] T009 [P] Define AI-related types in src/ai/types.ts (AIConfig, AIPrompt, RetryContext, GenerationMetadata)
- [x] T010 [P] Define interface types in src/interface/types.ts (RenderedInterface, InteractionEvent, EventCallback, ElementUpdate)
- [x] T011 [P] Define validation types in src/validation/types.ts (ValidationError, BlockedPattern, AllowedAPI)
- [x] T012 Create public API type exports in src/index.ts (re-export all public types from contracts/api.ts)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1+2 - Core Rendering & Validation (Priority: P1) 🎯 MVP

**Goal**: Users can describe a TUI in natural language and see it rendered, with all code validated for safety before execution

**Independent Test**: Submit "show a box with hello world" and verify TUI renders; submit malicious code and verify rejection

### Tests for US1+US2

- [x] T013 [P] [US1] Create test fixtures for valid blessed code in tests/fixtures/valid-code/
- [x] T014 [P] [US2] Create test fixtures for invalid/malicious code in tests/fixtures/invalid-code/
- [x] T015 [P] [US1] Unit test for prompt builder in tests/unit/prompt/builder.test.ts
- [x] T016 [P] [US1] Unit test for response parser in tests/unit/prompt/parser.test.ts
- [x] T017 [P] [US2] Unit test for syntax validator in tests/unit/validation/syntax.test.ts
- [x] T018 [P] [US2] Unit test for security validator in tests/unit/validation/security.test.ts
- [x] T019 [P] [US2] Unit test for allowlist validator in tests/unit/validation/allowlist.test.ts
- [x] T020 [P] [US1] Unit test for sandbox execution in tests/unit/sandbox/sandbox.test.ts
- [x] T021 [US1] Integration test for full render flow in tests/integration/render-flow.test.ts

### Implementation for US1+US2

#### Prompt System (US1)

- [x] T022 [P] [US1] Create system prompt template in src/prompt/templates/system.ts
- [x] T023 [P] [US1] Create few-shot examples in src/prompt/templates/examples.ts
- [x] T024 [US1] Implement prompt builder in src/prompt/builder.ts (combines system prompt + examples + user request)
- [x] T025 [US1] Implement response parser in src/prompt/parser.ts (extract code from markdown fences)

#### Validation System (US2)

- [x] T026 [P] [US2] Implement syntax checker using @babel/parser in src/validation/syntax.ts
- [x] T027 [P] [US2] Define blocked patterns (fs, net, child_process, eval) in src/validation/security.ts
- [x] T028 [P] [US2] Define allowed blessed APIs in src/validation/allowlist.ts
- [x] T029 [US2] Implement validation orchestrator in src/validation/code-validator.ts (combines syntax + security + allowlist)

#### AI Client (US1)

- [x] T030 [US1] Implement provider-agnostic AI client interface in src/ai/client.ts
- [x] T031 [US1] Add OpenAI provider implementation in src/ai/providers/openai.ts
- [x] T032 [P] [US1] Add Anthropic provider implementation in src/ai/providers/anthropic.ts

#### Sandbox Execution (US1)

- [x] T033 [US1] Implement isolated-vm sandbox wrapper in src/core/sandbox.ts (memory limit 64MB, timeout 5s)
- [x] T034 [US1] Create blessed API bridge for sandbox in src/core/sandbox-bridge.ts

#### Interface Management (US1)

- [x] T035 [US1] Implement element registry in src/interface/manager.ts (Map<elementId, BlessedElement>)
- [x] T036 [US1] Implement event callback system in src/interface/events.ts
- [x] T037 [US1] Implement programmatic update API in src/interface/updates.ts

#### Core Orchestrator (US1)

- [x] T038 [US1] Implement main renderer orchestrator in src/core/renderer.ts (ties together prompt → AI → validate → sandbox → render)
- [x] T039 [US1] Implement createMoltUI factory function in src/index.ts

**Checkpoint**: MVP complete - users can render TUI from natural language with full validation

---

## Phase 4: User Story 3 - Error Recovery and Feedback Loop (Priority: P2)

**Goal**: When code fails validation or AI returns non-code, system provides clear feedback and retries automatically

**Independent Test**: Trigger validation failure and verify human-readable error; verify auto-retry with error context

### Tests for US3

- [x] T040 [P] [US3] Unit test for retry logic in tests/unit/ai/retry.test.ts
- [x] T041 [P] [US3] Unit test for non-code detection in tests/unit/prompt/parser.test.ts (extend)
- [x] T042 [US3] Integration test for retry flow in tests/integration/retry-flow.test.ts

### Implementation for US3

- [x] T043 [US3] Implement retry orchestrator in src/ai/retry.ts (max 3 attempts, error context injection)
- [x] T044 [US3] Add non-code response detection to src/prompt/parser.ts (detect conversational text)
- [x] T045 [US3] Create error message formatter in src/core/errors.ts (human-readable validation errors)
- [x] T046 [US3] Integrate retry logic into renderer in src/core/renderer.ts (update render flow)
- [x] T047 [US3] Add retry prompt template in src/prompt/templates/retry.ts (includes previous error)

**Checkpoint**: Error recovery complete - system handles failures gracefully with auto-retry

---

## Phase 5: User Story 4 - Prompt Engineering System (Priority: P2)

**Goal**: Well-crafted prompt templates ensure consistent, high-quality AI code generation

**Independent Test**: Compare AI outputs with optimized vs naive prompts, measure success rate

### Tests for US4

- [x] T048 [P] [US4] Unit test for prompt template loading in tests/unit/prompt/templates.test.ts
- [ ] T049 [US4] Integration test for prompt quality in tests/integration/prompt-quality.test.ts (deferred - requires live AI)

### Implementation for US4

- [x] T050 [US4] Add widget-specific examples in src/prompt/templates/examples.ts (table, form, list)
- [x] T051 [US4] Add constraint documentation to system prompt in src/prompt/templates/system.ts
- [x] T052 [US4] Implement prompt template manager in src/prompt/templates/index.ts (load/combine templates)
- [x] T053 [US4] Add terminal context to prompts in src/prompt/builder.ts (width, height, color support)

**Checkpoint**: Prompt engineering complete - consistent code generation across request types

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting all user stories

- [x] T054 [P] Add JSDoc comments to all public API functions in src/index.ts
- [x] T055 [P] Create CLI entry point in src/cli/index.ts (optional CLI wrapper) - already exists at src/cli.ts
- [x] T056 Run all tests and ensure 100% pass rate - 93 tests passing
- [ ] T057 Validate against quickstart.md examples (requires live AI service)
- [ ] T058 Performance profiling - verify <10s end-to-end for basic interface (requires live AI service)
- [x] T059 Security audit - verify 100% of blocked operations are rejected - security tests passing

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ──────────────────────────────────┐
                                                  │
Phase 2: Foundational (BLOCKS all user stories) ◄┘
            │
            ▼
    ┌───────┴───────┐
    ▼               ▼
Phase 3: US1+US2   (Can proceed in parallel if team allows)
(P1 - MVP)
    │
    ▼
Phase 4: US3 ◄──── (Depends on US1+US2 for retry integration)
(P2)
    │
    ▼
Phase 5: US4 ◄──── (Depends on US1 prompt system)
(P2)
    │
    ▼
Phase 6: Polish
```

### User Story Dependencies

- **US1+US2 (P1)**: Can start after Foundational - Core MVP, tightly coupled
- **US3 (P2)**: Depends on US1+US2 - Extends renderer with retry logic
- **US4 (P2)**: Depends on US1 - Enhances prompt templates

### Within Each User Story

- Tests written FIRST (should FAIL before implementation)
- Types/fixtures before implementation
- Low-level components before orchestrators
- Core implementation before integration

### Parallel Opportunities

**Phase 1 (Setup):**
```bash
# All can run in parallel:
T003: Install core dependencies
T004: Install dev dependencies
T005: Configure tsconfig.json
T006: Configure vitest.config.ts
T007: Add .gitignore
```

**Phase 2 (Foundational):**
```bash
# After T008 (core types), these can run in parallel:
T009: AI types
T010: Interface types
T011: Validation types
```

**Phase 3 (US1+US2) Tests:**
```bash
# All test setup can run in parallel:
T013-T020: All unit tests can be written in parallel
```

**Phase 3 (US1+US2) Implementation:**
```bash
# Prompt templates in parallel:
T022: System prompt template
T023: Few-shot examples

# Validation components in parallel:
T026: Syntax checker
T027: Security rules
T028: Allowlist rules

# AI providers in parallel:
T031: OpenAI provider
T032: Anthropic provider
```

---

## Parallel Example: Phase 3 Implementation

```bash
# Launch prompt templates together:
Task: "Create system prompt template in src/prompt/templates/system.ts"
Task: "Create few-shot examples in src/prompt/templates/examples.ts"

# Launch validation components together:
Task: "Implement syntax checker in src/validation/syntax.ts"
Task: "Define blocked patterns in src/validation/security.ts"
Task: "Define allowed blessed APIs in src/validation/allowlist.ts"

# Launch AI providers together:
Task: "Add OpenAI provider in src/ai/providers/openai.ts"
Task: "Add Anthropic provider in src/ai/providers/anthropic.ts"
```

---

## Implementation Strategy

### MVP First (US1+US2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: US1+US2 (Core rendering + validation)
4. **STOP and VALIDATE**: Test with "show a box with hello world"
5. Deploy/demo if ready - this is the MVP!

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1+US2 → Test rendering + validation → **MVP Release**
3. Add US3 → Test retry behavior → Enhanced stability release
4. Add US4 → Test prompt quality → Improved generation release
5. Each story adds value without breaking previous stories

---

## Summary

| Phase | Tasks | Parallel Tasks | User Stories |
|-------|-------|----------------|--------------|
| Setup | 7 | 5 | - |
| Foundational | 5 | 3 | - |
| US1+US2 (MVP) | 27 | 17 | US1, US2 |
| US3 | 8 | 2 | US3 |
| US4 | 6 | 1 | US4 |
| Polish | 6 | 2 | - |
| **Total** | **59** | **30** | **4** |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- US1 and US2 are combined because validation is integral to the render flow
- Tests use vitest - run with `npm test`
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
