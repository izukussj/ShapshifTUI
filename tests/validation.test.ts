import { describe, it, expect } from 'vitest';
import { validateLayout, validateEvent } from '../src/validation/index.js';

describe('validateLayout', () => {
  it('should validate a valid layout', () => {
    const layout = {
      version: '1.0',
      id: 'test-layout',
      type: 'single',
      root: {
        id: 'root',
        type: 'container',
      },
    };

    const result = validateLayout(layout);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject layout with wrong version', () => {
    const layout = {
      version: '2.0',
      id: 'test-layout',
      type: 'single',
      root: {
        id: 'root',
        type: 'container',
      },
    };

    const result = validateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path === '/version')).toBe(true);
  });

  it('should reject layout with missing required fields', () => {
    const layout = {
      version: '1.0',
      id: 'test-layout',
      // missing type and root
    };

    const result = validateLayout(layout);
    expect(result.valid).toBe(false);
  });

  it('should reject layout with duplicate widget IDs', () => {
    const layout = {
      version: '1.0',
      id: 'test-layout',
      type: 'single',
      root: {
        id: 'widget-1',
        type: 'container',
        children: [
          { id: 'widget-1', type: 'text' }, // duplicate
          { id: 'widget-2', type: 'text' },
        ],
      },
    };

    const result = validateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('Duplicate widget ID'))).toBe(true);
  });

  it('should validate layout with nested children', () => {
    const layout = {
      version: '1.0',
      id: 'test-layout',
      type: 'split',
      root: {
        id: 'root',
        type: 'container',
        layout: {
          flexDirection: 'row',
        },
        children: [
          {
            id: 'left',
            type: 'panel',
            props: {
              title: 'Left Panel',
            },
          },
          {
            id: 'right',
            type: 'container',
            children: [
              { id: 'text-1', type: 'text' },
              { id: 'btn-1', type: 'button' },
            ],
          },
        ],
      },
    };

    const result = validateLayout(layout);
    expect(result.valid).toBe(true);
  });

  it('should validate layout with theme overrides', () => {
    const layout = {
      version: '1.0',
      id: 'test-layout',
      type: 'single',
      root: {
        id: 'root',
        type: 'text',
      },
      theme: {
        colors: {
          primary: '#ff0000',
          background: 'black',
        },
      },
    };

    const result = validateLayout(layout);
    expect(result.valid).toBe(true);
  });

  it('should validate layout with keybindings', () => {
    const layout = {
      version: '1.0',
      id: 'test-layout',
      type: 'single',
      root: {
        id: 'root',
        type: 'text',
      },
      keybindings: [
        {
          key: 'ctrl+s',
          action: {
            type: 'emit',
            target: 'save',
          },
        },
      ],
    };

    const result = validateLayout(layout);
    expect(result.valid).toBe(true);
  });
});

describe('validateEvent', () => {
  it('should validate a valid event', () => {
    const event = {
      jsonrpc: '2.0',
      method: 'event',
      params: {
        sessionId: 'session-1',
        layoutId: 'layout-1',
        widgetId: 'btn-1',
        eventType: 'click',
        data: { x: 10, y: 20 },
        timestamp: Date.now(),
      },
    };

    const result = validateEvent(event);
    expect(result.valid).toBe(true);
  });

  it('should reject event with missing params', () => {
    const event = {
      jsonrpc: '2.0',
      method: 'event',
      // missing params
    };

    const result = validateEvent(event);
    expect(result.valid).toBe(false);
  });

  it('should reject event with invalid eventType', () => {
    const event = {
      jsonrpc: '2.0',
      method: 'event',
      params: {
        sessionId: 'session-1',
        layoutId: 'layout-1',
        widgetId: 'btn-1',
        eventType: 'invalid-type',
        data: {},
        timestamp: Date.now(),
      },
    };

    const result = validateEvent(event);
    expect(result.valid).toBe(false);
  });
});
