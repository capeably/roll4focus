# Roll 4 Focus

A gamified Pomodoro timer app with a dark fantasy RPG aesthetic.

## Tech Stack
- **Vanilla HTML/CSS/JS** — no frameworks, no build tools, no bundler
- Open `index.html` directly in a browser to run
- All state persisted to `localStorage` under key `r4f_state`
- Custom sounds stored as base64 data URLs in localStorage (`r4f_sound_*` keys)

## Project Structure
```
index.html        ← HTML markup + <script>/<link> tags
css/styles.css    ← All styling
js/utils.js       ← Helpers: escapeHtml, showToast, modal manager
js/state.js       ← State defaults, persistence (save/load/markDirty)
js/sound.js       ← Sound module with registry pattern
js/battle.js      ← Battle system factory, DC helpers, minion countdown
js/timer.js       ← Session timer, break timer, session result
js/settings.js    ← SETTINGS_MAP, hydrate/read/save, config import/export
js/ui.js          ← Stats display, edit modals, dice names, metrics, logs, notes, tabs
js/app.js         ← Roll logic, init(), keyboard shortcuts, DOMContentLoaded
```

## Architecture
- Scripts load in order via `<script>` tags — each can use globals from earlier scripts
- `state` object is global and shared across all modules
- `Sound` object is global with a registry pattern for audio channels
- `createBattleSystem()` is a factory that produces `BossBattle` and `MinionBattle` instances
- CSS uses custom properties (design tokens) defined as `:root` variables
- Modals use `.modal-overlay.show` class toggling
- Tooltips use `.tip[data-tooltip]` CSS pattern
- Settings are mapped bidirectionally via `SETTINGS_MAP` array

## Conventions
- No build step — edit files and refresh browser
- State changes go through `markDirty()` which debounces a save after 1.5s
- Sound channels are registered with `Sound.register()` and played with `Sound.play(key)`
- HTML `onclick` handlers call global functions (wrapper aliases for module methods)
