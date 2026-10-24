import { createGameFrame, makeSelect, makeSetupPanel } from '../game-ui.js';

const choices = [{ id: 'rock', label: 'Rock', icon: '✊' }, { id: 'paper', label: 'Paper', icon: '✋' }, { id: 'scissors', label: 'Scissors', icon: '✌️' }];
const beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const counters = { rock: 'paper', paper: 'scissors', scissors: 'rock' };

export default {
  mount(root, { onQuit, onResult }) {
    const game = createGameFrame(root, { title: 'Rock Paper Scissors', subtitle: 'Choose a same-device opponent or test yourself against an adaptive local AI.', onQuit });
    let playerScore;
    let opponentScore;
    let over = false;
    let started = false;
    let mode = 'ai';
    let difficulty = 'medium';
    let resultSent = false;
    let pendingMove = null;
    let playerHistory = [];
    let lastRound = 'Choose your move to begin.';
    const predictMostCommon = () => {
      const counts = { rock: 0, paper: 0, scissors: 0 };
      for (const move of playerHistory) counts[move] += 1;
      return choices.map((choice) => choice.id).sort((a, b) => counts[b] - counts[a])[0];
    };
    const chooseAiMove = () => {
      if (difficulty === 'easy' || playerHistory.length === 0) return choices[Math.floor(Math.random() * choices.length)].id;
      if (difficulty === 'medium') return counters[playerHistory[playerHistory.length - 1]];
      if (difficulty === 'hard') return counters[predictMostCommon()];
      const last = playerHistory[playerHistory.length - 1];
      const previous = playerHistory[playerHistory.length - 2];
      const transitions = { rock: { rock: 0, paper: 0, scissors: 0 }, paper: { rock: 0, paper: 0, scissors: 0 }, scissors: { rock: 0, paper: 0, scissors: 0 } };
      for (let i = 1; i < playerHistory.length; i += 1) transitions[playerHistory[i - 1]][playerHistory[i]] += 1;
      const nextMove = previous ? Object.keys(transitions[last]).sort((a, b) => transitions[last][b] - transitions[last][a])[0] : predictMostCommon();
      return counters[nextMove];
    };
    const finish = () => {
      over = true;
      const playerName = 'Player 1';
      const otherName = mode === 'ai' ? 'Computer' : 'Player 2';
      const firstWon = playerScore === 3;
      game.setStatus(`${firstWon ? playerName : otherName} wins the match! Start a new match or change settings.`);
      if (!resultSent) { resultSent = true; onResult(mode === 'ai' ? firstWon ? 'win' : 'loss' : firstWon ? 'win' : 'loss'); }
    };
    const draw = () => {
      const wrap = document.createElement('div'); wrap.className = 'guess-panel';
      const score = document.createElement('div'); score.className = 'guess-count'; score.textContent = `${playerScore} — ${opponentScore}`;
      const opponent = mode === 'ai' ? `COMPUTER · ${difficulty.toUpperCase()}` : 'PLAYER 2';
      const note = document.createElement('p'); note.className = 'guess-range';
      note.textContent = mode === 'local' && pendingMove ? 'PLAYER 2 · SELECT YOUR THROW' : `PLAYER 1 · ${lastRound} · ${opponent}`;
      const picks = document.createElement('div'); picks.className = 'rps-picks';
      for (const choice of choices) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'rps-pick'; button.disabled = !started || over;
        const icon = document.createElement('span'); icon.textContent = choice.icon;
        const label = document.createElement('span'); label.textContent = choice.label;
        button.append(icon, label);
        button.setAttribute('aria-label', `${mode === 'local' && pendingMove ? 'Player 2 choose' : 'Player 1 choose'} ${choice.label}`);
        button.addEventListener('click', () => play(choice.id)); picks.append(button);
      }
      wrap.append(score, note, picks); game.board.replaceChildren(wrap);
      if (started && !over) game.setStatus(mode === 'local' ? pendingMove ? 'Player 2: choose your move.' : 'Player 1: choose your move.' : `First to 3 · ${difficulty[0].toUpperCase()}${difficulty.slice(1)} AI learns from your earlier choices.`);
    };
    const resolveRound = (first, second) => {
      pendingMove = null;
      if (first === second) lastRound = `Tie: ${first} vs ${second}`;
      else if (beats[first] === second) { playerScore += 1; lastRound = `Player 1 wins: ${first} beats ${second}`; }
      else { opponentScore += 1; lastRound = `Player 2 wins: ${second} beats ${first}`; }
      if (playerScore === 3 || opponentScore === 3) { finish(); draw(); }
      else draw();
    };
    const play = (playerMove) => {
      if (!started || over) return;
      if (mode === 'local' && !pendingMove) { pendingMove = playerMove; draw(); return; }
      if (mode === 'local') { resolveRound(pendingMove, playerMove); return; }
      const opponentMove = chooseAiMove();
      playerHistory.push(playerMove);
      resolveRound(playerMove, opponentMove);
    };
    const resetMatch = () => { playerScore = 0; opponentScore = 0; over = false; resultSent = false; pendingMove = null; playerHistory = []; lastRound = 'Choose your move to begin.'; };
    const startMatch = () => { mode = modeSelect.value; difficulty = difficultySelect.value; resetMatch(); started = true; draw(); };
    const modeSelect = makeSelect('Player mode', [['local','Player vs Player · same device'],['ai','Player vs AI']], () => { difficultySelect.disabled = modeSelect.value === 'local'; });
    const difficultySelect = makeSelect('AI difficulty', [['easy','Easy'],['medium','Medium'],['hard','Hard'],['expert','Expert']], () => {});
    const setup = makeSetupPanel({
      title: 'Choose your match',
      description: 'First to three round wins. In local mode, pass the device after Player 1 locks in a choice.',
      fields: [
        { label: 'Player mode', control: modeSelect },
        { label: 'AI difficulty', control: difficultySelect, help: 'Easy is random. Medium counters your last move; Hard tracks your most common throw. Expert adapts to repeated patterns.' },
      ],
      onStart: startMatch,
    });
    const showSetup = () => { started = false; resetMatch(); modeSelect.value = mode; difficultySelect.value = difficulty; difficultySelect.disabled = mode === 'local'; game.board.replaceChildren(setup); game.setStatus('Ready · Choose a mode to begin.'); };
    const restart = () => { if (!started) return; resetMatch(); started = true; draw(); };
    game.addButton('New match', restart);
    game.addButton('Match settings', showSetup);
    showSetup();
  },
};