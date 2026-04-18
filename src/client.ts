import WebSocket from 'ws';
import type { AppError, ChatMessage, ClientMessage, ServerMessage } from './types.js';

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

  private emit(msg: ServerMessage): void {
    for (const l of this.listeners) l(msg);
  }

  private emitError(err: AppError): void {
    this.emit({ type: 'error', error: err });
  }

  private emitSystem(content: string): void {
    const message: ChatMessage = {
      id: `sys-${Date.now()}`,
      sender: 'system',
      content,
      timestamp: Date.now(),
    };
    this.emit({ type: 'message', message });
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
        } catch (err) {
          console.error('[shapeshiftui]', {
            source: 'network',
            code: 'wire_parse_failed',
            message: 'server sent non-JSON frame; dropped',
            err: err instanceof Error ? err.message : String(err),
          });
          return;
        }
        this.emit(parsed);
      });

      this.ws.on('close', () => {
        if (!this.closed) this.reconnect();
      });
    });
  }

  private async reconnect(): Promise<void> {
    // One notice at the start of the backoff — not one per attempt. Subsequent
    // retries are silent unless they all fail.
    const firstDelay = RECONNECT_DELAYS[0] ?? 1000;
    this.emitError({
      source: 'network',
      code: 'ws_disconnected',
      severity: 'warn',
      recoverable: true,
      message: `disconnected — reconnecting in ${firstDelay / 1000}s...`,
    });

    for (const delay of RECONNECT_DELAYS) {
      if (this.closed) return;
      await new Promise((r) => setTimeout(r, delay));
      if (this.closed) return;

      try {
        await this.connect();
        // Success is not an error — send as a system chat message.
        this.emitSystem('reconnected');
        return;
      } catch (err) {
        // Transient — the next backoff tick retries. Log for debug; surfacing
        // every failed attempt would spam the user. If every delay fails we
        // emit the terminal ws_lost error below.
        console.error('[shapeshiftui]', {
          source: 'network',
          code: 'reconnect_attempt_failed',
          message: `reconnect after ${delay}ms failed`,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }

    this.emitError({
      source: 'network',
      code: 'ws_lost',
      severity: 'error',
      recoverable: false,
      message: 'connection lost — restart the app',
    });
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
