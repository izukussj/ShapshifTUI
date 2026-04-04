#!/usr/bin/env node
import { Application } from './app/index.js';

const backendUrl = process.argv[2] || process.env.MOLTUI_BACKEND || 'ws://localhost:8080';

const app = new Application({
  backendUrl,
  chatWidth: '35%',
  showTimestamps: true,
});

app.start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
