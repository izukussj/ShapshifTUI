#!/usr/bin/env node

import { WebSocketServer } from 'ws';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load the system prompt
const SYSTEM_PROMPT = readFileSync(join(__dirname, '../docs/PROMPT.md'), 'utf-8');

// Constraint to add to the prompt
const CONSTRAINT = `

## IMPORTANT CONSTRAINTS
You can ONLY use these widgets (others are not implemented yet):
- container - for layout grouping
- text - for displaying text with {color-fg} formatting tags
- button - for clickable buttons with events
- panel - for bordered boxes with titles

Do NOT use: table, list, form, chart, progressbar, input, tabs, modal, menu, tree, notification, scrollable, statusbar
`;

const PORT = process.env.PORT || 8080;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// Check for API key
if (!process.env.GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable is required');
  console.error('Usage: GEMINI_API_KEY=your-key node llm-backend.js');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: MODEL,
  systemInstruction: SYSTEM_PROMPT + CONSTRAINT,
});

const wss = new WebSocketServer({ port: PORT });

console.log(`LLM Backend running on ws://localhost:${PORT}`);
console.log(`Using Gemini model: ${MODEL}`);

// Store conversation history per session
const sessions = new Map();

wss.on('connection', (ws) => {
  console.log('Client connected');
  let sessionId = null;

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log('Received:', msg.method);

      // Handle init
      if (msg.method === 'init') {
        sessionId = `session-${Date.now()}`;

        // Start a chat session
        const chat = model.startChat({
          history: [],
        });

        sessions.set(sessionId, {
          chat,
          capabilities: msg.params?.capabilities || {},
        });

        // Send init response
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          result: { sessionId, serverVersion: '1.0.0' },
          id: msg.id,
        }));

        // Send welcome message
        setTimeout(() => {
          sendMessage(ws, sessionId, 'ai', 'Hello! I\'m your AI assistant with a TUI interface. I can show you interactive layouts. Try asking me to:\n• Show a welcome screen\n• Display some stats\n• Create a simple dashboard');

          // Send initial layout
          sendLayout(ws, sessionId, {
            version: '1.0',
            id: 'welcome',
            type: 'single',
            root: {
              id: 'root',
              type: 'panel',
              props: { title: 'Welcome' },
              layout: { padding: 1 },
              children: [{
                id: 'welcome-text',
                type: 'text',
                props: {
                  content: '{bold}{cyan-fg}MoltUI + Gemini{/cyan-fg}{/bold}\n\nType a message in the chat to interact with me.\n\nI can create layouts with:\n  • Text displays\n  • Buttons\n  • Panels\n  • Containers'
                }
              }]
            }
          });
        }, 300);

        return;
      }

      // Handle chat
      if (msg.method === 'chat') {
        const session = sessions.get(sessionId);
        if (!session) {
          console.error('Session not found:', sessionId);
          return;
        }

        const userContent = msg.params.content;
        console.log('User:', userContent);

        // Call Gemini
        try {
          const result = await session.chat.sendMessage(userContent);
          const aiText = result.response.text();
          console.log('Gemini response length:', aiText.length);

          // Extract layout if present
          const layoutMatch = aiText.match(/<layout>([\s\S]*?)<\/layout>/);
          let messageText = aiText.replace(/<layout>[\s\S]*?<\/layout>/g, '').trim();

          // Send AI message
          if (messageText) {
            sendMessage(ws, sessionId, 'ai', messageText);
          }

          // Send layout if present
          if (layoutMatch) {
            try {
              const layout = JSON.parse(layoutMatch[1]);
              console.log('Sending layout:', layout.id);
              sendLayout(ws, sessionId, layout);
            } catch (e) {
              console.error('Failed to parse layout:', e.message);
              sendMessage(ws, sessionId, 'system', 'Error: Failed to parse layout JSON');
            }
          }
        } catch (error) {
          console.error('Gemini API error:', error.message);
          sendMessage(ws, sessionId, 'system', `Error: ${error.message}`);
        }

        return;
      }

      // Handle events from widgets
      if (msg.method === 'event') {
        const { widgetId, eventType, data } = msg.params;
        console.log(`Event: ${eventType} on ${widgetId}`, data);

        const session = sessions.get(sessionId);
        if (!session) return;

        // Create a message describing the event for the LLM
        const eventDescription = `[User interacted with the UI: clicked "${widgetId}" button${data ? ` with data: ${JSON.stringify(data)}` : ''}. Respond appropriately and update the layout if needed.]`;

        try {
          const result = await session.chat.sendMessage(eventDescription);
          const aiText = result.response.text();

          const layoutMatch = aiText.match(/<layout>([\s\S]*?)<\/layout>/);
          let messageText = aiText.replace(/<layout>[\s\S]*?<\/layout>/g, '').trim();

          if (messageText) {
            sendMessage(ws, sessionId, 'ai', messageText);
          }

          if (layoutMatch) {
            try {
              const layout = JSON.parse(layoutMatch[1]);
              sendLayout(ws, sessionId, layout);
            } catch (e) {
              console.error('Failed to parse layout:', e.message);
            }
          }
        } catch (error) {
          console.error('Gemini API error:', error.message);
          sendMessage(ws, sessionId, 'system', `Error: ${error.message}`);
        }

        return;
      }

    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (sessionId) {
      sessions.delete(sessionId);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function sendMessage(ws, sessionId, sender, content) {
  const msg = {
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
  };
  ws.send(JSON.stringify(msg));
}

function sendLayout(ws, sessionId, layout) {
  const msg = {
    jsonrpc: '2.0',
    method: 'layout',
    params: {
      sessionId,
      layout,
    },
  };
  ws.send(JSON.stringify(msg));
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  wss.close();
  process.exit(0);
});
