import { createGameFrame, makeButton } from '../game-ui.js';

export default {
  mount(root, { onQuit, onResult }) {
    const game = createGameFrame(root, { title: 'Number Guess', subtitle: 'Find the hidden number from 1 to 100 in seven tries.', onQuit });
    let target;
    let attempts;
    let over;
    let resultSent;
    let message;
    const draw = () => {
      const panel = document.createElement('div'); panel.className = 'guess-panel';
      const range = document.createElement('p'); range.className = 'guess-range'; range.textContent = 'A secret number is waiting between 1 and 100';
      const counter = document.createElement('div'); counter.className = 'guess-count'; counter.textContent = `${Math.max(0, 7 - attempts)}`;
      const label = document.createElement('span'); label.className = 'guess-range'; label.textContent = 'guesses left';
      const form = document.createElement('form'); form.className = 'guess-form';
      const input = document.createElement('input'); input.className = 'guess-input'; input.type = 'number'; input.min = '1'; input.max = '100'; input.step = '1'; input.placeholder = 'Enter a number'; input.required = true; input.disabled = over; input.setAttribute('aria-label', 'Your guess, from 1 to 100');
      const submit = document.createElement('button'); submit.className = 'primary-button'; submit.type = 'submit'; submit.textContent = 'Guess'; submit.disabled = over;
      form.append(input, submit);
      const hint = document.createElement('p'); hint.className = 'guess-range'; hint.textContent = message;
      form.addEventListener('submit', (event) => { event.preventDefault(); const value = Number(input.value); if (!Number.isInteger(value) || value < 1 || value > 100) { input.setCustomValidity('Enter a whole number from 1 to 100.'); input.reportValidity(); input.setCustomValidity(''); return; } guess(value); });
      panel.append(range, counter, label, form, hint); game.board.replaceChildren(panel);
      if (!over) game.setStatus('Enter a whole number and use the higher-or-lower clue.');
    };
    const guess = (value) => {
      if (over) return;
      attempts += 1;
      if (value === target) { over = true; message = `Correct! The number was ${target}.`; if (!resultSent) { resultSent = true; onResult('win'); } }
      else if (attempts >= 7) { over = true; message = `Out of guesses. The number was ${target}.`; if (!resultSent) { resultSent = true; onResult('loss'); } }
      else message = value < target ? 'Too low — go higher.' : 'Too high — go lower.';
      draw();
    };
    const reset = () => { target = Math.floor(Math.random() * 100) + 1; attempts = 0; over = false; resultSent = false; message = 'You have seven guesses.'; draw(); };
    game.addButton('New number', reset);
    reset();
  },
};
