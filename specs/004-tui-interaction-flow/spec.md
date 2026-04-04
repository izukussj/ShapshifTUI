# Feature Specification: TUI Interaction Flow

**Feature Branch**: `004-tui-interaction-flow`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "Full interaction flow: Chat displays only conversation text (not code). AI can optionally return blessed TUI code which renders silently in the right panel. User interactions with the TUI (clicks, selections, input) are captured and sent back to the LLM as context, enabling a bidirectional conversation where the AI is aware of what the user does in the interface."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clean Chat Display (Priority: P1)

As a user, I want the chat panel to display only conversational text from the AI, without showing any code blocks or technical markup, so I can have a natural conversation experience.

**Why this priority**: This is foundational - the chat must feel like a conversation, not a code editor. Without this, the experience feels technical and jarring.

**Independent Test**: Can be tested by sending a message that triggers the AI to generate a TUI layout, and verifying that the chat only shows the conversational response while the code is hidden.

**Acceptance Scenarios**:

1. **Given** the AI responds with both text and a TUI layout definition, **When** the response is displayed in chat, **Then** only the conversational text appears (no code blocks, no JSON, no markup).
2. **Given** the AI responds with only conversational text (no TUI), **When** the response is displayed, **Then** the full text appears as expected.
3. **Given** the AI's conversational text references the generated interface, **When** displayed, **Then** the reference text appears but the actual code does not.

---

### User Story 2 - Silent TUI Rendering (Priority: P2)

As a user, I want the AI-generated interface to appear in the right panel without any notification or interruption to my chat flow, so the visual aids enhance rather than interrupt my conversation.

**Why this priority**: Silent rendering makes the TUI feel like a natural extension of the conversation rather than a separate feature.

**Independent Test**: Can be tested by asking the AI to create an interface and verifying it appears in the right panel without any message or delay indication in the chat.

**Acceptance Scenarios**:

1. **Given** the AI generates a TUI layout, **When** the response is processed, **Then** the interface renders in the right panel without any status message in chat.
2. **Given** a TUI is already displayed, **When** the AI generates a new layout, **Then** the right panel updates seamlessly without flickering or transition messages.
3. **Given** the AI generates an invalid layout, **When** rendering fails, **Then** the previous interface remains visible and an error indicator appears in the TUI panel (status bar or corner).

---

### User Story 3 - Interaction Capture (Priority: P3)

As a user, I want my interactions with the TUI (clicking buttons, selecting items, entering text) to be captured and available as context for the AI, so the AI can reference what I did.

**Why this priority**: This enables the bidirectional flow - without capturing interactions, the AI cannot be aware of user actions.

**Independent Test**: Can be tested by interacting with a TUI element (e.g., clicking a button), then asking the AI "what did I just do?" and verifying accurate response.

**Acceptance Scenarios**:

1. **Given** a TUI with interactive elements is displayed, **When** I click a button, **Then** the click event is captured with the button's ID and label.
2. **Given** a TUI with a selection list, **When** I select an item, **Then** the selection is captured with the item's value.
3. **Given** a TUI with an input field, **When** I enter text and submit, **Then** the input value is captured.

---

### User Story 4 - AI Interaction Awareness (Priority: P4)

As a user, I want the AI to acknowledge and respond to my TUI interactions in conversation, so I feel the AI is truly aware of what I'm doing.

**Why this priority**: This completes the bidirectional loop - the AI must demonstrate awareness for the feature to feel valuable.

**Independent Test**: Can be tested by performing a TUI interaction, then continuing the conversation and verifying the AI references the interaction appropriately.

**Acceptance Scenarios**:

1. **Given** I clicked a button in the TUI, **When** I ask "what button did I press?", **Then** the AI correctly identifies the button.
2. **Given** I made multiple selections in the TUI, **When** I ask for a summary, **Then** the AI accurately describes my selections.
3. **Given** I interacted with the TUI and then ask an unrelated question, **When** the AI responds, **Then** it can still reference my previous interactions if contextually relevant.

---

### Edge Cases

- What happens when the user interacts with the TUI while the AI is generating a response? → Queue the interaction and include it in the next context update.
- How does the system handle rapid repeated interactions (e.g., clicking multiple times quickly)? → Debounce interactions with a reasonable threshold (300ms) to avoid flooding the context.
- What happens if the TUI layout references non-existent interaction handlers? → Log the issue silently, interaction is ignored but TUI remains functional.
- What happens when interaction history grows very large? → Maintain a rolling window of the most recent interactions (last 50) to prevent context overflow.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST parse AI responses to separate conversational text from TUI layout definitions.
- **FR-002**: System MUST display only conversational text in the chat panel, excluding all code blocks and technical markup.
- **FR-003**: System MUST render TUI layouts in the right panel without displaying any notification in the chat.
- **FR-004**: System MUST capture user interactions with TUI elements including: button clicks, list selections, input submissions, and checkbox toggles.
- **FR-005**: System MUST store interaction events with timestamp, element ID, element type, and interaction data.
- **FR-006**: System MUST include recent interaction history as a separate structured metadata field (not appended to message text) sent to the AI with each new message.
- **FR-007**: System MUST debounce rapid repeated interactions to prevent context flooding.
- **FR-008**: System MUST maintain a maximum interaction history size to prevent context overflow.
- **FR-009**: System MUST gracefully handle TUI rendering failures by displaying an error indicator in the TUI panel (status bar or corner) without disrupting the chat experience.
- **FR-010**: System MUST preserve the previous TUI display when a new layout fails to render.

### Key Entities

- **ChatMessage**: A single message in the conversation with sender (user/ai), content (text only), timestamp, and optional metadata.
- **TUILayout**: A complete interface definition with ID, version, and widget tree structure.
- **InteractionEvent**: A captured user interaction with timestamp, element ID, element type, event type (click/select/submit/toggle), and associated data (value, label, etc.).
- **InteractionContext**: A collection of recent interaction events included with messages sent to the AI.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Chat responses containing TUI code display only conversational text with no visible code within 1 second of receiving the response.
- **SC-002**: TUI layouts render in the right panel within 500ms of the AI response being processed.
- **SC-003**: User interactions are captured and available to the AI within 100ms of the interaction occurring.
- **SC-004**: The AI correctly references the most recent user interaction in 90% of contextually relevant responses.
- **SC-005**: System handles at least 20 interactions per minute without performance degradation.
- **SC-006**: Users can have a 50+ message conversation with interactions without context overflow errors.

## Clarifications

### Session 2026-02-13

- Q: How should interaction context be sent to the AI? → A: Send as separate structured metadata field (not appended to message text)
- Q: Where should TUI rendering errors be displayed? → A: Show error indicator in the TUI panel (status bar/corner)

## Assumptions

- The AI backend (via bridge) supports receiving interaction context as a separate structured metadata field alongside the message payload.
- TUI layouts are delivered in a consistent format (moltui code blocks) that can be reliably parsed.
- Users have basic familiarity with terminal-based interfaces.
- Interaction debouncing of 300ms is acceptable for all use cases.
- Rolling window of 50 interactions provides sufficient context for most conversations.
