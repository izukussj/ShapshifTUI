import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { Chat } from './chat.js';
import { Runtime } from './runtime.js';
import { Client } from './client.js';
import { extractCodeBlock, type SendEvent, type SubmitEvent, type InteractionContext } from './sandbox.js';
import type { ChatMessage, InteractionRecord, ServerMessage } from './types.js';

const HISTORY_LIMIT = 50;
const MAX_RETRIES = 2;

type Pane = 'chat' | 'runtime';

interface AppProps {
  client: Client;
}

export function App({ client }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [interactions, setInteractions] = useState<InteractionRecord[]>([]);
  const [activePane, setActivePane] = useState<Pane>('chat');
  const retryCount = useRef(0);

  // Only Ctrl keybinds — no bare letter shortcuts that conflict with typing.
  useInput((_input, key) => {
    if (key.ctrl && _input === 'c') exit();
    if (key.ctrl && _input === 'a') setActivePane('chat');
    if (key.ctrl && _input === 'e') setActivePane('runtime');
  });

  useEffect(() => {
    const handler = (msg: ServerMessage) => {
      if (msg.type === 'message') {
        setMessages((prev) => [...prev, msg.message]);
        const code = extractCodeBlock(msg.message.content);
        if (code) {
          setSource(code);
          retryCount.current = 0;
        }
      } else if (msg.type === 'error') {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'system',
            content: msg.error,
            timestamp: Date.now(),
          },
        ]);
      }
    };
    const remove = client.onMessage(handler);
    return remove;
  }, [client]);

  // Called by Runtime when compilation fails — auto-retries with the backend.
  const onCompileError = useCallback(
    (error: string) => {
      if (retryCount.current >= MAX_RETRIES) return;
      retryCount.current++;
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'system',
          content: `Compile error (retry ${retryCount.current}/${MAX_RETRIES}): ${error}`,
          timestamp: Date.now(),
        },
      ]);
      client.send({
        type: 'chat',
        content: `Compile error: ${error}\nPlease fix the component.`,
        interactions: [],
      });
    },
    [client],
  );

  const onSend = useCallback(
    (content: string) => {
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        sender: 'user',
        content,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      client.send({ type: 'chat', content, interactions });
    },
    [client, interactions],
  );

  const recordEvent = useCallback((eventType: string, data: unknown) => {
    setInteractions((prev) => {
      const next = [...prev, { eventType, data, timestamp: Date.now() }];
      return next.length > HISTORY_LIMIT ? next.slice(-HISTORY_LIMIT) : next;
    });
  }, []);

  const sendEvent: SendEvent = useCallback((eventType, data) => {
    recordEvent(eventType, data);
  }, [recordEvent]);

  const submitEvent: SubmitEvent = useCallback((eventType, data) => {
    recordEvent(eventType, data);
    client.send({ type: 'event', eventType, data });
    setMessages((prev) => [
      ...prev,
      {
        id: `ev-${Date.now()}`,
        sender: 'system' as const,
        content: `[${eventType}]`,
        timestamp: Date.now(),
      },
    ]);
  }, [client, recordEvent]);

  const context: InteractionContext = { events: interactions };

  return (
    <Box flexDirection="column" width={stdout.columns} height={stdout.rows}>
      <Box flexDirection="row" flexGrow={1}>
        <Chat messages={messages} onSend={onSend} focused={activePane === 'chat'} />
        <Box flexGrow={1} flexDirection="column">
          <Runtime
            source={source}
            sendEvent={sendEvent}
            submitEvent={submitEvent}
            context={context}
            focused={activePane === 'runtime'}
            onCompileError={onCompileError}
          />
        </Box>
      </Box>
      <Box paddingX={1}>
        <Text dimColor>Ctrl+A: chat  Ctrl+E: component  Ctrl+C: quit</Text>
      </Box>
    </Box>
  );
}
