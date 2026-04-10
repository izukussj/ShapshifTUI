#!/usr/bin/env node

import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;

const wss = new WebSocketServer({ port: PORT });

console.log(`Mock MoltUI backend running on ws://localhost:${PORT}`);

// Sample layouts to demonstrate different widget types
const sampleLayouts = {
  welcome: {
    version: '1.0',
    id: 'welcome-layout',
    type: 'single',
    root: {
      id: 'root',
      type: 'container',
      layout: { flexDirection: 'column', padding: 1 },
      children: [
        {
          id: 'header',
          type: 'text',
          props: { content: '{bold}{cyan-fg}Welcome to MoltUI!{/cyan-fg}{/bold}' },
          layout: { height: 1 },
        },
        {
          id: 'info',
          type: 'panel',
          props: { title: 'Getting Started' },
          layout: { height: 10 },
          children: [
            {
              id: 'info-text',
              type: 'text',
              props: {
                content: 'This is a demo of MoltUI - a chat-integrated TUI framework.\n\nTry these commands:\n  • "show dashboard" - Display a dashboard layout\n  • "show form" - Display a form\n  • "show table" - Display a data table\n  • "hello" - Get a greeting',
              },
            },
          ],
        },
        {
          id: 'status',
          type: 'text',
          props: { content: '{gray-fg}Type a message in the chat panel to interact{/gray-fg}' },
          layout: { height: 1 },
        },
      ],
    },
  },

  dashboard: {
    version: '1.0',
    id: 'dashboard-layout',
    type: 'split',
    root: {
      id: 'root',
      type: 'container',
      layout: { flexDirection: 'column' },
      children: [
        {
          id: 'header',
          type: 'text',
          props: { content: '{bold}{blue-fg}Dashboard{/blue-fg}{/bold}' },
          layout: { height: 1 },
          style: { bg: 'blue', fg: 'white' },
        },
        {
          id: 'main',
          type: 'container',
          layout: { flexDirection: 'row', flexGrow: 1 },
          children: [
            {
              id: 'stats-panel',
              type: 'panel',
              props: { title: 'Statistics' },
              layout: { width: '50%' },
              children: [
                {
                  id: 'stats',
                  type: 'text',
                  props: {
                    content: '{green-fg}Active Users:{/green-fg} 1,234\n{yellow-fg}Sessions:{/yellow-fg} 5,678\n{cyan-fg}Requests/min:{/cyan-fg} 890\n{red-fg}Errors:{/red-fg} 12',
                  },
                },
              ],
            },
            {
              id: 'actions-panel',
              type: 'panel',
              props: { title: 'Quick Actions' },
              layout: { width: '50%' },
              children: [
                {
                  id: 'btn-refresh',
                  type: 'button',
                  props: { label: '[ Refresh Data ]' },
                  layout: { height: 3 },
                  events: [{ on: 'click', action: { type: 'emit', data: { action: 'refresh' } } }],
                },
                {
                  id: 'btn-export',
                  type: 'button',
                  props: { label: '[ Export Report ]' },
                  layout: { height: 3, top: 4 },
                  events: [{ on: 'click', action: { type: 'emit', data: { action: 'export' } } }],
                },
              ],
            },
          ],
        },
      ],
    },
  },

  form: {
    version: '1.0',
    id: 'form-layout',
    type: 'single',
    root: {
      id: 'root',
      type: 'panel',
      props: { title: 'User Registration' },
      layout: { padding: 1 },
      children: [
        {
          id: 'signup-form',
          type: 'form',
          props: {
            fields: [
              { id: 'name', label: 'Name', type: 'text', required: true },
              { id: 'email', label: 'Email', type: 'text', required: true },
              { id: 'password', label: 'Password', type: 'password' },
              { id: 'subscribe', label: 'Subscribe to newsletter', type: 'checkbox', value: true },
            ],
            submitLabel: '[ Submit ]',
          },
          events: [{ on: 'submit', action: { type: 'emit', data: { action: 'submit' } } }],
        },
      ],
    },
  },

  table: {
    version: '1.0',
    id: 'table-layout',
    type: 'single',
    root: {
      id: 'root',
      type: 'panel',
      props: { title: 'User Data' },
      children: [
        {
          id: 'users-table',
          type: 'table',
          props: {
            columns: [
              { id: 'id', label: 'ID', width: 6 },
              { id: 'name', label: 'Name', width: 16 },
              { id: 'email', label: 'Email', width: 22 },
              { id: 'status', label: 'Status', width: 10 },
            ],
            data: [
              ['001', 'Alice Smith', 'alice@example.com', 'Active'],
              ['002', 'Bob Johnson', 'bob@example.com', 'Active'],
              ['003', 'Carol White', 'carol@example.com', 'Pending'],
              ['004', 'David Brown', 'david@example.com', 'Inactive'],
              ['005', 'Eve Wilson', 'eve@example.com', 'Active'],
            ],
            selectable: 'single',
          },
          events: [{ on: 'select', action: { type: 'emit' } }],
        },
      ],
    },
  },
};

// Message responses
const responses = {
  hello: "Hello! I'm your AI assistant. How can I help you today?",
  help: "Available commands:\n• show dashboard\n• show form\n• show table\n• hello\n• help",
  default: "I received your message. Try 'show dashboard', 'show form', 'show table', or 'help' for available commands.",
};

wss.on('connection', (ws) => {
  console.log('Client connected');

  let sessionId = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received:', JSON.stringify(message, null, 2));

      // Handle init request
      if (message.method === 'init') {
        sessionId = `session-${Date.now()}`;

        // Send init response
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          result: { sessionId, serverVersion: '1.0.0' },
          id: message.id,
        }));

        // Send welcome message after a short delay
        setTimeout(() => {
          sendMessage(ws, sessionId, 'ai', 'Welcome to MoltUI! Type "help" for available commands.');
          sendLayout(ws, sessionId, sampleLayouts.welcome);
        }, 500);

        return;
      }

      // Handle chat messages
      if (message.method === 'chat') {
        const content = message.params?.content?.toLowerCase() || '';

        // Echo user message status update
        setTimeout(() => {
          // Process command
          if (content.includes('show dashboard')) {
            sendMessage(ws, sessionId, 'ai', 'Here\'s the dashboard layout:');
            sendLayout(ws, sessionId, sampleLayouts.dashboard);
          } else if (content.includes('show form')) {
            sendMessage(ws, sessionId, 'ai', 'Here\'s a sample form:');
            sendLayout(ws, sessionId, sampleLayouts.form);
          } else if (content.includes('show table')) {
            sendMessage(ws, sessionId, 'ai', 'Here\'s the user data table:');
            sendLayout(ws, sessionId, sampleLayouts.table);
          } else if (content.includes('hello') || content.includes('hi')) {
            sendMessage(ws, sessionId, 'ai', responses.hello);
          } else if (content.includes('help')) {
            sendMessage(ws, sessionId, 'ai', responses.help);
          } else {
            sendMessage(ws, sessionId, 'ai', responses.default);
          }
        }, 300);

        return;
      }

      // Handle events
      if (message.method === 'event') {
        const { widgetId, eventType, data } = message.params || {};
        console.log(`Event: ${eventType} on ${widgetId}`, data);

        if (data?.action === 'refresh') {
          sendMessage(ws, sessionId, 'ai', 'Data refreshed! (simulated)');
        } else if (data?.action === 'export') {
          sendMessage(ws, sessionId, 'ai', 'Report exported to /tmp/report.csv (simulated)');
        } else if (data?.action === 'submit') {
          sendMessage(ws, sessionId, 'ai', 'Form submitted successfully! (simulated)');
        }

        return;
      }

    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
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
    params: {
      sessionId,
      layout,
    },
  }));
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  wss.close();
  process.exit(0);
});
