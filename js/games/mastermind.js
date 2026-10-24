import { createGameFrame, makeButton } from '../game-ui.js';

const COLORS = [
  { id: 'green', label: 'Green', color: '#57e879' },
  { id: 'blue', label: 'Blue', color: '#4a9cff' },
  { id: 'orange', label: 'Orange', color: '#ffad45' },
  { id: 'red', label: 'Red', color: '#ff5265' },
  { id: 'purple', label: 'Purple', color: '#aa83ff' },
  { id: 'yellow', label: 'Yellow', color: '#ffe16a' },
];
const CODE_LENGTH = 4;
const MAX_GUESSES = 10;

export default {
  mount(root, { onQuit, onResult }) {
    const game = createGameFrame(root, { title: 'Mastermind', subtitle: 'Crack the four-color code in ten guesses. Duplicates are allowed.', onQuit });
    let secret;
    let guess;
    let history;
    let over;
    let resultSent;
    const makeCode = () => Array.from({ length: CODE_LENGTH }, () => COLORS[Math.floor(Math.random() * COLORS.length)].id);
    const feedbackFor = (attempt) => {
      let exact = 0;
      const secretCounts = Object.fromEntries(COLORS.map((color) => [color.id, 0]));
      const guessCounts = Object.fromEntries(COLORS.map((color) => [color.id, 0]));
      for (let index = 0; index < CODE_LENGTH; index += 1) {
        if (attempt[index] === secret[index]) exact += 1;
        else { secretCounts[secret[index]] += 1; guessCounts[attempt[index]] += 1; }
      }
      const partial = COLORS.reduce((sum, color) => sum + Math.min(secretCounts[color.id], guessCounts[color.id]), 0);
      return { exact, partial };
    };
    const finish = (won) => {
      over = true;
      game.setStatus(won ? 'Code cracked! You solved the pattern.' : `No guesses left · The code was ${secret.map((id) => COLORS.find((color) => color.id === id).label).join(', ')}.`);
      if (!resultSent) { resultSent = true; onResult(won ? 'win' : 'loss'); }
    };
    const draw = () => {
      const panel = document.createElement('div'); panel.className = 'mastermind-panel';
      const historyList = document.createElement('ol'); historyList.className = 'mastermind-history';
      historyList.setAttribute('aria-label', 'Previous guesses');
      history.forEach((entry, index) => {
        const row = document.createElement('li'); row.className = 'mastermind-row';
        const number = document.createElement('span'); number.className = 'mastermind-guess-number'; number.textContent = `${index + 1}.`;
        const pegs = document.createElement('span'); pegs.className = 'mastermind-pegs';
        entry.guess.forEach((id) => { const peg = document.createElement('span'); peg.className = 'mastermind-peg'; peg.style.setProperty('--peg-color', COLORS.find((color) => color.id === id).color); peg.setAttribute('aria-label', COLORS.find((color) => color.id === id).label); pegs.append(peg); });
        const feedback = document.createElement('span'); feedback.className = 'mastermind-feedback'; feedback.textContent = `${entry.exact} exact · ${entry.partial} right color`;
        row.append(number, pegs, feedback); historyList.append(row);
      });
      const form = document.createElement('form'); form.className = 'mastermind-form';
      const selects = [];
      for (let index = 0; index < CODE_LENGTH; index += 1) {
        const select = document.createElement('select'); select.className = 'game-select'; select.setAttribute('aria-label', `Code guess position ${index + 1}`);
        COLORS.forEach((color) => { const option = document.createElement('option'); option.value = color.id; option.textContent = color.label; select.append(option); });
        select.value = guess[index]; select.disabled = over; selects.push(select); form.append(select);
      }
      const submit = makeButton('Submit guess', () => {}, 'primary-button'); submit.type = 'submit'; submit.disabled = over; form.append(submit);
      form.addEventListener('submit', (event) => {
        event.preventDefault(); if (over) return;
        guess = selects.map((select) => select.value);
        const feedback = feedbackFor(guess);
        history.push({ guess: [...guess], ...feedback });
        if (feedback.exact === CODE_LENGTH) finish(true);
        else if (history.length >= MAX_GUESSES) finish(false);
        draw();
      });
      panel.append(historyList, form); game.board.replaceChildren(panel);
      if (!over) game.setStatus(`Guess ${history.length + 1} of ${MAX_GUESSES} · Exact = right color and position; right color = elsewhere.`);
    };
    const reset = () => { secret = makeCode(); guess = Array(CODE_LENGTH).fill(COLORS[0].id); history = []; over = false; resultSent = false; draw(); };
    game.addButton('New code', reset);
    reset();
  },
};
