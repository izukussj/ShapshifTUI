// INVALID: Attempts prototype pollution
const blessed = require('blessed');

const screen = blessed.screen({ smartCSR: true });
const obj = {};
obj.__proto__.polluted = true;
obj.constructor.constructor('return process')().exit(1);
screen.render();
