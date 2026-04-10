#!/usr/bin/env node
/**
 * Mock backend for shapeshiftui. Speaks the v2 wire protocol — plain JSON frames,
 * no JSON-RPC, no handshake. Auto-responds to keywords with canned shapeshiftui
 * code blocks. Echoes interaction context so you can verify the loop.
 */

import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`shapeshiftui mock backend on ws://localhost:${PORT}`);

// Component contract:
//   - props: { sendEvent, context }
//   - bare identifiers from the runtime globals: React, useState, useEffect,
//     useRef, useMemo, useCallback, useReducer, Box, Text, Newline, Spacer,
//     Static, Transform, useFocus, useFocusManager, useInput, TextInput, Button
const layouts = {
  form: `({ sendEvent, submitEvent }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [focus, setFocus] = useState('name');
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">Sign up</Text>
      <Box flexDirection="column">
        <Text>Name:</Text>
        <TextInput value={name} onChange={(v) => { setName(v); sendEvent('change', { field: 'name', value: v }); }} focus={focus === 'name'} onSubmit={() => setFocus('email')} />
      </Box>
      <Box flexDirection="column">
        <Text>Email:</Text>
        <TextInput value={email} onChange={(v) => { setEmail(v); sendEvent('change', { field: 'email', value: v }); }} focus={focus === 'email'} onSubmit={() => setFocus('submit')} />
      </Box>
      <Button label="Submit" onPress={() => submitEvent('submit', { name, email })} />
      <Text dimColor>Enter on each input to advance.</Text>
    </Box>
  );
}`,

  counter: `({ sendEvent }) => {
  const [count, setCount] = useState(0);
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="green">Counter: {count}</Text>
      <Box gap={1}>
        <Button label="-" onPress={() => { const n = count - 1; setCount(n); sendEvent('decrement', { count: n }); }} />
        <Button label="+" onPress={() => { const n = count + 1; setCount(n); sendEvent('increment', { count: n }); }} />
        <Button label="reset" onPress={() => { setCount(0); sendEvent('reset', { count: 0 }); }} />
      </Box>
    </Box>
  );
}`,

  dashboard: `({ context }) => {
  const recent = context.events.slice(-5);
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="magenta">Dashboard</Text>
      <Box flexDirection="row" gap={2}>
        <Box borderStyle="single" padding={1} flexDirection="column">
          <Text dimColor>Active</Text>
          <Text bold color="green">1,234</Text>
        </Box>
        <Box borderStyle="single" padding={1} flexDirection="column">
          <Text dimColor>Sessions</Text>
          <Text bold color="yellow">5,678</Text>
        </Box>
        <Box borderStyle="single" padding={1} flexDirection="column">
          <Text dimColor>Errors</Text>
          <Text bold color="red">12</Text>
        </Box>
      </Box>
      <Text dimColor>Recent events: {recent.length}</Text>
      {recent.map((e, i) => <Text key={i} dimColor>  - {e.eventType}</Text>)}
    </Box>
  );
}`,
};

function send(ws, sender, content) {
  ws.send(
    JSON.stringify({
      type: 'message',
      message: {
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender,
        content,
        timestamp: Date.now(),
      },
    })
  );
}

function reply(ws, content, code) {
  const body = code ? `${content}\n\n\`\`\`shapeshiftui\n${code}\n\`\`\`` : content;
  send(ws, 'ai', body);
}

wss.on('connection', (ws) => {
  console.log('client connected');
  send(ws, 'ai', 'Connected. Try: "form", "counter", "dashboard", or "what did I do?"');

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    // Handle real-time component events
    if (msg.type === 'event') {
      const { eventType, data } = msg;
      if (eventType === 'submit' && data) {
        const d = data;
        reply(
          ws,
          `Got your signup! Name: ${d.name || '?'}, Email: ${d.email || '?'}`,
          `() => {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="green">Success!</Text>
      <Text>Welcome aboard, ${d.name || 'friend'}.</Text>
      <Text dimColor>Confirmation sent to ${d.email || 'your email'}.</Text>
    </Box>
  );
}`
        );
      } else if (eventType === 'increment' || eventType === 'decrement' || eventType === 'reset') {
        const count = data?.count ?? 0;
        reply(ws, `Counter is now ${count}.`);
      } else {
        reply(ws, `Received event: ${eventType} ${JSON.stringify(data ?? {})}`);
      }
      return;
    }

    if (msg.type !== 'chat') return;

    const text = (msg.content || '').toLowerCase();
    const interactions = msg.interactions || [];

    if (text.includes('form')) {
      reply(ws, 'Here is a signup form:', layouts.form);
      return;
    }
    if (text.includes('counter')) {
      reply(ws, 'A counter for you:', layouts.counter);
      return;
    }
    if (text.includes('dashboard')) {
      reply(ws, 'Live dashboard (reflects your recent events):', layouts.dashboard);
      return;
    }

    // Interaction-context echo: prove the loop works.
    if (text.includes('what') || text.includes('did i')) {
      if (interactions.length === 0) {
        reply(ws, "You haven't interacted with anything yet. Try 'counter' and click + a few times.");
      } else {
        const summary = interactions
          .slice(-5)
          .map((e) => `  - ${e.eventType} ${JSON.stringify(e.data ?? {})}`)
          .join('\n');
        reply(ws, `Last ${Math.min(5, interactions.length)} events I see:\n${summary}`);
      }
      return;
    }

    reply(
      ws,
      `Got "${msg.content}" with ${interactions.length} prior interaction(s). Try: form, counter, dashboard, what did I do?`
    );
  });

  ws.on('close', () => console.log('client disconnected'));
});

process.on('SIGINT', () => {
  console.log('\nshutting down');
  wss.close();
  process.exit(0);
});
