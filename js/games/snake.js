import { createGameFrame, makeButton, makeSelect } from '../game-ui.js';

const CELLS = 20;
const PIXELS = 360;
const BEST_KEY = 'allplay-snake-best';
const directions = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const speedSettings = {
  slow: { base: 220, minimum: 165 },
  normal: { base: 200, minimum: 140 },
  fast: { base: 180, minimum: 120 },
};

function loadBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

function saveBest(value) {
  try { localStorage.setItem(BEST_KEY, String(value)); } catch { /* Best score is optional. */ }
}

export default {
  mount(root, { onQuit, onResult }) {
    const game = createGameFrame(root, { title: 'Snake', subtitle: 'Ready when you are. Swipe, tap a direction, or use arrow keys / WASD.', onQuit });
    const layout = document.createElement('div');
    layout.className = 'snake-layout';
    const stats = document.createElement('div');
    stats.className = 'snake-stats';
    const scoreValue = document.createElement('strong');
    const bestValue = document.createElement('strong');
    const scoreLabel = document.createElement('span'); scoreLabel.textContent = 'Score';
    const bestLabel = document.createElement('span'); bestLabel.textContent = 'Best';
    const scoreBox = document.createElement('div'); scoreBox.append(scoreLabel, scoreValue);
    const bestBox = document.createElement('div'); bestBox.append(bestLabel, bestValue);
    stats.append(scoreBox, bestBox);

    const canvas = document.createElement('canvas');
    canvas.className = 'snake-canvas';
    canvas.width = PIXELS;
    canvas.height = PIXELS;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Snake game board. Swipe to steer after starting.');
    canvas.setAttribute('tabindex', '0');

    const pad = document.createElement('div');
    pad.className = 'direction-pad';
    pad.setAttribute('role', 'group');
    pad.setAttribute('aria-label', 'Snake direction controls');
    for (const [name, label] of [['up', '↑'], ['left', '←'], ['down', '↓'], ['right', '→']]) {
      const button = makeButton(label, () => requestTurn(name));
      button.dataset.dir = name;
      button.setAttribute('aria-label', `Move ${name}`);
      pad.append(button);
    }
    layout.append(stats, canvas, pad);
    game.board.replaceChildren(layout);
    const ctx = canvas.getContext('2d');
    let snake;
    let direction;
    let nextDirection;
    let food;
    let score;
    let best = loadBest();
    let speed = 'normal';
    let timer = null;
    let started = false;
    let paused = false;
    let over = false;
    let resultSent = false;
    let inputLocked = false;
    let pointerStart = null;

    const currentDelay = () => Math.max(speedSettings[speed].minimum, speedSettings[speed].base - Math.floor(score / 3) * 8);
    const makeFood = () => {
      const available = [];
      for (let y = 0; y < CELLS; y += 1) for (let x = 0; x < CELLS; x += 1) {
        if (!snake.some((part) => part.x === x && part.y === y)) available.push({ x, y });
      }
      return available.length ? available[Math.floor(Math.random() * available.length)] : null;
    };
    const updateStatus = () => {
      scoreValue.textContent = String(score);
      bestValue.textContent = String(best);
      if (over) game.setStatus(`Run over · Score ${score} · Best ${best}. Restart to play again.`);
      else if (!started) game.setStatus('Ready · Press Start when you are ready. Choose a direction first if you like.');
      else if (paused) game.setStatus(`Paused · Score ${score} · Best ${best}`);
      else game.setStatus(`Score ${score} · Best ${best} · ${speed[0].toUpperCase()}${speed.slice(1)} · Speed increases gradually as you score`);
    };
    const paint = () => {
      if (!ctx) return;
      const unit = PIXELS / CELLS;
      ctx.fillStyle = '#080e0a';
      ctx.fillRect(0, 0, PIXELS, PIXELS);
      ctx.strokeStyle = 'rgba(100,255,125,.055)';
      for (let i = 1; i < CELLS; i += 1) {
        ctx.beginPath(); ctx.moveTo(i * unit, 0); ctx.lineTo(i * unit, PIXELS);
        ctx.moveTo(0, i * unit); ctx.lineTo(PIXELS, i * unit); ctx.stroke();
      }
      if (food) {
        ctx.fillStyle = '#ff596b'; ctx.beginPath();
        ctx.arc(food.x * unit + unit / 2, food.y * unit + unit / 2, unit * .34, 0, Math.PI * 2); ctx.fill();
      }
      snake.forEach((part, index) => {
        ctx.fillStyle = index === 0 ? '#b5ff6a' : '#54ed74';
        ctx.fillRect(part.x * unit + 2, part.y * unit + 2, unit - 4, unit - 4);
      });
      updateStatus();
    };
    const clearTimer = () => { if (timer !== null) clearTimeout(timer); timer = null; };
    const schedule = () => {
      clearTimer();
      if (started && !paused && !over) timer = setTimeout(step, currentDelay());
    };
    const end = () => {
      over = true; started = false; paused = false; clearTimer(); runButton.textContent = 'Play again'; paint();
      if (!resultSent) { resultSent = true; onResult('loss'); }
    };
    function step() {
      timer = null;
      if (!started || paused || over) return;
      direction = nextDirection;
      inputLocked = false;
      const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
      const eating = Boolean(food && head.x === food.x && head.y === food.y);
      const bodyToCheck = eating ? snake : snake.slice(0, -1);
      if (head.x < 0 || head.x >= CELLS || head.y < 0 || head.y >= CELLS || bodyToCheck.some((part) => part.x === head.x && part.y === head.y)) { end(); return; }
      snake.unshift(head);
      if (eating) {
        score += 1;
        if (score > best) { best = score; saveBest(best); }
        food = makeFood();
        if (!food) { end(); return; }
      } else snake.pop();
      paint();
      schedule();
    }
    function requestTurn(name) {
      if (over || inputLocked) return;
      const proposed = directions[name];
      if (!proposed || (proposed.x === -direction.x && proposed.y === -direction.y)) return;
      nextDirection = proposed;
      if (proposed.x !== direction.x || proposed.y !== direction.y) inputLocked = true;
      if (!started) updateStatus();
    }
    function toggleRun() {
      if (over) reset();
      if (!started) {
        started = true; paused = false; runButton.textContent = 'Pause';
        updateStatus(); schedule();
      } else if (paused) {
        paused = false; runButton.textContent = 'Pause'; updateStatus(); schedule();
      } else {
        paused = true; clearTimer(); runButton.textContent = 'Resume'; updateStatus();
      }
    }
    const keyHandler = (event) => {
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      const name = ({ arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' })[key];
      if (name) { event.preventDefault(); requestTurn(name); }
    };
    const pointerDown = (event) => {
      pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
      if (event.isTrusted && canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
    };
    const pointerUp = (event) => {
      if (!pointerStart || pointerStart.id !== event.pointerId) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
      event.preventDefault();
      requestTurn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    };
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', () => { pointerStart = null; });
    window.addEventListener('keydown', keyHandler);

    const runButton = makeButton('Start', toggleRun, 'primary-button');
    const restartButton = makeButton('Restart', reset);
    const speedSelect = makeSelect('Snake speed', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']], (value) => { speed = value; if (started && !paused) schedule(); else updateStatus(); });
    game.controls.append(runButton, restartButton, speedSelect);
    function reset() {
      clearTimer();
      snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      direction = directions.right; nextDirection = direction; food = makeFood(); score = 0;
      started = false; paused = false; over = false; resultSent = false; inputLocked = false;
      runButton.textContent = 'Start';
      paint();
    }
    reset();
    return () => {
      clearTimer();
      window.removeEventListener('keydown', keyHandler);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointerup', pointerUp);
    };
  },
};