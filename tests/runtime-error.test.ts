import React from 'react';
import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import { Runtime } from '../src/runtime.js';

describe('Runtime render errors', () => {
  it('scrolls Box layouts without wrapping them in Text-only transforms', async () => {
    const onError = vi.fn();
    const app = render(React.createElement(Runtime, {
      source: `() => (
        <Box flexDirection="column">
          {Array.from({ length: 8 }, (_, i) => <Text key={i}>row {i}</Text>)}
        </Box>
      )`,
      sendEvent: () => {},
      submitEvent: () => {},
      context: { events: [] },
      focused: true,
      scrollOffset: 2,
      availableRows: 8,
      onCompileError: onError,
    }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onError).not.toHaveBeenCalled();
    expect(app.lastFrame()).toContain('row 2');

    app.unmount();
  });

  it('captures invalid Ink trees instead of throwing out of the app', async () => {
    const onError = vi.fn();
    const app = render(React.createElement(Runtime, {
      source: '() => (<Text><Box><Text>bad</Text></Box></Text>)',
      sendEvent: () => {},
      submitEvent: () => {},
      context: { events: [] },
      focused: true,
      scrollOffset: 0,
      availableRows: 12,
      onCompileError: onError,
    }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      source: 'runtime',
      code: 'render_failed',
      message: expect.stringContaining('can’t be nested inside <Text>'),
    }));
    expect(app.lastFrame()).toContain('Render error');

    app.unmount();
  });
});
