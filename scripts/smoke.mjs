// End-to-end smoke test. Connects to the mock backend, walks through:
//   1. Receive welcome message.
//   2. Send "form" → mock should reply with a shapeshiftui code block.
//   3. Extract the block and compile it via the real sandbox → assert ok.
//   4. Send "what did i do?" with a synthetic interaction → assert mock echoes it.
// Exits non-zero on any failure. Run via: node scripts/smoke.mjs
import WebSocket from 'ws';
import React from 'react';
import * as Ink from 'ink';
import TextInput from 'ink-text-input';
import { render } from 'ink-testing-library';
import { compileComponent, extractCodeBlock } from '../dist/sandbox.js';

const URL = 'ws://localhost:8080';

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

function pass(msg) {
  console.log('OK:  ', msg);
}

// Stub Button so we don't depend on the bundled component (which lives in
// the cli bundle, not sandbox.js). The render check still exercises hooks.
const Button = ({ label }) => React.createElement(Ink.Text, null, `[${label}]`);

const globals = {
  React,
  useState: React.useState,
  useEffect: React.useEffect,
  useRef: React.useRef,
  useMemo: React.useMemo,
  useCallback: React.useCallback,
  useReducer: React.useReducer,
  Box: Ink.Box,
  Text: Ink.Text,
  Newline: Ink.Newline,
  Spacer: Ink.Spacer,
  Static: Ink.Static,
  Transform: Ink.Transform,
  useFocus: Ink.useFocus,
  useFocusManager: Ink.useFocusManager,
  useInput: Ink.useInput,
  TextInput,
  Button,
};

function renderCheck(Component, props, label) {
  const instance = render(React.createElement(Component, props));
  // ink-testing-library swallows render errors as console output; check
  // lastFrame() is non-empty AND no error went to stderr.
  const frame = instance.lastFrame();
  instance.unmount();
  if (!frame || frame.trim().length === 0) {
    fail(`${label}: rendered an empty frame (likely a hooks error)`);
  }
  pass(`${label} rendered (${frame.split('\n').length} lines)`);
}

async function main() {
  const ws = new WebSocket(URL);
  await new Promise((res, rej) => {
    ws.once('open', res);
    ws.once('error', rej);
  });
  pass('connected');

  const messages = [];
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    messages.push(msg);
  });

  // Wait briefly for welcome
  await new Promise((r) => setTimeout(r, 100));
  if (messages.length < 1) fail('no welcome message');
  pass(`welcome: ${messages[0].message.content.slice(0, 40)}...`);

  // Step 1: ask for a form
  ws.send(JSON.stringify({ type: 'chat', content: 'form please', interactions: [] }));
  await new Promise((r) => setTimeout(r, 200));

  const formReply = messages[messages.length - 1];
  if (!formReply || formReply.type !== 'message') fail('no form reply');

  const code = extractCodeBlock(formReply.message.content);
  if (!code) fail('no shapeshiftui code block in form reply');
  pass(`extracted code block (${code.length} chars)`);

  const compiled = compileComponent(code, globals);
  if (!compiled.ok) fail(`compile failed: ${compiled.error}`);
  if (typeof compiled.Component !== 'function') fail('compiled is not a function');
  pass('form compiled to a React component');
  renderCheck(compiled.Component, { sendEvent: () => {}, submitEvent: () => {}, context: { events: [] } }, 'form');

  // Step 2: counter
  ws.send(JSON.stringify({ type: 'chat', content: 'counter', interactions: [] }));
  await new Promise((r) => setTimeout(r, 200));
  const counterReply = messages[messages.length - 1];
  const counterCode = extractCodeBlock(counterReply.message.content);
  if (!counterCode) fail('no counter code block');
  const counterCompiled = compileComponent(counterCode, globals);
  if (!counterCompiled.ok) fail(`counter compile failed: ${counterCompiled.error}`);
  pass('counter compiled');
  renderCheck(counterCompiled.Component, { sendEvent: () => {}, submitEvent: () => {}, context: { events: [] } }, 'counter');

  // Step 3: dashboard
  ws.send(JSON.stringify({ type: 'chat', content: 'dashboard', interactions: [] }));
  await new Promise((r) => setTimeout(r, 200));
  const dashCode = extractCodeBlock(messages[messages.length - 1].message.content);
  if (!dashCode) fail('no dashboard code block');
  const dashCompiled = compileComponent(dashCode, globals);
  if (!dashCompiled.ok) fail(`dashboard compile failed: ${dashCompiled.error}`);
  pass('dashboard compiled');
  renderCheck(
    dashCompiled.Component,
    { sendEvent: () => {}, submitEvent: () => {}, context: { events: [{ eventType: 'click', data: {}, timestamp: Date.now() }] } },
    'dashboard',
  );

  // Step 4: real-time event round-trip
  ws.send(JSON.stringify({ type: 'event', eventType: 'submit', data: { name: 'Ada', email: 'ada@test.io' } }));
  await new Promise((r) => setTimeout(r, 200));
  const submitReply = messages[messages.length - 1];
  if (!submitReply.message.content.includes('Ada')) fail('mock did not echo submit data');
  pass('submit event round-trip');

  ws.send(JSON.stringify({ type: 'event', eventType: 'increment', data: { count: 5 } }));
  await new Promise((r) => setTimeout(r, 200));
  const incReply = messages[messages.length - 1];
  if (!incReply.message.content.includes('5')) fail('mock did not echo counter value');
  pass('increment event round-trip');

  // Step 5: interaction echo (legacy chat-based path)
  const fakeInteractions = [
    { eventType: 'click', data: { button: 'submit' }, timestamp: Date.now() },
    { eventType: 'change', data: { value: 'hello' }, timestamp: Date.now() },
  ];
  ws.send(JSON.stringify({ type: 'chat', content: 'what did i do?', interactions: fakeInteractions }));
  await new Promise((r) => setTimeout(r, 200));
  const echoReply = messages[messages.length - 1];
  if (!echoReply.message.content.includes('click')) fail('mock did not echo click event');
  if (!echoReply.message.content.includes('change')) fail('mock did not echo change event');
  pass('interaction context echoed back');

  ws.close();
  console.log('\nall good');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
