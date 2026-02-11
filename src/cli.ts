#!/usr/bin/env node

import * as readline from 'readline';
import { createMoltUI } from './index.js';
import type { MoltUI } from './specs-types.js';

/**
 * Parse command line arguments
 */
function parseArgs(): { backendUrl?: string; help?: boolean; version?: boolean } {
  const args = process.argv.slice(2);
  const result: { backendUrl?: string; help?: boolean; version?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      result.help = true;
    } else if (arg === '-v' || arg === '--version') {
      result.version = true;
    } else if (arg === '-u' || arg === '--url') {
      result.backendUrl = args[++i];
    } else if (arg.startsWith('--url=')) {
      result.backendUrl = arg.split('=')[1];
    } else if (!arg.startsWith('-')) {
      result.backendUrl = arg;
    }
  }

  return result;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
MoltUI - AI-Generated TUI Framework

Usage: moltui [options] [backend-url]

Options:
  -u, --url <url>   WebSocket URL of the AI backend (default: ws://localhost:8181)
  -h, --help        Show this help message
  -v, --version     Show version number

Environment Variables:
  MOLTUI_BACKEND    Default backend WebSocket URL

Examples:
  moltui                              # Uses default ws://localhost:8181
  moltui ws://localhost:8080
  moltui --url ws://ai.example.com/ws
  MOLTUI_BACKEND=ws://localhost:8080 moltui

Start the backend first:
  TOKEN=$(node -e "console.log(require('$HOME/.codex/auth.json').tokens.access_token)")
  npx chatgpt-websocket token=$TOKEN port=8181

Then describe what TUI you want and the AI will generate it.
`);
}

/**
 * Print version
 */
function printVersion(): void {
  console.log('MoltUI v1.0.0');
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.version) {
    printVersion();
    process.exit(0);
  }

  const backendUrl = args.backendUrl || process.env.MOLTUI_BACKEND || 'ws://localhost:8181';

  console.log('MoltUI - AI-Generated TUI Framework');
  console.log(`Backend: ${backendUrl}`);
  console.log('');
  console.log('Describe what interface you want to create.');
  console.log('Type "quit" or press Ctrl+C to exit.');
  console.log('');

  const moltui = createMoltUI({
    ai: {
      provider: 'websocket',
      baseUrl: backendUrl,
      apiKey: 'unused',
      model: 'gpt-5',
    },
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = (): void => {
    rl.question('> ', async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed.toLowerCase() === 'quit' || trimmed.toLowerCase() === 'exit') {
        console.log('Goodbye!');
        rl.close();
        process.exit(0);
      }

      await render(moltui, trimmed);
      prompt();
    });
  };

  rl.on('close', () => {
    process.exit(0);
  });

  prompt();
}

/**
 * Render a TUI from user description
 */
async function render(moltui: MoltUI, description: string): Promise<void> {
  console.log('');
  console.log('Generating interface...');

  try {
    const result = await moltui.render(description);

    if (result.success) {
      console.log(`Success! (${result.attempts} attempt${result.attempts > 1 ? 's' : ''}, ${result.durationMs}ms)`);
      console.log(`Interface ID: ${result.interface?.id}`);
    } else {
      console.log('Failed to generate valid interface.');
      if (result.error) {
        console.log(`Error type: ${result.error.type}`);
        console.log(`Message: ${result.error.message}`);
        if (result.error.details && result.error.details.length > 0) {
          console.log('Details:');
          for (const detail of result.error.details) {
            console.log(`  - ${detail.message}${detail.line ? ` (line ${detail.line})` : ''}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }

  console.log('');
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
