import React from 'react';
import { Box, Text } from 'ink';
import { Button } from './components.js';
import type { SavedViewSummary } from './types.js';

export interface SavedViewsPanelProps {
  views: SavedViewSummary[] | null;
  loading: boolean;
  focused: boolean;
  availableRows: number;
  action: 'load' | 'fork';
  onRefresh: () => void;
  onSelect: (name: string) => void;
  onDelete: (name: string) => void;
  onClose: () => void;
}

export function SavedViewsPanel({
  views,
  loading,
  focused,
  availableRows,
  action,
  onRefresh,
  onSelect,
  onDelete,
  onClose,
}: SavedViewsPanelProps): React.ReactElement {
  const borderStyle = focused ? 'bold' : 'round';
  const borderColor = focused ? 'cyan' : 'gray';
  const rows = views ?? [];

  const frameRows = Math.max(5, availableRows);

  return (
    <Box borderStyle={borderStyle} borderColor={borderColor} padding={1} flexDirection="column" flexGrow={1} height={frameRows} overflowY="hidden">
      <Box>
        <Text bold color="cyan">◆ Saves</Text>
        <Text dimColor>
          {loading
            ? '  ·  loading...'
            : action === 'fork'
              ? '  ·  start from a saved point'
              : '  ·  load a saved state'}
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column" flexGrow={1}>
        {views === null ? (
          <Text dimColor>{loading ? 'loading...' : 'no data yet'}</Text>
        ) : rows.length === 0 ? (
          <Box flexDirection="column">
            <Text dimColor>No saved views for this directory.</Text>
            <Text dimColor>Use /save &lt;name&gt; after a view is rendered.</Text>
          </Box>
        ) : (
          rows.map((view) => (
            <SavedViewRow
              key={view.name}
              view={view}
              action={action}
              onSelect={() => onSelect(view.name)}
              onDelete={() => onDelete(view.name)}
            />
          ))
        )}
      </Box>
      <Box marginTop={1}>
        <Button label="Refresh" onPress={onRefresh} autoFocus />
        <Box marginLeft={1}>
          <Button label="Close" onPress={onClose} />
        </Box>
      </Box>
    </Box>
  );
}

function SavedViewRow({
  view,
  action,
  onSelect,
  onDelete,
}: {
  view: SavedViewSummary;
  action: 'load' | 'fork';
  onSelect: () => void;
  onDelete: () => void;
}): React.ReactElement {
  return (
    <Box marginBottom={1} flexDirection="column">
      <Box>
        <Box width={28}>
          <Text bold wrap="truncate-end">{view.name}</Text>
        </Box>
        <Box width={13}>
          <Text dimColor>{formatDate(view.savedAt)}</Text>
        </Box>
        <Text dimColor>{view.turns} messages</Text>
      </Box>
      <Box>
        <Button label={action === 'fork' ? 'Start from save' : 'Load'} onPress={onSelect} />
        <Box marginLeft={1}>
          <Button label="Delete" onPress={onDelete} />
        </Box>
      </Box>
    </Box>
  );
}

function formatDate(value: number | null): string {
  if (!value) return 'unknown';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return d.toISOString().slice(0, 10);
}
