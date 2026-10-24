export function makeButton(label, onClick, className = 'game-button') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

export function createGameFrame(root, { title, subtitle, onQuit }) {
  const frame = document.createElement('section');
  frame.className = 'game-frame';

  const header = document.createElement('div');
  header.className = 'game-frame-header';
  const heading = document.createElement('div');
  heading.className = 'game-frame-heading';
  const titleElement = document.createElement('h1');
  titleElement.textContent = title;
  const description = document.createElement('p');
  description.textContent = subtitle;
  heading.append(titleElement, description);
  header.append(heading, makeButton('← Library', onQuit, 'back-button'));

  const controls = document.createElement('div');
  controls.className = 'game-toolbar';
  controls.setAttribute('aria-label', 'Game options');
  const board = document.createElement('div');
  board.className = 'game-board-area';
  const status = document.createElement('p');
  status.className = 'game-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  frame.append(header, controls, board, status);
  root.replaceChildren(frame);
  return {
    controls,
    board,
    status,
    setStatus(message) { status.textContent = message; },
    addButton(label, onClick) { controls.append(makeButton(label, onClick)); },
  };
}

export function makeSelect(label, options, onChange) {
  const select = document.createElement('select');
  select.className = 'game-select';
  select.setAttribute('aria-label', label);
  for (const [value, text] of options) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.append(option);
  }
  select.addEventListener('change', () => onChange(select.value));
  return select;
}



export function makeField(labelText, control, helpText = '') {
  const field = document.createElement('label');
  field.className = 'setting-field';
  const label = document.createElement('span');
  label.textContent = labelText;
  field.append(label, control);
  if (helpText) {
    const help = document.createElement('span');
    help.className = 'setting-help';
    help.textContent = helpText;
    field.append(help);
  }
  return field;
}

export function makeSetupPanel({ title, description, fields, onStart, startLabel = 'Start match' }) {
  const panel = document.createElement('section');
  panel.className = 'match-setup';
  const heading = document.createElement('h2');
  heading.textContent = title;
  const details = document.createElement('p');
  details.textContent = description;
  const settings = document.createElement('div');
  settings.className = 'setup-fields';
  for (const field of fields) settings.append(makeField(field.label, field.control, field.help));
  panel.append(heading, details, settings, makeButton(startLabel, onStart, 'primary-button'));
  return panel;
}
