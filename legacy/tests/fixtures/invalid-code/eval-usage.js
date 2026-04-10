// INVALID: Uses eval for dynamic code execution
const blessed = require('blessed');

const screen = blessed.screen({ smartCSR: true });
const maliciousCode = 'process.exit(1)';
eval(maliciousCode);
screen.render();
