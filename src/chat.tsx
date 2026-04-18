import React, { useEffect, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import type { ChatMessage } from './types.js';

interface SlashCommand {
  name: string;
  args: string;
  help: string;
  example: string;
}

const COMMANDS: SlashCommand[] = [
  { name: '/save', args: '<name>', help: 'save the current view for later', example: '/save dashboard' },
  { name: '/load', args: '<name>', help: 'restore a saved view', example: '/load dashboard' },
  { name: '/views', args: '', help: 'list saved views', example: '/views' },
  { name: '/delete', args: '<name>', help: 'remove a saved view', example: '/delete dashboard' },
  { name: '/help', args: '', help: 'show all commands', example: '/help' },
];

const EXAMPLE_PROMPTS = [
  'a todo list with priority tags',
  'a pomodoro timer with start/pause',
  'a markdown cheatsheet I can scroll',
];

interface ChatProps {
  messages: ChatMessage[];
  onSend: (content: string) => void;
  focused: boolean;
  scrollOffset: number;
  width: number | string;
}

export function Chat({ messages, onSend, focused, scrollOffset, width }: ChatProps): React.ReactElement {
  const [draft, setDraft] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { stdout } = useStdout();

  // Slash-command autocomplete. Only active when the draft starts with "/" and
  // the user hasn't typed a space yet — once they're on args, suggestions hide.
  const slashInput = draft.startsWith('/') && !draft.includes(' ');
  const suggestions = slashInput
    ? COMMANDS.filter((c) => c.name.startsWith(draft))
    : [];

  // Clamp selection to current suggestion count. Resets to 0 when the user
  // types (suggestions filter), stays valid when wrapping with arrows.
  useEffect(() => {
    setSelectedIndex((i) => (suggestions.length === 0 ? 0 : Math.min(i, suggestions.length - 1)));
  }, [suggestions.length]);
  useEffect(() => {
    setSelectedIndex(0);
  }, [draft]);

  // Tab completes toward the selection. If the draft already matches the full
  // completion, Tab stays put (Enter fires the send).
  const completeToSelection = () => {
    const picked = suggestions[selectedIndex] ?? suggestions[0];
    if (!picked) return;
    const completed = picked.args ? `${picked.name} ` : picked.name;
    if (draft !== completed) setDraft(completed);
  };

  useInput((_input, key) => {
    if (!focused || suggestions.length === 0) return;
    if (key.upArrow) {
      setSelectedIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (key.downArrow) {
      setSelectedIndex((i) => (i + 1) % suggestions.length);
    } else if (key.tab) {
      completeToSelection();
    }
  }, { isActive: focused });

  const submit = (value: string) => {
    // Enter progresses the slash menu: complete if the draft is a prefix, or
    // send if the draft already matches an argless command. Without this,
    // argless commands (/views, /help) loop — Enter would just re-complete
    // to the same string and never reach onSend.
    if (suggestions.length > 0) {
      const picked = suggestions[selectedIndex] ?? suggestions[0]!;
      const completed = picked.args ? `${picked.name} ` : picked.name;
      if (draft !== completed) {
        setDraft(completed);
        return;
      }
      // Draft already equals the completion. If the command is argless, ship
      // it; otherwise hold (user still needs to type the argument).
      if (!picked.args) {
        onSend(draft.trim());
        setDraft('');
      }
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft('');
  };

  // Reserve border (2) + padding (2) + input (1); add lines for scrollback hint
  // and suggestion rows so the message window shrinks rather than overflows.
  const suggestionLines = suggestions.length > 0 ? suggestions.length + 2 : 0;
  const reserved = 5 + (scrollOffset > 0 ? 1 : 0) + suggestionLines;
  const maxVisible = Math.max(1, stdout.rows - reserved);
  const end = Math.max(0, messages.length - scrollOffset);
  const start = Math.max(0, end - maxVisible);
  const visible = messages.slice(start, end);
  const olderHidden = start;
  const newerHidden = messages.length - end;

  return (
    <Box
      borderStyle={focused ? 'bold' : 'round'}
      borderColor={focused ? 'cyan' : 'gray'}
      padding={1}
      flexDirection="column"
      width={width}
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
          <EmptyChat />
        ) : (
          visible.map((m, i) => {
            const prev = i > 0 ? visible[i - 1] : null;
            const topGap = !!prev && prev.sender !== m.sender;
            return <ChatLine key={m.id} message={m} topGap={topGap} />;
          })
        )}
      </Box>
      {suggestions.length > 0 ? (
        <SuggestionPanel
          suggestions={suggestions}
          selectedIndex={selectedIndex}
        />
      ) : null}
      <Box>
        <Text color={focused ? 'cyan' : 'gray'} bold={focused}>{'❯ '}</Text>
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

function EmptyChat(): React.ReactElement {
  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="cyan">Welcome to ShapeshifTUI</Text>
      <Text dimColor>Describe a UI in plain English — I'll build it in the pane next door.</Text>
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Try asking for:</Text>
        {EXAMPLE_PROMPTS.map((p) => (
          <Box key={p}>
            <Text color="green">  › </Text>
            <Text>{p}</Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Type </Text>
        <Text color="yellow">/</Text>
        <Text dimColor> for commands.</Text>
      </Box>
    </Box>
  );
}

interface SuggestionPanelProps {
  suggestions: SlashCommand[];
  selectedIndex: number;
}

function SuggestionPanel({ suggestions, selectedIndex }: SuggestionPanelProps): React.ReactElement {
  const selected = suggestions[selectedIndex] ?? suggestions[0]!;
  return (
    <Box flexDirection="column" marginBottom={0}>
      {suggestions.map((c, i) => {
        const active = i === selectedIndex;
        return (
          <Box key={c.name}>
            <Box width={2}>
              <Text color="cyan" bold>{active ? '▸' : ' '}</Text>
            </Box>
            <Box width={10}>
              <Text color={active ? 'cyan' : undefined} bold={active}>{c.name}</Text>
            </Box>
            <Box width={10}>
              <Text dimColor>{c.args}</Text>
            </Box>
            <Text dimColor>{c.help}</Text>
          </Box>
        );
      })}
      <Box marginTop={0}>
        <Text dimColor>↑↓ navigate · </Text>
        <Text dimColor>Tab/Enter accepts · e.g. </Text>
        <Text color="cyan">{selected.example}</Text>
      </Box>
    </Box>
  );
}

interface ChatLineStyle {
  bullet: string;
  label: string;
  color: string;
  bold: boolean;
}

// (sender, severity) → bullet + label + color. Bullet is the visual anchor
// (scanning a long chat reads as colored dots), label is secondary context.
function styleFor(message: ChatMessage): ChatLineStyle {
  if (message.sender === 'user') return { bullet: '●', label: 'you', color: 'green', bold: false };
  if (message.sender === 'ai') return { bullet: '◆', label: 'ai', color: 'cyan', bold: false };
  if (message.severity === 'error') return { bullet: '✗', label: 'err', color: 'red', bold: true };
  if (message.severity === 'warn') return { bullet: '▲', label: 'warn', color: 'yellow', bold: true };
  return { bullet: '○', label: 'sys', color: 'yellow', bold: false };
}

function ChatLine({ message, topGap }: { message: ChatMessage; topGap: boolean }): React.ReactElement {
  const { bullet, label, color, bold } = styleFor(message);
  // Strip shapeshiftui code blocks from rendered chat — they're noise once mounted.
  const content = message.content.replace(/```shapeshiftui\s*\n[\s\S]*?```/g, '').trim();
  const body = content || '(layout)';
  const bodyDim = !content;
  return (
    <Box marginTop={topGap ? 1 : 0}>
      <Text color={color} bold={bold}>{bullet} </Text>
      <Text color={color} dimColor={!bold}>{label} </Text>
      <Text dimColor={bodyDim}>{body}</Text>
    </Box>
  );
}
