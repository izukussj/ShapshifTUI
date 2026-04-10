// Valid: Form with input field and button
const blessed = require('blessed');
const screen = blessed.screen({ smartCSR: true });

const form = blessed.form({
  top: 'center',
  left: 'center',
  width: '60%',
  height: '40%',
  border: { type: 'line' },
  label: ' User Form '
});

const input = blessed.input({
  parent: form,
  top: 2,
  left: 2,
  width: '90%',
  height: 3,
  border: { type: 'line' },
  label: ' Name ',
  inputOnFocus: true
});

const button = blessed.button({
  parent: form,
  top: 7,
  left: 2,
  width: 12,
  height: 3,
  content: 'Submit',
  border: { type: 'line' },
  style: {
    focus: { bg: 'blue' }
  }
});

button.on('press', () => {
  form.submit();
});

screen.append(form);
input.focus();
screen.key(['q', 'escape'], () => process.exit(0));
screen.render();
