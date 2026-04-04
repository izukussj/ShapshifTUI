import WebSocket from 'ws';
import { EventEmitter } from 'events';
import type {
  SessionConfig,
  SessionState,
  TerminalCapabilities,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcErrorResponse,
  ServerNotification,
  LayoutParams,
  LayoutPatchParams,
  MessageParams,
  HistoryParams,
} from '../types/index.js';
import { JsonRpcErrorCodes } from '../types/index.js';

/**
 * WebSocket client events
 */
export interface WebSocketClientEvents {
  connected: (sessionId: string) => void;
  disconnected: (code: number, reason: string) => void;
  reconnecting: (attempt: number) => void;
  error: (error: Error) => void;
  layout: (params: LayoutParams) => void;
  'layout.patch': (params: LayoutPatchParams) => void;
  message: (params: MessageParams) => void;
  history: (params: HistoryParams) => void;
}

/**
 * Pending request awaiting response
 */
interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * Default configuration values
 */
const DEFAULTS = {
  idleTimeout: 30000,
  maxReconnectAttempts: 3,
  reconnectDelay: 1000,
  requestTimeout: 30000,
} as const;

/**
 * WebSocket client for MoltUI backend communication
 */
export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<SessionConfig>;
  private state: SessionState = 'disconnected';
  private sessionId: string | null = null;
  private reconnectAttempts = 0;
  private pendingRequests = new Map<string | number, PendingRequest>();
  private requestIdCounter = 0;
  private capabilities: TerminalCapabilities;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(config: SessionConfig, capabilities: TerminalCapabilities) {
    super();
    this.config = {
      backendUrl: config.backendUrl,
      idleTimeout: config.idleTimeout ?? DEFAULTS.idleTimeout,
      maxReconnectAttempts: config.maxReconnectAttempts ?? DEFAULTS.maxReconnectAttempts,
      reconnectDelay: config.reconnectDelay ?? DEFAULTS.reconnectDelay,
    };
    this.capabilities = capabilities;
  }

  /**
   * Get current connection state
   */
  getState(): SessionState {
    return this.state;
  }

  /**
   * Get session ID if connected
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<string> {
    if (this.state === 'connected' && this.sessionId) {
      return this.sessionId;
    }

    this.setState('connecting');

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.backendUrl);

        this.ws.on('open', () => {
          this.handleOpen(resolve, reject);
        });

        this.ws.on('message', (data: WebSocket.RawData) => {
          this.handleMessage(data);
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          this.handleClose(code, reason.toString());
        });

        this.ws.on('error', (error: Error) => {
          this.handleError(error, reject);
        });
      } catch (error) {
        this.setState('disconnected');
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.sessionId = null;
    this.setState('disconnected');
  }

  /**
   * Send a JSON-RPC request and await response
   */
  async request<T>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || this.state !== 'connected') {
      throw new Error('Not connected to server');
    }

    const id = ++this.requestIdCounter;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, DEFAULTS.requestTimeout);

      this.pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject, timeout });
      this.ws!.send(JSON.stringify(request));
    });
  }

  /**
   * Send a JSON-RPC notification (no response expected)
   */
  notify(method: string, params?: unknown): void {
    if (!this.ws || this.state !== 'connected') {
      throw new Error('Not connected to server');
    }

    const notification: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
    };

    this.ws.send(JSON.stringify(notification));
  }

  /**
   * Send a chat message
   */
  sendChat(content: string): void {
    if (!this.sessionId) {
      throw new Error('No active session');
    }

    this.notify('chat', {
      sessionId: this.sessionId,
      content,
    });
  }

  /**
   * Send an event to the backend
   */
  sendEvent(
    layoutId: string,
    widgetId: string,
    eventType: string,
    data: Record<string, unknown>
  ): void {
    if (!this.sessionId) {
      throw new Error('No active session');
    }

    this.notify('event', {
      sessionId: this.sessionId,
      layoutId,
      widgetId,
      eventType,
      data,
      timestamp: Date.now(),
    });
  }

  private setState(state: SessionState): void {
    this.state = state;
  }

  private async handleOpen(
    resolve: (sessionId: string) => void,
    reject: (error: Error) => void
  ): Promise<void> {
    try {
      // Send init request directly (before state is 'connected')
      const id = ++this.requestIdCounter;
      const initRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'init',
        params: {
          version: '1.0.0',
          capabilities: this.capabilities,
        },
        id,
      };

      const response = await new Promise<{ sessionId: string; serverVersion?: string }>((res, rej) => {
        const timeout = setTimeout(() => {
          this.pendingRequests.delete(id);
          rej(new Error('Init request timeout'));
        }, DEFAULTS.requestTimeout);

        this.pendingRequests.set(id, { resolve: res as (value: unknown) => void, reject: rej, timeout });
        this.ws!.send(JSON.stringify(initRequest));
      });

      this.sessionId = response.sessionId;
      this.reconnectAttempts = 0;
      this.setState('connected');
      this.emit('connected', this.sessionId);
      resolve(this.sessionId);
    } catch (error) {
      this.setState('disconnected');
      reject(error as Error);
    }
  }

  private handleMessage(data: WebSocket.RawData): void {
    try {
      const message = JSON.parse(data.toString()) as
        | JsonRpcResponse
        | JsonRpcErrorResponse
        | ServerNotification;

      // Check if it's a response to a pending request
      if ('id' in message && message.id !== undefined && message.id !== null) {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(message.id);

          if ('error' in message) {
            pending.reject(new Error(message.error.message));
          } else if ('result' in message) {
            pending.resolve(message.result);
          }
          return;
        }
      }

      // Handle notifications
      if ('method' in message) {
        this.handleNotification(message as ServerNotification);
      }
    } catch (error) {
      this.emit('error', new Error(`Failed to parse message: ${error}`));
    }
  }

  private handleNotification(notification: ServerNotification): void {
    switch (notification.method) {
      case 'layout':
        this.emit('layout', notification.params as LayoutParams);
        break;
      case 'layout.patch':
        this.emit('layout.patch', notification.params as LayoutPatchParams);
        break;
      case 'message':
        this.emit('message', notification.params as MessageParams);
        break;
      case 'history':
        this.emit('history', notification.params as HistoryParams);
        break;
      default:
        // Unknown notification, ignore
        break;
    }
  }

  private handleClose(code: number, reason: string): void {
    this.ws = null;
    this.clearPendingRequests('Connection closed');

    const wasConnected = this.state === 'connected';
    this.setState('disconnected');
    this.emit('disconnected', code, reason);

    // Attempt reconnection if we were previously connected
    if (wasConnected && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Error, reject?: (error: Error) => void): void {
    this.emit('error', error);
    if (reject && this.state === 'connecting') {
      reject(error);
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.reconnectAttempts++;
    this.setState('reconnecting');
    this.emit('reconnecting', this.reconnectAttempts);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch {
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          this.setState('disconnected');
        }
      }
    }, this.config.reconnectDelay * this.reconnectAttempts);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearPendingRequests(reason: string): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(reason));
    }
    this.pendingRequests.clear();
  }
}

// Type augmentation for EventEmitter
export interface WebSocketClient {
  on<K extends keyof WebSocketClientEvents>(event: K, listener: WebSocketClientEvents[K]): this;
  emit<K extends keyof WebSocketClientEvents>(
    event: K,
    ...args: Parameters<WebSocketClientEvents[K]>
  ): boolean;
}
