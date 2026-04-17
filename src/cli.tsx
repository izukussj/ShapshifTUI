import React from 'react';
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

async function main() {
  const url = process.argv[2] || 'ws://localhost:8080';
  const client = new Client(url);

  try {
    await client.waitForOpen();
  } catch (err) {
    console.error(`Failed to connect to ${url}: ${(err as Error).message}`);
    process.exit(1);
  }

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
