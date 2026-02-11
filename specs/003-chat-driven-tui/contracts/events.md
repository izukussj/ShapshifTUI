# Internal Event Contracts

**Feature**: 003-chat-driven-tui
**Date**: 2026-02-11

This feature is a CLI application with no external API. These contracts define internal event bus communication between components.

## Event Bus Events

### Chat Events

#### chat:send
Emitted when user submits a message in chat panel.

```typescript
eventBus.emit('chat:send', content: string)
```

**Producer**: ChatPanel
**Consumer**: Application (triggers AI generation flow)

#### chat:message
Emitted when a message should be displayed in chat.

```typescript
eventBus.emit('chat:message', message: ChatMessage)
```

**Producer**: Application (user messages, AI responses, system messages)
**Consumer**: ChatPanel (renders message)

#### chat:history
Emitted when chat history is loaded from storage.

```typescript
eventBus.emit('chat:history', messages: ChatMessage[])
```

**Producer**: Storage layer on startup
**Consumer**: ChatPanel (populates message list)

#### chat:clear
Emitted when user requests chat history clear.

```typescript
eventBus.emit('chat:clear')
```

**Producer**: Application (on user command)
**Consumer**: ChatPanel, Storage

### Interface Events

#### interface:generating
Emitted when AI starts generating interface code.

```typescript
eventBus.emit('interface:generating', messageId: string)
```

**Producer**: Application
**Consumer**: UI (shows loading indicator)

#### interface:rendered
Emitted when interface is successfully rendered.

```typescript
eventBus.emit('interface:rendered', state: InterfaceState)
```

**Producer**: Application (after sandbox execution)
**Consumer**: UI, Storage (for potential auto-save)

#### interface:error
Emitted when interface generation or rendering fails.

```typescript
eventBus.emit('interface:error', { messageId: string, error: string })
```

**Producer**: Application
**Consumer**: ChatPanel (shows error message)

#### interface:interaction
Emitted when user interacts with interface element.

```typescript
eventBus.emit('interface:interaction', event: InteractionEvent)
```

**Producer**: Interface elements
**Consumer**: Application (tracks for AI context)

### Storage Events

#### storage:save
Emitted to trigger interface save.

```typescript
eventBus.emit('storage:save', { name: string, description?: string })
```

**Producer**: Application (on "save as X" command)
**Consumer**: Storage layer

#### storage:load
Emitted to trigger interface load.

```typescript
eventBus.emit('storage:load', name: string)
```

**Producer**: Application (on "load X" command)
**Consumer**: Storage layer → emits interface:rendered

#### storage:list
Request list of saved interfaces.

```typescript
eventBus.emit('storage:list')
// Response via storage:list:result
eventBus.emit('storage:list:result', names: string[])
```

### Connection Events (existing)

#### connection:state
```typescript
eventBus.emit('connection:state', state: 'connected' | 'disconnected' | 'reconnecting')
```

#### connection:error
```typescript
eventBus.emit('connection:error', error: Error)
```

### Focus Events

#### focus:panel
Emitted when focus should move to a specific panel.

```typescript
eventBus.emit('focus:panel', panel: 'chat' | 'interface')
```

**Producer**: Application (on Tab key)
**Consumer**: ChatPanel, Interface container

## Event Flow Diagrams

### User Sends Chat Message
```
User types + Enter
    │
    ▼
ChatPanel ──chat:send──► Application
                              │
                              ├─► chat:message (user msg)
                              │
                              ├─► interface:generating
                              │
                              ▼
                         MoltUI.render()
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
               [success]            [failure]
                    │                   │
                    ▼                   ▼
           interface:rendered    interface:error
                    │                   │
                    ▼                   ▼
           chat:message          chat:message
           (AI response)         (error msg)
```

### User Interacts with Interface
```
User clicks/selects/inputs
    │
    ▼
Interface Element
    │
    ▼
interface:interaction ──► Application
                              │
                              ▼
                    Add to interaction buffer
                    (included in next AI prompt)
```

### Save Interface Command
```
User: "save as my-dashboard"
    │
    ▼
ChatPanel ──chat:send──► Application
                              │
                              ├─► (parse command)
                              │
                              ▼
                        storage:save
                              │
                              ▼
                        Storage Layer
                              │
                              ▼
                        chat:message
                        ("Saved as my-dashboard")
```
