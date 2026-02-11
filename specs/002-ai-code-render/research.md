# Research: AI-Generated Code Rendering

**Date**: 2026-02-04
**Feature**: 002-ai-code-render

## 1. Sandboxing Approach

### Decision: `isolated-vm`

### Rationale
- **Security**: Uses V8 isolates - true process-level isolation, not just context separation
- **Performance**: Minimal overhead compared to spawning processes, suitable for <10s target
- **Blessed Compatibility**: Can transfer serializable data and expose specific APIs
- **Maintenance**: Actively maintained, widely used in production (Cloudflare Workers pattern)
- **Node.js 20 LTS**: Full compatibility

### Alternatives Considered

| Option | Verdict | Reason |
|--------|---------|--------|
| Node.js `vm` module | REJECTED | Not a security boundary - can escape sandbox via prototype pollution |
| `vm2` | REJECTED | Deprecated due to security vulnerabilities (CVE-2023-37466, etc.) |
| `quickjs-emscripten` | CONSIDERED | Good isolation but would require blessed reimplementation for QuickJS |

### Implementation Notes
- Use `isolated-vm` to create V8 isolate
- Inject blessed library reference via `Reference` transfer
- Set memory limits (64MB default) and timeout (5s execution)
- Block all Node.js built-ins (fs, net, child_process, etc.) by not exposing them

---

## 2. Prompt Engineering Strategy

### Decision: Structured output format with few-shot examples

### Rationale
- Few-shot examples dramatically improve code structure consistency
- Explicit output format markers (````javascript` fences) enable reliable parsing
- System prompt establishes constraints; user prompt provides specific request

### Prompt Template Structure

```text
SYSTEM PROMPT:
You are a TUI code generator for the blessed library. Output ONLY valid JavaScript code.

Rules:
1. Output code inside ```javascript fences - nothing else
2. Use only blessed widgets: box, text, list, table, form, input, button, textarea, checkbox, radioset, progressbar
3. Do NOT use: require(), import, fs, net, http, child_process, eval, Function constructor
4. Create a screen, add elements, call screen.render()
5. Handle 'q' and Escape keys to exit

Example request: "Show a centered welcome message"
Example output:
```javascript
const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });
const box = blessed.box({
  top: 'center',
  left: 'center',
  width: '50%',
  height: '20%',
  content: 'Welcome!',
  border: { type: 'line' },
  style: { border: { fg: 'blue' } }
});
screen.append(box);
screen.key(['q', 'escape'], () => process.exit(0));
screen.render();
```

USER PROMPT:
Generate blessed TUI code for: {user_request}
```

### Non-Code Response Detection
- Check if response contains ```javascript fence
- If not, or if mostly prose (>50% non-code characters), trigger re-prompt
- Re-prompt includes: "Your previous response was not valid code. Output ONLY code inside ```javascript fences."

---

## 3. Code Validation Approach

### Decision: AST analysis with `@babel/parser` + custom visitor

### Rationale
- **@babel/parser**: Most complete JavaScript/TypeScript parser, handles all syntax
- **Visitor pattern**: Clean, extensible way to check all node types
- **Performance**: AST parsing is fast (<100ms for typical TUI code)

### Alternatives Considered

| Option | Verdict | Reason |
|--------|---------|--------|
| `esprima` | REJECTED | Less actively maintained, missing newer syntax |
| `acorn` | CONSIDERED | Faster but less feature-complete than Babel |
| TypeScript compiler | REJECTED | Overkill for validation, slower |
| Regex-based | REJECTED | Unreliable, can be bypassed |

### Validation Rules (Blocklist + Allowlist)

**Blocklist (REJECT if found)**:
- `require('fs')`, `require('path')`, `require('child_process')`, `require('net')`, `require('http')`
- `import` statements (except blessed)
- `eval()`, `new Function()`, `setTimeout`, `setInterval` with string args
- `process.env`, `process.exit` (except in key handlers), `global`, `globalThis`
- Property access: `__proto__`, `constructor.constructor`

**Allowlist (ONLY these blessed APIs allowed)**:
- `blessed.screen`, `blessed.box`, `blessed.text`, `blessed.list`
- `blessed.table`, `blessed.form`, `blessed.input`, `blessed.button`
- `blessed.textarea`, `blessed.checkbox`, `blessed.radioset`, `blessed.progressbar`
- `screen.append`, `screen.render`, `screen.key`, `element.on`, `element.setContent`

### Validation Pipeline
1. **Parse**: `@babel/parser` → AST (fail if syntax error)
2. **Walk**: Traverse AST with visitor
3. **Check blocklist**: Flag any dangerous patterns
4. **Check allowlist**: Ensure only approved APIs used
5. **Return**: ValidationResult with pass/fail + error details

---

## 4. Event Callback System

### Decision: Element ID-based event mapping

### Rationale
- Blessed elements don't have built-in IDs; we'll generate UUIDs
- Map element IDs to user-provided callbacks
- Serialize events with: `{ elementId, eventType, data }`

### Pattern
```typescript
interface InteractionEvent {
  elementId: string;
  eventType: 'click' | 'submit' | 'change' | 'focus' | 'blur' | 'keypress';
  data: Record<string, unknown>; // e.g., { value: 'input text' }
  timestamp: number;
}

type EventCallback = (event: InteractionEvent) => void;
```

---

## 5. Programmatic Updates

### Decision: Element registry with setter methods

### Rationale
- Maintain registry: `Map<elementId, BlessedElement>`
- Expose update API: `interface.update(elementId, { content, style, ... })`
- Changes apply directly to blessed element, no re-render from AI needed

---

## Summary of Decisions

| Area | Decision | Key Dependency |
|------|----------|----------------|
| Sandboxing | isolated-vm | `isolated-vm` |
| Prompt Engineering | Structured few-shot | AI SDK (provider-agnostic) |
| Validation | AST blocklist/allowlist | `@babel/parser` |
| Events | ID-based callbacks | Internal registry |
| Updates | Element registry + setters | Internal registry |
