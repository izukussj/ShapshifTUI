#!/usr/bin/env node
/**
 * AI bridge for shapeshiftui. Connects the TUI client to OpenAI, translating
 * between the shapeshiftui wire protocol and chat completions. Logs all
 * interactions to server/logs/ for debugging.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { WebSocketServer } from 'ws';
import OpenAI from 'openai';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, 'logs');
fs.mkdirSync(LOG_DIR, { recursive: true });

const PORT = process.env.PORT || 8080;
const MODEL = process.env.MODEL || 'gpt-5.4';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are ShapeshifTUI, an AI that builds interactive terminal interfaces. When the user asks for a UI, you respond with a JSX component inside a \\\`\\\`\\\`shapeshiftui fenced code block.

## Component contract

Your component is a single arrow function expression (NOT a default export, NOT a function declaration):

\`\`\`shapeshiftui
({ sendEvent, submitEvent, context }) => {
  // your component here
  return <Box>...</Box>;
}
\`\`\`

### Props (destructured from the function argument)
- \`sendEvent(eventType: string, data?: any)\` — silent event, recorded locally for context but does NOT notify you. Use for typing, focus changes, intermediate state.
- \`submitEvent(eventType: string, data?: any)\` — loud event, recorded AND sent back to you so you can respond. Use for form submits, confirmations, explicit user actions.
- \`context.events\` — array of past interaction records: \`{ eventType, data, timestamp }\`

### Globals available (DO NOT destructure from props — they are in scope as bare identifiers)
- React, useState, useEffect, useRef, useMemo, useCallback, useReducer
- Box, Text, Newline, Spacer, Static, Transform (from Ink)
- useFocus, useFocusManager, useInput (from Ink)
- TextInput (from ink-text-input)
- Button — custom component: \`<Button label="Click me" onPress={() => ...} />\`

### Rules
1. Always return a single root \`<Box>\` element.
2. Use \`useState\` for local state, \`useEffect\` for side effects.
3. Use \`sendEvent\` for intermediate/silent events (typing, toggling).
4. Use \`submitEvent\` for actions that need your response (form submit, confirm, etc).
5. Use \`<TextInput value={v} onChange={setV} focus={bool} />\` for text inputs.
6. Use \`<Button label="..." onPress={() => ...} />\` for buttons. Buttons are keyboard-focusable (Tab) and activated with Enter/Space.
7. Keep components self-contained — all state lives inside the component.
8. Do NOT import anything. Do NOT use export. Just the arrow function.
9. You can include explanatory text before/after the code block.

### Example
User: "make a todo list"

Here's a todo list:

\`\`\`shapeshiftui
({ sendEvent, submitEvent }) => {
  const [items, setItems] = useState([]);
  const [input, setInput] = useState('');

  const add = () => {
    if (!input.trim()) return;
    const next = [...items, { text: input, done: false }];
    setItems(next);
    setInput('');
    sendEvent('add', { text: input });
  };

  const toggle = (i) => {
    const next = items.map((item, j) => j === i ? { ...item, done: !item.done } : item);
    setItems(next);
    sendEvent('toggle', { index: i });
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">Todo List ({items.filter(i => !i.done).length} remaining)</Text>
      {items.map((item, i) => (
        <Box key={i} gap={1}>
          <Button label={item.done ? "[x]" : "[ ]"} onPress={() => toggle(i)} />
          <Text strikethrough={item.done}>{item.text}</Text>
        </Box>
      ))}
      <Box gap={1}>
        <TextInput value={input} onChange={setInput} onSubmit={add} focus={true} />
        <Button label="Add" onPress={add} />
      </Box>
    </Box>
  );
}
\`\`\`
`;

// Per-connection state
class Session {
  constructor(ws) {
    this.ws = ws;
    this.history = [{ role: 'system', content: SYSTEM_PROMPT }];
    this.interactions = [];
    this.logFile = path.join(LOG_DIR, `session-${Date.now()}.jsonl`);
  }

  log(entry) {
    const line = JSON.stringify({ ...entry, ts: new Date().toISOString() });
    fs.appendFileSync(this.logFile, line + '\n');
  }

  send(sender, content) {
    const msg = {
      type: 'message',
      message: {
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender,
        content,
        timestamp: Date.now(),
      },
    };
    this.ws.send(JSON.stringify(msg));
    this.log({ type: 'outgoing', sender, content });
  }

  async handleChat(content, clientInteractions) {
    // Merge incoming interactions into session history.
    if (clientInteractions?.length) {
      this.interactions.push(...clientInteractions);
      // Keep last 50.
      if (this.interactions.length > 50) {
        this.interactions = this.interactions.slice(-50);
      }
    }

    // Build user message with interaction context.
    let userContent = content;
    if (this.interactions.length > 0) {
      const recent = this.interactions.slice(-10);
      const ctx = recent
        .map((e) => `  - ${e.eventType}: ${JSON.stringify(e.data ?? {})}`)
        .join('\n');
      userContent += `\n\n[Recent user interactions]\n${ctx}`;
    }

    this.history.push({ role: 'user', content: userContent });
    this.log({ type: 'incoming', kind: 'chat', content, interactions: clientInteractions });

    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: this.history,
        temperature: 0.7,
        max_completion_tokens: 4096,
      });

      const reply = completion.choices[0]?.message?.content || 'No response.';
      this.history.push({ role: 'assistant', content: reply });

      // Keep history manageable — keep system + last 20 turns.
      if (this.history.length > 41) {
        this.history = [this.history[0], ...this.history.slice(-20)];
      }

      this.send('ai', reply);
    } catch (err) {
      const errMsg = `API error: ${err.message}`;
      this.send('system', errMsg);
      this.log({ type: 'error', error: errMsg });
    }
  }

  async handleEvent(eventType, data) {
    this.interactions.push({ eventType, data, timestamp: Date.now() });
    if (this.interactions.length > 50) {
      this.interactions = this.interactions.slice(-50);
    }
    this.log({ type: 'incoming', kind: 'event', eventType, data });

    // Send the event to the AI as a user message so it can respond.
    const content = `[User triggered event: ${eventType}]\nData: ${JSON.stringify(data ?? {})}`;
    this.history.push({ role: 'user', content });

    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: this.history,
        temperature: 0.7,
        max_completion_tokens: 4096,
      });

      const reply = completion.choices[0]?.message?.content || 'No response.';
      this.history.push({ role: 'assistant', content: reply });

      if (this.history.length > 41) {
        this.history = [this.history[0], ...this.history.slice(-20)];
      }

      this.send('ai', reply);
    } catch (err) {
      const errMsg = `API error: ${err.message}`;
      this.send('system', errMsg);
      this.log({ type: 'error', error: errMsg });
    }
  }
}

const wss = new WebSocketServer({ port: PORT });
console.log(`shapeshiftui AI bridge on ws://localhost:${PORT} (model: ${MODEL})`);

wss.on('connection', (ws) => {
  const session = new Session(ws);
  console.log(`client connected → ${session.logFile}`);
  session.send('ai', 'Connected to ShapeshifTUI. What would you like me to build?');

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

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
