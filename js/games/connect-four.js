import { createGameFrame, makeSelect, makeSetupPanel } from '../game-ui.js';

const ROWS = 6;
const COLS = 7;
const DIRECTIONS = [[0,1],[1,0],[1,1],[1,-1]];
const SEARCH_ORDER = [3,2,4,1,5,0,6];

function hasFour(board, row, col, piece) {
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === piece) { count += 1; r += dr * sign; c += dc * sign; }
    }
    if (count >= 4) return true;
  }
  return false;
}

function winner(board) {
  for (let row = 0; row < ROWS; row += 1) for (let col = 0; col < COLS; col += 1) {
    const piece = board[row][col];
    if (piece && hasFour(board, row, col, piece)) return piece;
  }
  return null;
}

function landingRow(board, col) {
  for (let row = ROWS - 1; row >= 0; row -= 1) if (!board[row][col]) return row;
  return -1;
}

function playOnCopy(board, col, piece) {
  const row = landingRow(board, col);
  if (row < 0) return null;
  const next = board.map((line) => [...line]);
  next[row][col] = piece;
  return { board: next, row };
}

function legalColumns(board) { return SEARCH_ORDER.filter((col) => board[0][col] === null); }

function evaluate(board) {
  let score = 0;
  for (let row = 0; row < ROWS; row += 1) if (board[row][3] === 'Y') score += 6;
  const scoreWindow = (cells) => {
    const yellow = cells.filter((piece) => piece === 'Y').length;
    const red = cells.filter((piece) => piece === 'R').length;
    if (yellow && red) return 0;
    if (yellow) return [0, 2, 14, 90, 100000][yellow];
    if (red) return -[0, 2, 16, 110, 100000][red];
    return 0;
  };
  for (let row = 0; row < ROWS; row += 1) for (let col = 0; col < COLS; col += 1) {
    for (const [dr, dc] of DIRECTIONS) {
      const endRow = row + dr * 3;
      const endCol = col + dc * 3;
      if (endRow >= 0 && endRow < ROWS && endCol >= 0 && endCol < COLS) score += scoreWindow([0,1,2,3].map((step) => board[row + dr * step][col + dc * step]));
    }
  }
  return score;
}

function minimax(board, depth, maximizing, alpha, beta) {
  const result = winner(board);
  if (result === 'Y') return 1000000 + depth;
  if (result === 'R') return -1000000 - depth;
  const moves = legalColumns(board);
  if (depth === 0 || moves.length === 0) return evaluate(board);
  let best = maximizing ? -Infinity : Infinity;
  for (const col of moves) {
    const play = playOnCopy(board, col, maximizing ? 'Y' : 'R');
    const score = minimax(play.board, depth - 1, !maximizing, alpha, beta);
    if (maximizing) { best = Math.max(best, score); alpha = Math.max(alpha, best); }
    else { best = Math.min(best, score); beta = Math.min(beta, best); }
    if (beta <= alpha) break;
  }
  return best;
}

function winningColumn(board, piece) {
  for (const col of legalColumns(board)) {
    const move = playOnCopy(board, col, piece);
    if (hasFour(move.board, move.row, col, piece)) return col;
  }
  return null;
}

export default {
  mount(root, { onQuit, onResult }) {
    const game = createGameFrame(root, { title: 'Connect Four', subtitle: 'Choose local two-player or play against a strategic computer opponent.', onQuit });
    let board;
    let turn;
    let over = false;
    let started = false;
    let mode = 'local';
    let difficulty = 'medium';
    let resultSent = false;
    const finish = (result, message) => { over = true; game.setStatus(message); if (!resultSent) { resultSent = true; onResult(result); } };
    const chooseAiMove = () => {
      const moves = legalColumns(board);
      if (!moves.length) return null;
      if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];
      if (difficulty === 'medium') return winningColumn(board, 'Y') ?? winningColumn(board, 'R') ?? (moves.includes(3) ? 3 : moves[Math.floor(Math.random() * moves.length)]);
      const depth = difficulty === 'expert' ? 6 : 4;
      let best = -Infinity;
      let selected = moves[0];
      for (const col of moves) {
        const play = playOnCopy(board, col, 'Y');
        if (hasFour(play.board, play.row, col, 'Y')) return col;
        const score = minimax(play.board, depth - 1, false, -Infinity, Infinity);
        if (score > best) { best = score; selected = col; }
      }
      return selected;
    };
    const draw = () => {
      const grid = document.createElement('div');
      grid.className = 'connect-board';
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', 'Connect Four board');
      for (let row = 0; row < ROWS; row += 1) for (let col = 0; col < COLS; col += 1) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'connect-cell';
        cell.disabled = !started || over || board[0][col] !== null || (mode === 'ai' && turn === 'Y');
        cell.setAttribute('aria-label', `Column ${col + 1}, row ${row + 1}, ${board[row][col] ? board[row][col] === 'R' ? 'red' : 'yellow' : 'empty'}`);
        const disc = document.createElement('span');
        disc.className = `disc ${board[row][col] === 'R' ? 'disc-red' : board[row][col] === 'Y' ? 'disc-yellow' : ''}`;
        cell.append(disc);
        cell.addEventListener('click', () => drop(col));
        grid.append(cell);
      }
      game.board.replaceChildren(grid);
      if (started && !over) game.setStatus(mode === 'ai' ? (turn === 'R' ? 'Your turn · Red' : `Computer turn · ${difficulty[0].toUpperCase()}${difficulty.slice(1)} AI · Yellow`) : `${turn === 'R' ? 'Player 1 · Red' : 'Player 2 · Yellow'} to move`);
    };
    const applyDrop = (col) => {
      const row = landingRow(board, col);
      if (row < 0) return;
      board[row][col] = turn;
      if (hasFour(board, row, col, turn)) { finish(turn === 'R' ? 'win' : 'loss', `${turn === 'R' ? 'Red' : 'Yellow'} connects four!`); draw(); return; }
      if (board[0].every(Boolean)) { finish('draw', 'The board is full. It is a draw!'); draw(); return; }
      turn = turn === 'R' ? 'Y' : 'R';
      if (mode === 'ai' && turn === 'Y') { const aiCol = chooseAiMove(); if (aiCol !== null) applyDrop(aiCol); }
      else draw();
    };
    const drop = (col) => { if (!started || over || (mode === 'ai' && turn === 'Y')) return; applyDrop(col); };
    const resetBoard = () => { board = Array.from({ length: ROWS }, () => Array(COLS).fill(null)); turn = 'R'; over = false; resultSent = false; };
    const startMatch = () => { mode = modeSelect.value; difficulty = difficultySelect.value; resetBoard(); started = true; draw(); };
    const modeSelect = makeSelect('Player mode', [['local','Player vs Player · same device'],['ai','Player vs AI']], () => { difficultySelect.disabled = modeSelect.value === 'local'; });
    const difficultySelect = makeSelect('AI difficulty', [['easy','Easy'],['medium','Medium'],['hard','Hard'],['expert','Expert']], () => {});
    const setup = makeSetupPanel({
      title: 'Choose your match',
      description: 'Red starts. Select a same-device rival or a computer opponent before play.',
      fields: [
        { label: 'Player mode', control: modeSelect },
        { label: 'AI difficulty', control: difficultySelect, help: 'Easy chooses freely. Medium wins or blocks a threat. Hard searches four moves ahead; Expert searches six.' },
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