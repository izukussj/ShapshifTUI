import type { LayoutDefinition } from './layout.js';

/**
 * Session connection state
 */
export type SessionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

/**
 * Terminal color capability
 */
export type ColorCapability = 16 | 256 | 'truecolor';

/**
 * Terminal capabilities detected at startup
 */
export interface TerminalCapabilities {
  /** Mouse support enabled */
  mouse: boolean;

  /** Color depth */
  colors: ColorCapability;

  /** Unicode support */
  unicode: boolean;

  /** Terminal width in columns */
  width: number;

  /** Terminal height in rows */
  height: number;
}

/**
 * Runtime session state (client-side only, not persisted)
 */
export interface Session {
  /** Session identifier (from AI backend) */
  id: string;

  /** Connection state */
  state: SessionState;

  /** Current layout identifier */
  currentLayoutId?: string;

  /** Queued layouts (waiting for user to finish interaction) */
  queuedLayouts: LayoutDefinition[];

  /** User interaction state */
  isUserInteracting: boolean;

  /** Terminal capabilities */
  capabilities: TerminalCapabilities;

  /** Last activity timestamp (Unix ms) */
  lastActivityTime: number;

  /** Number of reconnection attempts */
  reconnectAttempts: number;
}

/**
 * Session configuration options
 */
export interface SessionConfig {
  /** Backend WebSocket URL */
  backendUrl: string;

  /** Idle timeout in milliseconds (default: 30000) */
  idleTimeout?: number;

  /** Maximum reconnection attempts (default: 3) */
  maxReconnectAttempts?: number;

  /** Reconnection delay in milliseconds (default: 1000) */
  reconnectDelay?: number;
}

/**
 * Session initialization parameters sent to AI backend
 */
export interface SessionInitParams {
  /** Client version */
  version: string;

  /** Terminal capabilities */
  capabilities: TerminalCapabilities;
}

/**
 * Session ready response from AI backend
 */
export interface SessionReadyResponse {
  jsonrpc: '2.0';
  result: {
    sessionId: string;
    serverVersion?: string;
  };
  id?: string;
}
