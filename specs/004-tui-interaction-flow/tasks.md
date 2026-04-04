# Tasks: TUI Interaction Flow

**Input**: Design documents from `/specs/004-tui-interaction-flow/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/events.md, research.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create type definitions and module structure shared across all user stories

- [x] T001 [P] Create interaction type definitions in `src/types/interaction.ts` (InteractionEvent, InteractionData, InteractionElementType, InteractionEventType, InteractionContext, InteractionHistory)
- [x] T002 [P] Create parsed response types in `src/types/parsed-response.ts` (ParsedResponse interface with text, layout, hasLayout)
- [x] T003 Create interaction module directory structure `src/interaction/` with `index.ts` barrel export

**Checkpoint**: Shared types ready - user story implementation can begin

---

## Phase 2: User Story 1 - Clean Chat Display (Priority: P1) 🎯 MVP

**Goal**: Chat panel displays only conversational text; code blocks are hidden from view

**Independent Test**: Send a message that triggers AI to generate a TUI layout, verify chat shows only conversational text

### Implementation for User Story 1

- [x] T004 [US1] Create `MessageParser` class in `src/chat/message-parser.ts`:
  - `parse(content: string): ParsedResponse` method
  - Regex extraction of ```moltui code blocks
  - Strip code blocks from text, preserve surrounding conversation
  - Handle multiple code blocks in single response
  - Handle responses with no code blocks (text-only)

- [x] T005 [US1] Update `ChatPanel.addMessage()` in `src/chat/chat-panel.ts`:
  - Import and use MessageParser
  - Parse incoming AI messages before display
  - Display only `ParsedResponse.text` in chat
  - Pass `ParsedResponse.layout` to layout rendering (if present)

- [x] T006 [US1] Update chat index exports in `src/chat/index.ts` to include MessageParser

- [x] T007 [US1] Verify message parser handles edge cases:
  - Empty content
  - Text-only responses (no code blocks)
  - Code-only responses (minimal/no text)
  - Multiple code blocks in sequence
  - Inline code (should be preserved, only fenced moltui blocks removed)

**Checkpoint**: Chat displays clean conversational text, code blocks are hidden. User Story 1 complete.

---

## Phase 3: User Story 2 - Silent TUI Rendering (Priority: P2)

**Goal**: TUI renders in right panel without notifications; errors show indicator in TUI panel

**Independent Test**: Ask AI to create an interface, verify it appears silently; send invalid layout, verify previous TUI preserved with error indicator

### Implementation for User Story 2

- [x] T008 [US2] Update `Application.handleLayoutNotification()` in `src/app/application.ts`:
  - Remove any chat notification for TUI renders
  - Call layout renderer directly without status messages
  - Track current layoutId for error preservation

- [x] T009 [US2] Add error indicator component to TUI panel in `src/app/application.ts`:
  - Create status bar element at bottom of layoutContainer
  - Show error message when layout validation/rendering fails
  - Auto-dismiss error after 5 seconds or on successful render
  - Style: subtle, non-blocking (red text or warning icon)

- [x] T010 [US2] Implement graceful failure with layout preservation in `src/app/application.ts`:
  - Catch layout validation errors
  - Catch layout rendering errors
  - Keep previous layout visible on failure
  - Emit `tui:render:error` event per contracts/events.md
  - Emit `tui:render:success` event on success

- [x] T011 [US2] Add event handlers for render status events:
  - Listen for `tui:render:error` to show error indicator
  - Listen for `tui:render:success` to clear error indicator

**Checkpoint**: TUI renders silently, errors show in TUI panel, previous layout preserved on failure. User Story 2 complete.

---

## Phase 4: User Story 3 - Interaction Capture (Priority: P3)

**Goal**: User interactions with TUI elements are captured with full event details

**Independent Test**: Click a button in TUI, verify interaction event is captured with correct ID, type, and label

### Implementation for User Story 3

- [x] T012 [P] [US3] Create `Debouncer` class in `src/interaction/debounce.ts`:
  - Per-element debounce tracking (keyed by elementId + eventType)
  - 300ms threshold (configurable)
  - `shouldProcess(elementId: string, eventType: string): boolean` method
  - Emit `interaction:debounced` event when filtering

- [x] T013 [P] [US3] Create `InteractionHistory` class in `src/interaction/history.ts`:
  - Fixed-size circular buffer (max 50 events, configurable)
  - `add(event: InteractionEvent): void` method with FIFO eviction
  - `getRecent(count?: number): InteractionEvent[]` method
  - `clear(): void` method
  - Events ordered by timestamp ascending

- [x] T014 [US3] Create `InteractionCapture` class in `src/interaction/capture.ts`:
  - Listen to `widget:interaction` events from event bus
  - Normalize events to `InteractionEvent` structure
  - Generate unique event IDs (format: `evt-{timestamp}-{random}`)
  - Apply debouncer before adding to history
  - Emit `interaction:captured` event after successful capture

- [x] T015 [US3] Update `BaseWidget` in `src/widgets/base-widget.ts`:
  - Ensure `widget:interaction` events include all required fields per contracts/events.md:
    - layoutId, widgetId, widgetType, eventType, data (label, value, previousValue, index), timestamp
  - Verify button, list, input, checkbox widgets emit correctly

- [x] T016 [US3] Update interaction module exports in `src/interaction/index.ts`:
  - Export Debouncer, InteractionHistory, InteractionCapture
  - Export type definitions

- [x] T017 [US3] Initialize InteractionCapture in `src/app/application.ts`:
  - Create InteractionCapture instance during app initialization
  - Connect to event bus
  - Store reference for use by context builder

**Checkpoint**: Button clicks, list selections, input submissions, and checkbox toggles are captured. User Story 3 complete.

---

## Phase 5: User Story 4 - AI Interaction Awareness (Priority: P4)

**Goal**: Interaction history is sent to AI as context; AI can reference user actions

**Independent Test**: Click a button, ask "what did I click?", verify AI correctly identifies the button

### Implementation for User Story 4

- [x] T018 [US4] Create `InteractionContextBuilder` class in `src/interaction/context.ts`:
  - `build(history: InteractionHistory, layoutId?: string): InteractionContext` method
  - Include recent events from history
  - Include current layoutId if available
  - Generate brief layoutSummary from current TUI state

- [x] T019 [US4] Update `WebSocketClient.sendChat()` in `src/connection/websocket-client.ts`:
  - Accept optional `interactionContext` parameter
  - Include `interactionContext` field in JSON-RPC params per contracts/events.md
  - Maintain backwards compatibility (field is optional)

- [x] T020 [US4] Update `Application.handleChatSubmit()` in `src/app/application.ts`:
  - Build interaction context before sending message
  - Pass context to WebSocketClient.sendChat()

- [x] T021 [US4] Update bridge to forward interaction context in `mock-server/bridge.js`:
  - Pass through `interactionContext` field from MoltUI to backend
  - Include context in system prompt or message metadata for AI
  - Format context as human-readable summary for AI consumption

- [x] T022 [US4] Update interaction module exports in `src/interaction/index.ts`:
  - Export InteractionContextBuilder

**Checkpoint**: AI receives interaction context and can reference user actions in responses. User Story 4 complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T023 [P] Add debug logging for interaction capture (DEBUG=moltui:interaction)
- [x] T024 [P] Add debug logging for message parsing (DEBUG=moltui:parser)
- [x] T025 Verify integration: full flow from chat → AI → TUI → interaction → context → AI awareness
- [x] T026 Run quickstart.md validation scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (US1)**: Depends on Phase 1 types
- **Phase 3 (US2)**: Depends on Phase 1 types, independent of US1
- **Phase 4 (US3)**: Depends on Phase 1 types, independent of US1/US2
- **Phase 5 (US4)**: Depends on Phase 4 (needs InteractionHistory)
- **Phase 6 (Polish)**: Depends on all user stories complete

### Parallel Opportunities

Within Phase 1:
- T001 and T002 can run in parallel

Within Phase 4 (US3):
- T012 and T013 can run in parallel (no dependencies)

Across Phases (after Phase 1):
- US1 (Phase 2) and US2 (Phase 3) can run in parallel
- US1 (Phase 2) and US3 (Phase 4) can run in parallel
- US2 (Phase 3) and US3 (Phase 4) can run in parallel

### User Story Independence

- **US1**: Requires only message parser, no dependencies on other stories
- **US2**: Requires only render error handling, no dependencies on other stories
- **US3**: Requires interaction capture system, no dependencies on US1/US2
- **US4**: Requires US3 (interaction history) to build context

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: US1 - Clean Chat Display (T004-T007)
3. **STOP and VALIDATE**: Chat shows only text, code blocks hidden
4. Deploy/demo if ready

### Full Feature

1. Setup → US1 → Validate clean chat
2. US2 → Validate silent rendering + error indicator
3. US3 → Validate interaction capture
4. US4 → Validate AI awareness
5. Polish → Full integration test

---

## Notes

- Debounce threshold (300ms) is configurable in Debouncer class
- History size (50 events) is configurable in InteractionHistory class
- All interaction events follow the structure defined in contracts/events.md
- Error indicator appears in TUI panel status bar, not in chat
- Interaction context is sent as structured metadata, not appended to message text
