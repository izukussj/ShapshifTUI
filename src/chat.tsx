import React, { useState } from 'react';
import { Box, Text, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import type { ChatMessage } from './types.js';

interface ChatProps {
  messages: ChatMessage[];
  onSend: (content: string) => void;
  focused: boolean;
  scrollOffset: number;
}

export function Chat({ messages, onSend, focused, scrollOffset }: ChatProps): React.ReactElement {
  const [draft, setDraft] = useState('');
  const { stdout } = useStdout();

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft('');
  };

  // Reserve 5 lines for border (2) + padding (2) + input row (1). When scrolled
  // back, steal one line for the scroll-position hint.
  const reserved = scrollOffset > 0 ? 6 : 5;
  const maxVisible = Math.max(1, stdout.rows - reserved);
  const end = Math.max(0, messages.length - scrollOffset);
  const start = Math.max(0, end - maxVisible);
  const visible = messages.slice(start, end);
  const olderHidden = start;
  const newerHidden = messages.length - end;

  return (
    <Box
      borderStyle="round"
      borderColor={focused ? 'cyan' : 'gray'}
      padding={1}
      flexDirection="column"
      width="40%"
      flexGrow={1}
    >
      {scrollOffset > 0 ? (
        <Box>
          <Text color="yellow" dimColor>
            ── scrolled: {olderHidden} above · {newerHidden} below · PageDn to resume ──
          </Text>
        </Box>
      ) : null}
      <Box flexDirection="column" flexGrow={1}>
        {visible.length === 0 ? (
          <Text dimColor>Type a message to get started.</Text>
        ) : (
          visible.map((m) => <ChatLine key={m.id} message={m} />)
        )}
      </Box>
      <Box>
        <Text color={focused ? 'cyan' : 'gray'}>{'> '}</Text>
        <TextInput
          value={draft}
          onChange={setDraft}
          onSubmit={submit}
          focus={focused}
        />
      </Box>
    </Box>
  );
}

function ChatLine({ message }: { message: ChatMessage }): React.ReactElement {
  const color =
    message.sender === 'user' ? 'green' : message.sender === 'ai' ? 'cyan' : 'yellow';
  const label =
    message.sender === 'user' ? 'you' : message.sender === 'ai' ? 'ai' : 'sys';
  // Strip shapeshiftui code blocks from rendered chat — they're noise once mounted.
  const content = message.content.replace(/```shapeshiftui\s*\n[\s\S]*?```/g, '').trim();
  if (!content) return <Text color={color}>{label}: <Text dimColor>(layout)</Text></Text>;
  return (
    <Box>
      <Text color={color}>{label}: </Text>
      <Text>{content}</Text>
    </Box>
  );
}
