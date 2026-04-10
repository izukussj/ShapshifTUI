/**
 * MoltUI Type Definitions
 *
 * This module exports all type definitions used throughout the MoltUI framework.
 */

// Style types
export type {
  PositionMode,
  FlexDirection,
  JustifyContent,
  AlignItems,
  SizeValue,
  SpacingValue,
  LayoutProps,
  BorderType,
  BorderStyle,
  ScrollbarStyle,
  StyleProps,
  NamedColor,
  ColorValue,
} from './style.js';

// Action types
export type {
  ActionType,
  Action,
  EmitAction,
  NavigateAction,
  UpdateAction,
  ExecuteAction,
} from './action.js';

// Widget types
export type {
  WidgetType,
  WidgetEventType,
  EventHandler,
  Widget,
  TableColumn,
  TableProps,
  ListItem,
  ListProps,
  ValidationRule,
  FormField,
  FormProps,
  ChartData,
  ChartProps,
  PanelProps,
  TabsProps,
  ProgressBarProps,
  ContainerProps,
} from './widget.js';

// Layout types
export type {
  Theme,
  KeyBinding,
  LayoutMetadata,
  LayoutType,
  LayoutDefinition,
} from './layout.js';

export { SUPPORTED_VERSION } from './layout.js';

// Event types
export type {
  EventType,
  EventParams,
  Event,
  ClickEventData,
  KeypressEventData,
  SelectEventData,
  ChangeEventData,
  SubmitEventData,
  ScrollEventData,
  ResizeEventData,
} from './event.js';

// Message types
export type {
  MessageSender,
  MessageStatus,
  Message,
  MessageParams,
  HistoryParams,
  ChatMessage,
} from './message.js';

// Session types
export type {
  SessionState,
  ColorCapability,
  TerminalCapabilities,
  Session,
  SessionConfig,
  SessionInitParams,
  SessionReadyResponse,
} from './session.js';

// Protocol types
export type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  JsonRpcErrorResponse,
  InitRequest,
  LayoutNotification,
  LayoutParams,
  LayoutPatchNotification,
  LayoutPatchParams,
  JsonPatchOperation,
  MessageNotification,
  HistoryNotification,
  EventRequest,
  ChatRequest,
  ServerNotification,
  ClientRequest,
  JsonRpcMessage,
} from './protocol.js';

export { JsonRpcErrorCodes } from './protocol.js';

// Interaction types
export type {
  InteractionElementType,
  InteractionEventType,
  InteractionData,
  InteractionEvent,
  InteractionHistoryState,
  InteractionContext,
  WidgetInteractionEvent,
} from './interaction.js';

// Parsed response types
export type { ParsedResponse } from './parsed-response.js';
