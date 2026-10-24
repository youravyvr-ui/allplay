import games from './catalog.js';

const main = document.querySelector('#main-content');
const searchInput = document.querySelector('#game-search');
const themeButton = document.querySelector('#theme-toggle');
const profileButton = document.querySelector('#profile-button');
const STORAGE_KEY = 'allplay-v1';
const defaultData = { favorites: [], recent: [], launches: 0, wins: 0, draws: 0, theme: 'dark' };
let saved = loadData();
let view = 'discover';
let category = 'All';
let activeGame = null;
let cleanupGame = null;

function loadData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...defaultData, ...parsed, favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [], recent: Array.isArray(parsed.recent) ? parsed.recent : [] };
  } catch {
    return { ...defaultData };
  }
}

function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch { /* Local play remains available if storage is blocked. */ }
}

function applyTheme() {
  document.documentElement.dataset.theme = saved.theme === 'light' ? 'light' : 'dark';
  themeButton.setAttribute('aria-label', saved.theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  themeButton.textContent = saved.theme === 'light' ? '☾' : '☼';
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function setActiveNav() {
  document.querySelectorAll('.nav-button').forEach((button) => button.classList.toggle('active', button.dataset.nav === view));
}

function gameCard(game) {
  const isFavorite = saved.favorites.includes(game.id);
  return `<article class="game-card">
    <div class="game-cover" style="--cover:${game.cover}">
      <span class="game-badge">${escapeHTML(game.badge)}</span>
      <span class="game-icon" aria-hidden="true">${game.icon}</span>
      <button class="favorite-button ${isFavorite ? 'is-favorite' : ''}" type="button" data-favorite="${game.id}" aria-label="${isFavorite ? 'Remove from' : 'Add to'} favorites" aria-pressed="${isFavorite}">${isFavorite ? '♥' : '♡'}</button>
    </div>
    <div class="game-card-info">
      <h3 class="game-card-title">${escapeHTML(game.name)}</h3>
      <div class="game-card-meta"><span>${escapeHTML(game.category)}</span><span>● &nbsp;Ready to play</span></div>
      <div class="game-card-bottom"><span class="player-label">${escapeHTML(game.players)}</span><button class="play-link" type="button" data-open="${game.id}">PLAY NOW &nbsp;→</button></div>
    </div>
  </article>`;
}

function visibleGames() {
  const query = searchInput.value.trim().toLowerCase();
  let list = games.filter((game) => {
    const matchesCategory = category === 'All' || game.category === category;
    const matchesQuery = !query || `${game.name} ${game.category} ${game.description}`.toLowerCase().includes(query);
    const matchesView = view === 'favorites' ? saved.favorites.includes(game.id) : view === 'recent' ? saved.recent.includes(game.id) : true;
    return matchesCategory && matchesQuery && matchesView;
  });
  if (view === 'recent') list = list.sort((a, b) => saved.recent.indexOf(a.id) - saved.recent.indexOf(b.id));
  return list;
}

function renderCards() {
  const grid = document.querySelector('#game-grid');
  if (!grid) return;
  const list = visibleGames();
  grid.innerHTML = list.length ? list.map(gameCard).join('') : `<div class="empty-state"><div class="empty-icon">${view === 'favorites' ? '♡' : '⌕'}</div><h3>${view === 'favorites' ? 'Your collection starts here' : 'No games found'}</h3><p>${view === 'favorites' ? 'Tap the heart on any game to save it here.' : 'Try a different search or category.'}</p></div>`;
}

function renderHome() {
  setActiveNav();
  const sectionTitle = view === 'favorites' ? 'My games' : view === 'recent' ? 'Recently played' : 'Find your next favorite';
  const sectionDescription = view === 'favorites' ? 'Your saved games, ready whenever you are.' : view === 'recent' ? 'Pick up where you left off on this device.' : 'A hand-picked starter library. Every tile below opens a fully playable game.';
  const categories = ['All', ...new Set(games.map((game) => game.category))];
  main.innerHTML = `<div class="page-wrap">
    <section class="hero">
      <div class="hero-copy"><p class="eyebrow"><span class="eyebrow-dot"></span> YOUR NEXT GAME NIGHT STARTS HERE</p><h1>Good games.<br><span>All in one place.</span></h1><p>Quick matches, clever puzzles, and friendly rivalries. Pick a game and jump straight in — no account, install, or payment needed.</p><div class="hero-actions"><button class="primary-button" type="button" data-action="browse">Explore the library <span>→</span></button><span class="hero-note">Play now · Free · No sign-up</span></div></div>
      <div class="hero-art" aria-hidden="true"><span class="art-spark spark-one">✦</span><div class="art-tile art-tile-left">♟</div><div class="art-tile art-tile-right">✦</div><div class="art-tile art-tile-main">🎮</div><span class="art-spark spark-two">✦</span></div>
    </section>
    <section class="overview-row" aria-label="Platform highlights"><div class="overview-card"><span class="overview-icon">▦</span><div><strong>${games.length} playable games</strong><span>Real games, ready to play</span></div></div><div class="overview-card"><span class="overview-icon">◎</span><div><strong>Local-first</strong><span>Pass-and-play & solo modes</span></div></div><div class="overview-card"><span class="overview-icon">♧</span><div><strong>Free to play</strong><span>No checkout or account</span></div></div></section>
    <section id="library-section"><div class="section-heading"><div><h2>${sectionTitle}</h2><p>${sectionDescription}</p></div><button class="section-link" type="button" data-action="profile">Your local stats ↗</button></div>
      <div class="filter-row" aria-label="Filter games by category">${categories.map((item) => `<button type="button" class="filter-chip ${category === item ? 'active' : ''}" data-category="${escapeHTML(item)}">${escapeHTML(item)}</button>`).join('')}</div>
      <div class="game-grid" id="game-grid"></div>
    </section>
    <section class="info-panel" style="margin-top:30px"><h2>Play together, right here</h2><p>Games marked local multiplayer share one device. Online rooms, accounts, payments, and cloud saves are not enabled in this starter release, so we never label a game as online or imply a purchase is available. The library is designed to grow through independent game modules.</p></section>
  </div>`;
  renderCards();
}

function renderDetail(game) {
  setActiveNav();
  main.innerHTML = `<div class="page-wrap"><div class="detail-layout"><div class="detail-cover" style="--cover:${game.cover}"><span class="game-icon" aria-hidden="true">${game.icon}</span></div><section class="detail-copy"><button class="back-link" type="button" data-action="back">← Back to library</button><p class="eyebrow"><span class="eyebrow-dot"></span>${escapeHTML(game.category)} · ${escapeHTML(game.badge)}</p><h1>${escapeHTML(game.name)}</h1><p>${escapeHTML(game.description)}</p><div class="detail-meta"><span class="meta-pill">${escapeHTML(game.players)}</span><span class="meta-pill">${escapeHTML(game.mode)}</span><span class="meta-pill">Free to play</span></div><div class="rules-box"><h3>How to play</h3><p>${escapeHTML(game.rules)}</p></div><div class="local-note"><span>●</span><span>This game runs on your device. Online multiplayer is not available for this title.</span></div><button class="primary-button" type="button" data-action="play" data-id="${game.id}">Start game <span>→</span></button> <button class="secondary-button" type="button" data-favorite="${game.id}">${saved.favorites.includes(game.id) ? '♥ Saved' : '♡ Save game'}</button></section></div></div>`;
}

function renderProfile() {
  setActiveNav();
  main.innerHTML = `<div class="page-wrap profile-page"><button class="back-link" type="button" data-action="back">← Back to library</button><section class="profile-hero"><span class="profile-avatar-large">P</span><div><h1>Player One</h1><p>Local profile · Saved only on this device</p></div></section><div class="profile-stats"><div class="stat-card"><strong>${saved.launches}</strong><span>Games started</span></div><div class="stat-card"><strong>${saved.wins}</strong><span>Rounds won</span></div><div class="stat-card"><strong>${saved.favorites.length}</strong><span>Saved games</span></div></div><section class="info-panel"><h2>Your data, on this device</h2><p>This starter profile is stored locally in this browser. There are no online accounts, public leaderboards, friends, or cloud sync yet. Closing the browser or clearing its site data may remove your history.</p></section></div>`;
}

function stopCurrentGame() {
  if (cleanupGame) cleanupGame();
  cleanupGame = null;
  activeGame = null;
}

function openGame(game) {
  activeGame = game;
  saved.launches += 1;
  saved.recent = [game.id, ...saved.recent.filter((id) => id !== game.id)].slice(0, 8);
  saveData();
  renderPlay();
}

function renderPlay() {
  setActiveNav();
  main.innerHTML = `<div class="page-wrap game-screen"><div id="game-mount"></div></div>`;
  const mount = document.querySelector('#game-mount');
  cleanupGame = activeGame.engine.mount(mount, {
    onQuit: () => { stopCurrentGame(); renderHome(); },
    onResult: (result) => {
      if (result === 'win') saved.wins += 1;
      if (result === 'draw') saved.draws += 1;
      saveData();
    },
  });
}

function openById(id) {
  const game = games.find((item) => item.id === id);
  if (!game) return;
  activeGame = game;
  renderDetail(game);
}

function toggleFavorite(id) {
  saved.favorites = saved.favorites.includes(id) ? saved.favorites.filter((item) => item !== id) : [...saved.favorites, id];
  saveData();
  if (activeGame && main.querySelector('.detail-copy')) renderDetail(activeGame);
  else if (main.querySelector('#game-grid')) renderCards();
}

document.querySelectorAll('.nav-button').forEach((button) => button.addEventListener('click', () => {
  stopCurrentGame();
  view = button.dataset.nav;
  category = 'All';
  renderHome();
}));

main.addEventListener('click', (event) => {
  const favorite = event.target.closest('[data-favorite]');
  if (favorite) { toggleFavorite(favorite.dataset.favorite); return; }
  const open = event.target.closest('[data-open]');
  if (open) { openById(open.dataset.open); return; }
  const categoryButton = event.target.closest('[data-category]');
  if (categoryButton) { category = categoryButton.dataset.category; renderHome(); return; }
  const navigation = event.target.closest('[data-nav]');
  if (navigation) { stopCurrentGame(); view = navigation.dataset.nav; category = 'All'; renderHome(); return; }
  const action = event.target.closest('[data-action]');
  if (!action) return;
  if (action.dataset.action === 'browse') { document.querySelector('#library-section')?.scrollIntoView({ behavior: 'smooth' }); }
  if (action.dataset.action === 'profile') { stopCurrentGame(); renderProfile(); }
  if (action.dataset.action === 'back') { stopCurrentGame(); renderHome(); }
  if (action.dataset.action === 'play') { const game = games.find((item) => item.id === action.dataset.id); if (game) openGame(game); }
});

searchInput.addEventListener('input', () => {
  if (!main.querySelector('#game-grid')) { stopCurrentGame(); view = 'discover'; category = 'All'; renderHome(); searchInput.focus(); }
  else renderCards();
});
searchInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') main.querySelector('#library-section')?.scrollIntoView({ behavior: 'smooth' }); });
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && document.activeElement !== searchInput && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) { event.preventDefault(); searchInput.focus(); }
  if (event.key === 'Escape' && activeGame) { stopCurrentGame(); renderHome(); }
});
themeButton.addEventListener('click', () => { saved.theme = saved.theme === 'light' ? 'dark' : 'light'; saveData(); applyTheme(); });
profileButton.addEventListener('click', () => { stopCurrentGame(); renderProfile(); });
applyTheme();
renderHome();
