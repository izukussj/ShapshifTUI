#!/usr/bin/env node
/**
 * Codex CLI bridge for ShapeshifTUI.
 *
 * Exposes the same WebSocket wire protocol as bridge.js but routes every
 * turn through `codex exec --json`. The system prompt and operating style
 * live in ./codex/AGENTS.md (picked up because we -C into that directory).
 */

import { WebSocketServer } from 'ws';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CODEX_CWD = path.join(__dirname, 'codex');
const LOG_DIR = path.join(__dirname, 'logs');
const VIEWS_DIR = path.join(os.homedir(), '.shapeshiftui', 'views');
fs.mkdirSync(LOG_DIR, { recursive: true });
fs.mkdirSync(VIEWS_DIR, { recursive: true });

function cwdHash(cwd) {
  return crypto.createHash('sha1').update(cwd).digest('hex').slice(0, 12);
}

function viewDir(cwd) {
  return path.join(VIEWS_DIR, cwdHash(cwd));
}

function viewFile(cwd, name) {
  return path.join(viewDir(cwd), `${encodeURIComponent(name)}.json`);
}

const PORT = process.env.CODEX_BRIDGE_PORT || process.env.PORT || 8080;
const CODEX_BIN = process.env.CODEX_BIN || 'codex';
const SANDBOX = process.env.CODEX_SANDBOX || 'read-only';

// Loaded once at startup. Prepended on the first turn of sessions whose cwd
// is not the default (i.e. the client passed --cwd to run codex elsewhere).
// When the default cwd is used, codex's own AGENTS.md discovery handles it.
const CANONICAL_INSTRUCTIONS = fs.readFileSync(path.join(CODEX_CWD, 'AGENTS.md'), 'utf8');

class Session {
  constructor(ws) {
    this.ws = ws;
    this.threadId = null;
    this.interactions = [];
    this.logFile = path.join(LOG_DIR, `codex-session-${Date.now()}.jsonl`);
    this.busy = false;
    this.cwd = CODEX_CWD;
    // Transcript of chat-visible turns (user + ai + system), used for save/load.
    // Not the same as this.log() which is the full JSONL debug stream.
    this.transcript = [];
    // Pending approval gate entries, keyed by id. Value: { eventType, data }.
    this.pendingApprovals = new Map();
    // The codex child for the in-flight turn, or null when idle. Lets
    // handleCancel() SIGTERM the process on user request.
    this.currentChild = null;
    this.cancelled = false;
  }

  summarizeAction(data) {
    const d = data ?? {};
    if (d.tool === 'shell') return { tool: 'shell', summary: `shell: ${d.cmd ?? '(no cmd)'}` };
    if (d.tool === 'mcp') {
      const args = d.args ? ` ${JSON.stringify(d.args)}` : '';
      return { tool: 'mcp', summary: `mcp ${d.server}/${d.name}${args}` };
    }
    return { tool: 'other', summary: `action: ${JSON.stringify(d).slice(0, 120)}` };
  }

  requestApproval(eventType, data) {
    const id = `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { tool, summary } = this.summarizeAction(data);
    this.pendingApprovals.set(id, { eventType, data });
    this.ws.send(JSON.stringify({
      type: 'approval_request',
      request: { id, tool, summary, details: data ?? null },
    }));
    this.log({ type: 'approval-request', id, tool, summary });
  }

  async handleApprovalResponse(id, approved) {
    const pending = this.pendingApprovals.get(id);
    if (!pending) return;
    this.pendingApprovals.delete(id);
    this.log({ type: 'approval-response', id, approved });
    if (!approved) {
      const { summary } = this.summarizeAction(pending.data);
      this.send('system', `denied — ${summary}`);
      return;
    }
    await this.runTurn(this.formatEventPrompt(pending.eventType, pending.data) + this.interactionContext());
  }

  recordTurn(sender, content) {
    this.transcript.push({
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender,
      content,
      timestamp: Date.now(),
    });
  }

  handleInit({ cwd }) {
    if (typeof cwd !== 'string' || !cwd) return;
    const resolved = path.resolve(cwd);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      this.sendError(`--cwd path does not exist or is not a directory: ${resolved}`);
      return;
    }
    this.cwd = resolved;
    this.log({ type: 'init', cwd: resolved });
    this.send('ai', `Working in \`${resolved}\`.`);
  }

  log(entry) {
    fs.appendFileSync(this.logFile, JSON.stringify({ ...entry, ts: new Date().toISOString() }) + '\n');
  }

  send(sender, content) {
    const message = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender,
      content,
      timestamp: Date.now(),
    };
    this.ws.send(JSON.stringify({ type: 'message', message }));
    this.transcript.push(message);
    this.log({ type: 'outgoing', sender, content });
  }

  sendError(error) {
    this.sendStatus(null);
    this.ws.send(JSON.stringify({ type: 'error', error }));
    this.log({ type: 'error', error });
  }

  sendStatus(text) {
    this.ws.send(JSON.stringify({ type: 'status', text }));
    this.log({ type: 'status', text });
  }

  sendNotice(level, text) {
    this.ws.send(JSON.stringify({ type: 'notice', level, text }));
    this.log({ type: 'notice', level, text });
  }

  maybePromoteSandboxDenial(text) {
    // Codex wraps blocked commands' stderr inside agent_message prose. Surface
    // the underlying OS denial as a vim-style bar so users don't have to read
    // the chat wall to notice a write was blocked by the sandbox.
    const patterns = [
      /Operation not permitted/,
      /Read-only file system/,
      /Permission denied/,
      /sandbox (?:is )?read-only/i,
      /blocked by the (?:read-only )?sandbox/i,
    ];
    for (const re of patterns) {
      const m = text.match(re);
      if (m) {
        const line = text.split('\n').find((l) => re.test(l)) ?? m[0];
        this.sendNotice('error', line.trim().slice(0, 200));
        return;
      }
    }
  }

  mergeInteractions(incoming) {
    if (!incoming?.length) return;
    this.interactions.push(...incoming);
    if (this.interactions.length > 50) this.interactions = this.interactions.slice(-50);
  }

  interactionContext() {
    if (!this.interactions.length) return '';
    const recent = this.interactions.slice(-10)
      .map((e) => `  - ${e.eventType}: ${JSON.stringify(e.data ?? {})}`)
      .join('\n');
    return `\n\n[Recent user interactions]\n${recent}`;
  }

  formatEventPrompt(eventType, data) {
    // See AGENTS.md "Action conventions"
    if (eventType === 'refresh') {
      return '[User clicked Refresh — re-run the tools for the current view and re-emit it with fresh data.]';
    }
    if (eventType === 'action') {
      const d = data ?? {};
      if (d.tool === 'shell') {
        return `[User requested shell action: \`${d.cmd}\`]\nExecute it (subject to sandbox), then re-emit the previous view with updated state.`;
      }
      if (d.tool === 'mcp') {
        return `[User requested MCP action: server=${d.server}, tool=${d.name}, args=${JSON.stringify(d.args ?? {})}]\nCall the MCP tool, then re-emit the previous view with updated state.`;
      }
      return `[User triggered action]\nData: ${JSON.stringify(d)}`;
    }
    if (eventType === 'navigate') {
      return `[User navigated]\nData: ${JSON.stringify(data ?? {})}\nEmit the requested view.`;
    }
    return `[User triggered event: ${eventType}]\nData: ${JSON.stringify(data ?? {})}`;
  }

  async runTurn(prompt) {
    if (this.busy) {
      this.sendStatus('still working on the previous turn — hold on');
      return;
    }
    this.busy = true;

    // `codex exec resume` inherits sandbox/cwd from the original session, so
    // we only pass -s/-C on the first turn. It doesn't accept them on resume.
    const resume = this.threadId !== null;
    // On first turn with a non-default cwd, codex can't discover our AGENTS.md
    // (it lives in server/codex/). Prepend the canonical contract as a preamble
    // so the widget rendering protocol applies wherever codex runs.
    const needsPreamble = !resume && this.cwd !== CODEX_CWD;
    const finalPrompt = needsPreamble
      ? `${CANONICAL_INSTRUCTIONS}\n\n---\n\nUser: ${prompt}`
      : prompt;
    const args = resume
      ? ['exec', 'resume', this.threadId, '--json', '--skip-git-repo-check', finalPrompt]
      : ['exec', '--json', '--skip-git-repo-check', '-s', SANDBOX, '-C', this.cwd, finalPrompt];

    this.log({ type: 'codex-spawn', resume, threadId: this.threadId, cwd: this.cwd, preamble: needsPreamble, promptPreview: prompt.slice(0, 200) });

    let stderrBuf = '';
    let stdoutBuf = '';
    let anyOutput = false;

    const status = (text) => this.sendStatus(text);

    status('thinking…');

    const child = spawn(CODEX_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    this.currentChild = child;
    this.cancelled = false;

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdoutBuf += chunk;
      let nl;
      while ((nl = stdoutBuf.indexOf('\n')) !== -1) {
        const line = stdoutBuf.slice(0, nl).trim();
        stdoutBuf = stdoutBuf.slice(nl + 1);
        if (!line) continue;
        try {
          const evt = JSON.parse(line);
          this.log({ type: 'codex-event', evt });

          if (evt.type === 'thread.started' && evt.thread_id) {
            this.threadId = evt.thread_id;
            continue;
          }

          if (evt.type === 'item.started' && evt.item?.type === 'command_execution') {
            const raw = String(evt.item.command || '').replace(/\s+/g, ' ');
            const cmd = raw.length > 120 ? raw.slice(0, 117) + '…' : raw;
            status(`working — ${cmd}`);
            continue;
          }

          if (evt.type === 'item.completed' && evt.item?.type === 'agent_message' && typeof evt.item.text === 'string') {
            anyOutput = true;
            this.send('ai', evt.item.text);
            this.maybePromoteSandboxDenial(evt.item.text);
            continue;
          }

          if (evt.type === 'turn.completed') {
            status(null);
            continue;
          }

          if (evt.type === 'turn.failed') {
            const detail = JSON.stringify(evt.error ?? {}).slice(0, 200);
            this.sendError(`turn failed: ${detail}`);
            continue;
          }
        } catch {
          // ignore non-JSON line
        }
      }
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (c) => { stderrBuf += c; });

    child.on('close', (code) => {
      this.busy = false;
      this.currentChild = null;
      this.sendStatus(null);
      if (this.cancelled) {
        this.send('system', 'turn cancelled');
        return;
      }
      if (code !== 0) {
        this.sendError(`codex exited with code ${code}${stderrBuf ? `: ${stderrBuf.trim().slice(-500)}` : ''}`);
        return;
      }
      if (!anyOutput) {
        this.sendError('codex finished without producing a message');
      }
    });

    child.on('error', (err) => {
      this.busy = false;
      this.currentChild = null;
      this.sendError(`Failed to launch codex (${CODEX_BIN}): ${err.message}`);
    });
  }

  handleCancel() {
    if (!this.currentChild) return;
    this.cancelled = true;
    this.currentChild.kill('SIGTERM');
    this.log({ type: 'cancel' });
  }

  async handleChat(content, clientInteractions) {
    this.mergeInteractions(clientInteractions);
    this.recordTurn('user', content);
    this.log({ type: 'incoming', kind: 'chat', content, interactions: clientInteractions });
    await this.runTurn(content + this.interactionContext());
  }

  async handleEvent(eventType, data) {
    this.interactions.push({ eventType, data, timestamp: Date.now() });
    if (this.interactions.length > 50) this.interactions = this.interactions.slice(-50);
    this.log({ type: 'incoming', kind: 'event', eventType, data });

    if (eventType === 'load-view' && data && typeof data.name === 'string') {
      this.handleLoad(data.name);
      return;
    }

    // Gate any `action` event behind an explicit user approval. `navigate`,
    // `refresh`, and other signaling events pass through as before.
    if (eventType === 'action') {
      this.requestApproval(eventType, data);
      return;
    }

    await this.runTurn(this.formatEventPrompt(eventType, data) + this.interactionContext());
  }

  handleSave(name) {
    if (!name || typeof name !== 'string') {
      this.sendError('save: missing name');
      return;
    }
    if (this.transcript.length === 0) {
      this.sendError('save: nothing to save yet — chat first');
      return;
    }
    const dir = viewDir(this.cwd);
    fs.mkdirSync(dir, { recursive: true });
    const payload = {
      name,
      cwd: this.cwd,
      thread_id: this.threadId,
      messages: this.transcript,
      saved_at: Date.now(),
    };
    fs.writeFileSync(viewFile(this.cwd, name), JSON.stringify(payload, null, 2));
    this.send('system', `saved "${name}" (${this.transcript.length} messages)`);
  }

  handleLoad(name) {
    const file = viewFile(this.cwd, name);
    if (!fs.existsSync(file)) {
      this.sendError(`load: no view named "${name}" for this directory`);
      return;
    }
    let saved;
    try {
      saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      this.sendError(`load: corrupt save file: ${err.message}`);
      return;
    }
    this.threadId = saved.thread_id || null;
    this.cwd = saved.cwd || this.cwd;
    this.transcript = Array.isArray(saved.messages) ? saved.messages : [];
    this.interactions = [];
    this.ws.send(JSON.stringify({
      type: 'restore',
      name,
      messages: this.transcript,
    }));
    this.log({ type: 'load', name, thread_id: this.threadId, cwd: this.cwd });
  }

  handleListViews() {
    const dir = viewDir(this.cwd);
    let items = [];
    if (fs.existsSync(dir)) {
      items = fs.readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
          try {
            const obj = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
            return {
              name: obj.name,
              saved: new Date(obj.saved_at).toISOString().slice(0, 10),
              turns: Array.isArray(obj.messages) ? obj.messages.length : 0,
            };
          } catch { return null; }
        })
        .filter(Boolean)
        .sort((a, b) => (a.name < b.name ? -1 : 1));
    }
    const jsx = renderViewsListJsx(items, this.cwd);
    this.send('ai', `Saved views for \`${this.cwd}\`:\n\n\`\`\`shapeshiftui\n${jsx}\n\`\`\``);
  }

  handleDeleteView(name) {
    const file = viewFile(this.cwd, name);
    if (!fs.existsSync(file)) {
      this.sendError(`delete: no view named "${name}"`);
      return;
    }
    fs.unlinkSync(file);
    this.send('system', `deleted "${name}"`);
  }
}

function renderViewsListJsx(items, cwd) {
  if (items.length === 0) {
    return `() => (
  <Box flexDirection="column">
    <Text dimColor>No saved views for ${JSON.stringify(cwd)}.</Text>
    <Text dimColor>Use /save &lt;name&gt; after a view is rendered.</Text>
  </Box>
)`;
  }
  return `({ submitEvent }) => {
  const rows = ${JSON.stringify(items)};
  return (
    <Box flexDirection="column">
      <Text bold>Saved views ({rows.length})</Text>
      <Box marginTop={1} />
      <Table
        columns={[
          { key: 'name', label: 'Name', width: 28 },
          { key: 'saved', label: 'Saved', width: 12 },
          { key: 'turns', label: 'Turns', width: 6, align: 'right' },
        ]}
        rows={rows}
        onRowPress={(row) => submitEvent('load-view', { name: row.name })}
      />
      <Box marginTop={1}>
        <Text dimColor>Click a row to load. /delete &lt;name&gt; to remove.</Text>
      </Box>
    </Box>
  );
}`;
}

const wss = new WebSocketServer({ port: PORT });
console.log(`shapeshiftui codex bridge on ws://localhost:${PORT}`);
console.log(`  sandbox: ${SANDBOX}   binary: ${CODEX_BIN}   cwd: ${CODEX_CWD}`);

wss.on('connection', (ws) => {
  const session = new Session(ws);
  console.log(`client connected → ${session.logFile}`);
  session.send('ai', 'Connected to ShapeshifTUI (Codex backend). Ask for anything — I can run tools and render live UIs.');

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === 'init') {
      session.handleInit(msg);
    } else if (msg.type === 'chat') {
      session.handleChat(msg.content, msg.interactions);
    } else if (msg.type === 'event') {
      session.handleEvent(msg.eventType, msg.data);
    } else if (msg.type === 'save') {
      session.handleSave(msg.name);
    } else if (msg.type === 'load') {
      session.handleLoad(msg.name);
    } else if (msg.type === 'list-views') {
      session.handleListViews();
    } else if (msg.type === 'delete-view') {
      session.handleDeleteView(msg.name);
    } else if (msg.type === 'approval_response') {
      session.handleApprovalResponse(msg.id, !!msg.approved);
    } else if (msg.type === 'cancel') {
      session.handleCancel();
    }
  });

  ws.on('close', () => {
    console.log('client disconnected');
    session.log({ type: 'disconnect' });
  });
});

process.on('SIGINT', () => {
  console.log('\nshutting down');
  wss.close();
  process.exit(0);
});
