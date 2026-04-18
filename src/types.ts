export type Sender = 'user' | 'ai' | 'system';

export type ErrorSeverity = 'info' | 'warn' | 'error';
export type ErrorSource = 'bridge' | 'runtime' | 'sandbox' | 'network' | 'codex' | 'user';

/**
 * Canonical error shape across the wire and inside the client. Classified at
 * origin so the sink can render, log, and derive persistent state without
 * pattern-matching strings.
 */
export interface AppError {
  source: ErrorSource;
  code: string;
  message: string;
  severity: ErrorSeverity;
  recoverable: boolean;
  details?: unknown;
}

export interface ChatMessage {
  id: string;
  sender: Sender;
  content: string;
  timestamp: number;
  severity?: ErrorSeverity;
}

export interface InteractionRecord {
  eventType: string;
  data: unknown;
  timestamp: number;
}

export interface ApprovalRequest {
  id: string;
  tool: 'shell' | 'mcp' | 'other';
  summary: string;
  details: unknown;
}

/**
 * Wire protocol — minimal JSON over websocket. No JSON-RPC envelope, no
 * handshake. The first message either side sends sets the contract.
 */
export type ServerMessage =
  | { type: 'message'; message: ChatMessage }
  | { type: 'error'; error: AppError }
  | { type: 'status'; text: string | null }
  | { type: 'restore'; name: string; messages: ChatMessage[] }
  | { type: 'approval_request'; request: ApprovalRequest };

export type ClientMessage =
  | { type: 'init'; cwd: string }
  | { type: 'chat'; content: string; interactions: InteractionRecord[] }
  | { type: 'event'; eventType: string; data: unknown }
  | { type: 'save'; name: string }
  | { type: 'load'; name: string }
  | { type: 'list-views' }
  | { type: 'delete-view'; name: string }
  | { type: 'approval_response'; id: string; approved: boolean }
  | { type: 'cancel' };
