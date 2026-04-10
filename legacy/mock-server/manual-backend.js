#!/usr/bin/env node

import { WebSocketServer } from 'ws';
import { createInterface } from 'readline';

const PORT = process.env.PORT || 8080;

const wss = new WebSocketServer({ port: PORT });

console.log(`\n${'='.repeat(60)}`);
console.log('MANUAL LLM BACKEND');
console.log(`${'='.repeat(60)}`);
console.log(`WebSocket running on ws://localhost:${PORT}`);
console.log('\nHow it works:');
console.log('1. User messages appear here - copy them to ChatGPT');
console.log('2. Paste ChatGPT response and press Enter twice to send');
console.log('3. Include <layout>...</layout> for UI updates');
console.log(`${'='.repeat(60)}\n`);

let currentWs = null;
let currentSessionId = null;

// Readline for manual input
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

let inputBuffer = '';
let inputMode = false;

function promptForResponse() {
  inputMode = true;
  inputBuffer = '';
  console.log('\n📝 PASTE LLM RESPONSE (press Enter twice to send):');
  console.log('-'.repeat(40));
}

rl.on('line', (line) => {
  if (!inputMode) return;

  if (line === '' && inputBuffer.length > 0) {
    // Empty line after content = send
    sendLLMResponse(inputBuffer.trim());
    inputMode = false;
    inputBuffer = '';
  } else {
    inputBuffer += line + '\n';
  }
});

function sendLLMResponse(response) {
  if (!currentWs || !currentSessionId) {
    console.log('⚠️  No client connected');
    return;
  }

  console.log('-'.repeat(40));
  console.log('✅ Sending response...\n');

  // Extract layout if present
  const layoutMatch = response.match(/<layout>([\s\S]*?)<\/layout>/);
  let messageText = response.replace(/<layout>[\s\S]*?<\/layout>/g, '').trim();

  // Send AI message
  if (messageText) {
    sendMessage(currentWs, currentSessionId, 'ai', messageText);
  }

  // Send layout if present
  if (layoutMatch) {
    try {
      const layout = JSON.parse(layoutMatch[1]);
      console.log('📐 Layout detected:', layout.id);
      sendLayout(currentWs, currentSessionId, layout);
    } catch (e) {
      console.error('❌ Failed to parse layout JSON:', e.message);
      sendMessage(currentWs, currentSessionId, 'system', 'Error: Invalid layout JSON');
    }
  }
}

wss.on('connection', (ws) => {
  console.log('🔌 Client connected\n');
  currentWs = ws;

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      // Handle init
      if (msg.method === 'init') {
        currentSessionId = `session-${Date.now()}`;

        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          result: { sessionId: currentSessionId, serverVersion: '1.0.0' },
          id: msg.id,
        }));

        console.log('✅ Session started:', currentSessionId);

        // Send welcome
        setTimeout(() => {
          sendMessage(ws, currentSessionId, 'ai', 'Connected! I\'m ready to help. (Responses are manually provided)');

          sendLayout(ws, currentSessionId, {
            version: '1.0',
            id: 'welcome',
            type: 'single',
            root: {
              id: 'root',
              type: 'panel',
              props: { title: 'Manual Mode' },
              children: [{
                id: 'info',
                type: 'text',
                props: {
                  content: '{cyan-fg}Manual LLM Backend Active{/cyan-fg}\n\nYour messages are sent to the terminal.\nResponses are pasted manually from ChatGPT.'
                }
              }]
            }
          });
        }, 200);

        return;
      }

      // Handle chat
      if (msg.method === 'chat') {
        const userContent = msg.params.content;

        console.log(`\n${'='.repeat(60)}`);
        console.log('💬 USER MESSAGE (copy this to ChatGPT):');
        console.log('='.repeat(60));
        console.log(userContent);
        console.log('='.repeat(60));

        promptForResponse();
        return;
      }

      // Handle events
      if (msg.method === 'event') {
        const { widgetId, eventType, data } = msg.params;

        console.log(`\n${'='.repeat(60)}`);
        console.log('🖱️  UI EVENT (copy this to ChatGPT):');
        console.log('='.repeat(60));
        console.log(`User clicked "${widgetId}" button`);
        if (data) console.log('Data:', JSON.stringify(data, null, 2));
        console.log('='.repeat(60));

        promptForResponse();
        return;
      }

    } catch (error) {
      console.error('Error:', error);
    }
  });

  ws.on('close', () => {
    console.log('\n🔌 Client disconnected');
    currentWs = null;
    currentSessionId = null;
  });
});

function sendMessage(ws, sessionId, sender, content) {
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    method: 'message',
    params: {
      sessionId,
      message: {
        id: `msg-${Date.now()}`,
        sender,
        content,
        timestamp: Date.now(),
        status: 'sent',
      },
    },
  }));
}

function sendLayout(ws, sessionId, layout) {
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    method: 'layout',
    params: { sessionId, layout },
  }));
}

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  rl.close();
  wss.close();
  process.exit(0);
});
