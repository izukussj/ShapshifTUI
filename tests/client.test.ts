import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Client as ClientType } from '../src/client.js';
import type { ServerMessage } from '../src/types.js';

const sockets: FakeWebSocket[] = [];

class FakeWebSocket extends EventEmitter {
  static OPEN = 1;

  readyState = 0;
  sent: string[] = [];

  constructor(readonly url: string) {
    super();
    sockets.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.emit('close');
  }
}

vi.mock('ws', () => ({ default: FakeWebSocket }));

const { Client } = await import('../src/client.js');

let client: ClientType | null = null;

beforeEach(() => {
  sockets.length = 0;
});

afterEach(() => {
  client?.close();
  client = null;
  sockets.length = 0;
});

describe('Client connection lifecycle', () => {
  it('does not emit reconnect state for a connection that never opened', async () => {
    const messages: ServerMessage[] = [];

    client = new Client('ws://127.0.0.1:1');
    client.onMessage((msg) => messages.push(msg));

    const opening = client.waitForOpen();
    sockets[0]!.emit('error', new Error('ECONNREFUSED'));
    sockets[0]!.emit('close');

    await expect(opening).rejects.toThrow('ECONNREFUSED');
    await Promise.resolve();

    expect(messages).toEqual([]);
    expect(sockets).toHaveLength(1);
  });
});
