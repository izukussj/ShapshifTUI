#!/usr/bin/env node

/**
 * Bridge server that translates between chatgpt-websocket and MoltUI protocol.
 *
 * Usage:
 *   1. Start chatgpt-websocket: npx chatgpt-websocket token=$TOKEN port=8181
 *   2. Start bridge: node mock-server/bridge.js
 *   3. Run MoltUI: npm run demo
 */

import { WebSocketServer, WebSocket } from 'ws';

const BRIDGE_PORT = process.env.BRIDGE_PORT || 8080;
const BACKEND_URL = process.env.BACKEND_URL || 'ws://localhost:8181';

const wss = new WebSocketServer({ port: BRIDGE_PORT });

console.log(`MoltUI Bridge Server`);
console.log(`  Listening on: ws://localhost:${BRIDGE_PORT}`);
console.log(`  Backend: ${BACKEND_URL}`);
console.log('');

// System prompt - conversation-first, TUI generation is optional
const SYSTEM_PROMPT = `You are a helpful AI assistant in a split-screen terminal UI (MoltUI).
Left panel: chat with you. Right panel: interactive layouts you generate.

## Layout Format
When asked to create a UI/dashboard/form, respond with a JSON layout in a \`\`\`moltui code block:
\`\`\`moltui
{"version":"1.0","id":"unique-id","type":"single","root":{"id":"root","type":"container","layout":{"flexDirection":"column"},"children":[...]}}
\`\`\`
Only generate layouts when explicitly asked - normal chat doesn't need them.

## Widget Types
- **container**: Layout wrapper. Props: layout.flexDirection ("row"/"column"), gap, padding
- **text**: Display text. Props: content (supports {bold}, {green-fg}, {underline} tags)
- **button**: Clickable. Props: label. Events: click
- **panel**: Bordered section with title. Props: title. Has children[]
- **input**: Text field. Props: label, value, placeholder, password (bool)
- **list**: Selectable items. Props: items [{id, label, icon?, subtitle?}], selectable, selected
- **table**: Data grid. Props: columns [{id, label, width}], data [[cell,...]], selectable
- **form**: Multi-field input. Props: fields [{id, label, type: "text"/"password"/"number"/"checkbox"/"select"/"textarea", required?, options?}], submitLabel
- **progressbar**: Progress indicator. Props: value, max, label
- **chart**: Visualization. Props: chartType ("bar"/"line"/"sparkline"), data {labels, datasets}

## Layout Properties
\`layout: { width: "50%", height: 10, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 1, padding: 1, flexGrow: 1 }\`

## Style Properties
\`style: { fg: "white", bg: "blue", bold: true, border: { type: "line", fg: "cyan" } }\`
Colors: black, red, green, yellow, blue, magenta, cyan, white, bright* variants, #hex

## Events
Add to widgets: \`"events": [{"on": "click", "action": {"type": "emit", "data": {...}}}]\`
Types: click, select, change, submit

## Interaction Context
You receive user interaction history showing what they clicked, selected, or entered.
Reference these naturally: "I see you clicked the Submit button" or "You entered 'John' in the name field."
Use this context to provide relevant responses and update layouts accordingly.

## Key Rules
1. Always include version "1.0" and unique IDs for all widgets
2. Use meaningful IDs (e.g., "submit-btn", "name-input") - they appear in events
3. Keep layouts focused on one task
4. Use colors for status: green=success, red=error, yellow=warning
5. Buttons need click events, forms need submit events`;

wss.on('connection', (clientWs) => {
  console.log('MoltUI client connected');

  let sessionId = null;
  let backendWs = null;
  let messageBuffer = '';
  let isStreaming = false;
  let currentMessageId = null;
  let waitingForSystemPromptResponse = false;

  // Connect to chatgpt-websocket backend
  function connectToBackend() {
    backendWs = new WebSocket(BACKEND_URL);

    backendWs.on('open', () => {
      console.log('Connected to ChatGPT backend');

      // Send system prompt to set context (suppress the response)
      waitingForSystemPromptResponse = true;
      backendWs.send(JSON.stringify({
        type: 'chat',
        message: SYSTEM_PROMPT,
      }));
    });

    backendWs.on('message', (data) => {
      const text = data.toString();
      console.log('Backend response:', text.substring(0, 200));

      // Try to parse as JSON
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Not JSON, treat as plain text chunk
        parsed = { type: 'chunk', content: text };
      }

      // Handle different message types
      if (parsed.type === 'error') {
        console.log('Backend error:', parsed.error);
        // Only send error to client if not waiting for system prompt response
        if (!waitingForSystemPromptResponse) {
          sendMessage(clientWs, sessionId, currentMessageId || `msg-${Date.now()}`, 'ai', `Error: ${parsed.error}`, 'sent');
        }
        waitingForSystemPromptResponse = false;
        isStreaming = false;
        return;
      }

      if (parsed.type === 'end' || parsed.type === 'done' || text === 'END') {
        // Streaming complete
        if (waitingForSystemPromptResponse) {
          // System prompt response finished, don't forward to client
          console.log('System prompt acknowledged by backend');
          waitingForSystemPromptResponse = false;
          messageBuffer = '';
          isStreaming = false;
          return;
        }

        if (messageBuffer) {
          finishMessage();
        }
        isStreaming = false;
        return;
      }

      // Skip forwarding system prompt response to client
      if (waitingForSystemPromptResponse) {
        return;
      }

      // Extract content from response
      const content = parsed.content || parsed.text || parsed.delta || text;

      // Accumulate message
      if (!isStreaming) {
        isStreaming = true;
        currentMessageId = `msg-${Date.now()}`;
        messageBuffer = '';
      }

      messageBuffer += content;

      // Send streaming update with consistent message ID
      sendMessage(clientWs, sessionId, currentMessageId, 'ai', messageBuffer, 'streaming');
    });

    backendWs.on('close', () => {
      console.log('Backend connection closed');
      backendWs = null;
    });

    backendWs.on('error', (error) => {
      console.error('Backend error:', error.message);
    });
  }

  function finishMessage() {
    console.log('Finishing message, length:', messageBuffer.length);

    // Send final message with consistent ID
    sendMessage(clientWs, sessionId, currentMessageId, 'ai', messageBuffer, 'sent');

    // Check for layout in response
    const layout = extractLayout(messageBuffer);
    if (layout) {
      console.log('Layout extracted! Sending to client:', layout.id);
      console.log('Layout JSON:', JSON.stringify(layout, null, 2));
      sendLayout(clientWs, sessionId, layout);
    } else {
      console.log('No layout found in response');
    }

    messageBuffer = '';
    currentMessageId = null;
  }

  clientWs.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Client:', message.method, message.params?.content?.substring(0, 50) || '');

      // Handle init request
      if (message.method === 'init') {
        sessionId = `session-${Date.now()}`;

        // Send init response
        clientWs.send(JSON.stringify({
          jsonrpc: '2.0',
          result: { sessionId, serverVersion: '1.0.0' },
          id: message.id,
        }));

        // Connect to backend
        connectToBackend();

        // Send welcome message
        setTimeout(() => {
          sendMessage(clientWs, sessionId, `msg-welcome-${Date.now()}`, 'ai',
            'Connected to ChatGPT! Describe the interface you want to build.', 'sent');
        }, 500);

        return;
      }

      // Handle chat messages
      if (message.method === 'chat') {
        const content = message.params?.content || '';
        const interactionContext = message.params?.interactionContext;

        if (backendWs && backendWs.readyState === WebSocket.OPEN) {
          // Build message with interaction context if present
          let messageToSend = content;

          if (interactionContext && interactionContext.events && interactionContext.events.length > 0) {
            // Format interaction context as human-readable summary for AI
            const contextSummary = formatInteractionContext(interactionContext);
            console.log('Interaction context:', contextSummary);

            // Prepend context to message (AI will see it as system context)
            messageToSend = `[User Context - Recent TUI Interactions]\n${contextSummary}\n\n[User Message]\n${content}`;
          }

          // Forward to ChatGPT backend
          backendWs.send(JSON.stringify({
            type: 'chat',
            message: messageToSend,
          }));
        } else {
          sendMessage(clientWs, sessionId, `msg-error-${Date.now()}`, 'ai',
            'Backend not connected. Please wait or restart.', 'sent');
        }
        return;
      }

      // Handle events (acknowledge but don't forward)
      if (message.method === 'event') {
        const { widgetId, data } = message.params || {};
        console.log('Event:', widgetId, data);
        return;
      }

    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  clientWs.on('close', () => {
    console.log('MoltUI client disconnected');
    if (backendWs) {
      backendWs.close();
    }
  });

  clientWs.on('error', (error) => {
    console.error('Client error:', error.message);
  });
});

function sendMessage(ws, sessionId, messageId, sender, content, status = 'sent') {
  if (ws.readyState !== WebSocket.OPEN) return;

  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    method: 'message',
    params: {
      sessionId,
      message: {
        id: messageId,
        sender,
        content,
        timestamp: Date.now(),
        status,
      },
    },
  }));
}

function sendLayout(ws, sessionId, layout) {
  if (ws.readyState !== WebSocket.OPEN) return;

  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    method: 'layout',
    params: {
      sessionId,
      layout,
    },
  }));
}

/**
 * Format interaction context as human-readable summary for AI
 */
function formatInteractionContext(context) {
  const lines = [];

  if (context.layoutId) {
    lines.push(`Current layout: ${context.layoutId}`);
  }

  if (context.layoutSummary) {
    lines.push(`Layout: ${context.layoutSummary}`);
  }

  if (context.events && context.events.length > 0) {
    lines.push(`Recent interactions (${context.events.length}):`);
    for (const event of context.events) {
      const label = event.data?.label ? ` "${event.data.label}"` : '';
      const value = event.data?.value !== undefined ? ` (value: ${event.data.value})` : '';
      const time = new Date(event.timestamp).toLocaleTimeString();
      lines.push(`  - [${time}] ${event.eventType} on ${event.elementType} "${event.elementId}"${label}${value}`);
    }
  }

  return lines.join('\n');
}

function extractLayout(text) {
  // Look for ```moltui code blocks
  const moltMatch = text.match(/```moltui\s*([\s\S]*?)```/);
  if (moltMatch) {
    try {
      return JSON.parse(moltMatch[1].trim());
    } catch (e) {
      console.error('Failed to parse moltui layout:', e.message);
    }
  }

  // Also try ```json blocks that look like layouts
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed.root && parsed.id) {
        return parsed;
      }
    } catch (e) {
      // Not a valid layout
    }
  }

  return null;
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down bridge...');
  wss.close();
  process.exit(0);
});
