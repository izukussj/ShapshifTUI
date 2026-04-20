import React from 'react';
import { Box, Text } from 'ink';
import { Button } from './components.js';

interface PluginGuidePanelProps {
  focused: boolean;
  onClose: () => void;
}

export function PluginGuidePanel({ focused, onClose }: PluginGuidePanelProps): React.ReactElement {
  const borderStyle = focused ? 'bold' : 'round';
  const borderColor = focused ? 'cyan' : 'gray';

  return (
    <Box borderStyle={borderStyle} borderColor={borderColor} padding={1} flexDirection="column" flexGrow={1}>
      <Box>
        <Text bold color="cyan">◆ Codex plugins</Text>
        <Text dimColor>  ·  configure in Codex</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text>Plugin setup is handled by Codex, not ShapeshifTUI.</Text>
        <Text dimColor>Open Codex in another terminal, install or connect the plugin there, then return here.</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text bold>Suggested flow</Text>
        <Text color="green">1. Open a normal terminal.</Text>
        <Text color="green">2. Run Codex and configure the plugin from there.</Text>
        <Text color="green">3. Restart or refresh ShapeshifTUI after setup.</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          For MCP servers, use <Text color="cyan">/mcp list</Text>, <Text color="cyan">/mcp add</Text>, or <Text color="cyan">/mcp remove</Text> here.
        </Text>
      </Box>
      <Box marginTop={1}>
        <Button label="Close" onPress={onClose} autoFocus />
      </Box>
    </Box>
  );
}
