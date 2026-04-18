import React, { useEffect, useMemo, useRef } from 'react';
import * as Ink from 'ink';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { compileComponent, type SendEvent, type SubmitEvent, type InteractionContext } from './sandbox.js';
import { runtimeGlobals } from './runtime-globals.js';
import type { AppError } from './types.js';

interface RuntimeProps {
  source: string | null;
  sendEvent: SendEvent;
  submitEvent: SubmitEvent;
  context: InteractionContext;
  focused: boolean;
  onCompileError: (error: AppError) => void;
}

export function Runtime({ source, sendEvent, submitEvent, context, focused, onCompileError }: RuntimeProps): React.ReactElement {
  const focusedRef = useRef(focused);
  focusedRef.current = focused;

  // Stable globals — all hooks read focusedRef at render time so toggling
  // panes doesn't recompile or remount the sandboxed component.
  const globals = useMemo(() => ({
    ...runtimeGlobals,

    // Gate focus: remove sandboxed components from Tab ring when inactive.
    useFocus: (opts?: Record<string, unknown>) =>
      Ink.useFocus({ ...opts, isActive: focusedRef.current }),

    // Gate keyboard: swallow all input when pane is inactive.
    useInput: (handler: Ink.Handler, opts?: { isActive?: boolean }) =>
      Ink.useInput(handler, { ...opts, isActive: focusedRef.current && (opts?.isActive ?? true) }),

    // Gate TextInput: force focus={false} when pane is inactive.
    TextInput: (props: Record<string, unknown>) =>
      React.createElement(TextInput, {
        ...props,
        focus: focusedRef.current && (props.focus ?? true),
      }),
  }), []);

  const compiled = useMemo(() => {
    if (!source) return null;
    return compileComponent(source, globals);
  }, [source, globals]);

  // Auto-retry: notify parent on compile failure with a structured AppError.
  useEffect(() => {
    if (compiled && !compiled.ok) {
      onCompileError({
        source: 'sandbox',
        code: 'compile_failed',
        severity: 'error',
        recoverable: true,
        message: compiled.error,
        details: { error: compiled.error },
      });
    }
  }, [compiled, onCompileError]);

  const borderStyle = focused ? 'bold' : 'round';
  const borderColor = focused ? 'cyan' : 'gray';

  if (!source) {
    return (
      <Box borderStyle={borderStyle} borderColor={borderColor} padding={1} flexDirection="column" flexGrow={1}>
        <Box flexDirection="column" paddingY={1}>
          <Text bold color="cyan">◆ Component canvas</Text>
          <Text dimColor>Nothing mounted yet. Ask the assistant in the chat pane on the left</Text>
          <Text dimColor>and whatever it builds appears here — live, interactive.</Text>
          <Box marginTop={1}>
            <Text dimColor>Tip: </Text>
            <Text color="green">Ctrl+A</Text>
            <Text dimColor> focuses chat, </Text>
            <Text color="green">Ctrl+E</Text>
            <Text dimColor> focuses this pane.</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  if (compiled && !compiled.ok) {
    return (
      <Box borderStyle={borderStyle} borderColor="red" padding={1} flexDirection="column" flexGrow={1}>
        <Text color="red" bold>✗ Compile error</Text>
        <Text>{compiled.error}</Text>
      </Box>
    );
  }

  if (!compiled || !compiled.ok) return <Box />;

  const Component = compiled.Component;
  return (
    <Box borderStyle={borderStyle} borderColor={borderColor} padding={1} flexDirection="column" flexGrow={1}>
      <Component key={source} sendEvent={sendEvent} submitEvent={submitEvent} context={context} />
    </Box>
  );
}
