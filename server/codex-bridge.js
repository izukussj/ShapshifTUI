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
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CODEX_CWD = path.join(__dirname, 'codex');
const LOG_DIR = path.join(__dirname, 'logs');
fs.mkdirSync(LOG_DIR, { recursive: true });

const PORT = process.env.CODEX_BRIDGE_PORT || process.env.PORT || 8080;
const CODEX_BIN = process.env.CODEX_BIN || 'codex';
const SANDBOX = process.env.CODEX_SANDBOX || 'workspace-write';

class Session {
  constructor(ws) {
    this.ws = ws;
    this.threadId = null;
    this.interactions = [];
    this.logFile = path.join(LOG_DIR, `codex-session-${Date.now()}.jsonl`);
    this.busy = false;
  }

  log(entry) {
    fs.appendFileSync(this.logFile, JSON.stringify({ ...entry, ts: new Date().toISOString() }) + '\n');
  }

  send(sender, content) {
    this.ws.send(JSON.stringify({
      type: 'message',
      message: {
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender,
        content,
        timestamp: Date.now(),
      },
    }));
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
    const args = resume
      ? ['exec', 'resume', this.threadId, '--json', '--skip-git-repo-check', prompt]
      : ['exec', '--json', '--skip-git-repo-check', '-s', SANDBOX, '-C', CODEX_CWD, prompt];

    this.log({ type: 'codex-spawn', resume, threadId: this.threadId, promptPreview: prompt.slice(0, 200) });

    let stderrBuf = '';
    let stdoutBuf = '';
    let anyOutput = false;

    const status = (text) => this.sendStatus(text);

    status('thinking…');

    const child = spawn(CODEX_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });

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
      this.sendStatus(null);
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
      this.sendError(`Failed to launch codex (${CODEX_BIN}): ${err.message}`);
    });
  }

  async handleChat(content, clientInteractions) {
    this.mergeInteractions(clientInteractions);
    this.log({ type: 'incoming', kind: 'chat', content, interactions: clientInteractions });
    await this.runTurn(content + this.interactionContext());
  }

  async handleEvent(eventType, data) {
    this.interactions.push({ eventType, data, timestamp: Date.now() });
    if (this.interactions.length > 50) this.interactions = this.interactions.slice(-50);
    this.log({ type: 'incoming', kind: 'event', eventType, data });
    await this.runTurn(this.formatEventPrompt(eventType, data) + this.interactionContext());
  }
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
    if (msg.type === 'chat') {
      session.handleChat(msg.content, msg.interactions);
    } else if (msg.type === 'event') {
      session.handleEvent(msg.eventType, msg.data);
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
