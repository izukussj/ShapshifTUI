import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import * as Ink from 'ink';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { compileComponent, type SendEvent, type SubmitEvent, type InteractionContext } from './sandbox.js';
import { runtimeGlobals } from './runtime-globals.js';
import type { AppError } from './types.js';

type InputHandler = Parameters<typeof Ink.useInput>[0];
type TextInputProps = React.ComponentProps<typeof TextInput>;

interface RuntimeProps {
  source: string | null;
  sendEvent: SendEvent;
  submitEvent: SubmitEvent;
  context: InteractionContext;
  focused: boolean;
  scrollOffset: number;
  availableRows: number;
  availableColumns: number;
  onCompileError: (error: AppError) => void;
}

export function Runtime({
  source,
  sendEvent,
  submitEvent,
  context,
  focused,
  scrollOffset,
  availableRows,
  availableColumns,
  onCompileError,
}: RuntimeProps): React.ReactElement {
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
    useInput: (handler: InputHandler, opts?: { isActive?: boolean }) =>
      Ink.useInput(handler, { ...opts, isActive: focusedRef.current && (opts?.isActive ?? true) }),

    // Gate TextInput: force focus={false} when pane is inactive.
    TextInput: (props: TextInputProps) =>
      React.createElement(TextInput, {
        ...props,
        focus: focusedRef.current && (typeof props.focus === 'boolean' ? props.focus : true),
      }),
  }), []);

  const compiled = useMemo(() => {
    if (!source) return null;
    return compileComponent(source, globals);
  }, [source, globals]);

  const onRenderError = useCallback((error: Error) => {
    onCompileError({
      source: 'runtime',
      code: 'render_failed',
      severity: 'error',
      recoverable: true,
      message: error.message,
      details: { error: error.message, stack: error.stack },
    });
  }, [onCompileError]);

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

  const borderColor = focused ? 'cyan' : 'gray';
  const frameRows = Math.max(5, availableRows);
  const frameColumns = Math.max(20, availableColumns);
  const viewportColumns = Math.max(1, frameColumns - 4);
  const hintRows = source && scrollOffset > 0 ? 1 : 0;
  const viewportRows = Math.max(1, frameRows - 4 - hintRows);

  if (!source) {
    return (
      <Box borderStyle="round" borderColor={borderColor} padding={1} flexDirection="column" flexGrow={1} width={frameColumns} height={frameRows} overflowX="hidden" overflowY="hidden">
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
      <Box borderStyle="round" borderColor="red" padding={1} flexDirection="column" flexGrow={1} width={frameColumns} height={frameRows} overflowX="hidden" overflowY="hidden">
        <Text color="red" bold>✗ Compile error</Text>
        <Text>{compiled.error}</Text>
      </Box>
    );
  }

  if (!compiled || !compiled.ok) return <Box />;

  const Component = compiled.Component;
  return (
    <Box borderStyle="round" borderColor={borderColor} padding={1} flexDirection="column" flexGrow={1} width={frameColumns} height={frameRows} overflowX="hidden" overflowY="hidden">
      {scrollOffset > 0 ? (
        <Box>
          <Text color="yellow" dimColor>
            ── runtime scrolled {scrollOffset} lines · PageUp/wheel up to return ──
          </Text>
        </Box>
      ) : null}
      <Box width={viewportColumns} height={viewportRows} overflowX="hidden" overflowY="hidden" flexDirection="column" flexShrink={0}>
        <RuntimeErrorBoundary key={source} onError={onRenderError}>
          <Box width={viewportColumns} flexDirection="column" flexShrink={0} marginTop={scrollOffset > 0 ? -scrollOffset : 0}>
            <Component sendEvent={sendEvent} submitEvent={submitEvent} context={context} />
          </Box>
        </RuntimeErrorBoundary>
      </Box>
    </Box>
  );
}

interface RuntimeErrorBoundaryProps {
  children: React.ReactNode;
  onError: (error: Error) => void;
}

interface RuntimeErrorBoundaryState {
  error: Error | null;
}

class RuntimeErrorBoundary extends React.Component<RuntimeErrorBoundaryProps, RuntimeErrorBoundaryState> {
  state: RuntimeErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RuntimeErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    this.props.onError(error);
  }

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <Box flexDirection="column">
        <Text color="red" bold>✗ Render error</Text>
        <Text>{this.state.error.message}</Text>
      </Box>
    );
  }
}
