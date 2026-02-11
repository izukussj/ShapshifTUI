import type { LayoutDefinition } from './layout.js';
import type { Message, MessageParams, HistoryParams, ChatMessage } from './message.js';
import type { Event, EventParams } from './event.js';
import type { SessionInitParams, SessionReadyResponse } from './session.js';

/**
 * JSON-RPC 2.0 request base
 */
export interface JsonRpcRequest<T = unknown> {
  jsonrpc: '2.0';
  method: string;
  params?: T;
  id?: string | number;
}

/**
 * JSON-RPC 2.0 success response
 */
export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  result: T;
  id: string | number | null;
}

/**
 * JSON-RPC 2.0 error object
 */
export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * JSON-RPC 2.0 error response
 */
export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  error: JsonRpcError;
  id: string | number | null;
}

/**
 * Standard JSON-RPC error codes
 */
export const JsonRpcErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // Custom error codes (server-defined, -32000 to -32099)
  SCHEMA_VALIDATION_ERROR: -32000,
  SESSION_ERROR: -32001,
  LAYOUT_ERROR: -32002,
} as const;

/**
 * Initialize session request (client → server)
 */
export interface InitRequest extends JsonRpcRequest<SessionInitParams> {
  method: 'init';
}

/**
 * Layout update notification (server → client)
 */
export interface LayoutNotification extends JsonRpcRequest<LayoutParams> {
  method: 'layout';
}

/**
 * Layout parameters
 */
export interface LayoutParams {
  sessionId: string;
  layout: LayoutDefinition;
}

/**
 * Incremental layout update (JSON Patch)
 */
export interface LayoutPatchNotification extends JsonRpcRequest<LayoutPatchParams> {
  method: 'layout.patch';
}

/**
 * Layout patch parameters
 */
export interface LayoutPatchParams {
  sessionId: string;
  layoutId: string;
  patches: JsonPatchOperation[];
}

/**
 * JSON Patch operation (RFC 6902)
 */
export interface JsonPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;
  from?: string;
}

/**
 * Chat message notification (server → client)
 */
export interface MessageNotification extends JsonRpcRequest<MessageParams> {
  method: 'message';
}

/**
 * History restore notification (server → client)
 */
export interface HistoryNotification extends JsonRpcRequest<HistoryParams> {
  method: 'history';
}

/**
 * Event request (client → server)
 */
export type EventRequest = Event;

/**
 * Chat request (client → server)
 */
export type ChatRequest = ChatMessage;

/**
 * All possible server → client notifications
 */
export type ServerNotification =
  | LayoutNotification
  | LayoutPatchNotification
  | MessageNotification
  | HistoryNotification;

/**
 * All possible client → server requests
 */
export type ClientRequest =
  | InitRequest
  | EventRequest
  | ChatRequest;

/**
 * Any JSON-RPC message
 */
export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcResponse
  | JsonRpcErrorResponse;
