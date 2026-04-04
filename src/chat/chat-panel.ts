import blessed from 'blessed';
import type { Message, MessageSender } from '../types/index.js';
import { getEventBus } from '../events/index.js';
import { getThemeManager } from '../theme/index.js';

/**
 * Chat panel configuration
 */
export interface ChatPanelConfig {
  width: string | number;
  showTimestamps?: boolean;
}

/**
 * Chat panel - displays conversation history and input
 */
export class ChatPanel {
  private container: blessed.Widgets.BoxElement | null = null;
  private messageList: blessed.Widgets.BoxElement | null = null;
  private input: blessed.Widgets.TextareaElement | null = null;
  private messages: Message[] = [];
  private config: ChatPanelConfig;
  private eventBus = getEventBus();
  private themeManager = getThemeManager();
  private screen: blessed.Widgets.Screen | null = null;

  constructor(config: ChatPanelConfig) {
    this.config = {
      showTimestamps: true,
      ...config,
    };

    // Listen for new messages
    this.eventBus.on('chat:message', (message) => {
      this.addMessage(message);
    });

    // Listen for history restore
    this.eventBus.on('chat:history', (messages) => {
      this.setMessages(messages);
    });
  }

  /**
   * Render the chat panel
   */
  render(parent: blessed.Widgets.Node, screen: blessed.Widgets.Screen): blessed.Widgets.BoxElement {
    this.screen = screen;

    // Main container
    this.container = blessed.box({
      parent,
      left: 0,
      top: 0,
      width: this.config.width,
      height: '100%',
      style: {
        fg: 'white',
        bg: 'black',
      },
    });

    // Message list area (scrollable)
    this.messageList = blessed.box({
      parent: this.container,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%-3',
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: '█',
        track: {
          bg: 'gray',
        },
        style: {
          bg: 'white',
        },
      },
      mouse: true,
      keys: true,
      vi: true,
      style: {
        fg: 'white',
        bg: 'black',
      },
      tags: true,
    });

    // Input area
    const inputContainer = blessed.box({
      parent: this.container,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      style: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: 'gray',
        },
      },
      border: {
        type: 'line',
      },
    });

    this.input = blessed.textarea({
      parent: inputContainer,
      top: 0,
      left: 0,
      width: '100%-2',
      height: 1,
      inputOnFocus: true,
      mouse: true,
      keys: true,
      style: {
        fg: 'white',
        bg: 'black',
      },
    });

    // Handle input submission
    this.input.key('enter', () => {
      this.submitMessage();
    });

    // Handle escape to blur
    this.input.key('escape', () => {
      this.input?.cancel();
      screen.focusPop();
      screen.render();
    });

    // Render initial messages
    this.renderMessages();

    return this.container;
  }

  /**
   * Add a new message
   */
  addMessage(message: Message): void {
    this.messages.push(message);
    this.renderMessages();
    this.scrollToBottom();
  }

  /**
   * Set all messages (for history restore)
   */
  setMessages(messages: Message[]): void {
    this.messages = messages;
    this.renderMessages();
    this.scrollToBottom();
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.messages = [];
    this.renderMessages();
  }

  /**
   * Focus the input field
   */
  focusInput(): void {
    this.input?.focus();
  }

  /**
   * Get the container element
   */
  getElement(): blessed.Widgets.BoxElement | null {
    return this.container;
  }

  /**
   * Destroy the chat panel
   */
  destroy(): void {
    this.container?.destroy();
    this.container = null;
    this.messageList = null;
    this.input = null;
  }

  private submitMessage(): void {
    if (!this.input) return;

    const content = this.input.getValue().trim();
    if (!content) return;

    // Clear input
    this.input.clearValue();
    this.screen?.render();

    // Emit chat send event
    this.eventBus.emit('chat:send', content);

    // Also emit user submit for layout queue processing
    this.eventBus.emit('user:submit');
  }

  private renderMessages(): void {
    if (!this.messageList) return;

    const lines: string[] = [];

    for (const message of this.messages) {
      const formatted = this.formatMessage(message);
      lines.push(...formatted);
      lines.push(''); // Empty line between messages
    }

    this.messageList.setContent(lines.join('\n'));
    this.screen?.render();
  }

  private formatMessage(message: Message): string[] {
    const lines: string[] = [];
    const prefix = this.getSenderPrefix(message.sender);
    const color = this.getSenderColor(message.sender);

    // Header line with sender and optional timestamp
    let header = `{${color}-fg}${prefix}{/${color}-fg}`;
    if (this.config.showTimestamps) {
      const time = new Date(message.timestamp).toLocaleTimeString();
      header += ` {gray-fg}${time}{/gray-fg}`;
    }
    lines.push(header);

    // Message content (wrapped)
    const contentLines = message.content.split('\n');
    for (const line of contentLines) {
      lines.push(`  ${line}`);
    }

    // Status indicator for user messages
    if (message.sender === 'user' && message.status) {
      const statusIcon = this.getStatusIcon(message.status);
      lines.push(`  {gray-fg}${statusIcon}{/gray-fg}`);
    }

    return lines;
  }

  private getSenderPrefix(sender: MessageSender): string {
    switch (sender) {
      case 'user':
        return 'You:';
      case 'ai':
        return 'AI:';
      case 'system':
        return '[System]';
      default:
        return `${sender}:`;
    }
  }

  private getSenderColor(sender: MessageSender): string {
    switch (sender) {
      case 'user':
        return 'cyan';
      case 'ai':
        return 'green';
      case 'system':
        return 'yellow';
      default:
        return 'white';
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'sending':
        return '⋯';
      case 'sent':
        return '✓';
      case 'error':
        return '✗';
      default:
        return '';
    }
  }

  private scrollToBottom(): void {
    if (this.messageList) {
      this.messageList.setScrollPerc(100);
      this.screen?.render();
    }
  }
}
