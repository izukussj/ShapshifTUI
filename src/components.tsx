import React, { useRef, useState } from 'react';
import { Box, Text, useFocus, useInput } from 'ink';
import type { DOMElement } from 'ink';
import { useMouseClick, useMouseHover } from './mouse.js';

interface ButtonProps {
  label: string;
  onPress: () => void;
}

export function Button({ label, onPress }: ButtonProps): React.ReactElement {
  const { isFocused } = useFocus();
  const ref = useRef<DOMElement | null>(null);
  const hovered = useMouseHover(ref);
  useMouseClick(ref, onPress);

  useInput((input, key) => {
    if (!isFocused) return;
    if (key.return || input === ' ') {
      onPress();
    }
  });

  const active = isFocused || hovered;

  return (
    <Box
      ref={ref}
      borderStyle="round"
      borderColor={active ? 'cyan' : 'gray'}
      paddingX={1}
    >
      <Text inverse={isFocused} bold={hovered && !isFocused}>{label}</Text>
    </Box>
  );
}

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

export function Checkbox({ label, checked, onChange }: CheckboxProps): React.ReactElement {
  const { isFocused } = useFocus();
  const ref = useRef<DOMElement | null>(null);
  const hovered = useMouseHover(ref);
  useMouseClick(ref, () => onChange(!checked));

  useInput((input, key) => {
    if (!isFocused) return;
    if (key.return || input === ' ') onChange(!checked);
  });

  const active = isFocused || hovered;
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
  const { isFocused } = useFocus();
  const normalized: SelectOption[] = options.map((o) =>
    typeof o === 'string' ? { label: o, value: o } : o,
  );
  const [index, setIndex] = useState(
    Math.min(Math.max(0, initialIndex), Math.max(0, normalized.length - 1)),
  );

  useInput((_input, key) => {
    if (!isFocused) return;
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
  const ref = useRef<DOMElement | null>(null);
  const hovered = useMouseHover(ref);
  useMouseClick(ref, onPress);
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
