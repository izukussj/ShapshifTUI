import React from 'react';
import { Box, Text, useFocus, useInput } from 'ink';

interface ButtonProps {
  label: string;
  onPress: () => void;
}

/**
 * Minimal Ink button: focusable with Tab, fires onPress on Enter or Space.
 * Visible focus state via inverse colors.
 */
export function Button({ label, onPress }: ButtonProps): React.ReactElement {
  const { isFocused } = useFocus();

  useInput((input, key) => {
    if (!isFocused) return;
    if (key.return || input === ' ') {
      onPress();
    }
  });

  return (
    <Box
      borderStyle="round"
      borderColor={isFocused ? 'cyan' : 'gray'}
      paddingX={1}
    >
      <Text inverse={isFocused}>{label}</Text>
    </Box>
  );
}
