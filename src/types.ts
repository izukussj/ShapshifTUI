export type Sender = 'user' | 'ai' | 'system';

export interface ChatMessage {
  id: string;
  sender: Sender;
  content: string;
  timestamp: number;
}

export interface InteractionRecord {
  eventType: string;
  data: unknown;
  timestamp: number;
}

/**
 * Wire protocol — minimal JSON over websocket. No JSON-RPC envelope, no
 * handshake. The first message either side sends sets the contract.
 */
export type ServerMessage =
  | { type: 'message'; message: ChatMessage }
  | { type: 'error'; error: string }
  | { type: 'status'; text: string | null };

export type ClientMessage =
  | { type: 'init'; cwd: string }
  | { type: 'chat'; content: string; interactions: InteractionRecord[] }
  | { type: 'event'; eventType: string; data: unknown };
