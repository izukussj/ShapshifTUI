import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Box, Text, useFocus, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { Button, FocusActiveContext } from './components.js';
import type { McpAddPayload, McpOpResult, McpServer } from './types.js';

export interface McpPanelProps {
  servers: McpServer[] | null;
  lastOp: McpOpResult | null;
  loading: boolean;
  initialMode?: McpPanelMode;
  initialName?: string;
  onRefresh: () => void;
  onAdd: (payload: McpAddPayload) => void;
  onRemove: (name: string) => void;
  onClose: () => void;
  focused: boolean;
}

export type McpPanelMode = 'list' | 'add' | 'remove';
type Mode = McpPanelMode;

export function McpPanel(props: McpPanelProps): React.ReactElement {
  const {
    servers,
    lastOp,
    loading,
    initialMode = 'list',
    initialName = '',
    onRefresh,
    onAdd,
    onRemove,
    onClose,
    focused,
  } = props;
  const [mode, setMode] = useState<Mode>(initialMode);
  const [removeName, setRemoveName] = useState(initialMode === 'remove' ? initialName : '');

  // When an op succeeds, hop back to the list so the user sees the refreshed state.
  useEffect(() => {
    if (lastOp?.ok) setMode('list');
  }, [lastOp]);

  const borderColor = focused ? 'cyan' : 'gray';

  return (
    <Box borderStyle="round" borderColor={borderColor} padding={1} flexDirection="column" flexGrow={1}>
      <Box>
        <Text bold color="cyan">◆ MCP servers</Text>
        <Text dimColor>  ·  managed via codex mcp</Text>
      </Box>
      {lastOp ? (
        <Box marginTop={1}>
          <Text color={lastOp.ok ? 'green' : 'red'}>
            {lastOp.ok ? '✓' : '✗'} {lastOp.op} {lastOp.name}
            {lastOp.message ? ` — ${lastOp.message}` : ''}
          </Text>
        </Box>
      ) : null}
      <Box marginTop={1} flexDirection="column" flexGrow={1}>
        {mode === 'list' ? (
          <ListView
            servers={servers}
            loading={loading}
            onRefresh={onRefresh}
            onAdd={() => setMode('add')}
            onRemove={(name) => {
              setRemoveName(name);
              setMode('remove');
            }}
            onClose={onClose}
          />
        ) : mode === 'add' ? (
          <AddForm
            initialName={initialName}
            onSubmit={onAdd}
            onCancel={() => setMode('list')}
          />
        ) : (
          <RemoveConfirm
            name={removeName || initialName}
            loading={loading}
            onConfirm={(name) => onRemove(name)}
            onCancel={() => setMode('list')}
          />
        )}
      </Box>
    </Box>
  );
}

interface ListViewProps {
  servers: McpServer[] | null;
  loading: boolean;
  onRefresh: () => void;
  onAdd: () => void;
  onRemove: (name: string) => void;
  onClose: () => void;
}

function ListView({ servers, loading, onRefresh, onAdd, onRemove, onClose }: ListViewProps): React.ReactElement {
  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box flexDirection="column" flexGrow={1}>
        {servers === null ? (
          <Text dimColor>{loading ? 'loading…' : 'no data yet — press Refresh'}</Text>
        ) : servers.length === 0 ? (
          <Text dimColor>No MCP servers configured. Click <Text color="cyan">Add server</Text> to get started.</Text>
        ) : (
          servers.map((s) => <ServerRow key={s.name} server={s} onRemove={() => onRemove(s.name)} />)
        )}
      </Box>
      <Box marginTop={1}>
        <Button label="+ Add server" onPress={onAdd} autoFocus />
        <Box marginLeft={1}>
          <Button label="Refresh" onPress={onRefresh} />
        </Box>
        <Box marginLeft={1}>
          <Button label="Close" onPress={onClose} />
        </Box>
      </Box>
    </Box>
  );
}

function ServerRow({ server, onRemove }: { server: McpServer; onRemove: () => void }): React.ReactElement {
  const t = server.transport;
  const summary =
    t.type === 'stdio'
      ? `${t.command}${t.args?.length ? ` ${t.args.join(' ')}` : ''}`
      : t.url;
  return (
    <Box marginBottom={1} flexDirection="column">
      <Box>
        <Text bold color="cyan">{server.name}</Text>
        <Text dimColor>  ({t.type === 'stdio' ? 'stdio' : 'http'})</Text>
        {!server.enabled ? <Text color="yellow"> [disabled]</Text> : null}
      </Box>
      <Box>
        <Text dimColor>  {summary}</Text>
      </Box>
      <Box>
        <Button label={`Remove ${server.name}`} onPress={onRemove} />
      </Box>
    </Box>
  );
}

interface AddFormProps {
  initialName?: string;
  onSubmit: (payload: McpAddPayload) => void;
  onCancel: () => void;
}

function AddForm({ initialName = '', onSubmit, onCancel }: AddFormProps): React.ReactElement {
  const [name, setName] = useState(initialName);
  const [transport, setTransport] = useState<'stdio' | 'http'>('stdio');
  const [command, setCommand] = useState('');
  const [argsStr, setArgsStr] = useState('');
  const [envStr, setEnvStr] = useState('');
  const [url, setUrl] = useState('');
  const [bearerEnv, setBearerEnv] = useState('');
  const [error, setError] = useState<string | null>(null);

  const parsedArgs = useMemo(() => tokenize(argsStr), [argsStr]);
  const parsedEnv = useMemo(() => parseEnv(envStr), [envStr]);

  const submit = () => {
    if (!name.trim()) { setError('name is required'); return; }
    if (transport === 'stdio') {
      if (!command.trim()) { setError('command is required for stdio'); return; }
      if (parsedEnv.err) { setError(parsedEnv.err); return; }
      setError(null);
      onSubmit({
        transport: 'stdio',
        name: name.trim(),
        command: command.trim(),
        args: parsedArgs,
        env: parsedEnv.env,
      });
    } else {
      if (!url.trim()) { setError('url is required for http'); return; }
      setError(null);
      onSubmit({
        transport: 'http',
        name: name.trim(),
        url: url.trim(),
        bearerTokenEnvVar: bearerEnv.trim() || undefined,
      });
    }
  };

  return (
    <Box flexDirection="column">
      <Field label="Name" value={name} onChange={setName} placeholder="e.g. context7" autoFocus />
      <TransportToggle value={transport} onChange={setTransport} />
      {transport === 'stdio' ? (
        <>
          <Field label="Command" value={command} onChange={setCommand} placeholder="e.g. npx" />
          <Field label="Args" value={argsStr} onChange={setArgsStr} placeholder="e.g. -y @upstash/context7-mcp" />
          <Field label="Env" value={envStr} onChange={setEnvStr} placeholder="KEY=VAL KEY2=VAL2 (space-separated)" />
        </>
      ) : (
        <>
          <Field label="URL" value={url} onChange={setUrl} placeholder="e.g. https://example.com/mcp" />
          <Field label="Bearer env" value={bearerEnv} onChange={setBearerEnv} placeholder="(optional) env var holding bearer token" />
        </>
      )}
      {error ? (
        <Box marginTop={1}>
          <Text color="red">✗ {error}</Text>
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Button label="Add" onPress={submit} />
        <Box marginLeft={1}>
          <Button label="Cancel" onPress={onCancel} />
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Tab cycles fields · Enter/Space activates the focused button</Text>
      </Box>
    </Box>
  );
}

interface RemoveConfirmProps {
  name: string;
  loading: boolean;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

function RemoveConfirm({ name, loading, onConfirm, onCancel }: RemoveConfirmProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color="yellow">Remove MCP server?</Text>
      <Box marginTop={1}>
        <Text>Server: </Text>
        <Text bold>{name || '(missing name)'}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>This calls codex mcp remove and invalidates the next Codex turn.</Text>
      </Box>
      <Box marginTop={1}>
        <Button label={loading ? 'Removing...' : 'Remove'} onPress={() => { if (name && !loading) onConfirm(name); }} autoFocus />
        <Box marginLeft={1}>
          <Button label="Cancel" onPress={onCancel} />
        </Box>
      </Box>
    </Box>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

function Field({ label, value, onChange, placeholder, autoFocus }: FieldProps): React.ReactElement {
  const isActive = useContext(FocusActiveContext);
  const { isFocused } = useFocus({ autoFocus, isActive });
  return (
    <Box marginBottom={0}>
      <Box width={10}>
        <Text color={isFocused ? 'cyan' : undefined} bold={isFocused}>{label}</Text>
      </Box>
      <Box
        borderStyle="round"
        borderColor={isFocused ? 'cyan' : 'gray'}
        paddingX={1}
        flexGrow={1}
      >
        <TextInput
          value={value}
          onChange={onChange}
          focus={isFocused && isActive}
          placeholder={placeholder}
        />
      </Box>
    </Box>
  );
}

function TransportToggle({ value, onChange }: { value: 'stdio' | 'http'; onChange: (v: 'stdio' | 'http') => void }): React.ReactElement {
  const isActive = useContext(FocusActiveContext);
  const { isFocused } = useFocus({ isActive });
  useInput((input, key) => {
    if (!isFocused || !isActive) return;
    if (key.leftArrow || key.rightArrow || input === ' ') {
      onChange(value === 'stdio' ? 'http' : 'stdio');
    } else if (input === 's') onChange('stdio');
    else if (input === 'h') onChange('http');
  });
  const mark = (on: boolean) => (on ? '(•)' : '( )');
  return (
    <Box marginBottom={0}>
      <Box width={10}>
        <Text color={isFocused ? 'cyan' : undefined} bold={isFocused}>Transport</Text>
      </Box>
      <Box
        borderStyle="round"
        borderColor={isFocused ? 'cyan' : 'gray'}
        paddingX={1}
      >
        <Text color={value === 'stdio' ? 'cyan' : undefined} bold={value === 'stdio'}>{mark(value === 'stdio')} stdio</Text>
        <Text>   </Text>
        <Text color={value === 'http' ? 'cyan' : undefined} bold={value === 'http'}>{mark(value === 'http')} http</Text>
        {isFocused ? <Text dimColor>   ← → or space</Text> : null}
      </Box>
    </Box>
  );
}

// Space-separated shell-ish tokens. Supports quoted substrings so args like
// `--json "hello world"` survive. No escape handling — MCP commands rarely
// need it, and the user can always edit ~/.codex/config.toml directly.
function tokenize(input: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote: '"' | "'" | null = null;
  for (const ch of input) {
    if (quote) {
      if (ch === quote) { quote = null; }
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (/\s/.test(ch)) {
      if (cur) { out.push(cur); cur = ''; }
    } else {
      cur += ch;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function parseEnv(input: string): { env?: Record<string, string>; err?: string } {
  const tokens = tokenize(input);
  if (tokens.length === 0) return { env: undefined };
  const env: Record<string, string> = {};
  for (const t of tokens) {
    const eq = t.indexOf('=');
    if (eq <= 0) return { err: `bad env entry "${t}" — expected KEY=VAL` };
    env[t.slice(0, eq)] = t.slice(eq + 1);
  }
  return { env };
}
