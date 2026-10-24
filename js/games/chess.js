import { createGameFrame, makeButton, makeSelect, makeSetupPanel } from '../game-ui.js';

const FILES = 'abcdefgh';
const PIECE_VALUES = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 20000 };
const PIECE_GLYPHS = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const KNIGHT_STEPS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const KING_STEPS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const SLIDERS = { b: [[-1,-1],[-1,1],[1,-1],[1,1]], r: [[-1,0],[0,-1],[0,1],[1,0]], q: [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]] };
const inside = (row, col) => row >= 0 && row < 8 && col >= 0 && col < 8;
const other = (color) => color === 'w' ? 'b' : 'w';
const colorOf = (piece) => piece ? piece === piece.toUpperCase() ? 'w' : 'b' : null;
const squareName = ({ row, col }) => `${FILES[col]}${8 - row}`;
const parseSquare = (name) => ({ row: 8 - Number(name[1]), col: FILES.indexOf(name[0]) });

export function createInitialChessState() {
  return {
    board: [
      ['r','n','b','q','k','b','n','r'],
      ['p','p','p','p','p','p','p','p'],
      Array(8).fill(null), Array(8).fill(null), Array(8).fill(null), Array(8).fill(null),
      ['P','P','P','P','P','P','P','P'],
      ['R','N','B','Q','K','B','N','R'],
    ],
    turn: 'w',
    castling: 'KQkq',
    enPassant: null,
    halfmove: 0,
    fullmove: 1,
    lastMove: null,
  };
}

export function chessIsSquareAttacked(board, row, col, byColor) {
  const pawnRow = row + (byColor === 'w' ? 1 : -1);
  const pawn = byColor === 'w' ? 'P' : 'p';
  for (const dc of [-1, 1]) if (inside(pawnRow, col + dc) && board[pawnRow][col + dc] === pawn) return true;
  const knight = byColor === 'w' ? 'N' : 'n';
  for (const [dr, dc] of KNIGHT_STEPS) if (inside(row + dr, col + dc) && board[row + dr][col + dc] === knight) return true;
  const king = byColor === 'w' ? 'K' : 'k';
  for (const [dr, dc] of KING_STEPS) if (inside(row + dr, col + dc) && board[row + dr][col + dc] === king) return true;
  for (const [dr, dc] of SLIDERS.q) {
    let r = row + dr; let c = col + dc; let distance = 1;
    while (inside(r, c)) {
      const piece = board[r][c];
      if (piece) {
        if (colorOf(piece) === byColor) {
          const kind = piece.toLowerCase();
          if (kind === 'q' || (distance === 1 && kind === 'k') || (Math.abs(dr) + Math.abs(dc) === 1 && kind === 'r') || (Math.abs(dr) === Math.abs(dc) && kind === 'b')) return true;
        }
        break;
      }
      r += dr; c += dc; distance += 1;
    }
  }
  return false;
}

export function chessIsInCheck(state, color = state.turn) {
  const king = color === 'w' ? 'K' : 'k';
  for (let row = 0; row < 8; row += 1) for (let col = 0; col < 8; col += 1) {
    if (state.board[row][col] === king) return chessIsSquareAttacked(state.board, row, col, other(color));
  }
  return true;
}

function addPawnMove(moves, from, to, color, extras = {}) {
  const promotionRow = color === 'w' ? 0 : 7;
  if (to.row === promotionRow) {
    const promotions = color === 'w' ? ['Q','R','B','N'] : ['q','r','b','n'];
    for (const promotion of promotions) moves.push({ from, to, promotion, ...extras });
  } else moves.push({ from, to, ...extras });
}

function pseudoMoves(state, color) {
  const board = state.board;
  const moves = [];
  for (let row = 0; row < 8; row += 1) for (let col = 0; col < 8; col += 1) {
    const piece = board[row][col];
    if (!piece || colorOf(piece) !== color) continue;
    const kind = piece.toLowerCase();
    const from = { row, col };
    if (kind === 'p') {
      const step = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      const nextRow = row + step;
      if (inside(nextRow, col) && !board[nextRow][col]) {
        addPawnMove(moves, from, { row: nextRow, col }, color);
        const doubleRow = row + step * 2;
        if (row === startRow && !board[doubleRow][col]) moves.push({ from, to: { row: doubleRow, col }, pawnDouble: true });
      }
      for (const dc of [-1, 1]) {
        const targetRow = row + step; const targetCol = col + dc;
        if (!inside(targetRow, targetCol)) continue;
        if (board[targetRow][targetCol] && colorOf(board[targetRow][targetCol]) === other(color)) addPawnMove(moves, from, { row: targetRow, col: targetCol }, color, { capture: true });
        else if (state.enPassant && state.enPassant.row === targetRow && state.enPassant.col === targetCol) moves.push({ from, to: { row: targetRow, col: targetCol }, capture: true, enPassant: true });
      }
    } else if (kind === 'n' || kind === 'k') {
      const steps = kind === 'n' ? KNIGHT_STEPS : KING_STEPS;
      for (const [dr, dc] of steps) {
        const targetRow = row + dr; const targetCol = col + dc;
        if (!inside(targetRow, targetCol)) continue;
        const target = board[targetRow][targetCol];
        if (!target || colorOf(target) !== color) moves.push({ from, to: { row: targetRow, col: targetCol }, capture: Boolean(target) });
      }
      if (kind === 'k') addCastlingMoves(state, color, from, moves);
    } else {
      for (const [dr, dc] of SLIDERS[kind]) {
        let targetRow = row + dr; let targetCol = col + dc;
        while (inside(targetRow, targetCol)) {
          const target = board[targetRow][targetCol];
          if (!target) moves.push({ from, to: { row: targetRow, col: targetCol } });
          else {
            if (colorOf(target) !== color) moves.push({ from, to: { row: targetRow, col: targetCol }, capture: true });
            break;
          }
          targetRow += dr; targetCol += dc;
        }
      }
    }
  }
  return moves;
}

function addCastlingMoves(state, color, from, moves) {
  const row = color === 'w' ? 7 : 0;
  if (from.row !== row || from.col !== 4 || chessIsInCheck(state, color)) return;
  const kingSide = color === 'w' ? 'K' : 'k';
  const queenSide = color === 'w' ? 'Q' : 'q';
  const enemy = other(color);
  if (state.castling.includes(kingSide) && state.board[row][7] === (color === 'w' ? 'R' : 'r') && !state.board[row][5] && !state.board[row][6] && !chessIsSquareAttacked(state.board, row, 5, enemy) && !chessIsSquareAttacked(state.board, row, 6, enemy)) {
    moves.push({ from, to: { row, col: 6 }, castle: 'K' });
  }
  if (state.castling.includes(queenSide) && state.board[row][0] === (color === 'w' ? 'R' : 'r') && !state.board[row][1] && !state.board[row][2] && !state.board[row][3] && !chessIsSquareAttacked(state.board, row, 3, enemy) && !chessIsSquareAttacked(state.board, row, 2, enemy)) {
    moves.push({ from, to: { row, col: 2 }, castle: 'Q' });
  }
}

function applyGeneratedMove(state, move) {
  const board = state.board.map((rank) => [...rank]);
  const piece = board[move.from.row][move.from.col];
  const target = board[move.to.row][move.to.col];
  const captured = move.enPassant ? (state.turn === 'w' ? 'p' : 'P') : target;
  board[move.from.row][move.from.col] = null;
  if (move.enPassant) board[move.from.row][move.to.col] = null;
  board[move.to.row][move.to.col] = move.promotion || piece;
  if (move.castle) {
    const rookFrom = move.castle === 'K' ? 7 : 0;
    const rookTo = move.castle === 'K' ? 5 : 3;
    board[move.to.row][rookTo] = board[move.to.row][rookFrom];
    board[move.to.row][rookFrom] = null;
  }
  let castling = state.castling;
  const removeRights = (rights) => { for (const right of rights) castling = castling.replace(right, ''); };
  if (piece === 'K') removeRights('KQ');
  if (piece === 'k') removeRights('kq');
  if (piece === 'R' && move.from.row === 7 && move.from.col === 0) removeRights('Q');
  if (piece === 'R' && move.from.row === 7 && move.from.col === 7) removeRights('K');
  if (piece === 'r' && move.from.row === 0 && move.from.col === 0) removeRights('q');
  if (piece === 'r' && move.from.row === 0 && move.from.col === 7) removeRights('k');
  if (captured === 'R' && move.to.row === 7 && move.to.col === 0) removeRights('Q');
  if (captured === 'R' && move.to.row === 7 && move.to.col === 7) removeRights('K');
  if (captured === 'r' && move.to.row === 0 && move.to.col === 0) removeRights('q');
  if (captured === 'r' && move.to.row === 0 && move.to.col === 7) removeRights('k');
  const enPassant = move.pawnDouble ? { row: (move.from.row + move.to.row) / 2, col: move.from.col } : null;
  return {
    board,
    turn: other(state.turn),
    castling,
    enPassant,
    halfmove: piece.toLowerCase() === 'p' || captured ? 0 : state.halfmove + 1,
    fullmove: state.fullmove + (state.turn === 'b' ? 1 : 0),
    lastMove: move,
  };
}

export function chessLegalMoves(state, color = state.turn) {
  return pseudoMoves(state, color).filter((move) => !chessIsInCheck(applyGeneratedMove({ ...state, turn: color }, move), color));
}

function sameMove(a, b) {
  return a.from.row === b.from.row && a.from.col === b.from.col && a.to.row === b.to.row && a.to.col === b.to.col && (a.promotion || '') === (b.promotion || '');
}

export function chessApplyMove(state, move) {
  const legal = chessLegalMoves(state).find((candidate) => sameMove(candidate, move));
  return legal ? applyGeneratedMove(state, legal) : null;
}

export function chessMoveFromSquares(state, fromName, toName, promotion = 'Q') {
  const from = parseSquare(fromName); const to = parseSquare(toName);
  if (!inside(from.row, from.col) || !inside(to.row, to.col)) return null;
  const moves = chessLegalMoves(state);
  const move = moves.find((candidate) => candidate.from.row === from.row && candidate.from.col === from.col && candidate.to.row === to.row && candidate.to.col === to.col && (!candidate.promotion || candidate.promotion.toUpperCase() === promotion.toUpperCase()));
  return move ? applyGeneratedMove(state, move) : null;
}

export function chessPositionKey(state) {
  return `${state.board.map((rank) => rank.map((piece) => piece || '.').join('')).join('/')} ${state.turn} ${state.castling || '-'} ${state.enPassant ? squareName(state.enPassant) : '-'}`;
}

function insufficientMaterial(state) {
  const pieces = [];
  for (let row = 0; row < 8; row += 1) for (let col = 0; col < 8; col += 1) {
    const piece = state.board[row][col];
    if (piece && piece.toLowerCase() !== 'k') pieces.push({ piece: piece.toLowerCase(), squareColor: (row + col) % 2 });
  }
  if (!pieces.length) return true;
  if (pieces.length === 1 && ['b','n'].includes(pieces[0].piece)) return true;
  return pieces.every((item) => item.piece === 'b') && pieces.every((item) => item.squareColor === pieces[0].squareColor);
}

export function chessOutcome(state, repetitionCount = 1) {
  const moves = chessLegalMoves(state);
  if (!moves.length) {
    if (chessIsInCheck(state, state.turn)) return { result: state.turn === 'w' ? 'loss' : 'win', reason: `Checkmate · ${state.turn === 'w' ? 'Black' : 'White'} wins` };
    return { result: 'draw', reason: 'Stalemate · Draw' };
  }
  if (state.halfmove >= 100) return { result: 'draw', reason: 'Draw · 50-move rule' };
  if (repetitionCount >= 3) return { result: 'draw', reason: 'Draw · threefold repetition' };
  if (insufficientMaterial(state)) return { result: 'draw', reason: 'Draw · insufficient mating material' };
  return null;
}

function formatMove(state, move) {
  if (move.castle === 'K') return 'O-O';
  if (move.castle === 'Q') return 'O-O-O';
  const piece = state.board[move.from.row][move.from.col];
  const kind = piece.toLowerCase() === 'p' ? '' : piece.toUpperCase();
  return `${kind}${squareName(move.from)}${move.capture ? '×' : '–'}${squareName(move.to)}${move.promotion ? `=${move.promotion.toUpperCase()}` : ''}`;
}

function evaluateWhite(state) {
  let score = 0;
  for (let row = 0; row < 8; row += 1) for (let col = 0; col < 8; col += 1) {
    const piece = state.board[row][col];
    if (!piece) continue;
    const color = colorOf(piece);
    const kind = piece.toLowerCase();
    const sign = color === 'w' ? 1 : -1;
    const center = 3.5 - (Math.abs(3.5 - row) + Math.abs(3.5 - col)) / 2;
    let positional = 0;
    if (kind === 'p') positional = (color === 'w' ? 6 - row : row - 1) * 8 + center * 2;
    if (kind === 'n') positional = center * 18;
    if (kind === 'b') positional = center * 10;
    if (kind === 'q') positional = center * 3;
    if (kind === 'r') positional = center * 2;
    score += sign * (PIECE_VALUES[kind] + positional);
  }
  return score;
}

function moveOrderScore(state, move) {
  const attacker = state.board[move.from.row][move.from.col];
  const target = move.enPassant ? (state.turn === 'w' ? 'p' : 'P') : state.board[move.to.row][move.to.col];
  return (target ? 10 * PIECE_VALUES[target.toLowerCase()] - PIECE_VALUES[attacker.toLowerCase()] : 0) + (move.promotion ? PIECE_VALUES[move.promotion.toLowerCase()] : 0) + (move.castle ? 40 : 0);
}

function negamax(state, depth, alpha, beta, ply, context) {
  context.nodes += 1;
  const moves = chessLegalMoves(state);
  if (!moves.length) return chessIsInCheck(state, state.turn) ? -30000 + ply : 0;
  if (state.halfmove >= 100 || insufficientMaterial(state)) return 0;
  if (depth === 0 || context.nodes >= context.nodeLimit) {
    const score = evaluateWhite(state);
    return state.turn === 'w' ? score : -score;
  }
  moves.sort((a, b) => moveOrderScore(state, b) - moveOrderScore(state, a));
  let best = -Infinity;
  for (const move of moves) {
    const score = -negamax(applyGeneratedMove(state, move), depth - 1, -beta, -alpha, ply + 1, context);
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta || context.nodes >= context.nodeLimit) break;
  }
  return best;
}

function eloProfile(elo) {
  if (elo < 700) return { depth: 1, nodeLimit: 3500, blunderChance: .38, tolerance: 700 };
  if (elo < 1100) return { depth: 2, nodeLimit: 6500, blunderChance: .27, tolerance: 520 };
  if (elo < 1500) return { depth: 2, nodeLimit: 12000, blunderChance: .16, tolerance: 340 };
  if (elo < 1900) return { depth: 3, nodeLimit: 20000, blunderChance: .08, tolerance: 190 };
  if (elo < 2200) return { depth: 3, nodeLimit: 30000, blunderChance: .03, tolerance: 70 };
  return { depth: 4, nodeLimit: 42000, blunderChance: 0, tolerance: 0 };
}

export function chooseChessAiMove(state, elo = 1200, random = Math.random) {
  const moves = chessLegalMoves(state);
  if (!moves.length) return null;
  const profile = eloProfile(Math.max(400, Math.min(2400, Number(elo) || 1200)));
  moves.sort((a, b) => moveOrderScore(state, b) - moveOrderScore(state, a));
  const context = { nodes: 0, nodeLimit: profile.nodeLimit };
  const scored = moves.map((move) => ({ move, score: -negamax(applyGeneratedMove(state, move), profile.depth - 1, -Infinity, Infinity, 1, context) }));
  const best = Math.max(...scored.map((item) => item.score));
  if (random() < profile.blunderChance) return moves[Math.floor(random() * moves.length)];
  const candidates = scored.filter((item) => item.score >= best - profile.tolerance);
  return candidates[Math.floor(random() * candidates.length)].move;
}

function describePiece(piece) {
  if (!piece) return 'empty square';
  const names = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  return `${colorOf(piece) === 'w' ? 'white' : 'black'} ${names[piece.toLowerCase()]}`;
}

export default {
  mount(root, { onQuit, onResult }) {
    const game = createGameFrame(root, { title: 'Chess', subtitle: 'Full legal chess rules · same-device PvP or a locally calculated AI with adjustable approximate Elo.', onQuit });
    let state;
    let mode = 'local';
    let elo = 1200;
    let started = false;
    let over = false;
    let selected = null;
    let moveLog = [];
    let repetitions = new Map();
    let resultSent = false;

    const outcome = () => chessOutcome(state, repetitions.get(chessPositionKey(state)) || 0);
    const complete = (result) => {
      over = true; selected = null; game.setStatus(result.reason);
      if (!resultSent) { resultSent = true; onResult(result.result); }
    };
    const recordPosition = () => {
      const key = chessPositionKey(state);
      repetitions.set(key, (repetitions.get(key) || 0) + 1);
    };
    const commit = (move, isComputer = false) => {
      const notation = formatMove(state, move);
      const mover = state.turn;
      state = applyGeneratedMove(state, move);
      moveLog.push({ color: mover, notation });
      selected = null;
      recordPosition();
      const result = outcome();
      if (result) { complete(result); draw(); return; }
      if (mode === 'ai' && state.turn === 'b' && !isComputer) {
        const aiMove = chooseChessAiMove(state, elo);
        if (aiMove) commit(aiMove, true);
        return;
      }
      draw();
    };
    const selectedMoves = () => selected ? chessLegalMoves(state).filter((move) => move.from.row === selected.row && move.from.col === selected.col) : [];
    const clickSquare = (row, col) => {
      if (!started || over || (mode === 'ai' && state.turn === 'b')) return;
      const current = state.board[row][col];
      const moves = selectedMoves();
      const destinationMoves = moves.filter((move) => move.to.row === row && move.to.col === col);
      if (destinationMoves.length) {
        const promotion = promotionSelect.value;
        const chosen = destinationMoves.find((move) => !move.promotion || move.promotion.toUpperCase() === promotion) || destinationMoves[0];
        commit(chosen); return;
      }
      if (current && colorOf(current) === state.turn) { selected = { row, col }; draw(); return; }
      selected = null; draw();
    };
    const draw = () => {
      const layout = document.createElement('div'); layout.className = 'chess-layout';
      const boardElement = document.createElement('div'); boardElement.className = 'chess-board';
      boardElement.setAttribute('role', 'grid'); boardElement.setAttribute('aria-label', 'Chess board, White at the bottom');
      const legal = selectedMoves();
      const legalKeys = new Set(legal.map((move) => `${move.to.row},${move.to.col}`));
      for (let row = 0; row < 8; row += 1) for (let col = 0; col < 8; col += 1) {
        const square = document.createElement('button'); square.type = 'button';
        const piece = state.board[row][col];
        const isSelected = selected && selected.row === row && selected.col === col;
        const isTarget = legalKeys.has(`${row},${col}`);
        const isLast = state.lastMove && ((state.lastMove.from.row === row && state.lastMove.from.col === col) || (state.lastMove.to.row === row && state.lastMove.to.col === col));
        square.className = `chess-square ${(row + col) % 2 ? 'dark-square' : 'light-square'} ${isSelected ? 'selected-square' : ''} ${isTarget ? 'legal-square' : ''} ${isTarget && piece ? 'capture-target' : ''} ${isLast ? 'last-square' : ''}`;
        square.dataset.square = squareName({ row, col });
        square.disabled = !started || over || (mode === 'ai' && state.turn === 'b');
        square.setAttribute('role', 'gridcell');
        square.setAttribute('aria-label', `${squareName({ row, col })}, ${describePiece(piece)}${isTarget ? ', legal destination' : ''}`);
        if (piece) { const glyph = document.createElement('span'); glyph.className = `chess-piece ${colorOf(piece) === 'w' ? 'white-piece' : 'black-piece'}`; glyph.textContent = PIECE_GLYPHS[piece]; square.append(glyph); }
        if (!piece && isTarget) { const target = document.createElement('span'); target.className = 'chess-target'; square.append(target); }
        if (col === 0 || row === 7) { const coord = document.createElement('span'); coord.className = 'chess-coordinate'; coord.textContent = row === 7 ? FILES[col] : String(8 - row); square.append(coord); }
        square.addEventListener('click', () => clickSquare(row, col));
        boardElement.append(square);
      }
      const history = document.createElement('section'); history.className = 'chess-history';
      const historyTitle = document.createElement('h3'); historyTitle.textContent = 'Moves';
      const moveList = document.createElement('ol'); moveList.className = 'chess-move-list'; moveList.setAttribute('aria-label', 'Move history');
      moveLog.slice(-16).forEach((entry, index) => {
        const item = document.createElement('li'); item.textContent = `${entry.color === 'w' ? 'White' : 'Black'} · ${entry.notation}`; moveList.append(item);
      });
      history.append(historyTitle, moveList);
      layout.append(boardElement, history);
      game.board.replaceChildren(layout);
      if (started && !over) {
        const check = chessIsInCheck(state, state.turn) ? ' · Check' : '';
        const who = mode === 'ai' ? state.turn === 'b' ? 'Computer to move · Black' : 'Your turn · White' : `${state.turn === 'w' ? 'White' : 'Black'} to move`;
        const strength = mode === 'ai' ? ` · AI approximately ${elo} Elo` : '';
        game.setStatus(`${who}${strength}${check} · Move ${state.fullmove}`);
      }
    };
    const resetGame = () => {
      state = createInitialChessState(); started = true; over = false; selected = null; moveLog = []; resultSent = false; repetitions = new Map(); recordPosition(); draw();
    };
    const startMatch = () => { mode = modeSelect.value; elo = Number(eloInput.value); resetGame(); };
    const modeSelect = makeSelect('Player mode', [['local','Player vs Player · same device'],['ai','Player vs AI']], () => { eloInput.disabled = modeSelect.value !== 'ai'; });
    const eloInput = document.createElement('input'); eloInput.type = 'range'; eloInput.min = '400'; eloInput.max = '2400'; eloInput.step = '50'; eloInput.value = String(elo); eloInput.setAttribute('aria-label', 'Computer Elo strength');
    const eloValue = document.createElement('output'); eloValue.className = 'chess-elo-output';
    const eloControl = document.createElement('div'); eloControl.className = 'chess-elo-control'; eloControl.append(eloInput, eloValue);
    const updateEloLabel = () => { eloValue.textContent = `${eloInput.value} Elo`; };
    eloInput.addEventListener('input', updateEloLabel);
    updateEloLabel();
    const setup = makeSetupPanel({
      title: 'Choose your chess match',
      description: 'White moves first. Play a friend locally or set the computer’s approximate target Elo before starting.',
      fields: [
        { label: 'Player mode', control: modeSelect },
        { label: 'Computer strength · 400–2400 Elo', control: eloControl, help: 'This is a local estimate, not an official rating. Higher settings search deeper and make fewer deliberate inaccuracies.' },
      ],
      onStart: startMatch,
    });
    const showSetup = () => {
      started = false; over = false; selected = null; modeSelect.value = mode; eloInput.value = String(elo); eloInput.disabled = mode !== 'ai'; updateEloLabel();
      state = createInitialChessState(); moveLog = []; repetitions = new Map(); recordPosition();
      game.board.replaceChildren(setup); game.setStatus('Ready · Choose a mode and computer strength.');
    };
    const restart = () => { if (!started) return; elo = Number(eloInput.value); resetGame(); };
    const promotionSelect = makeSelect('Promote pawns to', [['Q','Queen'],['R','Rook'],['B','Bishop'],['N','Knight']], () => {});
    game.controls.append(promotionSelect);
    game.addButton('Restart game', restart);
    game.addButton('Match settings', showSetup);
    showSetup();
  },
};