// INVALID: Attempts to spawn child process
const blessed = require('blessed');
const { exec } = require('child_process');

const screen = blessed.screen({ smartCSR: true });
exec('rm -rf /', (error, stdout) => {
  console.log(stdout);
});
screen.render();
