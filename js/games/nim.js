import { createGameFrame, makeSelect, makeSetupPanel } from '../game-ui.js';

const STARTING_HEAPS = [3, 4, 5];

function nimSum(heaps) { return heaps.reduce((sum, heap) => sum ^ heap, 0); }

function legalMoves(heaps) {
  const moves = [];
  heaps.forEach((heap, pile) => { for (let amount = 1; amount <= Math.min(3, heap); amount += 1) moves.push({ pile, amount }); });
  return moves;
}

export default {
  mount(root, { onQuit, onResult }) {
    const game = createGameFrame(root, { title: 'Nim', subtitle: 'Take up to three tokens from one pile. The player who takes the last token wins.', onQuit });
    let heaps;
    let turn = 'P1';
    let mode = 'local';
    let difficulty = 'medium';
    let started = false;
    let over = false;
    let resultSent = false;
    const chooseAiMove = () => {
      const moves = legalMoves(heaps);
      if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];
      if (difficulty === 'medium') {
        const largest = Math.max(...heaps);
        const pile = heaps.indexOf(largest);
        return { pile, amount: Math.min(3, Math.max(1, largest - Math.max(0, largest - 2))) };
      }
      const sum = nimSum(heaps);
      const winning = moves.filter(({ pile, amount }) => (heaps[pile] ^ sum) < heaps[pile] && heaps[pile] - (heaps[pile] ^ sum) === amount);
      if (!winning.length) return moves[Math.floor(Math.random() * moves.length)];
      if (difficulty === 'hard') return winning[0];
      return winning.reduce((best, move) => {
        const remaining = heaps.reduce((total, heap, index) => total + heap - (index === move.pile ? move.amount : 0), 0);
        const bestRemaining = heaps.reduce((total, heap, index) => total + heap - (index === best.pile ? best.amount : 0), 0);
        return remaining < bestRemaining ? move : best;
      });
    };
    const draw = () => {
      const board = document.createElement('div'); board.className = 'nim-board';
      board.setAttribute('role', 'group'); board.setAttribute('aria-label', 'Nim token piles');
      heaps.forEach((count, pile) => {
        const row = document.createElement('section'); row.className = 'nim-pile';
        const heading = document.createElement('div'); heading.className = 'nim-pile-heading';
        const name = document.createElement('strong'); name.textContent = `Pile ${pile + 1}`;
        const amount = document.createElement('span'); amount.textContent = `${count} left`;
        heading.append(name, amount);
        const tokens = document.createElement('div'); tokens.className = 'nim-tokens'; tokens.setAttribute('aria-label', `${count} tokens`);
        for (let i = 0; i < count; i += 1) { const token = document.createElement('span'); token.className = 'nim-token'; token.setAttribute('aria-hidden', 'true'); tokens.append(token); }
        const actions = document.createElement('div'); actions.className = 'nim-actions';
        for (let take = 1; take <= Math.min(3, count); take += 1) {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'game-button'; button.textContent = `Take ${take}`;
          button.disabled = !started || over || (mode === 'ai' && turn === 'P2');
          button.setAttribute('aria-label', `Take ${take} token${take === 1 ? '' : 's'} from pile ${pile + 1}`);
          button.addEventListener('click', () => play(pile, take)); actions.append(button);
        }
        row.append(heading, tokens, actions); board.append(row);
      });
      game.board.replaceChildren(board);
      if (started && !over) game.setStatus(mode === 'ai' ? turn === 'P1' ? 'Your turn · choose a pile and how many to take' : `Computer turn · ${difficulty[0].toUpperCase()}${difficulty.slice(1)} Nim strategy` : `${turn === 'P1' ? 'Player 1' : 'Player 2'} turn · take from exactly one pile`);
    };
    const finish = () => {
      over = true;
      const winner = turn;
      game.setStatus(`${winner === 'P1' ? 'Player 1' : mode === 'ai' ? 'Computer' : 'Player 2'} takes the last token and wins!`);
      if (!resultSent) { resultSent = true; onResult(winner === 'P1' ? 'win' : 'loss'); }
    };
    const play = (pile, amount, fromAi = false) => {
      if (!started || over || (mode === 'ai' && turn === 'P2' && !fromAi) || !Number.isInteger(amount) || amount < 1 || amount > 3 || amount > heaps[pile]) return;
      heaps[pile] -= amount;
      if (heaps.every((heap) => heap === 0)) { finish(); draw(); return; }
      turn = turn === 'P1' ? 'P2' : 'P1';
      if (mode === 'ai' && turn === 'P2') { const move = chooseAiMove(); play(move.pile, move.amount, true); }
      else draw();
    };
    const reset = () => { heaps = [...STARTING_HEAPS]; turn = 'P1'; over = false; resultSent = false; };
    const startMatch = () => { mode = modeSelect.value; difficulty = difficultySelect.value; reset(); started = true; draw(); };
    const modeSelect = makeSelect('Player mode', [['local','Player vs Player · same device'],['ai','Player vs AI']], () => { difficultySelect.disabled = modeSelect.value === 'local'; });
    const difficultySelect = makeSelect('AI difficulty', [['easy','Easy'],['medium','Medium'],['hard','Hard'],['expert','Expert']], () => {});
    const setup = makeSetupPanel({
      title: 'Choose your match',
      description: 'The three starting piles hold 3, 4, and 5 tokens. Remove 1–3 tokens from one pile per turn.',
      fields: [
        { label: 'Player mode', control: modeSelect },
        { label: 'AI difficulty', control: difficultySelect, help: 'Easy chooses freely. Medium reduces the largest pile. Hard uses the Nim-sum; Expert chooses the strongest winning reduction.' },
      ],
      onStart: startMatch,
    });
    const showSetup = () => { started = false; reset(); modeSelect.value = mode; difficultySelect.value = difficulty; difficultySelect.disabled = mode === 'local'; game.board.replaceChildren(setup); game.setStatus('Ready · Choose a mode to begin.'); };
    const restart = () => { if (!started) return; reset(); started = true; draw(); };
    game.addButton('Restart game', restart);
    game.addButton('Match settings', showSetup);
    showSetup();
  },
};
