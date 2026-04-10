// Valid: Table with data
const blessed = require('blessed');
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
    ['Bob', '25', 'San Francisco'],
    ['Charlie', '35', 'Chicago']
  ]
});
screen.append(table);
screen.key(['q', 'escape'], () => process.exit(0));
screen.render();
