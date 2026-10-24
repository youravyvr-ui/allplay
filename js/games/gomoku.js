import { createGameFrame, makeSelect, makeSetupPanel } from '../game-ui.js';

const SIZE = 15;
const DIRECTIONS = [[0,1],[1,0],[1,1],[1,-1]];
const WIN_SCORE = 1000000;

function wins(board, row, col, stone) {
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign; let c = col + dc * sign;
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === stone) { count += 1; r += dr * sign; c += dc * sign; }
    }
    if (count >= 5) return true;
  }
  return false;
}

function candidates(board) {
  const seen = new Set();
  const moves = [];
  for (let row = 0; row < SIZE; row += 1) for (let col = 0; col < SIZE; col += 1) {
    if (!board[row][col]) continue;
    for (let dr = -2; dr <= 2; dr += 1) for (let dc = -2; dc <= 2; dc += 1) {
      const r = row + dr; const c = col + dc; const key = r * SIZE + c;
      if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && !board[r][c] && !seen.has(key)) { seen.add(key); moves.push([r, c]); }
    }
  }
  if (!moves.length) return [[7, 7]];
  return moves.sort((a, b) => Math.abs(a[0] - 7) + Math.abs(a[1] - 7) - Math.abs(b[0] - 7) - Math.abs(b[1] - 7));
}

function placementScore(board, row, col, stone) {
  if (board[row][col]) return -Infinity;
  board[row][col] = stone;
  let score = 0;
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1; let open = 0;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign; let c = col + dc * sign;
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === stone) { count += 1; r += dr * sign; c += dc * sign; }
      if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && !board[r][c]) open += 1;
    }
    if (count >= 5) score += WIN_SCORE;
    else if (count === 4 && open === 2) score += 120000;
    else if (count === 4 && open === 1) score += 9000;
    else if (count === 3 && open === 2) score += 3500;
    else if (count === 3 && open === 1) score += 450;
    else if (count === 2 && open === 2) score += 120;
    else if (count === 2 && open === 1) score += 20;
    else score += open;
  }
  board[row][col] = null;
  return score;
}

export default {
  mount(root, { onQuit, onResult }) {
    const game = createGameFrame(root, { title: 'Gomoku', subtitle: 'Connect five in a row. Play locally or challenge a threat-aware computer.', onQuit });
    let board;
    let turn = 'B';
    let over = false;
    let started = false;
    let mode = 'local';
    let difficulty = 'medium';
    let resultSent = false;
    const chooseAiMove = () => {
      const moves = candidates(board);
      if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];
      const own = moves.map(([row, col]) => ({ row, col, attack: placementScore(board, row, col, 'W'), defense: placementScore(board, row, col, 'B') }));
      const winning = own.find((move) => move.attack >= WIN_SCORE);
      if (winning) return [winning.row, winning.col];
      const immediateThreat = own.filter((move) => move.defense >= WIN_SCORE);
      if (immediateThreat.length) return [immediateThreat[0].row, immediateThreat[0].col];
      if (difficulty === 'medium') {
        const best = own.reduce((a, b) => b.attack + b.defense * .85 > a.attack + a.defense * .85 ? b : a);
        return [best.row, best.col];
      }
      let bestScore = -Infinity;
      let selected = own[0];
      for (const move of own) {
        let replyThreat = 0;
        if (difficulty === 'expert') {
          board[move.row][move.col] = 'W';
          for (const [r, c] of candidates(board)) replyThreat = Math.max(replyThreat, placementScore(board, r, c, 'B'));
          board[move.row][move.col] = null;
        }
        const centerBonus = 14 - Math.abs(move.row - 7) - Math.abs(move.col - 7);
        const score = move.attack * 1.1 + move.defense * .95 + centerBonus - replyThreat * .65;
        if (score > bestScore) { bestScore = score; selected = move; }
      }
      return [selected.row, selected.col];
    };
    const draw = () => {
      const grid = document.createElement('div');
      grid.className = 'gomoku-grid';
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', 'Gomoku 15 by 15 board');
      for (let row = 0; row < SIZE; row += 1) for (let col = 0; col < SIZE; col += 1) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'gomoku-cell';
        cell.disabled = !started || over || Boolean(board[row][col]) || (mode === 'ai' && turn === 'W');
        cell.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}, ${board[row][col] === 'B' ? 'black stone' : board[row][col] === 'W' ? 'white stone' : 'empty'}`);
        if (board[row][col]) { const stone = document.createElement('span'); stone.className = `gomoku-stone ${board[row][col] === 'B' ? 'stone-black' : 'stone-white'}`; cell.append(stone); }
        cell.addEventListener('click', () => play(row, col));
        grid.append(cell);
      }
      game.board.replaceChildren(grid);
      if (started && !over) game.setStatus(mode === 'ai' ? (turn === 'B' ? 'Your turn · Black' : `Computer turn · ${difficulty[0].toUpperCase()}${difficulty.slice(1)} AI · White`) : `${turn === 'B' ? 'Player 1 · Black' : 'Player 2 · White'} to move`);
    };
    const finish = (result, message) => { over = true; game.setStatus(message); if (!resultSent) { resultSent = true; onResult(result); } };
    const play = (row, col, fromAi = false) => {
      if (!started || over || board[row][col] || (mode === 'ai' && turn === 'W' && !fromAi)) return;
      const piece = turn;
      board[row][col] = piece;
      if (wins(board, row, col, piece)) { finish(piece === 'B' ? 'win' : 'loss', `${piece === 'B' ? 'Black' : 'White'} makes five in a row!`); draw(); return; }
      if (board.every((line) => line.every(Boolean))) { finish('draw', 'The board is full. It is a draw!'); draw(); return; }
      turn = turn === 'B' ? 'W' : 'B';
      if (mode === 'ai' && turn === 'W') { const [aiRow, aiCol] = chooseAiMove(); play(aiRow, aiCol, true); }
      else draw();
    };
    const resetBoard = () => { board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null)); turn = 'B'; over = false; resultSent = false; };
    const startMatch = () => { mode = modeSelect.value; difficulty = difficultySelect.value; resetBoard(); started = true; draw(); };
    const modeSelect = makeSelect('Player mode', [['local','Player vs Player · same device'],['ai','Player vs AI']], () => { difficultySelect.disabled = modeSelect.value === 'local'; });
    const difficultySelect = makeSelect('AI difficulty', [['easy','Easy'],['medium','Medium'],['hard','Hard'],['expert','Expert']], () => {});
    const setup = makeSetupPanel({
      title: 'Choose your match',
      description: 'Black starts. The computer looks for immediate wins and blocks, with deeper threat evaluation at higher levels.',
      fields: [
        { label: 'Player mode', control: modeSelect },
        { label: 'AI difficulty', control: difficultySelect, help: 'Easy plays casually. Medium spots wins and blocks. Hard scores open lines; Expert also checks dangerous replies.' },
      ],
      onStart: startMatch,
    });
    const showSetup = () => { started = false; resetBoard(); modeSelect.value = mode; difficultySelect.value = difficulty; difficultySelect.disabled = mode === 'local'; game.board.replaceChildren(setup); game.setStatus('Ready · Choose a mode to begin.'); };
    const restart = () => { if (!started) return; resetBoard(); started = true; draw(); };
    game.addButton('Restart game', restart);
    game.addButton('Match settings', showSetup);
    showSetup();
  },
};