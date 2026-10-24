import games from './catalog.js';
import { createInitialChessState, chessLegalMoves, chessIsInCheck, chessMoveFromSquares, chessOutcome } from './games/chess.js';

const output = document.querySelector('#test-results');
const summary = document.querySelector('#test-summary');
const fixtures = document.querySelector('#test-fixtures');
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function withGame(id, check) {
  const entry = games.find((game) => game.id === id);
  assert(entry, `Catalog entry missing: ${id}`);
  const root = document.createElement('div');
  fixtures.append(root);
  let results = 0;
  const cleanup = entry.engine.mount(root, { onQuit() {}, onResult() { results += 1; } });
  try { check(root, () => results); }
  finally { if (typeof cleanup === 'function') cleanup(); root.remove(); }
}

function test(name, callback) {
  const item = document.createElement('li');
  try {
    callback();
    passed += 1;
    item.className = 'pass';
    item.textContent = `PASS · ${name}`;
  } catch (error) {
    failed += 1;
    item.className = 'fail';
    item.textContent = `FAIL · ${name} — ${error.message}`;
  }
  output.append(item);
}

function clickCell(root, selector, index) {
  const cell = root.querySelectorAll(selector)[index];
  assert(cell, `Missing ${selector} at index ${index}`);
  cell.click();
}

function startMatch(root) {
  const start = root.querySelector('.match-setup .primary-button');
  assert(start, 'Expected the pre-match setup screen');
  start.click();
}

function chooseAi(root, difficulty = 'medium') {
  const mode = root.querySelector('select[aria-label="Player mode"]');
  const level = root.querySelector('select[aria-label="AI difficulty"]');
  assert(mode && level && level.options.length === 4, 'Expected mode and four difficulty options');
  mode.value = 'ai'; mode.dispatchEvent(new Event('change', { bubbles: true }));
  level.value = difficulty; level.dispatchEvent(new Event('change', { bubbles: true }));
  startMatch(root);
}

test('Tic Tac Toe detects a three-mark local win', () => withGame('tic-tac-toe', (root, resultCount) => {
  startMatch(root);
  for (const index of [0, 3, 1, 4, 2]) clickCell(root, '.ttt-cell', index);
  assert(root.querySelector('.game-status').textContent.includes('X wins'), 'Expected X to win across the top row');
  assert(resultCount() === 1, 'Expected one result callback');
}));

test('Tic Tac Toe AI difficulty makes a legal reply', () => withGame('tic-tac-toe', (root) => {
  chooseAi(root, 'expert');
  clickCell(root, '.ttt-cell', 0);
  assert(root.querySelectorAll('.mark-o').length === 1, 'Expected Expert AI to make one legal move');
}));

test('Connect Four detects a vertical local win', () => withGame('connect-four', (root) => {
  startMatch(root);
  for (const col of [0, 1, 0, 1, 0, 1, 0]) clickCell(root, '.connect-cell', col);
  assert(root.querySelector('.game-status').textContent.includes('connects four'), 'Expected a Connect Four win');
}));

test('Connect Four AI chooses a legal column', () => withGame('connect-four', (root) => {
  chooseAi(root, 'medium');
  clickCell(root, '.connect-cell', 3);
  assert(root.querySelectorAll('.disc-red').length === 1 && root.querySelectorAll('.disc-yellow').length === 1, 'Expected the AI to place one legal reply');
}));

test('Reversi accepts a legal opening and flips a piece', () => withGame('reversi', (root) => {
  startMatch(root);
  const legalMove = root.querySelector('.reversi-cell.legal');
  assert(legalMove, 'Expected legal opening moves');
  legalMove.click();
  assert(root.querySelector('.game-status').textContent.includes('White to move'), 'Expected turn to pass after a legal move');
  assert(root.querySelectorAll('.piece-black').length === 4, 'Expected the captured piece to flip to black');
}));

test('Reversi AI responds with a legal move', () => withGame('reversi', (root) => {
  chooseAi(root, 'medium');
  root.querySelector('.reversi-cell.legal').click();
  assert(root.querySelectorAll('.reversi-piece').length === 6, 'Expected player and AI to place one piece each');
}));

test('Gomoku detects five in a row', () => withGame('gomoku', (root, resultCount) => {
  startMatch(root);
  for (const index of [0, 15, 1, 16, 2, 17, 3, 18, 4]) clickCell(root, '.gomoku-cell', index);
  assert(root.querySelector('.game-status').textContent.includes('Black makes five'), 'Expected five black stones in a row to win');
  assert(resultCount() === 1, 'Expected one result callback');
}));

test('Gomoku AI responds to a legal opening', () => withGame('gomoku', (root) => {
  chooseAi(root, 'medium');
  clickCell(root, '.gomoku-cell', 112);
  assert(root.querySelectorAll('.stone-white').length === 1, 'Expected the AI to place one legal reply');
}));

test('2048 responds to keyboard input and touch swipes', () => withGame('2048', (root) => {
  assert(root.querySelectorAll('.tile2048').length === 16, 'Expected a 4×4 board');
  const before = [...root.querySelectorAll('.tile2048')].map((tile) => tile.textContent).join(',');
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  const afterKeys = [...root.querySelectorAll('.tile2048')].map((tile) => tile.textContent).join(',');
  assert(before !== afterKeys, 'Expected a legal keyboard move to change the board');
  if (typeof PointerEvent === 'function') {
    let pointerId = 1;
    for (const [x1, y1, x2, y2] of [[90,40,30,40],[30,40,90,40],[40,90,40,30],[40,30,40,90]]) {
      const board = root.querySelector('.puzzle2048');
      board.dispatchEvent(new PointerEvent('pointerdown', { pointerId, clientX: x1, clientY: y1, bubbles: true }));
      board.dispatchEvent(new PointerEvent('pointerup', { pointerId, clientX: x2, clientY: y2, bubbles: true, cancelable: true }));
      pointerId += 1;
    }
    const afterSwipes = [...root.querySelectorAll('.tile2048')].map((tile) => tile.textContent).join(',');
    assert(afterKeys !== afterSwipes, 'Expected touch swipes to move the tiles');
  }
}));

test('Minesweeper supports flagging and a safe first reveal', () => withGame('minesweeper', (root) => {
  const flagButton = root.querySelector('.game-toolbar button');
  flagButton.click();
  root.querySelector('.mine-cell').click();
  assert(root.querySelector('.mine-cell').getAttribute('aria-label').includes('flagged'), 'Expected flag mode to mark the selected square');
  flagButton.click();
  flagButton.click();
  root.querySelector('.mine-cell').click();
  flagButton.click();
  root.querySelector('.mine-cell').click();
  assert(root.querySelectorAll('.mine-cell.revealed').length > 0, 'Expected the first reveal to be safe');
}));

test('Memory Match exposes sixteen cards and counts a pair attempt', () => withGame('memory-match', (root) => {
  assert(root.querySelectorAll('.memory-card').length === 16, 'Expected a 16-card deck');
  clickCell(root, '.memory-card', 0);
  clickCell(root, '.memory-card', 1);
  assert(root.querySelector('.game-status').textContent.includes('Moves 1'), 'Expected the first pair to count as a move');
}));

test('Snake waits for Start and supports speed, pause, resume, and restart', () => withGame('snake', (root) => {
  assert(root.querySelector('canvas.snake-canvas'), 'Expected the game canvas');
  assert(root.querySelectorAll('.direction-pad button').length === 4, 'Expected four direction controls');
  assert(root.querySelector('.game-status').textContent.includes('Ready'), 'Snake should not move before the player starts');
  const [runButton, restartButton] = root.querySelectorAll('.game-toolbar button');
  const speed = root.querySelector('select[aria-label="Snake speed"]');
  assert(speed && speed.options.length === 3, 'Expected Slow, Normal, and Fast speed settings');
  runButton.click();
  assert(runButton.textContent === 'Pause', 'Start should begin play and offer pause');
  runButton.click();
  assert(runButton.textContent === 'Resume', 'Pause should stop play and offer resume');
  restartButton.click();
  assert(runButton.textContent === 'Start' && root.querySelector('.game-status').textContent.includes('Ready'), 'Restart should return to a ready game');
}));

test('Rock Paper Scissors supports AI and local two-player modes', () => withGame('rock-paper-scissors', (root) => {
  chooseAi(root, 'expert');
  const choice = root.querySelector('.rps-pick');
  assert(choice, 'Expected three playable choices');
  choice.click();
  assert(root.querySelector('.guess-count').textContent.includes('—'), 'Expected the AI match score to render');
  assert(root.querySelector('.game-status').textContent.includes('Expert AI'), 'Expected selected AI difficulty to be shown');
}));

test('Number Guess submits a valid guess and reduces attempts', () => withGame('number-guess', (root) => {
  const input = root.querySelector('.guess-input');
  input.value = '50';
  root.querySelector('.guess-form button').click();
  assert(root.querySelector('.guess-count').textContent === '6', 'Expected six guesses to remain');
}));

test('Nim enforces a legal local move', () => withGame('nim', (root) => {
  startMatch(root);
  root.querySelector('.nim-actions button').click();
  assert(root.querySelector('.game-status').textContent.includes('Player 2 turn'), 'Expected the turn to pass after a legal removal');
  assert(root.querySelectorAll('.nim-token').length === 11, 'Expected exactly one token to be removed');
}));

test('Nim AI replies legally after the selected difficulty', () => withGame('nim', (root) => {
  chooseAi(root, 'hard');
  root.querySelector('.nim-actions button').click();
  assert(root.querySelectorAll('.nim-token').length < 11, 'Expected the AI to make a legal reply');
  assert(root.querySelector('.game-status').textContent.includes('Your turn'), 'Expected the turn to return to the player');
}));

test('Hangman offers letter controls and records guesses', () => withGame('hangman', (root) => {
  assert(root.querySelectorAll('.hangman-letter').length === 26, 'Expected a complete alphabet keyboard');
  root.querySelector('.hangman-letter').click();
  assert(root.querySelector('.game-status').textContent.includes('Tap a letter') || root.querySelector('.game-status').textContent.includes('solved'), 'Expected a valid letter guess');
}));

test('Mastermind records a four-peg code guess', () => withGame('mastermind', (root) => {
  assert(root.querySelectorAll('.mastermind-form select').length === 4, 'Expected four code positions');
  root.querySelector('.mastermind-form button').click();
  assert(root.querySelectorAll('.mastermind-row').length === 1, 'Expected one submitted guess in the history');
}));

test('Rock Paper Scissors supports local two-player turn passing', () => withGame('rock-paper-scissors', (root) => {
  const mode = root.querySelector('select[aria-label="Player mode"]');
  mode.value = 'local'; mode.dispatchEvent(new Event('change', { bubbles: true }));
  startMatch(root);
  root.querySelector('.rps-pick').click();
  assert(root.querySelector('.game-status').textContent.includes('Player 2'), 'Expected Player 2 to choose after Player 1 locks a move');
  root.querySelector('.rps-pick').click();
  assert(root.querySelector('.game-status').textContent.includes('Player 1'), 'Expected the next round to return to Player 1');
}));

function playChess(state, from, to) {
  const next = chessMoveFromSquares(state, from, to);
  assert(next, `Expected legal chess move ${from}-${to}`);
  return next;
}

test('Chess starts with twenty legal moves and rejects an illegal pawn jump', () => {
  let state = createInitialChessState();
  assert(chessLegalMoves(state).length === 20, 'Expected twenty legal opening moves');
  assert(chessMoveFromSquares(state, 'e2', 'e5') === null, 'A pawn must not jump three squares');
  state = playChess(state, 'e2', 'e4');
  assert(state.turn === 'b' && state.board[4][4] === 'P', 'Expected e4 and Black to move');
  assert(state.enPassant.row === 5 && state.enPassant.col === 4, 'Expected the en-passant target after a double pawn move');
});

test('Chess supports king-side castling and moves the rook', () => {
  let state = createInitialChessState();
  for (const [from, to] of [['e2','e4'],['e7','e5'],['g1','f3'],['b8','c6'],['f1','c4'],['g8','f6'],['e1','g1']]) state = playChess(state, from, to);
  assert(state.board[7][6] === 'K' && state.board[7][5] === 'R', 'Expected king and rook to land on castled squares');
  assert(!state.castling.includes('K'), 'Castling rights should be removed after castling');
});

test('Chess supports en-passant captures', () => {
  let state = createInitialChessState();
  for (const [from, to] of [['e2','e4'],['a7','a6'],['e4','e5'],['d7','d5'],['e5','d6']]) state = playChess(state, from, to);
  assert(state.board[2][3] === 'P' && state.board[3][3] === null, 'Expected the captured pawn to be removed en passant');
});

test('Chess detects Fool’s Mate as checkmate', () => {
  let state = createInitialChessState();
  for (const [from, to] of [['f2','f3'],['e7','e5'],['g2','g4'],['d8','h4']]) state = playChess(state, from, to);
  assert(chessIsInCheck(state, 'w'), 'Expected White to be in check');
  assert(chessLegalMoves(state).length === 0, 'Expected no legal escape from checkmate');
});

test('Chess promotes pawns to a selected piece', () => {
  const state = createInitialChessState();
  state.board = Array.from({ length: 8 }, () => Array(8).fill(null));
  state.board[7][7] = 'K'; state.board[0][7] = 'k'; state.board[1][0] = 'P';
  state.turn = 'w'; state.castling = ''; state.enPassant = null;
  const promotions = chessLegalMoves(state).filter((move) => move.from.row === 1 && move.from.col === 0 && move.to.row === 0 && move.to.col === 0);
  assert(promotions.length === 4, 'Expected queen, rook, bishop, and knight promotion choices');
  const promoted = chessMoveFromSquares(state, 'a7', 'a8', 'N');
  assert(promoted.board[0][0] === 'N', 'Expected the selected knight promotion');
});

test('Chess recognizes stalemate as a draw', () => {
  const state = createInitialChessState();
  state.board = Array.from({ length: 8 }, () => Array(8).fill(null));
  state.board[0][7] = 'k'; state.board[1][5] = 'K'; state.board[2][6] = 'Q';
  state.turn = 'b'; state.castling = ''; state.enPassant = null;
  assert(!chessIsInCheck(state, 'b'), 'The stalemated king should not be in check');
  assert(chessLegalMoves(state).length === 0, 'Expected no legal black moves');
  assert(chessOutcome(state)?.result === 'draw', 'Expected a stalemate draw');
});

test('Chess AI uses the selected Elo and replies legally', () => withGame('chess', (root) => {
  const mode = root.querySelector('select[aria-label="Player mode"]');
  const elo = root.querySelector('input[aria-label="Computer Elo strength"]');
  assert(elo && elo.min === '400' && elo.max === '2400' && elo.step === '50', 'Expected a customizable 400–2400 Elo scale');
  mode.value = 'ai'; mode.dispatchEvent(new Event('change', { bubbles: true }));
  elo.value = '800'; elo.dispatchEvent(new Event('input', { bubbles: true }));
  startMatch(root);
  root.querySelector('[data-square="e2"]').click();
  root.querySelector('[data-square="e4"]').click();
  assert(root.querySelectorAll('.chess-piece').length === 32, 'Expected the AI to reply without removing pieces');
  assert(root.querySelector('.game-status').textContent.includes('800 Elo'), 'Expected the selected Elo to be reflected in the match');
}));

summary.textContent = `${passed} passed · ${failed} failed`;
summary.classList.toggle('fail', failed > 0);
