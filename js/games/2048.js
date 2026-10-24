import { createGameFrame, makeButton } from '../game-ui.js';

const SIZE = 4;
const BEST_KEY = 'allplay-2048-best';

function getBest() { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } }
function saveBest(value) { try { localStorage.setItem(BEST_KEY, String(value)); } catch { /* Best score is optional. */ } }
function addTile(grid) {
  const empty = [];
  grid.forEach((value, index) => { if (!value) empty.push(index); });
  if (empty.length) grid[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4;
}
function hasMoves(grid) {
  if (grid.some((value) => value === 0)) return true;
  for (let row = 0; row < SIZE; row += 1) for (let col = 0; col < SIZE; col += 1) {
    const i = row * SIZE + col;
    if (col < SIZE - 1 && grid[i] === grid[i + 1]) return true;
    if (row < SIZE - 1 && grid[i] === grid[i + SIZE]) return true;
  }
  return false;
}

export default {
  mount(root, { onQuit, onResult }) {
    const game = createGameFrame(root, { title: '2048', subtitle: 'Swipe on the board or use arrow keys, WASD, and the controls.', onQuit });
    let grid;
    let score;
    let best = getBest();
    let over;
    let won;
    let resultSent;
    let pointerStart = null;
    const pointerDown = (event) => {
      pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
      if (event.isTrusted && event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId);
    };
    const pointerUp = (event) => {
      if (!pointerStart || pointerStart.id !== event.pointerId) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
      event.preventDefault();
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    };
    const draw = () => {
      const board = document.createElement('div');
      board.className = 'puzzle2048';
      board.setAttribute('role', 'group');
      board.setAttribute('aria-label', '2048 game board. Swipe to move tiles.');
      board.addEventListener('pointerdown', pointerDown);
      board.addEventListener('pointerup', pointerUp);
      board.addEventListener('pointercancel', () => { pointerStart = null; });
      for (const value of grid) {
        const tile = document.createElement('div');
        tile.className = 'tile2048';
        tile.dataset.value = String(value);
        tile.textContent = value || '·';
        tile.setAttribute('aria-label', value ? String(value) : 'empty');
        board.append(tile);
      }
      game.board.replaceChildren(board);
      if (over) game.setStatus(`No more moves · Score ${score} · Best ${best}. Start a new game to try again.`);
      else if (won) game.setStatus(`2048 reached! Score ${score} · Best ${best}. Keep going or start a new game.`);
      else game.setStatus(`Score ${score} · Best ${best} · Swipe, arrow keys, or WASD`);
    };
    const move = (direction) => {
      if (over) return;
      const next = [...grid];
      let gained = 0;
      for (let line = 0; line < SIZE; line += 1) {
        const indices = Array.from({ length: SIZE }, (_, i) => direction === 'left' ? line * SIZE + i : direction === 'right' ? line * SIZE + (SIZE - 1 - i) : direction === 'up' ? i * SIZE + line : (SIZE - 1 - i) * SIZE + line);
        const values = indices.map((index) => grid[index]).filter(Boolean);
        const merged = [];
        for (let i = 0; i < values.length; i += 1) {
          if (values[i] === values[i + 1]) { const combined = values[i] * 2; merged.push(combined); gained += combined; i += 1; }
          else merged.push(values[i]);
        }
        while (merged.length < SIZE) merged.push(0);
        indices.forEach((index, i) => { next[index] = merged[i]; });
      }
      if (next.every((value, index) => value === grid[index])) return;
      grid = next;
      score += gained;
      if (score > best) { best = score; saveBest(best); }
      addTile(grid);
      if (!won && grid.includes(2048)) { won = true; if (!resultSent) { resultSent = true; onResult('win'); } }
      if (!hasMoves(grid)) { over = true; if (!resultSent) { resultSent = true; onResult(won ? 'win' : 'loss'); } }
      draw();
    };
    const keyHandler = (event) => {
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      const direction = ({ arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down' })[key];
      if (direction) { event.preventDefault(); move(direction); }
    };
    window.addEventListener('keydown', keyHandler);
    for (const [direction, label] of [['left','←'],['up','↑'],['down','↓'],['right','→']]) game.controls.append(makeButton(label, () => move(direction)));
    const reset = () => { grid = Array(SIZE * SIZE).fill(0); score = 0; over = false; won = false; resultSent = false; addTile(grid); addTile(grid); draw(); };
    game.addButton('New game', reset);
    reset();
    return () => window.removeEventListener('keydown', keyHandler);
  },
};