/**
 * Message sender type
 */
export type MessageSender = 'user' | 'ai' | 'system';

/**
 * Message status
 */
export type MessageStatus = 'sending' | 'sent' | 'error';

/**
 * Chat message displayed in the chat panel
 */
export interface Message {
  /** Unique message identifier */
  id: string;

  /** Message sender */
  sender: MessageSender;

  /** Message content (plain text or markdown-like) */
  content: string;

  /** Timestamp (Unix ms) */
  timestamp: number;

  /** Optional associated layout (for AI messages) */
  layoutId?: string;

  /** Message status */
  status?: MessageStatus;
}

/**
 * Chat message parameters from AI backend
 */
export interface MessageParams {
  sessionId: string;
  message: Message;
}

/**
 * History restore parameters from AI backend
 */
export interface HistoryParams {
  sessionId: string;
  messages: Message[];
  currentLayoutId?: string;
}

/**
 * Chat message sent from client to AI backend
 */
export interface ChatMessage {
  jsonrpc: '2.0';
  method: 'chat';
  params: {
    sessionId: string;
    content: string;
  };
}
