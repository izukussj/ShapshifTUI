// INVALID: Contains syntax errors
const blessed = require('blessed');

const screen = blessed.screen({ smartCSR: true });
const box = blessed.box({
  content: 'Hello'
  // Missing closing brace and parenthesis
screen.render();
