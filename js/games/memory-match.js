import { createGameFrame } from '../game-ui.js';

const symbols = ['🍋','🍒','🍇','🍉','🥝','🍊','🍍','🍓'];

export default {
  mount(root, { onQuit, onResult }) {
    const game = createGameFrame(root, { title: 'Memory Match', subtitle: 'Find all eight pairs. Fewer turns means a sharper memory.', onQuit });
    let deck;
    let flipped;
    let matched;
    let moves;
    let locked;
    let over;
    let resultSent;
    let timer = null;
    const shuffle = (items) => { for (let i = items.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; } return items; };
    const draw = () => {
      const grid = document.createElement('div');
      grid.className = 'memory-grid';
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', 'Memory cards');
      deck.forEach((symbol, index) => {
        const card = document.createElement('button');
        card.type = 'button';
        const faceUp = flipped.includes(index) || matched.has(index);
        card.className = `memory-card ${faceUp ? 'face-up' : ''} ${matched.has(index) ? 'matched' : ''}`;
        card.textContent = faceUp ? symbol : '?';
        card.setAttribute('aria-label', `Card ${index + 1}, ${matched.has(index) ? 'matched' : faceUp ? symbol : 'face down'}`);
        card.disabled = locked || over || faceUp;
        card.addEventListener('click', () => pick(index));
        grid.append(card);
      });
      game.board.replaceChildren(grid);
      if (!over) game.setStatus(`Moves ${moves} · Pairs ${matched.size / 2} / 8`);
    };
    const pick = (index) => {
      if (locked || over || flipped.includes(index) || matched.has(index)) return;
      flipped.push(index);
      if (flipped.length === 2) {
        moves += 1;
        if (deck[flipped[0]] === deck[flipped[1]]) {
          matched.add(flipped[0]); matched.add(flipped[1]); flipped = [];
          if (matched.size === deck.length) { over = true; if (!resultSent) { resultSent = true; onResult('win'); } }
        } else {
          locked = true;
          draw();
          timer = setTimeout(() => { flipped = []; locked = false; draw(); }, 700);
          return;
        }
      }
      draw();
      if (over) game.setStatus(`All pairs found in ${moves} moves. Nice memory!`);
    };
    const reset = () => { clearTimeout(timer); deck = shuffle([...symbols, ...symbols]); flipped = []; matched = new Set(); moves = 0; locked = false; over = false; resultSent = false; draw(); };
    game.addButton('New game', reset);
    reset();
    return () => clearTimeout(timer);
  },
};
