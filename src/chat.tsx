import React, { useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import type { ChatMessage } from './types.js';

interface SlashCommand {
  name: string;
  args: string;
  help: string;
}

const COMMANDS: SlashCommand[] = [
  { name: '/save', args: '<name>', help: 'save the current view for later' },
  { name: '/load', args: '<name>', help: 'restore a saved view' },
  { name: '/views', args: '', help: 'list saved views (clickable)' },
  { name: '/delete', args: '<name>', help: 'remove a saved view' },
  { name: '/help', args: '', help: 'show this list' },
];

interface ChatProps {
  messages: ChatMessage[];
  onSend: (content: string) => void;
  focused: boolean;
  scrollOffset: number;
}

export function Chat({ messages, onSend, focused, scrollOffset }: ChatProps): React.ReactElement {
  const [draft, setDraft] = useState('');
  const { stdout } = useStdout();

  // Slash-command autocomplete. Only active when the draft starts with "/" and
  // the user hasn't typed a space yet — once they're on args, suggestions hide.
  const slashInput = draft.startsWith('/') && !draft.includes(' ');
  const suggestions = slashInput
    ? COMMANDS.filter((c) => c.name.startsWith(draft))
    : [];

  useInput((input, key) => {
    if (!focused) return;
    if (key.tab && suggestions.length > 0) {
      const top = suggestions[0]!;
      setDraft(top.args ? `${top.name} ` : top.name);
    }
  }, { isActive: focused });

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft('');
  };

  // Reserve border (2) + padding (2) + input (1); add lines for scrollback hint
  // and suggestion rows so the message window shrinks rather than overflows.
  const suggestionLines = suggestions.length > 0 ? suggestions.length + 1 : 0;
  const reserved = 5 + (scrollOffset > 0 ? 1 : 0) + suggestionLines;
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
      {suggestions.length > 0 ? (
        <Box flexDirection="column" marginBottom={0}>
          <Text dimColor>— Tab completes —</Text>
          {suggestions.map((c, i) => (
            <Box key={c.name}>
              <Box width={12}>
                <Text color={i === 0 ? 'cyan' : undefined} bold={i === 0}>{c.name}</Text>
              </Box>
              <Box width={12}>
                <Text dimColor>{c.args}</Text>
              </Box>
              <Text dimColor>{c.help}</Text>
            </Box>
          ))}
        </Box>
      ) : null}
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
