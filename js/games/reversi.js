import { createGameFrame, makeSelect, makeSetupPanel } from '../game-ui.js';

const SIZE = 8;
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const WEIGHTS = [
  [100,-20,10,5,5,10,-20,100],
  [-20,-45,-3,-2,-2,-3,-45,-20],
  [10,-3,7,2,2,7,-3,10],
  [5,-2,2,1,1,2,-2,5],
  [5,-2,2,1,1,2,-2,5],
  [10,-3,7,2,2,7,-3,10],
  [-20,-45,-3,-2,-2,-3,-45,-20],
  [100,-20,10,5,5,10,-20,100],
];
const inside = (row, col) => row >= 0 && row < SIZE && col >= 0 && col < SIZE;

function flipsFor(board, row, col, player) {
  if (board[row][col]) return [];
  const opponent = player === 'B' ? 'W' : 'B';
  const flips = [];
  for (const [dr, dc] of DIRS) {
    let r = row + dr; let c = col + dc; const line = [];
    while (inside(r, c) && board[r][c] === opponent) { line.push([r, c]); r += dr; c += dc; }
    if (line.length && inside(r, c) && board[r][c] === player) flips.push(...line);
  }
  return flips;
}

function validMoves(board, player) {
  const moves = [];
  for (let row = 0; row < SIZE; row += 1) for (let col = 0; col < SIZE; col += 1) if (flipsFor(board, row, col, player).length) moves.push([row, col]);
  return moves;
}

function applyMove(board, row, col, player) {
  const flips = flipsFor(board, row, col, player);
  if (!flips.length) return null;
  const next = board.map((line) => [...line]);
  next[row][col] = player;
  for (const [r, c] of flips) next[r][c] = player;
  return next;
}

function evaluate(board, ai) {
  const opponent = ai === 'B' ? 'W' : 'B';
  let score = 0;
  let aiDiscs = 0;
  let opponentDiscs = 0;
  for (let row = 0; row < SIZE; row += 1) for (let col = 0; col < SIZE; col += 1) {
    if (board[row][col] === ai) { score += WEIGHTS[row][col]; aiDiscs += 1; }
    else if (board[row][col] === opponent) { score -= WEIGHTS[row][col]; opponentDiscs += 1; }
  }
  const remaining = SIZE * SIZE - aiDiscs - opponentDiscs;
  const diskWeight = remaining < 16 ? 7 : 1;
  score += (aiDiscs - opponentDiscs) * diskWeight;
  score += (validMoves(board, ai).length - validMoves(board, opponent).length) * 5;
  return score;
}

function search(board, player, depth, ai, alpha, beta) {
  const moves = validMoves(board, player);
  const opponent = player === 'B' ? 'W' : 'B';
  if (depth === 0) return evaluate(board, ai);
  if (!moves.length) {
    if (!validMoves(board, opponent).length) {
      const aiCount = board.flat().filter((piece) => piece === ai).length;
      const opponentCount = board.flat().filter((piece) => piece === opponent).length;
      return (aiCount - opponentCount) * 1000;
    }
    return search(board, opponent, depth - 1, ai, alpha, beta);
  }
  const maximizing = player === ai;
  let best = maximizing ? -Infinity : Infinity;
  for (const [row, col] of moves) {
    const next = applyMove(board, row, col, player);
    const score = search(next, opponent, depth - 1, ai, alpha, beta);
    if (maximizing) { best = Math.max(best, score); alpha = Math.max(alpha, best); }
    else { best = Math.min(best, score); beta = Math.min(beta, best); }
    if (beta <= alpha) break;
  }
  return best;
}

export default {
  mount(root, { onQuit, onResult }) {
    const game = createGameFrame(root, { title: 'Reversi', subtitle: 'Capture pieces by trapping them. Choose a local rival or a computer opponent.', onQuit });
    let board;
    let turn = 'B';
    let over = false;
    let started = false;
    let mode = 'local';
    let difficulty = 'medium';
    let resultSent = false;
    const chooseAiMove = () => {
      const moves = validMoves(board, 'W');
      if (!moves.length) return null;
      if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];
      const depth = difficulty === 'expert' ? 5 : difficulty === 'hard' ? 3 : 0;
      let selected = moves[0];
      let best = -Infinity;
      for (const [row, col] of moves) {
        const next = applyMove(board, row, col, 'W');
        const score = depth ? search(next, 'B', depth - 1, 'W', -Infinity, Infinity) : evaluate(next, 'W');
        if (score > best) { best = score; selected = [row, col]; }
      }
      return selected;
    };
    const finish = () => {
      over = true;
      const black = board.flat().filter((piece) => piece === 'B').length;
      const white = board.flat().filter((piece) => piece === 'W').length;
      const outcome = black === white ? 'draw' : black > white ? 'win' : 'loss';
      game.setStatus(`Game over · Black ${black} — ${white} White · ${black === white ? 'Draw!' : black > white ? 'Black wins!' : 'White wins!'}`);
      if (!resultSent) { resultSent = true; onResult(outcome); }
    };
    const draw = (note = '') => {
      const grid = document.createElement('div');
      grid.className = 'reversi-grid';
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', 'Reversi board');
      const legal = validMoves(board, turn);
      for (let row = 0; row < SIZE; row += 1) for (let col = 0; col < SIZE; col += 1) {
        const cell = document.createElement('button');
        cell.type = 'button';
        const isLegal = legal.some(([r, c]) => r === row && c === col);
        cell.className = `reversi-cell ${isLegal && !over ? 'legal' : ''}`;
        cell.disabled = !started || over || !isLegal || (mode === 'ai' && turn === 'W');
        cell.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}, ${board[row][col] === 'B' ? 'black' : board[row][col] === 'W' ? 'white' : isLegal ? 'legal move' : 'empty'}`);
        if (board[row][col]) { const piece = document.createElement('span'); piece.className = `reversi-piece ${board[row][col] === 'B' ? 'piece-black' : 'piece-white'}`; cell.append(piece); }
        cell.addEventListener('click', () => play(row, col));
        grid.append(cell);
      }
      game.board.replaceChildren(grid);
      if (started && !over) {
        const black = board.flat().filter((piece) => piece === 'B').length;
        const white = board.flat().filter((piece) => piece === 'W').length;
        game.setStatus(`${note ? `${note} · ` : ''}${mode === 'ai' ? turn === 'B' ? 'Your turn · Black' : `Computer turn · ${difficulty[0].toUpperCase()}${difficulty.slice(1)} AI` : `${turn === 'B' ? 'Black' : 'White'} to move`} · Black ${black} — ${white} White`);
      }
    };
    const play = (row, col, fromAi = false) => {
      if (!started || over || (mode === 'ai' && turn === 'W' && !fromAi)) return;
      const next = applyMove(board, row, col, turn);
      if (!next) return;
      board = next;
      const previous = turn;
      const opponent = turn === 'B' ? 'W' : 'B';
      if (validMoves(board, opponent).length) turn = opponent;
      else if (validMoves(board, turn).length) turn = previous;
      else { draw(); finish(); return; }
      if (mode === 'ai' && turn === 'W') {
        const move = chooseAiMove();
        if (move) play(move[0], move[1], true);
      } else draw(turn === previous ? `${opponent === 'B' ? 'Black' : 'White'} has no move; turn passed` : '');
    };
    const resetBoard = () => {
      board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
      board[3][3] = 'W'; board[3][4] = 'B'; board[4][3] = 'B'; board[4][4] = 'W';
      turn = 'B'; over = false; resultSent = false;
    };
    const startMatch = () => { mode = modeSelect.value; difficulty = difficultySelect.value; resetBoard(); started = true; draw(); };
    const modeSelect = makeSelect('Player mode', [['local','Player vs Player · same device'],['ai','Player vs AI']], () => { difficultySelect.disabled = modeSelect.value === 'local'; });
    const difficultySelect = makeSelect('AI difficulty', [['easy','Easy'],['medium','Medium'],['hard','Hard'],['expert','Expert']], () => {});
    const setup = makeSetupPanel({
      title: 'Choose your match',
      description: 'Black takes the first move. Corners and mobility are valuable; the AI plays by the same legal-move rules.',
      fields: [
        { label: 'Player mode', control: modeSelect },
        { label: 'AI difficulty', control: difficultySelect, help: 'Easy is casual. Medium favors corners and mobility. Hard searches three turns; Expert searches five.' },
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