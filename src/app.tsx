import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { Chat } from './chat.js';
import { Runtime } from './runtime.js';
import { Client } from './client.js';
import { Button, FocusActiveContext } from './components.js';
import { extractCodeBlock, type SendEvent, type SubmitEvent, type InteractionContext } from './sandbox.js';
import type { ApprovalRequest, ChatMessage, InteractionRecord, ServerMessage } from './types.js';
import { onMouse, setMouseEnabled, isMouseEnabled } from './mouse.js';

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
  const [status, setStatus] = useState<string | null>(null);
  const [mouseOn, setMouseOn] = useState<boolean>(isMouseEnabled());
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [notice, setNotice] = useState<{ level: 'error' | 'warning' | 'info'; text: string } | null>(null);
  // scrollOffset = how many newest messages to hide. 0 means pinned to latest.
  const [scrollOffset, setScrollOffset] = useState(0);
  const retryCount = useRef(0);
  const noticeTimer = useRef<NodeJS.Timeout | null>(null);

  const respondToApproval = useCallback(
    (id: string, approved: boolean) => {
      client.send({ type: 'approval_response', id, approved });
      setApprovals((prev) => prev.filter((a) => a.id !== id));
    },
    [client],
  );

  useInput((_input, key) => {
    if (key.ctrl && _input === 'c') exit();
    if (key.ctrl && _input === 'a') setActivePane('chat');
    if (key.ctrl && _input === 'e') setActivePane('runtime');
    if (key.ctrl && _input === 'p') {
      const next = setMouseEnabled(!mouseOn);
      setMouseOn(next);
      setStatus(next ? 'mouse on — hold Option to select text' : 'mouse off — text selection restored');
    }

    // Esc: cancel in priority order — pending approval → active turn.
    const pending = approvals[0];
    if (key.escape) {
      if (pending) {
        respondToApproval(pending.id, false);
      } else if (status) {
        client.send({ type: 'cancel' });
      }
      return;
    }

    // Chat scrollback. Only when chat is active and no approval is pending.
    if (activePane === 'chat' && !pending) {
      if (key.pageUp) setScrollOffset((o) => Math.min(Math.max(0, messages.length - 1), o + 3));
      else if (key.pageDown) setScrollOffset((o) => Math.max(0, o - 3));
    }
  });

  useEffect(() => {
    return onMouse((e) => {
      if (e.type !== 'press') return;
      const chatWidth = Math.floor(stdout.columns * 0.4);
      setActivePane(e.x < chatWidth ? 'chat' : 'runtime');
    });
  }, [stdout.columns]);

  const showNotice = useCallback((level: 'error' | 'warning' | 'info', text: string) => {
    setNotice({ level, text });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 8000);
  }, []);

  useEffect(() => {
    const handler = (msg: ServerMessage) => {
      if (msg.type === 'message') {
        setMessages((prev) => [...prev, msg.message]);
        setScrollOffset((o) => (o > 0 ? o + 1 : 0));
        const code = extractCodeBlock(msg.message.content);
        if (code) {
          setSource(code);
          retryCount.current = 0;
        }
      } else if (msg.type === 'error') {
        setStatus(null);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'system',
            content: msg.error,
            timestamp: Date.now(),
          },
        ]);
        setScrollOffset((o) => (o > 0 ? o + 1 : 0));
        showNotice('error', msg.error);
      } else if (msg.type === 'status') {
        setStatus(msg.text);
      } else if (msg.type === 'restore') {
        setMessages(msg.messages);
        setInteractions([]);
        retryCount.current = 0;
        const lastAi = [...msg.messages].reverse().find((m) => m.sender === 'ai');
        const code = lastAi ? extractCodeBlock(lastAi.content) : null;
        setSource(code);
        showNotice('info', `loaded "${msg.name}"`);
      } else if (msg.type === 'approval_request') {
        setApprovals((prev) => [...prev, msg.request]);
      } else if (msg.type === 'notice') {
        showNotice(msg.level, msg.text);
      }
    };
    const remove = client.onMessage(handler);
    return remove;
  }, [client, showNotice]);

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

  const pushSystem = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `sys-${Date.now()}`, sender: 'system', content, timestamp: Date.now() },
    ]);
  }, []);

  const onSend = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (trimmed.startsWith('/')) {
        const [cmd, ...rest] = trimmed.split(/\s+/);
        const arg = rest.join(' ').trim();
        if (cmd === '/save') {
          if (!arg) return pushSystem('usage: /save <name>');
          client.send({ type: 'save', name: arg });
          return;
        }
        if (cmd === '/load') {
          if (!arg) return pushSystem('usage: /load <name>');
          client.send({ type: 'load', name: arg });
          return;
        }
        if (cmd === '/views' || cmd === '/list') {
          client.send({ type: 'list-views' });
          return;
        }
        if (cmd === '/delete' || cmd === '/rm') {
          if (!arg) return pushSystem('usage: /delete <name>');
          client.send({ type: 'delete-view', name: arg });
          return;
        }
        if (cmd === '/help') {
          return pushSystem('commands: /save <name>, /load <name>, /views, /delete <name>');
        }
        return pushSystem(`unknown command: ${cmd} — try /help`);
      }

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        sender: 'user',
        content,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setScrollOffset(0);
      setStatus(null);
      client.send({ type: 'chat', content, interactions });
    },
    [client, interactions, pushSystem],
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
  }, [client, recordEvent]);

  const context: InteractionContext = { events: interactions };

  const pendingApproval = approvals[0] ?? null;

  return (
    <Box flexDirection="column" width={stdout.columns} height={stdout.rows}>
      <FocusActiveContext.Provider value={!pendingApproval}>
        <Box flexDirection="row" flexGrow={1}>
          <Chat
            messages={messages}
            onSend={onSend}
            focused={activePane === 'chat' && !pendingApproval}
            scrollOffset={scrollOffset}
          />
          <Box flexGrow={1} flexDirection="column">
            <Runtime
              source={source}
              sendEvent={sendEvent}
              submitEvent={submitEvent}
              context={context}
              focused={activePane === 'runtime' && !pendingApproval}
              onCompileError={onCompileError}
            />
          </Box>
        </Box>
      </FocusActiveContext.Provider>
      {pendingApproval ? (
        <ApprovalBanner
          request={pendingApproval}
          queued={approvals.length - 1}
          onApprove={() => respondToApproval(pendingApproval.id, true)}
          onDeny={() => respondToApproval(pendingApproval.id, false)}
        />
      ) : null}
      <StatusLine notice={notice} status={status} />
      <Box paddingX={1}>
        <Text dimColor>
          {pendingApproval
            ? 'Enter: approve  ·  Tab then Enter: deny  ·  Esc: cancel'
            : status
              ? `Esc: cancel turn  ·  Ctrl+A/E: panes  ·  PgUp/Dn: scroll  ·  Ctrl+C: quit`
              : `Ctrl+A: chat  Ctrl+E: component  Ctrl+P: mouse (${mouseOn ? 'on' : 'off'})  PgUp/Dn: scroll  Ctrl+C: quit`}
        </Text>
      </Box>
    </Box>
  );
}

interface StatusLineProps {
  notice: { level: 'error' | 'warning' | 'info'; text: string } | null;
  status: string | null;
}

function StatusLine({ notice, status }: StatusLineProps): React.ReactElement {
  if (notice) {
    const bg = notice.level === 'error' ? 'red' : notice.level === 'warning' ? 'yellow' : 'blue';
    const prefix = notice.level === 'error' ? 'E' : notice.level === 'warning' ? 'W' : 'I';
    return (
      <Box>
        <Text backgroundColor={bg} color="white" bold>
          {' '}{prefix}{' '}
        </Text>
        <Text color={bg}> {notice.text}</Text>
      </Box>
    );
  }
  if (status) {
    return (
      <Box paddingX={1}>
        <Text dimColor italic>{`⋯ ${status}`}</Text>
      </Box>
    );
  }
  return <Box minHeight={1} />;
}

interface ApprovalBannerProps {
  request: ApprovalRequest;
  queued: number;
  onApprove: () => void;
  onDeny: () => void;
}

function ApprovalBanner({ request, queued, onApprove, onDeny }: ApprovalBannerProps): React.ReactElement {
  return (
    <Box
      borderStyle="round"
      borderColor="yellow"
      paddingX={1}
      flexDirection="column"
    >
      <Box>
        <Text bold color="yellow">Approval required</Text>
        {queued > 0 ? <Text dimColor> ({queued} more queued)</Text> : null}
      </Box>
      <Box marginY={0}>
        <Text>{request.summary}</Text>
      </Box>
      <Box marginTop={1}>
        <Button label="Approve" onPress={onApprove} autoFocus />
        <Box marginLeft={1}>
          <Button label="Deny" onPress={onDeny} />
        </Box>
      </Box>
    </Box>
  );
}
