import { createGameFrame, makeButton } from '../game-ui.js';

const SIZE = 9;
const MINES = 10;

export default {
  mount(root, { onQuit, onResult }) {
    const game = createGameFrame(root, { title: 'Minesweeper', subtitle: 'Find every safe square. Your first reveal is always safe.', onQuit });
    let cells;
    let started;
    let over;
    let won;
    let resultSent;
    let flagMode = false;
    let flagButton;
    const createBoard = (safeIndex) => {
      const flags = cells.map((cell) => cell.flagged);
      cells = Array.from({ length: SIZE * SIZE }, (_, index) => ({ mine: false, count: 0, revealed: false, flagged: flags[index] }));
      const choices = cells.map((_, index) => index).filter((index) => index !== safeIndex);
      for (let i = 0; i < MINES; i += 1) { const pick = Math.floor(Math.random() * choices.length); const [index] = choices.splice(pick, 1); cells[index].mine = true; }
      cells.forEach((cell, index) => {
        if (cell.mine) return;
        const row = Math.floor(index / SIZE); const col = index % SIZE;
        for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) {
          const r = row + dr; const c = col + dc;
          if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && cells[r * SIZE + c].mine) cell.count += 1;
        }
      });
      started = true;
    };
    const reveal = (index) => {
      if (over || cells[index].revealed || cells[index].flagged) return;
      if (!started) createBoard(index);
      const cell = cells[index];
      if (cell.mine) {
        over = true; cell.revealed = true;
        cells.forEach((item) => { if (item.mine) item.revealed = true; });
        if (!resultSent) { resultSent = true; onResult('loss'); }
        draw(); game.setStatus('Boom! You found a mine. Start a new game to try again.'); return;
      }
      const queue = [index];
      while (queue.length) {
        const current = queue.pop();
        const currentCell = cells[current];
        if (currentCell.revealed || currentCell.flagged || currentCell.mine) continue;
        currentCell.revealed = true;
        if (currentCell.count === 0) {
          const row = Math.floor(current / SIZE); const col = current % SIZE;
          for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) {
            const r = row + dr; const c = col + dc;
            if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) queue.push(r * SIZE + c);
          }
        }
      }
      const safeCount = cells.filter((item) => !item.mine && item.revealed).length;
      if (safeCount === SIZE * SIZE - MINES) { over = true; won = true; if (!resultSent) { resultSent = true; onResult('win'); } }
      draw();
      if (won) game.setStatus('Field cleared! You win. Start a new game for another board.');
    };
    const toggleFlag = (index) => {
      if (over || cells[index].revealed) return;
      cells[index].flagged = !cells[index].flagged;
      draw();
    };
    const draw = () => {
      const grid = document.createElement('div');
      grid.className = 'mines-grid';
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', 'Minesweeper 9 by 9 board');
      cells.forEach((cell, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `mine-cell ${cell.revealed ? 'revealed' : ''} ${over && cell.mine ? 'mine-hit' : ''}`;
        if (cell.revealed && cell.mine) button.textContent = '✹';
        else if (!cell.revealed && cell.flagged) button.textContent = '⚑';
        else if (cell.revealed && cell.count) { button.textContent = String(cell.count); button.dataset.count = String(cell.count); }
        button.disabled = over || cell.revealed;
        button.setAttribute('aria-label', `Row ${Math.floor(index / SIZE) + 1}, column ${index % SIZE + 1}, ${cell.revealed ? cell.mine ? 'mine' : cell.count ? `${cell.count} adjacent mines` : 'clear' : cell.flagged ? 'flagged' : 'covered'}`);
        button.addEventListener('click', () => flagMode ? toggleFlag(index) : reveal(index));
        button.addEventListener('contextmenu', (event) => { event.preventDefault(); toggleFlag(index); });
        grid.append(button);
      });
      game.board.replaceChildren(grid);
      if (!over) game.setStatus(flagMode ? 'Flag mode is on · Tap a covered square to mark or unmark it' : `Mines marked: ${cells.filter((cell) => cell.flagged).length} / ${MINES} · Right-click or switch to flag mode`);
    };
    const reset = () => { cells = Array.from({ length: SIZE * SIZE }, () => ({ mine: false, count: 0, revealed: false, flagged: false })); started = false; over = false; won = false; resultSent = false; flagMode = false; if (flagButton) flagButton.textContent = 'Flag mode: off'; draw(); };
    flagButton = makeButton('Flag mode: off', () => { flagMode = !flagMode; flagButton.textContent = `Flag mode: ${flagMode ? 'on' : 'off'}`; draw(); });
    game.controls.append(flagButton);
    game.addButton('New game', reset);
    reset();
    return () => {};
  },
};
