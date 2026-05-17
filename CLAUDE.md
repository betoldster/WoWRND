# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

WoWRND is a Mythic+ randomizer web app for a World of Warcraft group. It randomly assigns each active player a role (Tank/Heal/DPS), class, and spec, then rolls a dungeon from the season pool. Up to 15 players can be on the roster; exactly 5 are selected per roll. State is persisted server-side so all group members see the same result.

GitHub: https://github.com/betoldster/WoWRND  
Deployed via Netlify CI on push to `main`.

---

## Development Commands

```bash
# Install dependencies
npm install

# Start local dev server with live Netlify Functions support
netlify dev
```

Deployment is fully automated: push to `main` and Netlify CI deploys. No build command needed. Manual testing is done via browser at the URL served by `netlify dev`. There is no test framework.

---

## Architecture

**There is no build step.** `index.html` is the entire frontend — all CSS and JS are inline. Do not split it into separate files. The Netlify publish directory is `.` (repo root).

### Frontend (`index.html`)

**Rendering pattern**: Each view renders itself by building an HTML string and assigning it to `main.innerHTML`. There is no virtual DOM or framework. Event handlers are either inline `onclick` attributes or re-attached after each `render()` call. When editing the render functions, be aware that any DOM state (checked checkboxes, focus) is destroyed on re-render.

**Randomize phase state machine**: `rPhase` drives the entire Randomize view:
- `idle` — player selection, roll button shown
- `revealing` — slot-machine animation running (`isAnimating = true`)
- `key-entry` — assignments settled, key checkbox grid shown
- `done` — dungeon revealed, "Randomize Again" shown

`rAssignments`, `rDungeon`, and `rKeyPool` are populated as phases advance. `resetRandomize()` returns everything to `idle`.

**State flow**: `appState` is the single in-memory source of truth. Mutations optimistically update `appState`, call `saveState()`, and roll back on failure. The server's PUT response becomes the new `appState` (server adds `updatedAt`).

**Responsive scaling**: `html { font-size }` is set in media queries (1440p: 20px, 1920p: 23px). All sizing uses `rem` so scaling flows through automatically. Must target `html`, not `body`.

**Audio**: All sounds synthesized via Web Audio API — `playClick()` during slot rolling, `playSettle()` on each assignment lock-in, `playFanfare()` on dungeon reveal. No audio files.

**Auth**: Password stored in `sessionStorage` (key `wow_pw`) and sent as `X-Group-Password` on every request. Cleared on tab close.

### Backend (`netlify/functions/state.js`)

Netlify Function v2 — uses `req.method`, `req.headers.get()`, `req.json()`, `new Response(...)`. Not the v1 `event.httpMethod` / `exports.handler` style.

- `GET` — returns current state or `{ version:1, players:[], history:[] }` on first run.
- `PUT` — validates, trims history to 200 entries, persists, returns updated state.
- Storage: Netlify Blobs, store `wow-mplus`, key `state`. Uses raw `store.set(key, JSON.stringify(obj))` / `JSON.parse(await store.get(key))`.

---

## Key Constraints

**Security**
- Auth MUST use `crypto.timingSafeEqual`. Never `===` on secrets.
- All user-supplied strings rendered into HTML MUST go through `esc()`. No raw `innerHTML` with user data.
- No `eval`, `new Function(string)`, or dynamic code execution.
- CSP headers in `netlify.toml` — do not weaken them.
- `#pw-overlay[hidden], #app[hidden] { display: none !important }` is required — these elements have explicit `display` values that would otherwise override the `hidden` attribute.

**Randomization**
- MUST use Fisher-Yates shuffle (`shuffle()` helper). Never `Array.sort(() => Math.random() - 0.5)`.

**Roll results** always display in order: Tank → Heal → DPS → DPS → DPS (sorted in `handleRandomize()` before animation).

**State**
- Max 15 players (`MAX_PLAYERS = 15` in `state.js`). Validated server-side on every PUT.
- History capped at 200 entries, trimmed in `state.js` on PUT (not in the frontend).

---

## Game Data Constants (in `index.html`)

- **`CLASSES`** — 13 classes, each with specs and eligible roles (`TANK` / `HEAL` / `DPS`).
- **`CLASS_COLORS`** — official WoW hex color per class, used for colored player names.
- **`SEASON_DUNGEONS`** — 8 dungeons for Mythic+ Midnight Season 1.
- **`ROLE_COLORS`** — Tank `#2a4d8a`, Heal `#2a8a4d`, DPS `#8a2a2a`.

To update when the season changes: edit `SEASON_DUNGEONS` only.  
To update after a class/spec rework: edit `CLASSES` only.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROUP_PASSWORD` | Yes | Shared password for all group members. Set in Netlify: Site Settings → Environment Variables. Never commit. |

For local dev, create `.env` at repo root (already gitignored):
```
GROUP_PASSWORD=your_local_dev_password
```
`netlify dev` loads it automatically.

---

## Known Gotchas

- **Netlify Function v2 API**: the function uses `req.method` / `req.headers.get()` / `await req.json()` / `new Response()` — not the v1 `event.httpMethod` / `exports.handler` style.
- **`rem` scaling**: font-size must be set on `html` (not `body`) for `rem` units to scale. The large-screen media queries target `html`.
- **`hidden` attribute**: elements with explicit `display` CSS need `[hidden] { display: none !important }` or `element.hidden = true` has no visual effect.
- **`@netlify/blobs` storage**: raw string round-trip is used (`store.set(key, JSON.stringify(obj))`) rather than the `setJSON` convenience method, for reliability across package versions.
