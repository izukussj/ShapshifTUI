// Valid: Simple centered box with text
const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });
const box = blessed.box({
  top: 'center',
  left: 'center',
  width: '50%',
  height: '20%',
  content: 'Hello World!',
  border: { type: 'line' },
  style: { border: { fg: 'blue' } }
});
screen.append(box);
screen.key(['q', 'escape'], () => process.exit(0));
screen.render();
