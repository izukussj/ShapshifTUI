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
import {
  getInteractionCapture,
  getInteractionContextBuilder,
  type InteractionCapture,
  type InteractionContextBuilder,
} from '../interaction/index.js';

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
  private errorIndicator: blessed.Widgets.BoxElement | null = null;
  private currentWidgetTree: BaseWidget | null = null;
  private currentLayoutId: string | null = null;
  private config: ApplicationConfig;
  private capabilities: TerminalCapabilities;
  private eventBus = getEventBus();
  private layoutManager = getLayoutManager();
  private interactionCapture: InteractionCapture;
  private interactionContextBuilder: InteractionContextBuilder;
  private sessionId: string | null = null;
  private errorDismissTimer: NodeJS.Timeout | null = null;

  constructor(config: ApplicationConfig = {}) {
    this.config = {
      chatWidth: '35%',
      showTimestamps: true,
      ...config,
    };
    this.capabilities = detectCapabilities();

    // Initialize theme manager with detected color capability
    getThemeManager(this.capabilities.colors);

    // Initialize interaction capture system
    this.interactionCapture = getInteractionCapture({
      debounceMs: 300,
      historySize: 50,
    });
    this.interactionCapture.start();

    // Initialize interaction context builder
    this.interactionContextBuilder = getInteractionContextBuilder();
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

    // Initial render and focus chat input
    this.screen!.render();
    this.chatPanel?.focusInput();
  }

  /**
   * Stop the application
   */
  stop(): void {
    this.interactionCapture.stop();
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
    // Calculate remaining width (blessed doesn't support "100%-35%")
    let layoutWidth: string | number;
    if (typeof this.config.chatWidth === 'string' && this.config.chatWidth.endsWith('%')) {
      const chatPercent = parseInt(this.config.chatWidth, 10);
      layoutWidth = `${100 - chatPercent}%`;
    } else {
      // If chatWidth is a number, use remaining space
      layoutWidth = `100%-${this.config.chatWidth}`;
    }

    this.layoutContainer = blessed.box({
      parent: this.screen,
      left: this.config.chatWidth,
      top: 0,
      width: layoutWidth,
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
      process.stderr.write(`[APP] layout received: ${params.layout?.id}\n`);
      this.handleLayoutNotification(params.layout);
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

        // Build interaction context from captured history
        const history = this.interactionCapture.getHistory();
        const context = this.interactionContextBuilder.build(
          history,
          this.currentLayoutId || undefined,
          this.currentLayoutId
            ? this.interactionContextBuilder.generateLayoutSummary(
                this.currentLayoutId,
                this.layoutContainer?.children.length
              )
            : undefined
        );

        // Send to backend with interaction context
        this.client.sendChat(content, context);
      }
    });

    // Handle layout applied
    this.eventBus.on('layout:applied', (layoutId) => {
      process.stderr.write(`[APP] layout:applied event: ${layoutId}\n`);
      const layout = this.layoutManager.getCurrentLayout();
      if (layout) {
        process.stderr.write(`[APP] renderLayout: ${layout.id}\n`);
        this.renderLayout(layout);
      } else {
        process.stderr.write(`[APP] no layout in manager!\n`);
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

    // Handle layout extracted from chat messages (silent rendering)
    this.eventBus.on('chat:layout', (layout) => {
      process.stderr.write(`[APP] chat:layout received: ${layout?.id}\n`);
      this.handleLayoutNotification(layout);
    });

    // Handle render error events
    this.eventBus.on('tui:render:error', (params) => {
      this.showErrorIndicator(params.error);
    });

    // Handle render success events
    this.eventBus.on('tui:render:success', () => {
      this.clearErrorIndicator();
    });
  }

  /**
   * Handle layout notification - validates and renders silently
   */
  private handleLayoutNotification(layout: LayoutDefinition): void {
    const result = this.layoutManager.handleLayout(layout);
    process.stderr.write(`[APP] validation: ${result.valid}\n`);

    if (!result.valid) {
      // Emit error event, preserve previous layout
      this.eventBus.emit('tui:render:error', {
        layoutId: layout?.id || 'unknown',
        error: result.errors?.join(', ') || 'Invalid layout',
        preservedLayoutId: this.currentLayoutId,
      });
    }
  }

  /**
   * Show error indicator in TUI panel status bar
   */
  private showErrorIndicator(error: string): void {
    if (!this.layoutContainer || !this.screen) return;

    // Clear any existing dismiss timer
    if (this.errorDismissTimer) {
      clearTimeout(this.errorDismissTimer);
      this.errorDismissTimer = null;
    }

    // Remove existing error indicator
    this.clearErrorIndicator();

    // Create error indicator at bottom of layout container
    this.errorIndicator = blessed.box({
      parent: this.layoutContainer,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: ` {red-fg}⚠{/red-fg} ${error}`,
      tags: true,
      style: {
        fg: 'red',
        bg: 'black',
      },
    });

    this.screen.render();

    // Auto-dismiss after 5 seconds
    this.errorDismissTimer = setTimeout(() => {
      this.clearErrorIndicator();
    }, 5000);
  }

  /**
   * Clear error indicator from TUI panel
   */
  private clearErrorIndicator(): void {
    if (this.errorIndicator) {
      this.errorIndicator.destroy();
      this.errorIndicator = null;
      this.screen?.render();
    }

    if (this.errorDismissTimer) {
      clearTimeout(this.errorDismissTimer);
      this.errorDismissTimer = null;
    }
  }

  private renderLayout(layout: LayoutDefinition): void {
    process.stderr.write(`[APP] renderLayout: ${layout.id}, root: ${layout.root?.type}\n`);
    if (!this.layoutContainer || !this.screen) {
      process.stderr.write(`[APP] missing container/screen!\n`);
      return;
    }
    process.stderr.write(`[APP] layoutContainer: ${this.layoutContainer.width}x${this.layoutContainer.height} at ${this.layoutContainer.left},${this.layoutContainer.top}\n`);

    const startTime = Date.now();

    // Destroy existing widget tree
    if (this.currentWidgetTree) {
      this.currentWidgetTree.destroy();
      this.currentWidgetTree = null;
    }

    // Clear placeholder and other children (but keep error indicator if present)
    this.layoutContainer.children.forEach((child) => {
      if (child !== this.errorIndicator) {
        child.destroy();
      }
    });

    // Create new widget tree
    try {
      process.stderr.write(`[APP] creating widget tree: ${layout.root?.id}\n`);
      this.currentWidgetTree = createWidgetTree(layout.root);
      process.stderr.write(`[APP] rendering widget tree\n`);
      this.currentWidgetTree.render({
        parent: this.layoutContainer,
        screen: this.screen,
        layoutId: layout.id,
        sessionId: this.sessionId || '',
      });

      // Track current layout ID for error preservation
      this.currentLayoutId = layout.id;

      const renderTimeMs = Date.now() - startTime;
      process.stderr.write(`[APP] widget tree children: ${this.layoutContainer.children.length}\n`);
      process.stderr.write(`[APP] screen.render()\n`);
      this.screen.render();

      // Emit success event (silently - no chat notification)
      this.eventBus.emit('tui:render:success', {
        layoutId: layout.id,
        widgetCount: this.layoutContainer.children.length,
        renderTimeMs,
      });
    } catch (err) {
      process.stderr.write(`[APP] ERROR: ${err}\n`);

      // Emit error event, preserve previous layout
      this.eventBus.emit('tui:render:error', {
        layoutId: layout.id,
        error: err instanceof Error ? err.message : String(err),
        preservedLayoutId: this.currentLayoutId,
      });
    }
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
