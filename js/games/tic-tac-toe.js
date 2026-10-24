import { createGameFrame, makeSelect, makeSetupPanel } from '../game-ui.js';

const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function winner(board) {
  for (const [a,b,c] of lines) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  return null;
}

function heuristic(board, ai) {
  const opponent = ai === 'O' ? 'X' : 'O';
  let score = 0;
  for (const line of lines) {
    const values = line.map((index) => board[index]);
    const own = values.filter((value) => value === ai).length;
    const other = values.filter((value) => value === opponent).length;
    if (other === 0) score += [0, 2, 12, 80][own];
    if (own === 0) score -= [0, 2, 12, 80][other];
  }
  return score;
}

function minimax(board, turn, depth, limit, ai, alpha, beta) {
  const result = winner(board);
  if (result) return result === ai ? 100 - depth : depth - 100;
  const moves = board.map((value, index) => value ? -1 : index).filter((index) => index >= 0);
  if (!moves.length) return 0;
  if (depth >= limit) return heuristic(board, ai);
  const maximizing = turn === ai;
  let best = maximizing ? -Infinity : Infinity;
  for (const index of moves) {
    board[index] = turn;
    const score = minimax(board, turn === 'O' ? 'X' : 'O', depth + 1, limit, ai, alpha, beta);
    board[index] = null;
    if (maximizing) { best = Math.max(best, score); alpha = Math.max(alpha, best); }
    else { best = Math.min(best, score); beta = Math.min(beta, best); }
    if (beta <= alpha) break;
  }
  return best;
}

export default {
  mount(root, { onQuit, onResult }) {
    const game = createGameFrame(root, { title: 'Tic Tac Toe', subtitle: 'Three in a row wins. Choose local play or a computer opponent.', onQuit });
    let board = Array(9).fill(null);
    let turn = 'X';
    let over = false;
    let started = false;
    let mode = 'local';
    let difficulty = 'medium';
    let resultSent = false;
    const finish = (result, message) => { over = true; game.setStatus(message); if (!resultSent) { resultSent = true; onResult(result); } };
    const chooseAiMove = () => {
      const available = [4,0,2,6,8,1,3,5,7].filter((index) => !board[index]);
      if (difficulty === 'easy') return available[Math.floor(Math.random() * available.length)];
      if (difficulty === 'medium') {
        for (const mark of ['O', 'X']) for (const index of available) {
          board[index] = mark; const wins = winner(board) === mark; board[index] = null;
          if (wins) return index;
        }
        return available.includes(4) ? 4 : available[Math.floor(Math.random() * available.length)];
      }
      const limit = difficulty === 'expert' ? 9 : 5;
      let bestScore = -Infinity;
      let bestMove = available[0];
      for (const index of available) {
        board[index] = 'O';
        const score = minimax(board, 'X', 1, limit, 'O', -Infinity, Infinity);
        board[index] = null;
        if (score > bestScore) { bestScore = score; bestMove = index; }
      }
      return bestMove;
    };
    const draw = () => {
      const grid = document.createElement('div');
      grid.className = 'ttt-grid';
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', 'Tic Tac Toe board');
      board.forEach((mark, index) => {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = `ttt-cell ${mark === 'O' ? 'mark-o' : ''}`;
        cell.textContent = mark || '';
        cell.disabled = !started || over || Boolean(mark) || (mode === 'ai' && turn === 'O');
        cell.setAttribute('aria-label', `Row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}, ${mark || 'empty'}`);
        cell.addEventListener('click', () => play(index));
        grid.append(cell);
      });
      game.board.replaceChildren(grid);
      if (started && !over) game.setStatus(mode === 'ai' ? (turn === 'X' ? 'Your turn · You are X' : `Computer turn · ${difficulty[0].toUpperCase()}${difficulty.slice(1)} AI`) : `${turn === 'X' ? 'Player 1 · X' : 'Player 2 · O'} turn`);
    };
    const play = (index, fromAi = false) => {
      if (!started || over || board[index] || (mode === 'ai' && turn === 'O' && !fromAi)) return;
      board[index] = turn;
      if (winner(board)) { finish(turn === 'X' ? 'win' : 'loss', `${turn} wins! Start a new round to play again.`); draw(); return; }
      if (board.every(Boolean)) { finish('draw', 'It is a draw. Start a new round for a rematch.'); draw(); return; }
      turn = turn === 'X' ? 'O' : 'X';
      if (mode === 'ai' && turn === 'O') { const move = chooseAiMove(); if (move !== undefined) play(move, true); }
      else draw();
    };
    const resetBoard = () => { board = Array(9).fill(null); turn = 'X'; over = false; resultSent = false; };
    const startMatch = () => { mode = modeSelect.value; difficulty = difficultySelect.value; resetBoard(); started = true; draw(); };
    const modeSelect = makeSelect('Player mode', [['local','Player vs Player · same device'],['ai','Player vs AI']], () => { difficultySelect.disabled = modeSelect.value === 'local'; });
    const difficultySelect = makeSelect('AI difficulty', [['easy','Easy'],['medium','Medium'],['hard','Hard'],['expert','Expert']], () => {});
    const setup = makeSetupPanel({
      title: 'Choose your match',
      description: 'Take turns on this device, or challenge a local computer opponent. The board starts after you confirm.',
      fields: [
        { label: 'Player mode', control: modeSelect },
        { label: 'AI difficulty', control: difficultySelect, help: 'Easy makes mistakes. Medium blocks obvious threats. Hard searches ahead; Expert uses full optimal play.' },
      ],
      onStart: startMatch,
    });
    const showSetup = () => { started = false; resetBoard(); modeSelect.value = mode; difficultySelect.value = difficulty; difficultySelect.disabled = mode === 'local'; game.board.replaceChildren(setup); game.setStatus('Ready · Choose a mode and start your match.'); };
    const restart = () => { if (!started) return; resetBoard(); started = true; draw(); };
    game.addButton('Restart round', restart);
    game.addButton('Match settings', showSetup);
    showSetup();
  },
};