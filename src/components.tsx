import React, { createContext, useContext, useRef, useState } from 'react';
import { Box, Text, useFocus, useInput } from 'ink';
import type { DOMElement } from 'ink';
import { useMouseClick, useMouseHover } from './mouse.js';

// Lets a parent mark a subtree as focus-inert (e.g. behind a modal banner).
// Widgets in the subtree won't appear in Tab order, won't highlight on hover,
// and won't respond to clicks or Enter/Space.
export const FocusActiveContext = createContext(true);
const MAX_BUTTON_LABEL_CELLS = 32;

interface ButtonProps {
  label: string;
  onPress: () => void;
  autoFocus?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function Button({ label, onPress, autoFocus, width, minWidth, maxWidth }: ButtonProps): React.ReactElement {
  const isActive = useContext(FocusActiveContext);
  const { isFocused } = useFocus({ autoFocus, isActive });
  const ref = useRef<DOMElement | null>(null);
  const implicitWidthRef = useRef<number | null>(null);
  const hovered = useMouseHover(ref);
  useMouseClick(ref, () => { if (isActive) onPress(); });

  useInput((input, key) => {
    if (!isFocused || !isActive) return;
    if (key.return || input === ' ') {
      onPress();
    }
  });

  const active = (isFocused || hovered) && isActive;
  const labelCells = stringWidth(label);
  const naturalWidth = Math.min(labelCells, MAX_BUTTON_LABEL_CELLS) + 4;
  const requestedWidth = width ?? Math.max(naturalWidth, minWidth ?? 0);
  const boundedWidth = maxWidth === undefined ? requestedWidth : Math.min(requestedWidth, maxWidth);
  const computedWidth = Math.max(4, Math.floor(boundedWidth));
  if (width === undefined && implicitWidthRef.current === null) {
    implicitWidthRef.current = computedWidth;
  }
  const frameWidth = width === undefined ? implicitWidthRef.current ?? computedWidth : computedWidth;
  const renderedLabel = truncateCells(label, Math.max(0, frameWidth - 4));

  return (
    <Box
      ref={ref}
      borderStyle="round"
      borderColor={active ? 'cyan' : 'gray'}
      paddingX={1}
      flexShrink={0}
      width={frameWidth}
    >
      <Text inverse={isFocused} bold={hovered && !isFocused} wrap="truncate-end">{renderedLabel}</Text>
    </Box>
  );
}

function stringWidth(value: string): number {
  let width = 0;
  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (isCombining(codePoint)) continue;
    width += isWide(codePoint) ? 2 : 1;
  }
  return width;
}

function truncateCells(value: string, maxCells: number): string {
  if (stringWidth(value) <= maxCells) return value;
  if (maxCells <= 0) return '';

  const suffix = '.'.repeat(Math.min(3, maxCells));
  const budget = maxCells - suffix.length;
  let used = 0;
  let output = '';

  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;
    const cells = isCombining(codePoint) ? 0 : isWide(codePoint) ? 2 : 1;
    if (used + cells > budget) break;
    output += char;
    used += cells;
  }

  return output + suffix;
}

function isCombining(codePoint: number): boolean {
  return (
    (codePoint >= 0x0300 && codePoint <= 0x036f) ||
    (codePoint >= 0x1ab0 && codePoint <= 0x1aff) ||
    (codePoint >= 0x1dc0 && codePoint <= 0x1dff) ||
    (codePoint >= 0x20d0 && codePoint <= 0x20ff) ||
    (codePoint >= 0xfe20 && codePoint <= 0xfe2f)
  );
}

function isWide(codePoint: number): boolean {
  return (
    codePoint >= 0x1100 && (
      codePoint <= 0x115f ||
      codePoint === 0x2329 ||
      codePoint === 0x232a ||
      (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
      (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff00 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6)
    )
  );
}

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

export function Checkbox({ label, checked, onChange }: CheckboxProps): React.ReactElement {
  const isActive = useContext(FocusActiveContext);
  const { isFocused } = useFocus({ isActive });
  const ref = useRef<DOMElement | null>(null);
  const hovered = useMouseHover(ref);
  useMouseClick(ref, () => { if (isActive) onChange(!checked); });

  useInput((input, key) => {
    if (!isFocused || !isActive) return;
    if (key.return || input === ' ') onChange(!checked);
  });

  const active = (isFocused || hovered) && isActive;
  return (
    <Box ref={ref} paddingX={1}>
      <Text color={active ? 'cyan' : undefined} bold={active}>
        [{checked ? 'x' : ' '}] {label}
      </Text>
    </Box>
  );
}

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  options: Array<string | SelectOption>;
  onSelect: (value: string, index: number) => void;
  initialIndex?: number;
}

export function Select({ options, onSelect, initialIndex = 0 }: SelectProps): React.ReactElement {
  const isActive = useContext(FocusActiveContext);
  const { isFocused } = useFocus({ isActive });
  const normalized: SelectOption[] = options.map((o) =>
    typeof o === 'string' ? { label: o, value: o } : o,
  );
  const [index, setIndex] = useState(
    Math.min(Math.max(0, initialIndex), Math.max(0, normalized.length - 1)),
  );

  useInput((_input, key) => {
    if (!isFocused || !isActive) return;
    if (key.upArrow) setIndex((i) => Math.max(0, i - 1));
    else if (key.downArrow) setIndex((i) => Math.min(normalized.length - 1, i + 1));
    else if (key.return) {
      const opt = normalized[index];
      if (opt) onSelect(opt.value, index);
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={isFocused ? 'cyan' : 'gray'}
      paddingX={1}
    >
      {normalized.map((opt, i) => {
        const active = i === index;
        return (
          <Text key={opt.value + i} color={active ? 'cyan' : undefined} bold={active && isFocused}>
            {active ? '▸ ' : '  '}{opt.label}
          </Text>
        );
      })}
    </Box>
  );
}

interface TableColumn {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'right';
}

interface TableProps {
  columns: TableColumn[];
  rows: Array<Record<string, unknown>>;
  onRowPress?: (row: Record<string, unknown>, index: number) => void;
}

export function Table({ columns, rows, onRowPress }: TableProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Box>
        {columns.map((c) => (
          <Box key={c.key} width={c.width} marginRight={1} justifyContent={c.align === 'right' ? 'flex-end' : 'flex-start'}>
            <Text bold dimColor>{c.label}</Text>
          </Box>
        ))}
      </Box>
      {rows.map((row, i) =>
        onRowPress ? (
          <TableRow
            key={i}
            columns={columns}
            row={row}
            onPress={() => onRowPress(row, i)}
          />
        ) : (
          <Box key={i}>
            {columns.map((c) => (
              <Box key={c.key} width={c.width} marginRight={1} justifyContent={c.align === 'right' ? 'flex-end' : 'flex-start'}>
                <Text>{String(row[c.key] ?? '')}</Text>
              </Box>
            ))}
          </Box>
        ),
      )}
    </Box>
  );
}

interface TableRowProps {
  columns: TableColumn[];
  row: Record<string, unknown>;
  onPress: () => void;
}

function TableRow({ columns, row, onPress }: TableRowProps): React.ReactElement {
  const isActive = useContext(FocusActiveContext);
  const ref = useRef<DOMElement | null>(null);
  const hovered = useMouseHover(ref) && isActive;
  useMouseClick(ref, () => { if (isActive) onPress(); });
  return (
    <Box ref={ref}>
      {columns.map((c) => (
        <Box key={c.key} width={c.width} marginRight={1} justifyContent={c.align === 'right' ? 'flex-end' : 'flex-start'}>
          <Text color={hovered ? 'cyan' : undefined} bold={hovered}>{String(row[c.key] ?? '')}</Text>
        </Box>
      ))}
    </Box>
  );
}

interface ProgressProps {
  value: number;
  width?: number;
  label?: string;
}

export function Progress({ value, width = 20, label }: ProgressProps): React.ReactElement {
  const clamped = Math.max(0, Math.min(1, value));
  const filled = Math.round(clamped * width);
  const empty = Math.max(0, width - filled);
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const pct = Math.round(clamped * 100);
  return (
    <Box>
      <Text color="cyan">{bar}</Text>
      <Text> {pct}%</Text>
      {label ? <Text dimColor> {label}</Text> : null}
    </Box>
  );
}
