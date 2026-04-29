# ShapeshifTUI

> A Codex-powered terminal workbench where developer workflows turn into live, interactive Ink UIs.

ShapeshifTUI is not a chat skin. It is a two-pane TUI for building disposable developer tools on demand: repo dashboards, process inspectors, diff viewers, MCP-backed inbox/PR triage, deployment checklists, log explorers, and any other workflow where a static command output is too flat but a full app would be overkill.

You ask for a view. Codex runs the needed tools, embeds real results into a React/Ink component, and ShapeshifTUI mounts it in the runtime pane. Local UI interactions stay instant. Actions that need tools or fresh data go back through Codex with approval when needed.

```text
┌─ chat ─────────────────────────────┐┌─ runtime ───────────────────────────────────────┐
│ you  show repo health for this cwd ││ Repo health                                     │
│                                    ││ branch: main        dirty files: 4              │
│ ai   rendered a live workspace     ││ tests: failing      package: shapeshiftui       │
│                                    ││                                                │
│ ❯                                  ││ Changed files                                  │
│                                    ││  M src/runtime.tsx        render guard          │
│                                    ││  M src/chat.tsx           paste handling        │
│                                    ││                                                │
│                                    ││ [Refresh] [Run tests] [Open diff] [Save view]   │
└────────────────────────────────────┘└────────────────────────────────────────────────┘
  Ctrl+A chat   Ctrl+E runtime   PgUp/PgDn scroll   Ctrl+C quit
```

## Why Use It

- Turn one-off shell/MCP investigations into real terminal interfaces.
- Keep Codex in the loop for reasoning, tool use, repairs, and regenerated views.
- Keep deterministic layout interactions local: tabs, filters, sorting, row expansion, selection, pagination, and form drafts do not require another model turn.
- Use approval-gated actions for shell/MCP operations such as killing a process, archiving mail, running tests, or opening a repo detail view.
- Save a useful generated view, then load it later or fork from it repeatedly as a fresh Codex thread.

Good prompts look like:

```text
show me the health of this repo: branch, dirty files, package scripts, recent commits
build a compact process inspector sorted by CPU with kill buttons
show my open PRs and which ones need review
inspect disk usage under ./node_modules and make it drillable
make a release checklist from package.json, git status, and the latest commits
show unread Gmail threads grouped by action needed
```

## Quick Start

Requirements:

- Node.js >= 20
- Authenticated [Codex CLI](https://developers.openai.com/codex) recommended
- Optional fallback: `OPENAI_API_KEY` for the plain OpenAI bridge

```bash
# Install and authenticate Codex once
brew install codex && codex login
# or: npm install -g @openai/codex && codex login

# Run against the current directory
npx shapeshiftui

# Run against a specific repo
npx shapeshiftui --cwd ~/Projects/my-service
```

On startup, the CLI checks for a bridge on `ws://localhost:8080`. If none is running and no URL was provided, it spawns the Codex bridge automatically. If Codex is unavailable but `OPENAI_API_KEY` is set, it falls back to the OpenAI bridge.

Connect to an existing bridge:

```bash
shapeshiftui ws://localhost:9000 --no-serve
```

## Sandbox Modes

Codex runs in `read-only` mode by default. It can inspect and execute read-only commands, but write operations are blocked unless you opt into a wider sandbox.

```bash
shapeshiftui --sandbox read-only           # default
shapeshiftui --write                       # shorthand for workspace-write
shapeshiftui --sandbox workspace-write     # edits inside --cwd only
shapeshiftui --sandbox danger-full-access  # no sandboxing; use deliberately
```

The sandbox flag only applies when ShapeshifTUI spawns the bridge. If you connect to an already-running bridge, that process owns its sandbox.

## Core Workflow

1. You describe a developer workflow in chat.
2. The bridge asks Codex to gather real data with shell commands or MCP tools.
3. Codex returns a `shapeshiftui` fenced React/Ink component.
4. `src/sandbox.ts` transpiles the component with esbuild and evaluates it in a Node `vm` with a small runtime API.
5. The runtime pane mounts the component.
6. Pure UI interactions stay local. Submitted events go back through the bridge as a new Codex turn.

The key distinction:

| Interaction | Path |
|-------------|------|
| Filter/sort/select/expand/paginate already-rendered data | local React state |
| Record a local interaction as context for later | `sendEvent(...)` |
| Refresh data, run shell, call MCP, navigate to a new data-backed view | `submitEvent(...)` |

## Slash Commands

These commands are handled by ShapeshifTUI itself, not by generated layouts.

| Command | Purpose |
|---------|---------|
| `/save <name>` | Save the current generated view for this working directory |
| `/load` | Open the native save list |
| `/load <name>` | Restore a saved view |
| `/fork` | Open the save list in "start from save" mode |
| `/fork <name>` | Start a fresh Codex thread from a saved view |
| `/delete <name>` | Delete a saved view |
| `/mcp list` | Open the native Codex MCP server list |
| `/mcp add <name>` | Open the native MCP add form |
| `/mcp remove <name>` | Confirm and remove an MCP server |
| `/plugin` | Show Codex plugin setup guidance |
| `/help` | Show command help |

## Keybindings

| Key | Action |
|-----|--------|
| `Ctrl+A` | Focus chat pane |
| `Ctrl+E` | Focus runtime pane |
| `Tab` | From chat, jump to runtime; inside runtime, cycle focusable widgets |
| `Enter` / `Space` | Activate focused button |
| `PgUp` / `PgDn` | Scroll active pane |
| Mouse wheel | Scroll pane under cursor |
| `/` | Open slash-command menu in chat |
| `Esc` | Cancel in-flight turn or close active dialog |
| `Ctrl+K` | Toggle keybinding cheatsheet |
| `Ctrl+P` | Toggle mouse tracking |
| `Ctrl+C` | Quit |

Mouse tracking is on by default. Set `SHAPESHIFTUI_MOUSE=0` to disable it at launch. Hold Option on macOS, or Shift in many terminals, to select text while mouse tracking is enabled.

## MCP Management

MCP turns Codex from repo assistant into a service workbench. ShapeshifTUI exposes a native MCP manager but does not edit `~/.codex/config.toml` directly. It shells out to Codex's own `codex mcp` subcommands, so Codex owns the schema and config migrations.

```text
/mcp list
/mcp add context7
/mcp remove context7
```

Equivalent CLI commands:

```bash
codex mcp list --json
codex mcp add context7 -- npx -y @upstash/context7-mcp
codex mcp add docs --url https://example.com/mcp --bearer-token-env-var DOCS_TOKEN
codex mcp remove context7
```

After any MCP add/remove, the bridge kills its hot-spare Codex process so the next turn sees the fresh MCP configuration.

## Saves And Forks

Saves are named checkpoints for the current working directory. They store the chat transcript, rendered source, and interaction context.

```text
/save release-dashboard
/load release-dashboard
/fork release-dashboard
```

Use `/load` when you want to restore a previous view. Use `/fork` when you want to start from the same saved context multiple times as fresh Codex threads.

## Runtime Contract

Generated components are single arrow function expressions:

```jsx
({ sendEvent, submitEvent, context }) => {
  const [filter, setFilter] = useState('dirty');
  const rows = [
    { path: 'src/runtime.tsx', status: 'M', area: 'runtime' },
    { path: 'src/chat.tsx', status: 'M', area: 'input' }
  ];

  const visible = useMemo(
    () => rows.filter((row) => filter === 'all' || row.status === 'M'),
    [filter]
  );

  return (
    <Box flexDirection="column">
      <Box>
        <Button label="Dirty" onPress={() => {
          setFilter('dirty');
          sendEvent('filter', { filter: 'dirty' });
        }} />
        <Button label="Refresh" onPress={() => {
          submitEvent('refresh');
        }} />
      </Box>
      {visible.map((row) => (
        <Box key={row.path}>
          <Box width={3}><Text>{row.status}</Text></Box>
          <Text>{row.path}</Text>
        </Box>
      ))}
    </Box>
  );
}
```

Available globals:

- React: `React`, `useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`, `useReducer`
- Ink: `Box`, `Text`, `Newline`, `Spacer`, `Static`, `Transform`, `useFocus`, `useFocusManager`, `useInput`, `useStdout`
- Widgets: `TextInput`, `Button`, `Checkbox`, `Select`, `Table`, `Progress`

Rules enforced by the prompt and guarded by the runtime:

- Return one root `<Box>`.
- Do not import or export.
- Keep deterministic interactions local.
- Use `submitEvent` only for work that needs Codex, tools, fresh data, or regenerated UI.
- Do not nest layout/widgets inside `<Text>`. In Ink, `<Text>` is inline text only; put `Box`, `Button`, `TextInput`, `Checkbox`, `Select`, `Table`, and `Progress` in `Box` containers.
- Use `Transform` only around `Text` children; it is not a layout wrapper.
- Generated render errors are caught and sent back to Codex as repair prompts instead of crashing the app.

## Architecture

```text
┌────────────────────┐   WebSocket    ┌──────────────────────┐   stdio/JSON
│ Ink TUI client     │ ◄────────────► │ bridge               │ ◄──────────► Codex CLI
│ chat + runtime     │                │ session + contracts  │              or OpenAI
└────────────────────┘                └──────────────────────┘
```

Source layout:

```text
src/
  cli.tsx             entry point, bridge auto-spawn, sandbox flags
  app.tsx             app shell, panes, slash commands, status, approvals
  chat.tsx            chat history, slash menu, paste-safe input
  runtime.tsx         compiled component mount + render error boundary
  sandbox.ts          esbuild transform + vm evaluation
  runtime-globals.ts  globals exposed to generated components
  components.tsx      Button, Checkbox, Select, Table, Progress
  mcp.tsx             native Codex MCP manager
  saved-state.tsx     native saved-view browser
  mouse.ts            SGR mouse parser and click/hover hooks
  client.ts           WebSocket client with reconnect
  types.ts            shared wire protocol

server/
  codex-bridge.js     Codex CLI bridge using `codex exec --json`
  bridge.js           OpenAI fallback bridge
  codex/AGENTS.md     Codex-side component contract and operating rules

tests/
  chat-paste.test.ts
  mouse.test.ts
  runtime-error.test.ts
```

## Environment

OpenAI fallback bridge:

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENAI_API_KEY` | none | Required for `server/bridge.js` |
| `MODEL` | `gpt-5.4` | Chat completions model |
| `PORT` | `8080` | WebSocket port |

Codex bridge:

| Variable | Default | Purpose |
|----------|---------|---------|
| `CODEX_BRIDGE_PORT` | `8080` | WebSocket port |
| `CODEX_BIN` | `codex` | Codex CLI binary |
| `CODEX_MODEL` | Codex default | Optional `codex exec -m <model>` override |
| `CODEX_SANDBOX` | `read-only` | `read-only`, `workspace-write`, or `danger-full-access` |

Client:

| Variable | Default | Purpose |
|----------|---------|---------|
| `SHAPESHIFTUI_MOUSE` | on | Set to `0` to disable mouse tracking at launch |

## Development

```bash
npm run build          # bundle dist/ with tsup
npm run dev            # watch build
npm start              # run built CLI
npm run codex-bridge   # run Codex bridge manually
npm run bridge         # run OpenAI fallback bridge manually
npm run typecheck      # TypeScript check
npm test               # Vitest suite
npm run bump           # patch version without creating a git tag
```

For local iteration:

```bash
npm run build
npm start -- --cwd ~/Projects/my-service --write
```

## License

MIT
