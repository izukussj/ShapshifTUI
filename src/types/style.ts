/**
 * Position mode for widgets
 */
export type PositionMode = 'relative' | 'absolute';

/**
 * Flex direction for container layouts
 */
export type FlexDirection = 'row' | 'column';

/**
 * Justify content alignment
 */
export type JustifyContent = 'start' | 'end' | 'center' | 'space-between' | 'space-around';

/**
 * Align items alignment
 */
export type AlignItems = 'start' | 'end' | 'center' | 'stretch';

/**
 * Size value - can be number (absolute), string percentage, or special value
 */
export type SizeValue = string | number;

/**
 * Spacing value - single number or [vertical, horizontal] or [top, right, bottom, left]
 */
export type SpacingValue = number | [number, number] | [number, number, number, number];

/**
 * Flexbox-style layout properties
 */
export interface LayoutProps {
  /** Positioning mode */
  position?: PositionMode;

  /** Position (absolute only) */
  top?: SizeValue;
  left?: SizeValue;
  right?: SizeValue;
  bottom?: SizeValue;

  /** Sizing */
  width?: SizeValue;
  height?: SizeValue;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;

  /** Spacing */
  padding?: SpacingValue;
  margin?: SpacingValue;

  /** Flex container properties */
  flexDirection?: FlexDirection;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  gap?: number;

  /** Flex item properties */
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: SizeValue;
}

/**
 * Border type for widgets
 */
export type BorderType = 'line' | 'bg' | 'none';

/**
 * Border style configuration
 */
export interface BorderStyle {
  type: BorderType;
  fg?: string;
  bg?: string;
  /** Custom border character */
  ch?: string;
}

/**
 * Scrollbar style configuration
 */
export interface ScrollbarStyle {
  track?: string;
  thumb?: string;
}

/**
 * Visual styling properties
 */
export interface StyleProps {
  /** Foreground/text color */
  fg?: string;

  /** Background color */
  bg?: string;

  /** Text formatting */
  bold?: boolean;
  underline?: boolean;
  italic?: boolean;
  inverse?: boolean;
  blink?: boolean;

  /** Border styling */
  border?: BorderStyle;

  /** Scrollbar styling */
  scrollbar?: ScrollbarStyle;

  /** Focus state overrides */
  focus?: Partial<StyleProps>;

  /** Hover state overrides (mouse) */
  hover?: Partial<StyleProps>;

  /** Selected state overrides */
  selected?: Partial<StyleProps>;
}

/**
 * Named terminal colors
 */
export type NamedColor =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'default';

/**
 * Color value - can be named color, hex (#RRGGBB), or 256-palette (color0-color255)
 */
export type ColorValue = NamedColor | string;
