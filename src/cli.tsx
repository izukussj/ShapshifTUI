import React from 'react';
import path from 'node:path';
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
  cwd: string | null;
}

function parseArgs(argv: string[]): CliArgs {
  let url = 'ws://localhost:8080';
  let cwd: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--cwd') {
      const next = argv[++i];
      if (!next) throw new Error('--cwd requires a path argument');
      cwd = path.resolve(next);
    } else if (a === '--help' || a === '-h') {
      console.log('Usage: shapeshiftui [ws-url] [--cwd <path>]');
      process.exit(0);
    } else if (a && !a.startsWith('--')) {
      url = a;
    }
  }
  return { url, cwd };
}

async function main() {
  const { url, cwd } = parseArgs(process.argv.slice(2));
  const client = new Client(url);

  try {
    await client.waitForOpen();
  } catch (err) {
    console.error(`Failed to connect to ${url}: ${(err as Error).message}`);
    process.exit(1);
  }

  if (cwd) client.send({ type: 'init', cwd });

  enterAltScreen();
  if (process.env.SHAPESHIFTUI_MOUSE === '1') setMouseEnabled(true);

  // Restore terminal on any exit path.
  process.on('exit', exitAltScreen);
  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
  process.on('uncaughtException', (err) => {
    exitAltScreen();
    console.error(err);
    process.exit(1);
  });

  const { waitUntilExit } = render(<App client={client} />);
  await waitUntilExit();
  client.close();
}

main().catch((err) => {
  exitAltScreen();
  console.error(err);
  process.exit(1);
});
