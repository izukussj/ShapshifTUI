import type { Theme, ColorCapability, StyleProps } from '../types/index.js';

/**
 * Default theme configuration
 */
const DEFAULT_THEME: Required<Theme> = {
  colors: {
    primary: 'blue',
    secondary: 'cyan',
    background: 'black',
    foreground: 'white',
    error: 'red',
    warning: 'yellow',
    success: 'green',
    info: 'cyan',
  },
  borders: {
    type: 'line',
    fg: 'white',
    bg: 'black',
  },
};

/**
 * Named color to 256-color palette mapping
 */
const NAMED_COLORS: Record<string, number> = {
  black: 0,
  red: 1,
  green: 2,
  yellow: 3,
  blue: 4,
  magenta: 5,
  cyan: 6,
  white: 7,
  default: -1,
};

/**
 * Bright variants of named colors
 */
const BRIGHT_COLORS: Record<string, number> = {
  brightblack: 8,
  brightred: 9,
  brightgreen: 10,
  brightyellow: 11,
  brightblue: 12,
  brightmagenta: 13,
  brightcyan: 14,
  brightwhite: 15,
};

/**
 * Theme manager - handles theme resolution and color mapping
 */
export class ThemeManager {
  private baseTheme: Required<Theme>;
  private currentOverrides: Theme | undefined;
  private colorCapability: ColorCapability;

  constructor(colorCapability: ColorCapability = 256) {
    this.baseTheme = DEFAULT_THEME;
    this.colorCapability = colorCapability;
  }

  /**
   * Set layout-specific theme overrides
   */
  setOverrides(theme: Theme | undefined): void {
    this.currentOverrides = theme;
  }

  /**
   * Clear layout-specific overrides
   */
  clearOverrides(): void {
    this.currentOverrides = undefined;
  }

  /**
   * Get the current effective theme
   */
  getTheme(): Required<Theme> {
    if (!this.currentOverrides) {
      return this.baseTheme;
    }

    return {
      colors: {
        ...this.baseTheme.colors,
        ...this.currentOverrides.colors,
      },
      borders: {
        ...this.baseTheme.borders,
        ...this.currentOverrides.borders,
      },
    };
  }

  /**
   * Get a theme color by name
   */
  getColor(name: keyof Required<Theme>['colors']): string {
    const theme = this.getTheme();
    return theme.colors[name] ?? this.baseTheme.colors[name]!;
  }

  /**
   * Resolve a color value to blessed-compatible format
   */
  resolveColor(color: string | undefined): string | number | undefined {
    if (!color) return undefined;

    // Handle theme references like "$primary"
    if (color.startsWith('$')) {
      const themeName = color.slice(1) as keyof Required<Theme>['colors'];
      const themeColor = this.getColor(themeName);
      return this.resolveColor(themeColor);
    }

    // Handle named colors
    const lowerColor = color.toLowerCase();
    if (lowerColor in NAMED_COLORS) {
      return NAMED_COLORS[lowerColor];
    }
    if (lowerColor in BRIGHT_COLORS) {
      return BRIGHT_COLORS[lowerColor];
    }

    // Handle 256-color palette (color0-color255)
    const colorMatch = color.match(/^color(\d+)$/i);
    if (colorMatch) {
      const index = parseInt(colorMatch[1], 10);
      if (index >= 0 && index <= 255) {
        return this.downgradeColor256(index);
      }
    }

    // Handle hex colors (#RRGGBB or #RGB)
    if (color.startsWith('#')) {
      return this.hexToTerminal(color);
    }

    // Return as-is for blessed to handle
    return color;
  }

  /**
   * Resolve style props with theme values
   */
  resolveStyle(style: StyleProps | undefined): Record<string, unknown> {
    if (!style) return {};

    const resolved: Record<string, unknown> = {};

    if (style.fg) {
      resolved.fg = this.resolveColor(style.fg);
    }
    if (style.bg) {
      resolved.bg = this.resolveColor(style.bg);
    }
    if (style.bold !== undefined) {
      resolved.bold = style.bold;
    }
    if (style.underline !== undefined) {
      resolved.underline = style.underline;
    }
    if (style.italic !== undefined) {
      // blessed doesn't support italic directly, use underline as fallback
      resolved.underline = resolved.underline || style.italic;
    }
    if (style.inverse !== undefined) {
      resolved.inverse = style.inverse;
    }
    if (style.blink !== undefined) {
      resolved.blink = style.blink;
    }

    if (style.border) {
      resolved.border = {
        type: style.border.type,
        fg: this.resolveColor(style.border.fg),
        bg: this.resolveColor(style.border.bg),
        ch: style.border.ch,
      };
    }

    if (style.scrollbar) {
      resolved.scrollbar = {
        track: { bg: this.resolveColor(style.scrollbar.track) },
        style: { bg: this.resolveColor(style.scrollbar.thumb) },
      };
    }

    // Handle state overrides
    if (style.focus) {
      resolved.focus = this.resolveStyle(style.focus);
    }
    if (style.hover) {
      resolved.hover = this.resolveStyle(style.hover);
    }
    if (style.selected) {
      resolved.selected = this.resolveStyle(style.selected);
    }

    return resolved;
  }

  /**
   * Downgrade 256-color to 16 colors if needed
   */
  private downgradeColor256(color: number): number {
    if (this.colorCapability === 'truecolor' || this.colorCapability === 256) {
      return color;
    }

    // Downgrade to 16 colors
    if (color < 16) {
      return color;
    }

    // Map grayscale (232-255) to basic gray
    if (color >= 232) {
      const gray = color - 232;
      if (gray < 8) return 0; // black
      if (gray < 16) return 8; // bright black
      return 7; // white
    }

    // Map 216 color cube to basic 16
    const index = color - 16;
    const r = Math.floor(index / 36);
    const g = Math.floor((index % 36) / 6);
    const b = index % 6;

    // Simple mapping to basic colors
    const intensity = r + g + b;
    if (intensity < 3) return 0; // black
    if (r > g && r > b) return 1; // red
    if (g > r && g > b) return 2; // green
    if (b > r && b > g) return 4; // blue
    if (r === g && r > b) return 3; // yellow
    if (r === b && r > g) return 5; // magenta
    if (g === b && g > r) return 6; // cyan
    return 7; // white
  }

  /**
   * Convert hex color to terminal color
   */
  private hexToTerminal(hex: string): number | string {
    // Parse hex
    let r: number, g: number, b: number;

    if (hex.length === 4) {
      // #RGB
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      // #RRGGBB
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    } else {
      return hex; // Invalid, return as-is
    }

    if (this.colorCapability === 'truecolor') {
      // Return hex for truecolor terminals
      return hex;
    }

    // Convert to 256-color palette
    if (this.colorCapability === 256) {
      return this.rgbTo256(r, g, b);
    }

    // Convert to 16 colors
    return this.rgbTo16(r, g, b);
  }

  /**
   * Convert RGB to 256-color palette index
   */
  private rgbTo256(r: number, g: number, b: number): number {
    // Check for grayscale
    if (r === g && g === b) {
      if (r < 8) return 16;
      if (r > 248) return 231;
      return Math.round((r - 8) / 247 * 24) + 232;
    }

    // Map to 6x6x6 color cube
    const ri = Math.round(r / 255 * 5);
    const gi = Math.round(g / 255 * 5);
    const bi = Math.round(b / 255 * 5);
    return 16 + ri * 36 + gi * 6 + bi;
  }

  /**
   * Convert RGB to 16-color index
   */
  private rgbTo16(r: number, g: number, b: number): number {
    const brightness = (r + g + b) / 3;
    const bright = brightness > 128 ? 8 : 0;

    if (brightness < 50) return 0; // black
    if (brightness > 200 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
      return bright + 7; // white
    }

    const max = Math.max(r, g, b);
    if (r === max && r > g + 50 && r > b + 50) return bright + 1; // red
    if (g === max && g > r + 50 && g > b + 50) return bright + 2; // green
    if (b === max && b > r + 50 && b > g + 50) return bright + 4; // blue
    if (r > 150 && g > 150 && b < 100) return bright + 3; // yellow
    if (r > 150 && b > 150 && g < 100) return bright + 5; // magenta
    if (g > 150 && b > 150 && r < 100) return bright + 6; // cyan

    return bright + 7; // default to white
  }
}

// Singleton instance
let themeManagerInstance: ThemeManager | null = null;

/**
 * Get the global theme manager instance
 */
export function getThemeManager(colorCapability?: ColorCapability): ThemeManager {
  if (!themeManagerInstance) {
    themeManagerInstance = new ThemeManager(colorCapability);
  }
  return themeManagerInstance;
}
