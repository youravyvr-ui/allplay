# ALLPLAY

A responsive, dependency-free browser game platform. The current release is a local-first library of fourteen playable games, with search, category filters, favorites, recently played, a local profile, and light/dark themes. Seven competitive titles offer same-device PvP and local AI; chess uses a customizable approximate Elo scale.

## Architecture

- `js/catalog.js` is the catalog and the single place to register game modules and player/mode/rules metadata.
- Each independent module in `js/games/` exports `mount(root, { onQuit, onResult })`. It owns its rules and input, uses the shared frame in `js/game-ui.js`, and may return a cleanup function for timers and global listeners.
- `js/main.js` handles navigation, catalog search/filtering, local profile state, favorites, recent games, theme, and module lifecycle.
- `styles.css` and `index.html` provide a responsive, accessible shell. There is no build step, package manager, framework, or third-party runtime dependency.

## Run and cost

Open `index.html` through the app's web preview/Run. The dependency-free browser interaction checks are available at `tests.html` and exercise the shipped game modules, including multiplayer and AI turns. The site needs no server for gameplay and has no unavoidable Phase 1 infrastructure cost. Static hosting can be free depending on the chosen provider. Online accounts, matchmaking, cloud saves, public leaderboards, and purchases are intentionally not implemented; those features would require a secure backend and provider-specific operating/transaction costs before they can be offered.

## Current limits

Multiplayer and computer opponents run locally on the same device; there is no online matchmaking. Solo games remain playable without an opponent. Favorites, recent games, theme, and basic statistics use this browser's local storage and do not sync. There are no ads, subscriptions, checkout, online rooms, accounts, or real-money claims. Add games as tested modules rather than publishing placeholder catalog entries.
