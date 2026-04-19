import React from 'react';
import path from 'node:path';
import net from 'node:net';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { render } from 'ink';
import { App } from './app.js';
import { Client } from './client.js';
import { setMouseEnabled } from './mouse.js';

function enterAltScreen() {
  process.stdout.write('\x1b[?1049h\x1b[H');
}

function exitAltScreen() {
  setMouseEnabled(false);
  process.stdout.write('\x1b[?1049l');
}

interface CliArgs {
  url: string;
  urlProvided: boolean;
  cwd: string | null;
  serve: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  let url = 'ws://localhost:8080';
  let urlProvided = false;
  let cwd: string | null = null;
  let serve = true;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--cwd') {
      const next = argv[++i];
      if (!next) throw new Error('--cwd requires a path argument');
      cwd = path.resolve(next);
    } else if (a === '--no-serve') {
      serve = false;
    } else if (a === '--help' || a === '-h') {
      console.log('Usage: shapeshiftui [ws-url] [--cwd <path>] [--no-serve]');
      console.log('');
      console.log('Launches the TUI. If no URL is given, spawns the Codex bridge on :8080.');
      console.log('Pass --no-serve to skip the spawn when an external bridge is already running.');
      process.exit(0);
    } else if (a && !a.startsWith('--')) {
      url = a;
      urlProvided = true;
    }
  }
  return { url, urlProvided, cwd, serve };
}

function probePort(host: string, port: number, timeoutMs = 250): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    const done = (ok: boolean) => { sock.destroy(); resolve(ok); };
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
    sock.once('timeout', () => done(false));
    sock.connect(port, host);
  });
}

async function waitForPort(host: string, port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await probePort(host, port)) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

function hasBinary(name: string): boolean {
  const result = spawnSync(name, ['--version'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  return result.status === 0 || (result.status === null && !result.error);
}

type Backend = { label: string; script: string };

function pickBackend(): Backend | null {
  if (hasBinary('codex')) {
    return { label: 'Codex', script: 'codex-bridge.js' };
  }
  if (process.env.OPENAI_API_KEY) {
    return { label: 'OpenAI', script: 'bridge.js' };
  }
  return null;
}

async function spawnBridge(url: string): Promise<ChildProcess> {
  const u = new URL(url);
  const port = Number(u.port) || 8080;
  const host = u.hostname || 'localhost';

  if (await probePort(host, port)) {
    return null as unknown as ChildProcess;
  }

  const backend = pickBackend();
  if (!backend) {
    throw new Error(
      'No backend available.\n' +
      '  Install Codex CLI:   brew install codex && codex login\n' +
      '                       (or: npm install -g @openai/codex && codex login)\n' +
      '  Or set OPENAI_API_KEY in your environment / .env.local.',
    );
  }

  const bridgePath = fileURLToPath(new URL(`../server/${backend.script}`, import.meta.url));
  process.stderr.write(`starting ${backend.label} bridge on ws://${host}:${port}…\n`);

  const child = spawn(process.execPath, [bridgePath], {
    stdio: ['ignore', 'ignore', 'pipe'],
    env: {
      ...process.env,
      CODEX_BRIDGE_PORT: String(port),
      PORT: String(port),
    },
  });

  let stderrTail = '';
  child.stderr?.on('data', (chunk: Buffer) => {
    stderrTail = (stderrTail + chunk.toString()).slice(-2000);
  });

  const ready = await waitForPort(host, port, 10000);
  if (!ready) {
    child.kill();
    const hint = stderrTail.trim() ? `\n\nBridge stderr:\n${stderrTail.trim()}` : '';
    throw new Error(`${backend.label} bridge did not start on :${port} within 10s.${hint}`);
  }
  return child;
}

async function main() {
  const { url, urlProvided, cwd, serve } = parseArgs(process.argv.slice(2));

  let bridgeChild: ChildProcess | null = null;
  if (serve && !urlProvided) {
    try {
      const child = await spawnBridge(url);
      bridgeChild = child ?? null;
    } catch (err) {
      console.error(`\n${(err as Error).message}\n`);
      process.exit(1);
    }
  }

  const client = new Client(url);
  try {
    await client.waitForOpen();
  } catch (err) {
    console.error(`Failed to connect to ${url}: ${(err as Error).message}`);
    bridgeChild?.kill();
    process.exit(1);
  }

  if (cwd) client.send({ type: 'init', cwd });

  enterAltScreen();
  if (process.env.SHAPESHIFTUI_MOUSE === '1') setMouseEnabled(true);

  const cleanup = () => {
    exitAltScreen();
    bridgeChild?.kill();
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
  process.on('uncaughtException', (err) => {
    cleanup();
    console.error(err);
    process.exit(1);
  });

  const { waitUntilExit } = render(<App client={client} />);
  await waitUntilExit();
  client.close();
  bridgeChild?.kill();
}

main().catch((err) => {
  exitAltScreen();
  console.error(err);
  process.exit(1);
});
