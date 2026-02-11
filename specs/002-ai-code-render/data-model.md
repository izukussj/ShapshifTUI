# Data Model: AI-Generated Code Rendering

**Date**: 2026-02-04
**Feature**: 002-ai-code-render

## Entities

### UserRequest

Natural language description of desired TUI interface.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (UUID) | Yes | Unique request identifier |
| text | string | Yes | Raw natural language description |
| context | RequestContext | No | Optional metadata for prompt enrichment |
| timestamp | number | Yes | Unix timestamp of request |

```typescript
interface UserRequest {
  id: string;
  text: string;
  context?: RequestContext;
  timestamp: number;
}

interface RequestContext {
  terminalWidth?: number;
  terminalHeight?: number;
  previousRequest?: string;  // For iterative refinement
}
```

---

### AIPrompt

Constructed prompt sent to AI service.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| systemPrompt | string | Yes | System instructions with constraints |
| userPrompt | string | Yes | User request formatted for AI |
| examples | CodeExample[] | No | Few-shot examples |
| retryContext | RetryContext | No | Error context if retrying |

```typescript
interface AIPrompt {
  systemPrompt: string;
  userPrompt: string;
  examples?: CodeExample[];
  retryContext?: RetryContext;
}

interface CodeExample {
  request: string;
  code: string;
}

interface RetryContext {
  previousCode: string;
  error: string;
  attemptNumber: number;
}
```

---

### GeneratedCode

Raw code returned by AI service.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (UUID) | Yes | Unique generation identifier |
| requestId | string | Yes | Reference to originating UserRequest |
| rawResponse | string | Yes | Full AI response text |
| extractedCode | string | No | Parsed code (if extraction successful) |
| metadata | GenerationMetadata | Yes | Generation details |

```typescript
interface GeneratedCode {
  id: string;
  requestId: string;
  rawResponse: string;
  extractedCode?: string;
  metadata: GenerationMetadata;
}

interface GenerationMetadata {
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  attemptNumber: number;
}
```

---

### ValidationResult

Outcome of code validation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| codeId | string | Yes | Reference to GeneratedCode |
| passed | boolean | Yes | Overall validation status |
| syntaxValid | boolean | Yes | Syntax check result |
| securityPassed | boolean | Yes | Security rules check result |
| allowlistPassed | boolean | Yes | Approved APIs check result |
| errors | ValidationError[] | No | List of validation failures |

```typescript
interface ValidationResult {
  codeId: string;
  passed: boolean;
  syntaxValid: boolean;
  securityPassed: boolean;
  allowlistPassed: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  type: 'syntax' | 'security' | 'allowlist';
  message: string;
  line?: number;
  column?: number;
  code?: string;  // Offending code snippet
}
```

---

### RenderedInterface

Active TUI displayed in terminal.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (UUID) | Yes | Unique interface identifier |
| requestId | string | Yes | Reference to originating UserRequest |
| screen | BlessedScreen | Yes | Blessed screen instance |
| elements | Map<string, Element> | Yes | Element registry by ID |
| status | InterfaceStatus | Yes | Current lifecycle state |
| createdAt | number | Yes | Creation timestamp |

```typescript
interface RenderedInterface {
  id: string;
  requestId: string;
  screen: BlessedScreen;  // blessed.Widgets.Screen
  elements: Map<string, ElementEntry>;
  status: InterfaceStatus;
  createdAt: number;
}

interface ElementEntry {
  element: BlessedElement;  // blessed.Widgets.BlessedElement
  type: string;  // 'box', 'text', 'list', etc.
  callbacks: Map<string, EventCallback>;
}

type InterfaceStatus = 'initializing' | 'active' | 'updating' | 'destroyed';
```

---

### InteractionEvent

Callback notification for user actions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| interfaceId | string | Yes | Reference to RenderedInterface |
| elementId | string | Yes | ID of element that triggered event |
| eventType | EventType | Yes | Type of interaction |
| data | Record<string, unknown> | Yes | Event-specific payload |
| timestamp | number | Yes | Event timestamp |

```typescript
interface InteractionEvent {
  interfaceId: string;
  elementId: string;
  eventType: EventType;
  data: Record<string, unknown>;
  timestamp: number;
}

type EventType =
  | 'click'
  | 'submit'
  | 'change'
  | 'focus'
  | 'blur'
  | 'keypress'
  | 'select';  // For list/table selection
```

---

## State Transitions

### Request Lifecycle

```
UserRequest
    │
    ▼
[Prompt Construction]
    │
    ▼
AIPrompt ──► AI Service ──► GeneratedCode
    │                            │
    │                            ▼
    │                    [Validation]
    │                            │
    │         ┌──────────────────┴──────────────────┐
    │         ▼                                      ▼
    │   ValidationResult                      ValidationResult
    │   (passed: false)                       (passed: true)
    │         │                                      │
    │         ▼                                      ▼
    │   [Retry? < 3]                         [Sandbox Execution]
    │     │      │                                   │
    │    Yes     No                                  ▼
    │     │      │                           RenderedInterface
    │     ▼      ▼                           (status: active)
    └──► Retry   Error
```

### Interface Lifecycle

```
RenderedInterface
(status: initializing)
        │
        ▼
   [screen.render()]
        │
        ▼
(status: active) ◄────────────────┐
        │                          │
        ├───► [User Interaction]   │
        │           │              │
        │           ▼              │
        │    InteractionEvent      │
        │           │              │
        │           ▼              │
        │    [Callback invoked]    │
        │                          │
        ├───► [Programmatic Update]│
        │           │              │
        │           ▼              │
        │   (status: updating)     │
        │           │              │
        │           ▼              │
        │    [element.setX()]      │
        │           │              │
        │           ▼              │
        │    [screen.render()] ────┘
        │
        ▼
   [Destroy called]
        │
        ▼
(status: destroyed)
```

## Validation Rules

### Blocked Patterns (Security)

| Pattern | Reason |
|---------|--------|
| `require('fs')` | File system access |
| `require('child_process')` | Process spawning |
| `require('net')`, `require('http')` | Network access |
| `eval()`, `new Function()` | Dynamic code execution |
| `process.env` | Environment variable access |
| `__proto__`, `constructor.constructor` | Prototype pollution |

### Allowed APIs (Allowlist)

| API | Usage |
|-----|-------|
| `blessed.screen()` | Create screen |
| `blessed.box()` | Container element |
| `blessed.text()` | Text display |
| `blessed.list()` | Scrollable list |
| `blessed.table()` | Data table |
| `blessed.form()` | Form container |
| `blessed.input()` | Text input |
| `blessed.button()` | Clickable button |
| `blessed.textarea()` | Multi-line input |
| `blessed.checkbox()` | Boolean toggle |
| `blessed.radioset()` | Radio button group |
| `blessed.progressbar()` | Progress indicator |
| `screen.append()` | Add element |
| `screen.render()` | Render screen |
| `screen.key()` | Key binding |
| `element.on()` | Event listener |
| `element.setContent()` | Update content |
| `element.focus()` | Focus element |
