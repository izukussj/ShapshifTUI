# Data Model: Chat-Driven TUI

**Feature**: 003-chat-driven-tui
**Date**: 2026-02-11

## Entities

### ChatMessage (extends existing)

Represents a single message in the conversation.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier (uuid) |
| sender | 'user' \| 'ai' \| 'system' | Who sent the message |
| content | string | Message text content |
| timestamp | number | Unix timestamp ms |
| status | 'sending' \| 'sent' \| 'error' | Delivery status |
| interfaceGenerated | boolean | Whether this message triggered interface generation |
| interfaceId | string? | ID of interface generated (if any) |

**Lifecycle**: Created on send → status: sending → sent/error after AI response

### InterfaceState

The current state of the generated interface.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier (uuid) |
| code | string | The blessed code that renders this interface |
| generatedAt | number | When the code was generated |
| generatedFromMessageId | string | Which chat message triggered this |
| elements | ElementInfo[] | Registry of rendered elements |
| status | 'rendering' \| 'active' \| 'error' | Current state |
| errorMessage | string? | Error details if status is 'error' |

**Lifecycle**: rendering → active (success) or error (failure)

### ElementInfo

Information about a rendered interface element.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Element identifier |
| type | string | Element type (box, list, button, etc.) |
| label | string? | Human-readable label |
| interactable | boolean | Whether element accepts user input |

### InteractionEvent

A user interaction with an interface element.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| elementId | string | Which element was interacted with |
| elementType | string | Type of element |
| elementLabel | string? | Label for context |
| eventType | 'click' \| 'select' \| 'input' \| 'submit' \| 'focus' \| 'blur' | What happened |
| value | unknown? | Associated value (selected item, input text, etc.) |
| timestamp | number | When it happened |

**Retention**: Keep last 10 interactions in memory

### SavedInterface

A persisted interface configuration.

| Field | Type | Description |
|-------|------|-------------|
| name | string | User-assigned name (filesystem-safe) |
| code | string | The blessed code |
| chatContext | ChatMessage[] | Messages that led to this interface |
| savedAt | number | When it was saved |
| description | string? | Optional description |

**Storage**: `~/.moltui/interfaces/{name}.json`

### ChatHistoryStore

Persisted chat history.

| Field | Type | Description |
|-------|------|-------------|
| messages | ChatMessage[] | All chat messages |
| lastUpdated | number | Last modification timestamp |
| version | number | Schema version for migrations |

**Storage**: `~/.moltui/history.json`

### ConversationContext

Context passed to AI for each request.

| Field | Type | Description |
|-------|------|-------------|
| recentMessages | ChatMessage[] | Last N messages (configurable, default 20) |
| currentInterface | string? | Current interface code (if any) |
| recentInteractions | InteractionEvent[] | Last 10 interactions |
| savedInterfaces | string[] | List of saved interface names |

## Relationships

```
ChatMessage 1──────────0..1 InterfaceState
    │                         │
    │                         │
    └─────────────────────────┼───── InteractionEvent (many)
                              │
                              │
SavedInterface ◄──────────────┘ (snapshot of InterfaceState + context)
```

## State Transitions

### ChatMessage Status
```
[created] → sending → sent
                  └→ error
```

### InterfaceState Status
```
[created] → rendering → active
                    └→ error
```

### Application Connection State (existing)
```
disconnected → connecting → connected
                        └→ reconnecting (up to 3 attempts)
                                     └→ disconnected (prompt user)
```

## Validation Rules

1. **ChatMessage.id**: Must be unique UUID
2. **ChatMessage.content**: Non-empty string, max 10,000 characters
3. **SavedInterface.name**: Alphanumeric + hyphens, 1-50 characters, unique
4. **InteractionEvent buffer**: Max 10 items, FIFO eviction
5. **ChatHistory**: Max 1000 messages, oldest evicted on overflow

## Storage Schema

### ~/.moltui/history.json
```json
{
  "version": 1,
  "lastUpdated": 1707667200000,
  "messages": [
    {
      "id": "uuid-1",
      "sender": "user",
      "content": "Create a dashboard",
      "timestamp": 1707667100000,
      "status": "sent",
      "interfaceGenerated": true,
      "interfaceId": "iface-uuid-1"
    }
  ]
}
```

### ~/.moltui/interfaces/{name}.json
```json
{
  "name": "my-dashboard",
  "code": "const blessed = require('blessed');\n...",
  "chatContext": [...],
  "savedAt": 1707667200000,
  "description": "System monitoring dashboard"
}
```
