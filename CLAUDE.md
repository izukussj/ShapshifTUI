# MoltUI Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-03

## Active Technologies
- TypeScript 5.x / Node.js 20 LTS + blessed (TUI rendering), vm2 or isolated-vm (sandboxing), AI SDK (provider-agnostic) (002-ai-code-render)
- N/A (stateless rendering, no persistence required) (002-ai-code-render)
- TypeScript 5.x / Node.js 20 LTS + blessed (TUI), ws (WebSocket), @babel/parser (validation), isolated-vm (sandbox) (003-chat-driven-tui)
- Local JSON files for chat history and saved interfaces (003-chat-driven-tui)

- TypeScript 5.x / Node.js 20 LTS (001-moltui-tui-framework)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x / Node.js 20 LTS: Follow standard conventions

## Recent Changes
- 003-chat-driven-tui: Added TypeScript 5.x / Node.js 20 LTS + blessed (TUI), ws (WebSocket), @babel/parser (validation), isolated-vm (sandbox)
- 002-ai-code-render: Added TypeScript 5.x / Node.js 20 LTS + blessed (TUI rendering), vm2 or isolated-vm (sandboxing), AI SDK (provider-agnostic)

- 001-moltui-tui-framework: Added TypeScript 5.x / Node.js 20 LTS

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
