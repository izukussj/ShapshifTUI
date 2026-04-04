import blessed from 'blessed';
import type {
  TerminalCapabilities,
  SessionConfig,
  LayoutDefinition,
  Message,
} from '../types/index.js';
import { WebSocketClient } from '../connection/index.js';
import { getEventBus } from '../events/index.js';
import { getLayoutManager } from '../layout/index.js';
import { getThemeManager } from '../theme/index.js';
import { ChatPanel } from '../chat/index.js';
import { createWidgetTree, type BaseWidget } from '../widgets/index.js';

/**
 * Application configuration
 */
export interface ApplicationConfig {
  /** Backend WebSocket URL (or from MOLTUI_BACKEND env var) */
  backendUrl?: string;

  /** Chat panel width (default: '35%') */
  chatWidth?: string | number;

  /** Show timestamps in chat (default: true) */
  showTimestamps?: boolean;
}

/**
 * Detect terminal capabilities
 */
function detectCapabilities(): TerminalCapabilities {
  const colorTerm = process.env.COLORTERM;
  const term = process.env.TERM || '';

  let colors: TerminalCapabilities['colors'] = 16;
  if (colorTerm === 'truecolor' || colorTerm === '24bit') {
    colors = 'truecolor';
  } else if (term.includes('256color') || colorTerm === '256') {
    colors = 256;
  }

  return {
    mouse: true,
    colors,
    unicode: true,
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24,
  };
}

/**
 * Main MoltUI application
 */
export class Application {
  private screen: blessed.Widgets.Screen | null = null;
  private client: WebSocketClient | null = null;
  private chatPanel: ChatPanel | null = null;
  private layoutContainer: blessed.Widgets.BoxElement | null = null;
  private currentWidgetTree: BaseWidget | null = null;
  private config: ApplicationConfig;
  private capabilities: TerminalCapabilities;
  private eventBus = getEventBus();
  private layoutManager = getLayoutManager();
  private sessionId: string | null = null;

  constructor(config: ApplicationConfig = {}) {
    this.config = {
      chatWidth: '35%',
      showTimestamps: true,
      ...config,
    };
    this.capabilities = detectCapabilities();

    // Initialize theme manager with detected color capability
    getThemeManager(this.capabilities.colors);
  }

  /**
   * Start the application
   */
  async start(): Promise<void> {
    // Get backend URL from config or environment
    const backendUrl = this.config.backendUrl || process.env.MOLTUI_BACKEND;
    if (!backendUrl) {
      throw new Error(
        'Backend URL required. Set MOLTUI_BACKEND environment variable or pass backendUrl in config.'
      );
    }

    // Initialize screen
    this.initScreen();

    // Initialize UI components
    this.initUI();

    // Connect to backend
    await this.connect(backendUrl);

    // Setup event handlers
    this.setupEventHandlers();

    // Initial render
    this.screen!.render();
  }

  /**
   * Stop the application
   */
  stop(): void {
    this.client?.disconnect();
    this.screen?.destroy();
  }

  private initScreen(): void {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'MoltUI',
      fullUnicode: this.capabilities.unicode,
      mouse: this.capabilities.mouse,
    });

    // Global key bindings
    this.screen.key(['q', 'C-c'], () => {
      this.stop();
      process.exit(0);
    });

    // Handle terminal resize
    this.screen.on('resize', () => {
      this.capabilities.width = this.screen!.width as number;
      this.capabilities.height = this.screen!.height as number;
      this.eventBus.emit('terminal:resize', this.capabilities.width, this.capabilities.height);
      this.screen!.render();
    });
  }

  private initUI(): void {
    if (!this.screen) return;

    // Create chat panel on the left
    this.chatPanel = new ChatPanel({
      width: this.config.chatWidth!,
      showTimestamps: this.config.showTimestamps,
    });
    this.chatPanel.render(this.screen, this.screen);

    // Create layout container on the right
    this.layoutContainer = blessed.box({
      parent: this.screen,
      left: this.config.chatWidth,
      top: 0,
      width: `100%-${typeof this.config.chatWidth === 'string' ? this.config.chatWidth : this.config.chatWidth + ''}`,
      height: '100%',
      style: {
        fg: 'white',
        bg: 'black',
      },
    });

    // Show initial placeholder
    this.showPlaceholder('Connecting to AI backend...');
  }

  private async connect(backendUrl: string): Promise<void> {
    const sessionConfig: SessionConfig = {
      backendUrl,
    };

    this.client = new WebSocketClient(sessionConfig, this.capabilities);

    // Wire up client events
    this.client.on('connected', (sessionId) => {
      this.sessionId = sessionId;
      this.showPlaceholder('Connected. Start chatting!');
      this.eventBus.emit('connection:state', 'connected');
      this.screen?.render();
    });

    this.client.on('disconnected', (code, reason) => {
      this.eventBus.emit('connection:state', 'disconnected');
      this.showPlaceholder(`Disconnected: ${reason || 'Connection lost'}`);
      this.screen?.render();
    });

    this.client.on('reconnecting', (attempt) => {
      this.eventBus.emit('connection:state', 'reconnecting');
      this.showPlaceholder(`Reconnecting... (attempt ${attempt})`);
      this.screen?.render();
    });

    this.client.on('error', (error) => {
      this.eventBus.emit('connection:error', error);
    });

    this.client.on('layout', (params) => {
      this.layoutManager.handleLayout(params.layout);
    });

    this.client.on('layout.patch', (params) => {
      this.layoutManager.handlePatch(params.layoutId, params.patches);
    });

    this.client.on('message', (params) => {
      this.eventBus.emit('chat:message', params.message);
    });

    this.client.on('history', (params) => {
      this.eventBus.emit('chat:history', params.messages);
    });

    try {
      await this.client.connect();
    } catch (error) {
      this.showPlaceholder(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    // Handle chat send
    this.eventBus.on('chat:send', (content) => {
      if (this.client && this.sessionId) {
        // Add user message to chat immediately
        const userMessage: Message = {
          id: `user-${Date.now()}`,
          sender: 'user',
          content,
          timestamp: Date.now(),
          status: 'sending',
        };
        this.eventBus.emit('chat:message', userMessage);

        // Send to backend
        this.client.sendChat(content);
      }
    });

    // Handle layout applied
    this.eventBus.on('layout:applied', (layoutId) => {
      const layout = this.layoutManager.getCurrentLayout();
      if (layout) {
        this.renderLayout(layout);
      }
    });

    // Handle widget events
    this.eventBus.on('widget:event', (params) => {
      if (this.client && this.sessionId) {
        this.client.sendEvent(
          params.layoutId,
          params.widgetId,
          params.eventType,
          params.data
        );
      }
    });

    // Tab to switch focus between chat and layout
    this.screen?.key('tab', () => {
      const chatElement = this.chatPanel?.getElement();
      if (chatElement && this.screen?.focused === chatElement) {
        this.layoutContainer?.focus();
      } else {
        this.chatPanel?.focusInput();
      }
      this.screen?.render();
    });
  }

  private renderLayout(layout: LayoutDefinition): void {
    if (!this.layoutContainer || !this.screen) return;

    // Destroy existing widget tree
    if (this.currentWidgetTree) {
      this.currentWidgetTree.destroy();
      this.currentWidgetTree = null;
    }

    // Clear placeholder
    this.layoutContainer.children.forEach((child) => {
      if (child !== this.currentWidgetTree?.getElement()) {
        child.destroy();
      }
    });

    // Create new widget tree
    this.currentWidgetTree = createWidgetTree(layout.root);
    this.currentWidgetTree.render({
      parent: this.layoutContainer,
      screen: this.screen,
      layoutId: layout.id,
      sessionId: this.sessionId || '',
    });

    this.screen.render();
  }

  private showPlaceholder(message: string): void {
    if (!this.layoutContainer) return;

    // Clear existing content
    this.layoutContainer.children.forEach((child) => child.destroy());

    blessed.box({
      parent: this.layoutContainer,
      content: message,
      align: 'center',
      valign: 'middle',
      width: '100%',
      height: '100%',
      style: {
        fg: 'gray',
      },
    });
  }
}
