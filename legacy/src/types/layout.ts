import type { Widget } from './widget.js';
import type { StyleProps } from './style.js';

/**
 * Theme configuration for a layout
 */
export interface Theme {
  colors?: {
    primary?: string;
    secondary?: string;
    background?: string;
    foreground?: string;
    error?: string;
    warning?: string;
    success?: string;
    info?: string;
  };
  borders?: {
    type?: 'line' | 'bg' | 'none';
    fg?: string;
    bg?: string;
  };
}

/**
 * Key binding definition for custom shortcuts
 */
export interface KeyBinding {
  key: string;
  action: {
    type: 'emit' | 'navigate' | 'update' | 'execute';
    target?: string;
    data?: Record<string, unknown>;
    condition?: string;
  };
  description?: string;
  when?: string;
}

/**
 * Layout metadata
 */
export interface LayoutMetadata {
  title?: string;
  description?: string;
  createdBy?: string;
  timestamp?: number;
  tags?: string[];
}

/**
 * Layout type determining root widget behavior
 */
export type LayoutType = 'single' | 'split' | 'tabs' | 'stack';

/**
 * Complete layout definition - the contract between AI and MoltUI client
 */
export interface LayoutDefinition {
  /** Schema version - must match exactly */
  version: '1.0';

  /** Unique identifier for this layout instance */
  id: string;

  /** Layout type determining root behavior */
  type: LayoutType;

  /** Optional metadata */
  metadata?: LayoutMetadata;

  /** Root widget tree */
  root: Widget;

  /** Global keybindings for this layout */
  keybindings?: KeyBinding[];

  /** Theme overrides */
  theme?: Theme;
}

/**
 * Supported schema version
 */
export const SUPPORTED_VERSION = '1.0' as const;
