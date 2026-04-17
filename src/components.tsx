import React, { useRef } from 'react';
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
