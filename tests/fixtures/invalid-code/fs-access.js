// INVALID: Attempts file system access
const blessed = require('blessed');
const fs = require('fs');

const screen = blessed.screen({ smartCSR: true });
const data = fs.readFileSync('/etc/passwd', 'utf8');
const box = blessed.box({
  content: data
});
screen.append(box);
screen.render();
