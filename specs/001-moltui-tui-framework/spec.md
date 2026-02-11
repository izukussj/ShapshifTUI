# Feature Specification: MoltUI - Decoupled TUI Shapeshifting Interface

**Feature Branch**: `001-moltui-tui-framework`
**Created**: 2026-02-03
**Status**: Draft
**Input**: User description: "MoltUI is a standalone, model-agnostic TUI framework that enables AI assistants to present information through dynamically-generated, context-appropriate interactive interfaces."

**Architecture**: MoltUI is a chat-integrated TUI with two main panels:
- **Left panel (30-40%)**: Built-in chat history with scrollable messages, auto-scroll, and text input
- **Right panel (60-70%)**: Shapeshifting layout renderer for dynamic widgets (tables, forms, dashboards, etc.)
- **Resizable divider**: Users can drag to adjust panel proportions

## Clarifications

### Session 2026-02-03

- Q: How are sessions created and managed? → A: Implicit session on first message, expires after configurable idle timeout
- Q: How should client handle unresponsive AI backend? → A: Hard timeout at 30 seconds, display error and allow retry
- Q: Does MoltUI include built-in chat UI or only render layouts? → A: MoltUI includes built-in chat UI (left panel, 30-40%) + layout renderer (right panel, 60-70%) with resizable divider
- Q: How should client handle layouts with different schema versions? → A: Reject entirely with error if version doesn't match exactly
- Q: What happens if AI sends new layout during user interaction? → A: Layout stays locked until user submits; new layouts only applied after submission
- Q: Is chat history persisted between sessions? → A: AI-managed; AI backend responsible for storing/restoring conversation history
- Q: How does user configure which AI backend to connect to? → A: Environment variable `MOLTUI_BACKEND` specifies WebSocket URL
- Q: Should stdin/stdout be supported as alternative transport? → A: No, WebSocket only

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI Generates and Renders Interactive Table (Priority: P1)

An AI assistant needs to display tabular data (e.g., file listings, query results, comparison data) in an interactive format that users can sort, filter, and select from, rather than dumping raw text.

**Why this priority**: The table widget represents the most common use case for structured data presentation. It demonstrates the core value proposition of MoltUI - transforming static text responses into interactive, navigable interfaces.

**Independent Test**: Can be fully tested by having an AI generate a table layout JSON and rendering it in the TUI client. Delivers immediate value by making data exploration interactive.

**Acceptance Scenarios**:

1. **Given** a user asks the AI for a list of items, **When** the AI determines tabular display is appropriate, **Then** the AI generates a valid LayoutDefinition JSON containing a table widget with sortable columns
2. **Given** a table is displayed with sortable columns, **When** the user clicks a column header, **Then** the table re-sorts by that column and sends an event to the AI
3. **Given** a table with selectable rows, **When** the user clicks a row, **Then** the row is highlighted and a selection event is sent to the AI

---

### User Story 2 - AI Displays Master-Detail Interface (Priority: P1)

An AI assistant needs to show a list of items alongside detailed information about a selected item, enabling users to browse and explore data without multiple back-and-forth queries.

**Why this priority**: Master-detail is a fundamental pattern for data exploration. It showcases the split layout capability and event-driven updates that make MoltUI powerful.

**Independent Test**: Can be fully tested by displaying a list on the left and a detail panel on the right, with selection events updating the detail view.

**Acceptance Scenarios**:

1. **Given** a master-detail layout is rendered, **When** the user selects an item from the master list, **Then** the detail panel updates to show information about the selected item
2. **Given** a resizable split container, **When** the user drags the divider, **Then** the panels resize proportionally while maintaining content visibility
3. **Given** the detail panel is empty, **When** no item is selected, **Then** a placeholder message indicates "Select an item to view details"

---

### User Story 3 - User Submits Form Data (Priority: P2)

A user needs to input structured data (configuration settings, search parameters, new item creation) through a validated form interface rather than typing free-form text.

**Why this priority**: Forms enable bidirectional data flow - critical for task completion scenarios. This is essential for AI workflows that require user input.

**Independent Test**: Can be tested by rendering a form, filling fields, and verifying the submitted data is correctly sent to the AI.

**Acceptance Scenarios**:

1. **Given** a form with required fields, **When** the user attempts to submit without filling required fields, **Then** validation errors are displayed next to the incomplete fields
2. **Given** a form with valid data, **When** the user clicks submit, **Then** a form submission event containing all field values is sent to the AI
3. **Given** a form with a select dropdown, **When** the user opens the dropdown, **Then** available options are displayed and selectable via keyboard or mouse

---

### User Story 4 - AI Shows Dashboard with Multiple Visualizations (Priority: P2)

An AI assistant needs to present an overview combining multiple data visualizations (charts, tables, status indicators) in a single cohesive interface.

**Why this priority**: Dashboards demonstrate complex layout composition and are valuable for monitoring, analytics, and summary views.

**Independent Test**: Can be tested by rendering a multi-panel layout with different widget types and verifying all components display correctly.

**Acceptance Scenarios**:

1. **Given** a dashboard layout with multiple panels, **When** rendered, **Then** all panels display their respective widgets (charts, tables, status bars) in their designated positions
2. **Given** a chart widget, **When** data points are provided, **Then** the chart renders appropriately for the terminal (using ASCII/Unicode characters)
3. **Given** a dashboard with collapsible panels, **When** the user clicks the collapse control, **Then** the panel collapses and other panels adjust to fill the space

---

### User Story 5 - Real-time Layout Updates via Protocol (Priority: P2)

The MoltUI client needs to receive and render layout updates from the AI in real-time, enabling dynamic interfaces that respond to ongoing AI processing or external data changes.

**Why this priority**: Real-time updates are essential for progress indicators, streaming data, and responsive AI interactions.

**Independent Test**: Can be tested by sending a layout, then sending a patch message, and verifying the client updates only the changed elements.

**Acceptance Scenarios**:

1. **Given** an existing layout is displayed, **When** a JSON patch message is received, **Then** only the specified elements are updated without full re-render
2. **Given** a progress bar widget, **When** the AI sends incremental progress updates, **Then** the progress bar animates smoothly between values
3. **Given** a notification message is sent, **When** the duration expires, **Then** the notification automatically dismisses

---

### User Story 6 - Keyboard Navigation Throughout Interface (Priority: P3)

Users who prefer keyboard-only navigation need to access all interactive elements, navigate between widgets, and trigger actions without using a mouse.

**Why this priority**: Essential for accessibility and terminal power users who expect full keyboard control.

**Independent Test**: Can be tested by navigating through a complex layout using only Tab, arrow keys, and Enter, verifying all interactive elements are reachable.

**Acceptance Scenarios**:

1. **Given** a layout with multiple interactive widgets, **When** the user presses Tab, **Then** focus moves sequentially through focusable elements with visible focus indicators
2. **Given** a table widget has focus, **When** the user presses arrow keys, **Then** selection moves through rows appropriately
3. **Given** custom keybindings are defined in the layout, **When** the user presses the defined key combination, **Then** the associated action is triggered

---

### User Story 7 - Tabbed Interface Navigation (Priority: P3)

An AI assistant needs to organize related but distinct views into tabs, allowing users to switch between different perspectives or categories of information.

**Why this priority**: Tabs provide essential organizational structure for complex interfaces without requiring multiple separate layouts.

**Independent Test**: Can be tested by rendering a tabbed layout and verifying tab switching updates the visible content.

**Acceptance Scenarios**:

1. **Given** a tabbed layout with multiple tabs, **When** the user clicks a tab, **Then** the associated content panel becomes visible and other panels are hidden
2. **Given** a tab change occurs, **When** the event is emitted, **Then** the AI receives the tab change event with the new active tab ID
3. **Given** keyboard focus is on the tab bar, **When** the user presses left/right arrows, **Then** focus moves between tabs and Enter selects the focused tab

---

### Edge Cases

- What happens when the AI sends an invalid or malformed LayoutDefinition?
  - The client validates against the JSON schema and displays an error message without crashing
- How does the system handle network disconnection during interaction?
  - The client shows a "Disconnected" status, attempts reconnection, and preserves local state until reconnected
- What happens when a layout references a widget type that doesn't exist?
  - The client renders a placeholder indicating "Unknown widget type: [type]" and continues rendering the rest
- How does the system handle terminal resize events?
  - The client re-calculates layout proportions and re-renders all visible widgets
- What happens when the AI sends an update for a widget ID that doesn't exist?
  - The patch is ignored and a warning is logged without affecting the current display
- How does the system handle extremely large datasets (10,000+ rows)?
  - Tables and lists use virtualization to render only visible rows, maintaining performance
- What happens when the AI backend is connected but unresponsive to events?
  - Client enforces a 30-second hard timeout, displays an error message, and offers a retry option
- What happens when the AI sends a layout with a different schema version than the client supports?
  - Client rejects the layout entirely and displays an error "Unsupported version X.Y" in the layout panel
- What happens if AI sends a new layout while user is interacting with the current one?
  - Layout remains locked until user submits; incoming layouts are queued and applied only after user completes their current interaction

## Requirements *(mandatory)*

### Functional Requirements

**Chat Interface**

- **FR-001**: System MUST display a chat history panel showing conversation messages between user and AI
- **FR-002**: Chat panel MUST auto-scroll to newest messages while allowing manual scroll-back
- **FR-003**: System MUST provide a text input field for users to type messages to the AI
- **FR-004**: Chat panel MUST be resizable via draggable divider (30-40% default width)
- **FR-005**: System MUST visually distinguish user messages from AI messages

**Protocol & Communication**

- **FR-006**: System MUST implement a JSON-RPC 2.0 style message protocol for AI-to-client communication
- **FR-007**: System MUST support WebSocket as the sole transport mechanism
- **FR-008**: Client MUST read AI backend WebSocket URL from `MOLTUI_BACKEND` environment variable
- **FR-009**: Client MUST send a "ready" message with terminal capabilities (mouse support, color depth, unicode support) upon connection
- **FR-010**: System MUST support incremental updates via JSON Patch operations to avoid full re-renders
- **FR-011**: Client MUST queue incoming layouts during active user interaction and apply them only after user submission

**Layout & Rendering**

- **FR-012**: Client MUST render LayoutDefinition JSON documents conforming to the versioned schema
- **FR-013**: Client MUST support layout types: single, split, tabs, and stack
- **FR-014**: Client MUST implement flexbox-style layout properties (direction, justify, align)
- **FR-015**: Client MUST support percentage-based and absolute sizing for widgets
- **FR-016**: Client MUST handle terminal resize events and re-render layouts proportionally

**Core Widgets**

- **FR-017**: System MUST implement Table widget with sorting, filtering, and row selection capabilities
- **FR-018**: System MUST implement List widget with search, selection, and grouping capabilities
- **FR-019**: System MUST implement Form widget with field types: text, number, select, checkbox, textarea, date
- **FR-020**: System MUST implement Form validation with required, email, number, regex, min, and max rules
- **FR-021**: System MUST implement Container widget with horizontal/vertical orientation and resizable dividers
- **FR-022**: System MUST implement Panel widget with title, collapse, and close functionality
- **FR-023**: System MUST implement Tabs widget with switchable content panels
- **FR-024**: System MUST implement Text widget with scrollable, formatted content
- **FR-025**: System MUST implement Chart widget types: bar, line, sparkline, and gauge
- **FR-026**: System MUST implement Modal widget for overlay dialogs
- **FR-027**: System MUST implement ProgressBar widget with determinate and indeterminate modes
- **FR-028**: System MUST implement StatusBar widget for persistent information display
- **FR-029**: System MUST implement Notification widget for temporary messages with auto-dismiss

**Interaction & Events**

- **FR-030**: Client MUST capture and serialize user interactions (click, keypress, scroll, selection) as JSON events
- **FR-031**: Client MUST support mouse interactions including click, double-click, scroll, and drag
- **FR-032**: Client MUST support full keyboard navigation with Tab, arrow keys, and Enter
- **FR-033**: System MUST support custom keybinding definitions in LayoutDefinition
- **FR-034**: System MUST support event handlers with debounce and throttle options

**Styling & Theming**

- **FR-035**: Client MUST support foreground/background colors via named colors and hex values
- **FR-036**: Client MUST support text styling: bold, underline, italic, inverse
- **FR-037**: Client MUST support border styles: line, bg, none
- **FR-038**: Client MUST support focus states with distinct styling
- **FR-039**: Client MUST adapt to terminal color capabilities (16, 256, truecolor)

**Validation & Error Handling**

- **FR-040**: System MUST validate all incoming LayoutDefinitions against JSON Schema before rendering
- **FR-041**: Client MUST gracefully handle invalid layouts with user-visible error messages
- **FR-042**: Client MUST recover from network disconnections with automatic reconnection attempts

### Key Entities

- **LayoutDefinition**: The complete description of an interface, including version, metadata, root widget, keybindings, and theme. Serves as the contract between AI and client.
- **Widget**: A self-contained UI component with id, type, layout properties, style properties, child widgets, and event handlers.
- **Message**: A chat message displayed in the left panel, containing sender (user or AI), content, and timestamp. AI messages may optionally trigger a corresponding LayoutDefinition in the right panel. Chat history is not persisted by MoltUI; the AI backend is responsible for storing and restoring conversation history on reconnection.
- **Event**: A serialized user interaction containing session ID, layout ID, widget ID, event type, and interaction data.
- **Action**: A response to an event, specifying type (emit, navigate, update, execute), target, and data payload.
- **Session**: A persistent context linking an AI system to a client instance, tracking state across interactions. Sessions are created implicitly on first message receipt and expire after a configurable idle timeout. Reconnecting clients within the timeout window rejoin their existing session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate a 100-row table using keyboard or mouse and select a row within 5 seconds of first interaction
- **SC-002**: System renders a complete dashboard layout (4+ panels with different widget types) in under 500ms
- **SC-003**: 95% of users successfully complete a 5-field form submission on their first attempt
- **SC-004**: Client handles smooth scrolling at 60 updates per second without visible lag
- **SC-005**: System supports 10,000+ row datasets with virtualized rendering maintaining sub-100ms scroll response
- **SC-006**: AI developers can render their first custom layout within 30 minutes of reading documentation
- **SC-007**: Client reconnects automatically after network interruption within 5 seconds when connection is restored
- **SC-008**: Client memory usage remains under 50MB for typical interactive sessions
- **SC-009**: System works identically across macOS, Linux, and Windows (WSL) terminals
- **SC-010**: Client functions correctly over SSH connections with standard terminal emulators

## Assumptions

- AI systems will generate valid JSON conforming to the LayoutDefinition schema (client validates but AI is responsible for correctness)
- Target terminals support basic ANSI escape sequences for cursor movement and styling
- WebSocket connections will be available in most deployment environments
- Users have terminals with at least 80x24 character dimensions
- Node.js runtime will be available for running the TUI client
- AI integration is handled externally - MoltUI only provides the rendering protocol and client

## Dependencies

- Node.js runtime environment (version TBD during planning)
- Terminal emulator with ANSI support
- Network connectivity for WebSocket transport

## Out of Scope

- Web UI version (separate project)
- Mobile or native desktop applications
- AI model implementation or training
- Built-in authentication/authorization (handled by integrating systems)
- Real-time collaborative editing between multiple users
- Offline-first architecture or local data persistence
- Custom terminal emulator development
