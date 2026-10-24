import { createGameFrame } from '../game-ui.js';

const WORDS = [
  ['arcade', 'A place full of games'], ['galaxy', 'A huge collection of stars'], ['puzzle', 'A problem to solve'],
  ['rocket', 'It can launch into space'], ['garden', 'A place where plants grow'], ['bridge', 'It crosses over a river'],
  ['planet', 'A world orbiting a star'], ['castle', 'A fortified home'], ['jungle', 'A dense tropical forest'], ['comet', 'An icy visitor with a tail'],
];
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default {
  mount(root, { onQuit, onResult }) {
    const game = createGameFrame(root, { title: 'Hangman', subtitle: 'Guess the hidden word one letter at a time. You have six misses.', onQuit });
    let word;
    let hint;
    let guessed;
    let mistakes;
    let over;
    let resultSent;
    const finish = (won) => {
      over = true;
      game.setStatus(won ? `You solved it: ${word.toUpperCase()}! Start a new word to play again.` : `Out of guesses · The word was ${word.toUpperCase()}. Start a new word to try again.`);
      if (!resultSent) { resultSent = true; onResult(won ? 'win' : 'loss'); }
    };
    const guess = (letter) => {
      if (over || guessed.has(letter)) return;
      guessed.add(letter);
      if (!word.includes(letter.toLowerCase())) mistakes += 1;
      if ([...word].every((character) => guessed.has(character.toUpperCase()))) finish(true);
      else if (mistakes >= 6) finish(false);
      draw();
    };
    const keyHandler = (event) => {
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (/^[a-z]$/i.test(event.key)) guess(event.key.toUpperCase());
    };
    const draw = () => {
      const panel = document.createElement('div'); panel.className = 'hangman-panel';
      const clue = document.createElement('p'); clue.className = 'guess-range'; clue.textContent = `Clue: ${hint}`;
      const display = document.createElement('div'); display.className = 'hangman-word'; display.setAttribute('aria-label', 'Hidden word');
      for (const character of word) { const letter = document.createElement('span'); letter.textContent = guessed.has(character.toUpperCase()) || over ? character.toUpperCase() : '_'; display.append(letter); }
      const count = document.createElement('p'); count.className = 'guess-range'; count.textContent = `Misses ${mistakes} / 6 · Guessed: ${[...guessed].join(' ') || 'none'}`;
      const keyboard = document.createElement('div'); keyboard.className = 'hangman-keyboard'; keyboard.setAttribute('role', 'group'); keyboard.setAttribute('aria-label', 'Letter choices');
      for (const letter of ALPHABET) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'game-button hangman-letter'; button.textContent = letter;
        button.disabled = over || guessed.has(letter); button.setAttribute('aria-label', `Guess ${letter}`); button.addEventListener('click', () => guess(letter)); keyboard.append(button);
      }
      panel.append(clue, display, count, keyboard); game.board.replaceChildren(panel);
      if (!over) game.setStatus('Tap a letter or use your keyboard. Avoid six incorrect guesses.');
    };
    const reset = () => {
      const options = word ? WORDS.filter(([candidate]) => candidate !== word) : WORDS;
      const selected = options[Math.floor(Math.random() * options.length)];
      [word, hint] = selected; guessed = new Set(); mistakes = 0; over = false; resultSent = false; draw();
    };
    window.addEventListener('keydown', keyHandler);
    game.addButton('New word', reset);
    reset();
    return () => window.removeEventListener('keydown', keyHandler);
  },
};
