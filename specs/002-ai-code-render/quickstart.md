# Quickstart: AI-Generated Code Rendering

Get started with MoltUI's AI-powered TUI generation in minutes.

## Prerequisites

- Node.js 20 LTS or later
- An AI API key (OpenAI, Anthropic, or compatible provider)
- Terminal with UTF-8 and color support

## Installation

```bash
npm install moltui
```

## Basic Usage

### 1. Create a MoltUI Instance

```typescript
import { createMoltUI } from 'moltui';

const moltui = createMoltUI({
  ai: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4'
  }
});
```

### 2. Render Your First Interface

```typescript
const result = await moltui.render('Show a centered box with "Hello, MoltUI!"');

if (result.success) {
  console.log('Interface rendered successfully!');
  // The TUI is now displayed in your terminal
} else {
  console.error('Render failed:', result.error?.message);
}
```

### 3. Handle User Interactions

```typescript
const result = await moltui.render(
  'Create a form with name input and submit button'
);

if (result.success) {
  const ui = result.interface!;

  // Get all element IDs
  const elements = ui.getElementIds();
  console.log('Elements:', elements);

  // Listen for submit events
  ui.on('submit-btn', 'click', (event) => {
    console.log('Form submitted!', event.data);
  });

  // Listen for input changes
  ui.on('name-input', 'change', (event) => {
    console.log('Name changed to:', event.data.value);
  });
}
```

### 4. Update Interface Programmatically

```typescript
const result = await moltui.render('Show a progress bar at 0%');

if (result.success) {
  const ui = result.interface!;

  // Simulate progress updates
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    ui.update('progress-bar', { content: `${progress}%` });

    if (progress >= 100) {
      clearInterval(interval);
      ui.update('progress-bar', {
        content: 'Complete!',
        style: { fg: 'green' }
      });
    }
  }, 500);
}
```

### 5. Cleanup

```typescript
// Destroy the interface when done
moltui.destroy();
```

## Configuration Options

### AI Providers

```typescript
// OpenAI
createMoltUI({
  ai: { provider: 'openai', apiKey: '...', model: 'gpt-4' }
});

// Anthropic
createMoltUI({
  ai: { provider: 'anthropic', apiKey: '...', model: 'claude-3-opus' }
});

// Custom/Local
createMoltUI({
  ai: {
    provider: 'custom',
    apiKey: '...',
    model: 'local-model',
    baseUrl: 'http://localhost:8000/v1'
  }
});
```

### Retry Behavior

```typescript
createMoltUI({
  ai: { /* ... */ },
  retry: {
    maxAttempts: 5,           // Default: 3
    includeErrorContext: true // Include errors in retry prompts
  }
});
```

### Sandbox Settings

```typescript
createMoltUI({
  ai: { /* ... */ },
  sandbox: {
    memoryLimitMB: 128,  // Default: 64
    timeoutMs: 10000     // Default: 5000
  }
});
```

## Interface Description Tips

### Be Specific

```typescript
// Good - specific layout and content
await moltui.render(
  'Create a table with 3 columns: Name, Email, Status. Add 5 sample rows.'
);

// Less good - vague
await moltui.render('Make a table');
```

### Describe Layout

```typescript
// Specify positions and sizes
await moltui.render(
  'Show a sidebar on the left (20% width) with a menu, and main content area on the right'
);
```

### Request Interactivity

```typescript
// Ask for interactive elements
await moltui.render(
  'Create a todo list where I can add items with an input field and remove them by clicking'
);
```

## Error Handling

```typescript
const result = await moltui.render('...');

if (!result.success) {
  switch (result.error?.type) {
    case 'validation':
      console.error('Generated code was invalid:', result.error.details);
      break;
    case 'ai_service':
      console.error('AI service error:', result.error.message);
      break;
    case 'timeout':
      console.error('Generation timed out');
      break;
    case 'execution':
      console.error('Code execution failed:', result.error.message);
      break;
  }

  console.log(`Attempts made: ${result.attempts}`);
}
```

## Example: Interactive Dashboard

```typescript
import { createMoltUI } from 'moltui';

async function main() {
  const moltui = createMoltUI({
    ai: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4'
    }
  });

  const result = await moltui.render(`
    Create a dashboard with:
    - Header bar at top showing "System Monitor"
    - Left panel (30%) with a list of servers: web-1, web-2, db-1
    - Right panel (70%) showing CPU and Memory progress bars
    - Footer with "Press q to quit"
  `);

  if (result.success) {
    const ui = result.interface!;

    // Handle server selection
    ui.on('server-list', 'select', (event) => {
      const server = event.data.selected as string;

      // Update metrics display for selected server
      ui.update('cpu-bar', { content: `CPU: ${Math.random() * 100 | 0}%` });
      ui.update('mem-bar', { content: `Memory: ${Math.random() * 100 | 0}%` });
    });

    console.log('Dashboard running. Press q to quit.');
  } else {
    console.error('Failed to render dashboard:', result.error?.message);
    process.exit(1);
  }
}

main();
```

## Next Steps

- See [API Reference](./contracts/api.ts) for complete type definitions
- See [Data Model](./data-model.md) for entity definitions
- See [Research](./research.md) for technical decisions
