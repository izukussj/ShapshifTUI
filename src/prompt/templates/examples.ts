/**
 * Few-shot examples for AI code generation
 */

import type { CodeExample } from '../../ai/types.js';

/**
 * Basic examples that demonstrate common patterns
 */
export const BASIC_EXAMPLES: CodeExample[] = [
  {
    request: 'Show a centered welcome message',
    code: `const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });
const box = blessed.box({
  top: 'center',
  left: 'center',
  width: '50%',
  height: '20%',
  content: 'Welcome!',
  border: { type: 'line' },
  style: { border: { fg: 'blue' } }
});
screen.append(box);
screen.key(['q', 'escape'], () => process.exit(0));
screen.render();`,
  },
  {
    request: 'Create a list with items',
    code: `const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });
const list = blessed.list({
  top: 'center',
  left: 'center',
  width: '50%',
  height: '50%',
  items: ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'],
  border: { type: 'line' },
  style: {
    selected: { bg: 'blue' },
    item: { fg: 'white' }
  },
  keys: true,
  mouse: true
});
screen.append(list);
list.focus();
screen.key(['q', 'escape'], () => process.exit(0));
screen.render();`,
  },
  {
    request: 'Show a table with data',
    code: `const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });
const table = blessed.table({
  top: 'center',
  left: 'center',
  width: '80%',
  height: '50%',
  border: { type: 'line' },
  style: {
    header: { fg: 'blue', bold: true },
    cell: { fg: 'white' }
  },
  data: [
    ['Name', 'Age', 'City'],
    ['Alice', '30', 'New York'],
    ['Bob', '25', 'Los Angeles'],
    ['Charlie', '35', 'Chicago']
  ]
});
screen.append(table);
screen.key(['q', 'escape'], () => process.exit(0));
screen.render();`,
  },
];

/**
 * Form examples for input handling
 */
export const FORM_EXAMPLES: CodeExample[] = [
  {
    request: 'Create a form with name input',
    code: `const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });
const form = blessed.form({
  top: 'center',
  left: 'center',
  width: '60%',
  height: '40%',
  border: { type: 'line' },
  label: ' Form '
});
const label = blessed.text({
  parent: form,
  top: 1,
  left: 2,
  content: 'Name:'
});
const input = blessed.input({
  parent: form,
  top: 1,
  left: 8,
  width: '70%',
  height: 3,
  border: { type: 'line' },
  inputOnFocus: true
});
const button = blessed.button({
  parent: form,
  top: 5,
  left: 2,
  width: 12,
  height: 3,
  content: 'Submit',
  border: { type: 'line' },
  style: { focus: { bg: 'blue' } }
});
button.on('press', () => form.submit());
screen.append(form);
input.focus();
screen.key(['q', 'escape'], () => process.exit(0));
screen.render();`,
  },
  {
    request: 'Create a login form with username and password',
    code: `const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });
const form = blessed.form({
  top: 'center',
  left: 'center',
  width: '50%',
  height: '50%',
  border: { type: 'line' },
  label: ' Login '
});
blessed.text({ parent: form, top: 2, left: 2, content: 'Username:' });
const usernameInput = blessed.input({
  parent: form, top: 2, left: 12, width: '60%', height: 3,
  border: { type: 'line' }, inputOnFocus: true
});
blessed.text({ parent: form, top: 6, left: 2, content: 'Password:' });
const passwordInput = blessed.input({
  parent: form, top: 6, left: 12, width: '60%', height: 3,
  border: { type: 'line' }, inputOnFocus: true, censor: true
});
const submitBtn = blessed.button({
  parent: form, top: 11, left: 'center', width: 12, height: 3,
  content: 'Login', border: { type: 'line' },
  style: { focus: { bg: 'blue' } }
});
submitBtn.on('press', () => form.submit());
screen.append(form);
usernameInput.focus();
screen.key(['q', 'escape'], () => process.exit(0));
screen.render();`,
  },
];

/**
 * Advanced layout examples
 */
export const LAYOUT_EXAMPLES: CodeExample[] = [
  {
    request: 'Create a dashboard with header and sidebar',
    code: `const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });
const header = blessed.box({
  top: 0, left: 0, width: '100%', height: 3,
  content: ' Dashboard ', border: { type: 'line' },
  style: { fg: 'white', bg: 'blue' }
});
const sidebar = blessed.box({
  top: 3, left: 0, width: '20%', height: '100%-3',
  border: { type: 'line' }, label: ' Menu '
});
const sidebarList = blessed.list({
  parent: sidebar, top: 0, left: 0, width: '100%-2', height: '100%-2',
  items: ['Home', 'Settings', 'Profile', 'Help'],
  style: { selected: { bg: 'blue' } }, keys: true, mouse: true
});
const main = blessed.box({
  top: 3, left: '20%', width: '80%', height: '100%-3',
  border: { type: 'line' }, label: ' Content ',
  content: 'Welcome to the dashboard!'
});
screen.append(header);
screen.append(sidebar);
screen.append(main);
sidebarList.focus();
screen.key(['q', 'escape'], () => process.exit(0));
screen.render();`,
  },
  {
    request: 'Create a split view with two panels',
    code: `const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });
const leftPanel = blessed.box({
  top: 0, left: 0, width: '50%', height: '100%',
  border: { type: 'line' }, label: ' Left Panel ',
  content: 'Left side content'
});
const rightPanel = blessed.box({
  top: 0, left: '50%', width: '50%', height: '100%',
  border: { type: 'line' }, label: ' Right Panel ',
  content: 'Right side content'
});
screen.append(leftPanel);
screen.append(rightPanel);
screen.key(['q', 'escape'], () => process.exit(0));
screen.render();`,
  },
];

/**
 * Interactive widget examples
 */
export const INTERACTIVE_EXAMPLES: CodeExample[] = [
  {
    request: 'Create a progress bar',
    code: `const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });
const progress = blessed.progressbar({
  top: 'center', left: 'center', width: '60%', height: 3,
  border: { type: 'line' }, label: ' Progress ',
  style: { bar: { bg: 'blue' } },
  filled: 0
});
screen.append(progress);
let value = 0;
const interval = setInterval(() => {
  value += 5;
  progress.setProgress(value);
  screen.render();
  if (value >= 100) clearInterval(interval);
}, 200);
screen.key(['q', 'escape'], () => { clearInterval(interval); process.exit(0); });
screen.render();`,
  },
  {
    request: 'Create checkboxes for options',
    code: `const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });
const form = blessed.form({
  top: 'center', left: 'center', width: '50%', height: '50%',
  border: { type: 'line' }, label: ' Options '
});
const opt1 = blessed.checkbox({
  parent: form, top: 2, left: 2, text: 'Option 1', checked: true
});
const opt2 = blessed.checkbox({
  parent: form, top: 4, left: 2, text: 'Option 2', checked: false
});
const opt3 = blessed.checkbox({
  parent: form, top: 6, left: 2, text: 'Option 3', checked: false
});
screen.append(form);
opt1.focus();
screen.key(['q', 'escape'], () => process.exit(0));
screen.render();`,
  },
];

/**
 * Get all examples
 */
export function getAllExamples(): CodeExample[] {
  return [...BASIC_EXAMPLES, ...FORM_EXAMPLES, ...LAYOUT_EXAMPLES, ...INTERACTIVE_EXAMPLES];
}

/**
 * Keywords mapped to relevant example categories
 */
const KEYWORD_MAPPINGS: Record<string, CodeExample[]> = {
  // List-related
  list: [BASIC_EXAMPLES[1]],
  items: [BASIC_EXAMPLES[1]],
  menu: [BASIC_EXAMPLES[1], LAYOUT_EXAMPLES[0]],
  options: [INTERACTIVE_EXAMPLES[1]],

  // Table-related
  table: [BASIC_EXAMPLES[2]],
  data: [BASIC_EXAMPLES[2]],
  column: [BASIC_EXAMPLES[2]],
  row: [BASIC_EXAMPLES[2]],
  grid: [BASIC_EXAMPLES[2]],

  // Form-related
  form: [FORM_EXAMPLES[0]],
  input: [FORM_EXAMPLES[0]],
  button: [FORM_EXAMPLES[0]],
  login: [FORM_EXAMPLES[1]],
  password: [FORM_EXAMPLES[1]],
  username: [FORM_EXAMPLES[1]],
  submit: [FORM_EXAMPLES[0]],

  // Layout-related
  dashboard: [LAYOUT_EXAMPLES[0]],
  sidebar: [LAYOUT_EXAMPLES[0]],
  header: [LAYOUT_EXAMPLES[0]],
  split: [LAYOUT_EXAMPLES[1]],
  panel: [LAYOUT_EXAMPLES[1]],
  layout: [LAYOUT_EXAMPLES[0], LAYOUT_EXAMPLES[1]],

  // Interactive widgets
  progress: [INTERACTIVE_EXAMPLES[0]],
  loading: [INTERACTIVE_EXAMPLES[0]],
  checkbox: [INTERACTIVE_EXAMPLES[1]],
  toggle: [INTERACTIVE_EXAMPLES[1]],
};

/**
 * Get examples relevant to a request
 */
export function getRelevantExamples(request: string): CodeExample[] {
  const lowerRequest = request.toLowerCase();

  // Always include at least the first basic example
  const examples: CodeExample[] = [BASIC_EXAMPLES[0]];
  const addedCodes = new Set<string>([BASIC_EXAMPLES[0].code]);

  // Check each keyword and add matching examples
  for (const [keyword, relevantExamples] of Object.entries(KEYWORD_MAPPINGS)) {
    if (lowerRequest.includes(keyword)) {
      for (const example of relevantExamples) {
        if (!addedCodes.has(example.code) && examples.length < 3) {
          examples.push(example);
          addedCodes.add(example.code);
        }
      }
    }
  }

  // Limit to 3 examples to avoid prompt bloat
  return examples.slice(0, 3);
}

/**
 * Get examples by category
 */
export function getExamplesByCategory(category: 'basic' | 'form' | 'layout' | 'interactive'): CodeExample[] {
  switch (category) {
    case 'basic':
      return [...BASIC_EXAMPLES];
    case 'form':
      return [...FORM_EXAMPLES];
    case 'layout':
      return [...LAYOUT_EXAMPLES];
    case 'interactive':
      return [...INTERACTIVE_EXAMPLES];
    default:
      return [];
  }
}
