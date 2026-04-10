import WebSocket from 'ws';
import type { ClientMessage, ServerMessage } from './types.js';

type Listener = (msg: ServerMessage) => void;

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000]; // ms, then give up

export class Client {
  private ws!: WebSocket;
  private url: string;
  private listeners: Set<Listener> = new Set();
  private ready: Promise<void>;
  private closed = false;

  constructor(url: string) {
    this.url = url;
    this.ready = this.connect();
  }

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.once('open', () => resolve());
      this.ws.once('error', reject);

      this.ws.on('message', (data) => {
        let parsed: ServerMessage;
        try {
          parsed = JSON.parse(data.toString());
        } catch {
          return;
        }
        for (const l of this.listeners) l(parsed);
      });

      this.ws.on('close', () => {
        if (!this.closed) this.reconnect();
      });
    });
  }

  private async reconnect(): Promise<void> {
    for (const delay of RECONNECT_DELAYS) {
      if (this.closed) return;
      // Notify listeners of reconnect attempt.
      const sysMsg: ServerMessage = {
        type: 'error',
        error: `Disconnected. Reconnecting in ${delay / 1000}s...`,
      };
      for (const l of this.listeners) l(sysMsg);

      await new Promise((r) => setTimeout(r, delay));
      if (this.closed) return;

      try {
        await this.connect();
        const okMsg: ServerMessage = {
          type: 'error',
          error: 'Reconnected.',
        };
        for (const l of this.listeners) l(okMsg);
        return;
      } catch {
        // try next delay
      }
    }

    const failMsg: ServerMessage = {
      type: 'error',
      error: 'Connection lost. Restart the app.',
    };
    for (const l of this.listeners) l(failMsg);
  }

  async waitForOpen(): Promise<void> {
    await this.ready;
  }

  onMessage(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(msg: ClientMessage): void {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  close(): void {
    this.closed = true;
    this.ws.close();
  }
}
