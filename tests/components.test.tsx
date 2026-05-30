import React from 'react';
import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { Button } from '../src/components.js';

const stripAnsi = (value: string): string =>
  value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');

describe('Button', () => {
  it('keeps short multi-word labels on one line', () => {
    const app = render(React.createElement(Button, {
      label: 'Accept return',
      onPress: () => {},
    }));

    const frame = stripAnsi(app.lastFrame() ?? '');
    expect(frame).toContain('Accept return');
    expect(frame.split('\n').filter((line) => line.trim().length > 0)).toHaveLength(3);

    app.unmount();
  });

  it('uses a fixed width when provided', () => {
    const first = render(React.createElement(Button, {
      label: 'Go',
      width: 14,
      onPress: () => {},
    }));
    const second = render(React.createElement(Button, {
      label: 'Running now',
      width: 14,
      onPress: () => {},
    }));

    const firstLines = stripAnsi(first.lastFrame() ?? '').split('\n');
    const secondLines = stripAnsi(second.lastFrame() ?? '').split('\n');
    expect(firstLines.map((line) => line.length)).toEqual(secondLines.map((line) => line.length));

    first.unmount();
    second.unmount();
  });

  it('truncates long labels instead of wrapping', () => {
    const app = render(React.createElement(Button, {
      label: 'A very long button label that should not wrap',
      width: 14,
      onPress: () => {},
    }));

    const lines = stripAnsi(app.lastFrame() ?? '').split('\n');
    expect(lines.filter((line) => line.trim().length > 0)).toHaveLength(3);
    expect(Math.max(...lines.map((line) => line.length))).toBe(14);

    app.unmount();
  });
});
