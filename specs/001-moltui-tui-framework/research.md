# Research: MoltUI Technical Decisions

**Feature**: 001-moltui-tui-framework
**Date**: 2026-02-03

## 1. TUI Library Selection

**Decision**: blessed (npm: blessed)

**Rationale**:
- Most mature and widely-used Node.js TUI library
- Full mouse support including click, scroll, and drag
- Built-in widget primitives (box, list, table, form, textarea)
- Supports 16/256/truecolor terminals
- Works over SSH connections
- Active community with blessed-contrib for additional widgets

**Alternatives Considered**:
| Library | Pros | Cons | Why Rejected |
|---------|------|------|--------------|
| ink | React-like API, modern | No mouse support, limited widgets | Missing FR-031 (mouse interactions) |
| terminal-kit | Good mouse support | Less mature widget system | Fewer ready-made widgets for complex layouts |
| neo-blessed | Fork of blessed | Less active maintenance | Stick with original for stability |

**Implementation Notes**:
- Use `blessed.screen()` for main application
- Leverage blessed's built-in focus management for keyboard navigation
- Custom widgets extend `blessed.Box` base class

## 2. WebSocket Library

**Decision**: ws (npm: ws)

**Rationale**:
- De facto standard for Node.js WebSocket
- Lightweight with no dependencies
- Supports ping/pong for connection health
- Handles reconnection patterns well
- Used by major projects (socket.io uses ws internally)

**Alternatives Considered**:
| Library | Pros | Cons | Why Rejected |
|---------|------|------|--------------|
| socket.io-client | Auto-reconnect, fallbacks | Requires socket.io server | Not standard WebSocket, adds complexity |
| websocket | Full RFC 6455 compliance | Heavier, more complex API | Overkill for our needs |

**Implementation Notes**:
- Implement reconnection logic manually (5-second retry per SC-007)
- Use ping/pong for connection health monitoring
- 30-second timeout for AI responses

## 3. JSON Schema Validation

**Decision**: ajv (npm: ajv)

**Rationale**:
- Fastest JSON Schema validator for JavaScript
- Supports JSON Schema draft-07 (sufficient for our needs)
- Excellent error messages for debugging invalid layouts
- Can compile schemas for repeated validation (performance)

**Alternatives Considered**:
| Library | Pros | Cons | Why Rejected |
|---------|------|------|--------------|
| zod | TypeScript-first, great DX | Not JSON Schema compatible | Need interop with other languages |
| joi | Readable schema definitions | Not JSON Schema compatible | Same as zod |
| jsonschema | Simple API | Slower than ajv | Performance matters for real-time validation |

**Implementation Notes**:
- Pre-compile schemas at startup
- Use ajv's `coerceTypes` for flexible input handling
- Custom error formatter for user-friendly messages

## 4. Testing Framework

**Decision**: Vitest

**Rationale**:
- Fast, native ESM support
- Jest-compatible API (familiar)
- Built-in TypeScript support
- Watch mode for development
- Good integration with Node.js projects

**Alternatives Considered**:
| Framework | Pros | Cons | Why Rejected |
|-----------|------|------|--------------|
| Jest | Most popular | Slower, ESM issues | Vitest faster and modern |
| Mocha + Chai | Flexible | More setup required | Vitest simpler setup |
| Node test runner | Built-in | Less mature ecosystem | Vitest better tooling |

**Implementation Notes**:
- Use `vi.mock()` for mocking blessed components
- Create test utilities for simulating terminal events
- Snapshot testing for rendered widget output

## 5. TypeScript Configuration

**Decision**: TypeScript 5.x with strict mode

**Configuration**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Rationale**:
- ES2022 for modern features (top-level await, etc.)
- NodeNext module resolution for ESM compatibility
- Strict mode catches errors early
- Declaration files for potential library consumers

## 6. Build and Distribution

**Decision**: tsup for bundling, npm for distribution

**Rationale**:
- tsup is fast and handles ESM/CJS dual builds
- Single executable output for CLI
- Tree-shaking for smaller bundle
- npm standard distribution channel

**Implementation Notes**:
- Bundle as single file for CLI distribution
- Keep dependencies external (blessed, ws, ajv)
- Use `#!/usr/bin/env node` shebang

## 7. Chart Rendering in Terminal

**Decision**: blessed-contrib sparklines + custom ASCII charts

**Rationale**:
- blessed-contrib provides sparkline, bar, and line charts
- Terminal-native, no external processes
- Consistent with blessed widget API
- Gauge widget available for progress visualization

**Alternatives Considered**:
| Approach | Pros | Cons | Why Rejected |
|----------|------|------|--------------|
| asciichart | Simple API | Limited chart types | Need bar, gauge too |
| termgraph | Good visualizations | Python dependency | Keep Node.js only |
| Custom Unicode | Full control | More development time | Start with blessed-contrib, customize later |

**Implementation Notes**:
- Use blessed-contrib for sparkline, bar, line, gauge
- Implement custom renderers if contrib insufficient
- Use Unicode box-drawing characters for borders

## 8. Virtualization for Large Datasets

**Decision**: Custom virtual scrolling in Table/List widgets

**Rationale**:
- blessed's built-in list can handle scroll but needs optimization for 10k+ items
- Only render visible rows plus buffer
- Reuse DOM-like elements (blessed boxes) for performance

**Implementation Notes**:
- Calculate visible range based on scroll position and height
- Render buffer of 5-10 rows above/below visible area
- Update on scroll events with requestAnimationFrame equivalent
- Target: <100ms scroll response for 10,000 rows (SC-005)

## 9. JSON Patch Implementation

**Decision**: fast-json-patch (npm: fast-json-patch)

**Rationale**:
- RFC 6902 compliant
- Fast apply operations
- TypeScript types included
- Small footprint

**Implementation Notes**:
- Use for incremental layout updates (FR-010)
- Validate patch operations before applying
- Roll back on patch failure

## 10. Node.js Version

**Decision**: Node.js 20 LTS (minimum 18)

**Rationale**:
- LTS ensures stability and long-term support
- Native fetch API (useful for potential future features)
- Improved ESM support
- Performance improvements over Node 16/18

**Implementation Notes**:
- Set `engines` field in package.json: `"node": ">=18.0.0"`
- Test on Node 18, 20, and 22 in CI

---

## Resolved NEEDS CLARIFICATION Items

All technical clarifications from the spec have been resolved:

| Item | Resolution |
|------|------------|
| Node.js version | Node.js 20 LTS (minimum 18) |
| TUI library | blessed |
| WebSocket library | ws |
| JSON Schema validator | ajv |
| Testing framework | Vitest |
| Chart rendering | blessed-contrib + custom ASCII |
| Large dataset handling | Custom virtual scrolling |
| JSON Patch | fast-json-patch |

---

## Dependencies Summary

### Production
```json
{
  "blessed": "^0.1.81",
  "blessed-contrib": "^4.11.0",
  "ws": "^8.16.0",
  "ajv": "^8.12.0",
  "fast-json-patch": "^3.1.1"
}
```

### Development
```json
{
  "typescript": "^5.3.0",
  "vitest": "^1.2.0",
  "tsup": "^8.0.0",
  "@types/blessed": "^0.1.25",
  "@types/ws": "^8.5.10"
}
```
