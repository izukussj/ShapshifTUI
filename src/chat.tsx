import React, { useState } from 'react';
import { Box, Text, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import type { ChatMessage } from './types.js';

interface ChatProps {
  messages: ChatMessage[];
  onSend: (content: string) => void;
  focused: boolean;
}

export function Chat({ messages, onSend, focused }: ChatProps): React.ReactElement {
  const [draft, setDraft] = useState('');
  const { stdout } = useStdout();

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft('');
  };

  // Reserve 6 lines for border (2) + padding (2) + input row (1) + margin (1).
  const maxVisible = Math.max(1, stdout.rows - 6);
  const visible = messages.slice(-maxVisible);

  return (
    <Box
      borderStyle="round"
      borderColor={focused ? 'cyan' : 'gray'}
      padding={1}
      flexDirection="column"
      width="40%"
      flexGrow={1}
    >
      <Box flexDirection="column" flexGrow={1}>
        {visible.length === 0 ? (
          <Text dimColor>Type a message to get started.</Text>
        ) : (
          visible.map((m) => <ChatLine key={m.id} message={m} />)
        )}
      </Box>
      <Box marginTop={1}>
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
