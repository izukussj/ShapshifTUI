# Tasks: MoltUI - Decoupled TUI Shapeshifting Interface

**Input**: Design documents from `/specs/001-moltui-tui-framework/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the specification. Test tasks are excluded.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (per plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project directory structure per plan.md in src/
- [x] T002 Initialize Node.js project with package.json (name: moltui, type: module)
- [x] T003 [P] Configure TypeScript 5.x with tsconfig.json (strict mode, ES2022 target)
- [x] T004 [P] Install production dependencies: blessed, blessed-contrib, ws, ajv, fast-json-patch
- [x] T005 [P] Install dev dependencies: typescript, vitest, tsup, @types/blessed, @types/ws
- [x] T006 [P] Configure tsup for CLI bundling in tsup.config.ts
- [x] T007 [P] Add npm scripts for build, dev, test, lint in package.json
- [x] T008 [P] Create .gitignore for node_modules, dist, .env

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Type Definitions

- [ ] T009 [P] Define LayoutDefinition interface in src/types/layout.ts
- [ ] T010 [P] Define Widget interface and WidgetType union in src/types/widget.ts
- [ ] T011 [P] Define Event interface and EventType union in src/types/event.ts
- [ ] T012 [P] Define Message interface in src/types/message.ts
- [ ] T013 [P] Define Session interface in src/types/session.ts
- [ ] T014 [P] Define Action interface in src/types/action.ts
- [ ] T015 [P] Define LayoutProps and StyleProps interfaces in src/types/style.ts
- [ ] T016 [P] Create src/types/index.ts barrel export for all types

### JSON Schema Validation

- [ ] T017 [P] Copy layout-definition.schema.json to src/validation/schemas/
- [ ] T018 [P] Copy widget.schema.json to src/validation/schemas/
- [ ] T019 [P] Copy event.schema.json to src/validation/schemas/
- [ ] T020 Implement LayoutValidator class using ajv in src/validation/validator.ts
- [ ] T021 Add version check (strict "1.0" matching) in src/validation/validator.ts

### WebSocket Client & Protocol

- [ ] T022 Implement WebSocketConnection class in src/client/connection.ts
- [ ] T023 Add automatic reconnection (5s interval, 3 attempts) in src/client/connection.ts
- [ ] T024 Implement Session class in src/client/session.ts
- [ ] T025 Add layout queue for user interaction locking in src/client/session.ts
- [ ] T026 Implement JSON-RPC message handlers in src/client/protocol.ts
- [ ] T027 Implement ready message sender with terminal capabilities in src/client/protocol.ts
- [ ] T028 Implement 30-second response timeout handling in src/client/protocol.ts

### Event System

- [ ] T029 [P] Implement EventSerializer for JSON event creation in src/events/serializer.ts
- [ ] T030 [P] Implement EventQueue for layout locking in src/events/queue.ts
- [ ] T031 Implement EventHandler base class with debounce/throttle in src/events/handler.ts

### Theme & Styling

- [ ] T032 Implement ThemeManager with color capabilities detection in src/renderer/theme.ts
- [ ] T033 Add named color to blessed color mapping in src/renderer/theme.ts
- [ ] T034 Add 16/256/truecolor adaptation in src/renderer/theme.ts

### Layout Engine

- [ ] T035 Implement LayoutCalculator with flexbox-style positioning in src/renderer/layout.ts
- [ ] T036 Add percentage and absolute sizing support in src/renderer/layout.ts
- [ ] T037 Add terminal resize handling in src/renderer/layout.ts

### Base Widget System

- [ ] T038 Implement BaseWidget class extending blessed.Box in src/widgets/base.ts
- [ ] T039 Add event handler attachment to BaseWidget in src/widgets/base.ts
- [ ] T040 Add focus management to BaseWidget in src/widgets/base.ts
- [ ] T041 Implement WidgetFactory for type-to-class mapping in src/widgets/factory.ts

### Chat Panel

- [ ] T042 Implement ChatHistory component in src/chat/history.ts
- [ ] T043 Add auto-scroll with manual scroll-back in src/chat/history.ts
- [ ] T044 Implement ChatInput component in src/chat/input.ts
- [ ] T045 Implement MessageRenderer with user/AI styling in src/chat/message.ts

### Main Application Shell

- [ ] T046 Implement MoltUIApp class with blessed.screen in src/renderer/app.ts
- [ ] T047 Add two-panel layout (chat 30-40%, layout 60-70%) in src/renderer/app.ts
- [ ] T048 Add resizable divider between panels in src/renderer/app.ts
- [ ] T049 Wire up WebSocket connection to app in src/renderer/app.ts
- [ ] T050 Add disconnected/reconnecting status display in src/renderer/app.ts

### CLI Entry Point

- [ ] T051 Implement CLI with MOLTUI_BACKEND env var reading in src/cli/index.ts
- [ ] T052 Add error handling for missing/invalid backend URL in src/cli/index.ts
- [ ] T053 Add Ctrl+C exit handling in src/cli/index.ts
- [ ] T054 Configure package.json bin field for moltui command

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Interactive Table (Priority: P1) 🎯 MVP

**Goal**: AI can send a table layout that users can sort, filter, and select from with mouse/keyboard

**Independent Test**: Send a LayoutDefinition with a table widget, verify rendering and row selection events

### Implementation for User Story 1

- [ ] T055 [US1] Implement Table widget class in src/widgets/table.ts
- [ ] T056 [US1] Add column rendering with headers in src/widgets/table.ts
- [ ] T057 [US1] Add row rendering with zebra striping option in src/widgets/table.ts
- [ ] T058 [US1] Add row selection (single/multiple) with highlighting in src/widgets/table.ts
- [ ] T059 [US1] Add column sorting on header click in src/widgets/table.ts
- [ ] T060 [US1] Add sort direction indicator (asc/desc) in src/widgets/table.ts
- [ ] T061 [US1] Add filtering support in src/widgets/table.ts
- [ ] T062 [US1] Add keyboard navigation (arrow keys) within table in src/widgets/table.ts
- [ ] T063 [US1] Add mouse click selection events in src/widgets/table.ts
- [ ] T064 [US1] Emit select event with rowIndex, rowId, rowData in src/widgets/table.ts
- [ ] T065 [US1] Register Table in WidgetFactory in src/widgets/factory.ts
- [ ] T066 [US1] Add table fixture layout to tests/fixtures/layouts/table.json

**Checkpoint**: User Story 1 complete - can display and interact with tables independently

---

## Phase 4: User Story 2 - Master-Detail Interface (Priority: P1)

**Goal**: AI can send a split layout with list on left and detail panel on right, selection updates detail

**Independent Test**: Send a master-detail layout, select item in list, verify detail panel updates

### Implementation for User Story 2

- [ ] T067 [US2] Implement Container widget in src/widgets/container.ts
- [ ] T068 [US2] Add horizontal/vertical orientation support in src/widgets/container.ts
- [ ] T069 [US2] Add resizable divider with drag handling in src/widgets/container.ts
- [ ] T070 [US2] Add sizes prop for relative child sizing in src/widgets/container.ts
- [ ] T071 [US2] Implement List widget in src/widgets/list.ts
- [ ] T072 [US2] Add item rendering with icon/label/subtitle in src/widgets/list.ts
- [ ] T073 [US2] Add single/multiple selection in src/widgets/list.ts
- [ ] T074 [US2] Add search/filter functionality in src/widgets/list.ts
- [ ] T075 [US2] Add grouping support in src/widgets/list.ts
- [ ] T076 [US2] Emit select event with selectedItems in src/widgets/list.ts
- [ ] T077 [US2] Implement Panel widget in src/widgets/panel.ts
- [ ] T078 [US2] Add title bar rendering in src/widgets/panel.ts
- [ ] T079 [US2] Add collapse/expand functionality in src/widgets/panel.ts
- [ ] T080 [US2] Add close button functionality in src/widgets/panel.ts
- [ ] T081 [US2] Implement Text widget in src/widgets/text.ts
- [ ] T082 [US2] Add scrollable content support in src/widgets/text.ts
- [ ] T083 [US2] Add basic text formatting (bold, italic) in src/widgets/text.ts
- [ ] T084 [US2] Register Container, List, Panel, Text in WidgetFactory in src/widgets/factory.ts
- [ ] T085 [US2] Add master-detail fixture to tests/fixtures/layouts/master-detail.json

**Checkpoint**: User Story 2 complete - can display master-detail interfaces independently

---

## Phase 5: User Story 3 - Form Submission (Priority: P2)

**Goal**: AI can send a form layout that users can fill and submit with validation

**Independent Test**: Send a form layout, fill fields, submit, verify form data event is sent

### Implementation for User Story 3

- [ ] T086 [US3] Implement Form widget in src/widgets/form.ts
- [ ] T087 [US3] Add horizontal/vertical layout modes in src/widgets/form.ts
- [ ] T088 [US3] Implement text input field type in src/widgets/form.ts
- [ ] T089 [US3] Implement number input field type in src/widgets/form.ts
- [ ] T090 [US3] Implement select dropdown field type in src/widgets/form.ts
- [ ] T091 [US3] Implement checkbox field type in src/widgets/form.ts
- [ ] T092 [US3] Implement textarea field type in src/widgets/form.ts
- [ ] T093 [US3] Implement date field type in src/widgets/form.ts
- [ ] T094 [US3] Add field validation (required, email, regex, min, max) in src/widgets/form.ts
- [ ] T095 [US3] Add validation error display next to fields in src/widgets/form.ts
- [ ] T096 [US3] Add submit button with customizable label in src/widgets/form.ts
- [ ] T097 [US3] Add cancel button with customizable label in src/widgets/form.ts
- [ ] T098 [US3] Emit submit event with all field values in src/widgets/form.ts
- [ ] T099 [US3] Emit cancel event in src/widgets/form.ts
- [ ] T100 [US3] Add Tab navigation between form fields in src/widgets/form.ts
- [ ] T101 [US3] Register Form in WidgetFactory in src/widgets/factory.ts
- [ ] T102 [US3] Add form fixture to tests/fixtures/layouts/form.json

**Checkpoint**: User Story 3 complete - can display and submit forms independently

---

## Phase 6: User Story 4 - Dashboard with Charts (Priority: P2)

**Goal**: AI can send a dashboard layout with multiple panels containing charts and status indicators

**Independent Test**: Send a dashboard layout with 4+ panels, verify all widgets render correctly

### Implementation for User Story 4

- [ ] T103 [US4] Implement Chart widget base in src/widgets/chart.ts
- [ ] T104 [US4] Add bar chart rendering using blessed-contrib in src/widgets/chart.ts
- [ ] T105 [US4] Add line chart rendering using blessed-contrib in src/widgets/chart.ts
- [ ] T106 [US4] Add sparkline chart rendering in src/widgets/chart.ts
- [ ] T107 [US4] Add gauge chart rendering in src/widgets/chart.ts
- [ ] T108 [US4] Add chart options (title, legend, axis) in src/widgets/chart.ts
- [ ] T109 [US4] Add data point selection events in src/widgets/chart.ts
- [ ] T110 [US4] Implement StatusBar widget in src/widgets/status-bar.ts
- [ ] T111 [US4] Add persistent bottom status display in src/widgets/status-bar.ts
- [ ] T112 [US4] Add multi-section status bar in src/widgets/status-bar.ts
- [ ] T113 [US4] Register Chart, StatusBar in WidgetFactory in src/widgets/factory.ts
- [ ] T114 [US4] Add dashboard fixture to tests/fixtures/layouts/dashboard.json

**Checkpoint**: User Story 4 complete - can display dashboards with charts independently

---

## Phase 7: User Story 5 - Real-time Updates (Priority: P2)

**Goal**: AI can send JSON Patch updates to modify existing layouts without full re-render

**Independent Test**: Send a layout, then send a patch, verify only patched elements update

### Implementation for User Story 5

- [ ] T115 [US5] Implement JSON Patch handler using fast-json-patch in src/client/protocol.ts
- [ ] T116 [US5] Add patch validation before applying in src/client/protocol.ts
- [ ] T117 [US5] Add partial widget tree update in src/renderer/app.ts
- [ ] T118 [US5] Implement ProgressBar widget in src/widgets/progress-bar.ts
- [ ] T119 [US5] Add determinate mode (value/max) in src/widgets/progress-bar.ts
- [ ] T120 [US5] Add indeterminate mode (animated) in src/widgets/progress-bar.ts
- [ ] T121 [US5] Add smooth animation between values in src/widgets/progress-bar.ts
- [ ] T122 [US5] Implement Notification widget in src/widgets/notification.ts
- [ ] T123 [US5] Add notification types (success, error, warning, info) in src/widgets/notification.ts
- [ ] T124 [US5] Add auto-dismiss with configurable duration in src/widgets/notification.ts
- [ ] T125 [US5] Add notification positioning (top, bottom, corner) in src/widgets/notification.ts
- [ ] T126 [US5] Register ProgressBar, Notification in WidgetFactory in src/widgets/factory.ts
- [ ] T127 [US5] Add patch fixture to tests/fixtures/events/patch.json

**Checkpoint**: User Story 5 complete - can receive and apply real-time updates independently

---

## Phase 8: User Story 6 - Keyboard Navigation (Priority: P3)

**Goal**: Users can navigate all interactive elements using only keyboard (Tab, arrows, Enter)

**Independent Test**: Navigate complex layout using only keyboard, verify all elements reachable

### Implementation for User Story 6

- [ ] T128 [US6] Implement FocusManager for global focus tracking in src/renderer/focus.ts
- [ ] T129 [US6] Add Tab/Shift+Tab navigation between widgets in src/renderer/focus.ts
- [ ] T130 [US6] Add visible focus indicator styling in src/renderer/focus.ts
- [ ] T131 [US6] Add arrow key navigation within Table widget in src/widgets/table.ts
- [ ] T132 [US6] Add arrow key navigation within List widget in src/widgets/list.ts
- [ ] T133 [US6] Add Enter key activation for focused elements in src/renderer/focus.ts
- [ ] T134 [US6] Implement KeybindingManager in src/events/keybindings.ts
- [ ] T135 [US6] Add custom keybinding support from LayoutDefinition in src/events/keybindings.ts
- [ ] T136 [US6] Add keybinding action execution in src/events/keybindings.ts
- [ ] T137 [US6] Add Escape key for closing modals/canceling forms in src/events/keybindings.ts

**Checkpoint**: User Story 6 complete - full keyboard navigation works independently

---

## Phase 9: User Story 7 - Tabbed Interface (Priority: P3)

**Goal**: AI can organize content into tabs that users can switch between

**Independent Test**: Send a tabbed layout, click tabs, verify content switches correctly

### Implementation for User Story 7

- [ ] T138 [US7] Implement Tabs widget in src/widgets/tabs.ts
- [ ] T139 [US7] Add tab bar rendering with labels in src/widgets/tabs.ts
- [ ] T140 [US7] Add active tab indicator styling in src/widgets/tabs.ts
- [ ] T141 [US7] Add tab click to switch content in src/widgets/tabs.ts
- [ ] T142 [US7] Add keyboard navigation (left/right arrows) in tab bar in src/widgets/tabs.ts
- [ ] T143 [US7] Emit change event with activeTab ID in src/widgets/tabs.ts
- [ ] T144 [US7] Support nested widgets in tab content panels in src/widgets/tabs.ts
- [ ] T145 [US7] Register Tabs in WidgetFactory in src/widgets/factory.ts
- [ ] T146 [US7] Add tabbed fixture to tests/fixtures/layouts/tabbed.json

**Checkpoint**: User Story 7 complete - tabbed interfaces work independently

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Additional Widgets

- [ ] T147 [P] Implement Modal widget for overlay dialogs in src/widgets/modal.ts
- [ ] T148 [P] Add modal backdrop and centering in src/widgets/modal.ts
- [ ] T149 [P] Add confirm dialog support via protocol in src/client/protocol.ts
- [ ] T150 Register Modal in WidgetFactory in src/widgets/factory.ts

### Error Handling & Edge Cases

- [ ] T151 [P] Add unknown widget type placeholder rendering in src/widgets/factory.ts
- [ ] T152 [P] Add graceful error display for invalid layouts in src/renderer/app.ts
- [ ] T153 [P] Add version mismatch error display in src/validation/validator.ts
- [ ] T154 [P] Add patch error handling (ignore invalid patches) in src/client/protocol.ts

### Performance

- [ ] T155 Implement virtual scrolling for 10k+ row tables in src/widgets/table.ts
- [ ] T156 Implement virtual scrolling for large lists in src/widgets/list.ts
- [ ] T157 Add render batching for multiple rapid updates in src/renderer/app.ts

### Documentation

- [ ] T158 [P] Update quickstart.md with final API examples
- [ ] T159 [P] Add JSDoc comments to all public interfaces in src/types/
- [ ] T160 Add README.md with installation and usage instructions

### Final Validation

- [ ] T161 Validate all fixtures render correctly
- [ ] T162 Verify cross-platform (macOS, Linux, WSL) functionality
- [ ] T163 Verify SSH session compatibility
- [ ] T164 Run memory profiling (target <50MB)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 priority - can proceed in parallel or in order
  - US3, US4, US5 are P2 priority - can proceed after P1 stories or in parallel
  - US6, US7 are P3 priority - can proceed after P2 stories or in parallel
- **Polish (Phase 10)**: Can start after US1 complete, but should finish after all stories

### User Story Dependencies

| Story | Priority | Depends On | Can Start After |
|-------|----------|------------|-----------------|
| US1 - Table | P1 | Foundational | Phase 2 complete |
| US2 - Master-Detail | P1 | Foundational | Phase 2 complete |
| US3 - Form | P2 | Foundational | Phase 2 complete |
| US4 - Dashboard | P2 | Foundational | Phase 2 complete |
| US5 - Real-time | P2 | Foundational | Phase 2 complete |
| US6 - Keyboard Nav | P3 | US1, US2 (for widgets) | Phase 4 complete |
| US7 - Tabs | P3 | Foundational | Phase 2 complete |

### Within Each User Story

- Models/types → Widget implementation → Event handling → Factory registration → Fixtures
- Each story complete before moving to next priority (recommended)

### Parallel Opportunities

**Setup Phase (all [P]):**
```
T003, T004, T005, T006, T007, T008 (all parallel)
```

**Foundational Phase:**
```
T009-T016 (all types parallel)
T017-T019 (all schemas parallel)
T029-T030 (events parallel)
T032-T034 (theme)
```

**User Stories (after Foundational):**
```
US1 and US2 can run in parallel (different widgets)
US3, US4, US5 can run in parallel (different widgets)
US6 depends on US1/US2 widgets existing
US7 is independent
```

---

## Parallel Example: User Story 1

```bash
# All Table implementation tasks are sequential (same file)
# But US1 can run parallel to US2 (different files)

# Developer A: User Story 1 (Table)
T055 → T056 → T057 → T058 → T059 → T060 → T061 → T062 → T063 → T064 → T065 → T066

# Developer B: User Story 2 (Master-Detail) - PARALLEL with Developer A
T067 → T068 → T069 → T070 → T071 → ... → T085
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) 🎯

1. Complete Phase 1: Setup (T001-T008)
2. Complete Phase 2: Foundational (T009-T054)
3. Complete Phase 3: User Story 1 - Table (T055-T066)
4. **STOP and VALIDATE**: Test table rendering and interaction
5. Deploy/demo if ready - **This is the MVP!**

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Table) → Test → **MVP Demo**
3. Add US2 (Master-Detail) → Test → **P1 Complete Demo**
4. Add US3 (Form) → Test → Deploy/Demo
5. Add US4 (Dashboard) → Test → Deploy/Demo
6. Add US5 (Real-time) → Test → **P2 Complete Demo**
7. Add US6 (Keyboard) → Test → Deploy/Demo
8. Add US7 (Tabs) → Test → **P3 Complete Demo**
9. Polish phase → **v1.0 Release**

### Story Points Estimate

| Phase | Tasks | Complexity |
|-------|-------|------------|
| Setup | 8 | Low |
| Foundational | 46 | High (core infrastructure) |
| US1 - Table | 12 | Medium |
| US2 - Master-Detail | 19 | Medium-High |
| US3 - Form | 17 | Medium-High |
| US4 - Dashboard | 12 | Medium |
| US5 - Real-time | 13 | Medium |
| US6 - Keyboard | 10 | Medium |
| US7 - Tabs | 9 | Low-Medium |
| Polish | 18 | Medium |
| **Total** | **164** | |

---

## Notes

- [P] tasks = different files, no dependencies on other [P] tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- MVP is achievable with just Setup + Foundational + US1 (66 tasks)
