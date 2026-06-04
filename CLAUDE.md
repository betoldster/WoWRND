# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

WoWRND is a web app for a World of Warcraft group with two game modes:

- **Mythic+ Randomizer** — randomly assigns each active player a role (Tank/Heal/DPS), class, and spec, then rolls a dungeon from the season pool. Up to 15 players on the roster; exactly 5 selected per roll. State is persisted server-side so all group members see the same result.
- **Zero 2 Hero** — draft mode for new characters. 5 players are selected from the roster; each bans up to 5 specs from their personal pool; a dramatic reveal assigns 1 Tank, 1 Heal, and 3 DPS. Fully client-side, no server state.

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

**Zero 2 Hero phase state machine**: `z2hPhase` drives the Zero 2 Hero tab:
- `idle` — player selection (pick 5 from roster)
- `banning` — sequential per player: spec ban grid (up to 5 personal bans). `z2hCurrentBanner` (0–4) tracks who's up. `z2hCurrentBans` holds in-progress selections. After the 5th player locks in, auto-advances to `ready`.
- `ready` — summary of all 5 players and their ban counts; "ROLL DESTINY" button
- `revealing` — dramatic reveal animation (30 name cycles, 800 ms settle per card). `runZ2HRevealAnimation()` does **not** call `render()` at the end — it DOM-swaps the skip/done buttons in place and sets `z2hPhase = 'done'`.
- `done` — settled assignment cards; "Roll Again" resets to `idle`

`z2hPlayers` holds `[{id, name, bans:[{class,spec}]}]` for the selected 5. `z2hAssignments` holds the final `[{playerName,role,class,spec}]`. `resetZ2H()` clears all z2h state. Bans are personal — they only remove specs from that player's own roll pool; `computeZ2HAssignments()` always returns a valid result (falls back to ignoring bans if a role pool is somehow exhausted). Results are sorted Tank → Heal → DPS × 3.

**Randomize phase state machine**: `rPhase` drives the entire Randomize view:
- `idle` — ritual gathering (class pills, ritual slots, cast button)
- `revealing` — slot card animation runs, then **pauses** with all cards settled; `◆ ENTER THE KEYSTONE PHASE ◆` button (disabled during animation, enabled after) advances manually
- `key-entry` — assignments settled, dungeon-code chip + key-level picker per player
- `done` — Tonight's Path (gold dungeon card, party comp, copy/new-session)

`rAssignments`, `rDungeon`, `rKeyPool`, `rKeyInputs`, `rKeyHolder`, `rKeyLevel` are populated as phases advance. `resetRandomize()` returns everything to `idle`.

**State flow**: `appState` is the single in-memory source of truth. Mutations optimistically update `appState`, call `saveState()`, and roll back on failure. The server's PUT response becomes the new `appState` (server adds `updatedAt`).

**Responsive scaling**: `html { font-size: 17px }` is the default base (set directly, before media queries). Breakpoints: 1440p → 19px, 1920p → 21px, 2560p+ → 23px. All font sizes in CSS use `rem` — never hardcoded `px`. Must target `html`, not `body`, for rem to scale correctly.

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
- **`CLASS_COLORS`** — official WoW hex color per class, used for colored player names and LUST/BREZ stat tiles.
- **`SEASON_DUNGEONS`** — 8 dungeons for Mythic+ Midnight Season 1.
- **`ROLE_COLORS`** — Tank `#3b6cd9`, Heal `#3cc977`, DPS `#e34a4a`.
- **`DUNGEON_CODES`** — short 2–3 letter codes per dungeon (e.g. `"Skyreach": "SR"`), used in key-entry chips and Chronicle distribution.
- **`DUNGEON_IMAGES`** — map of dungeon name → Wowhead CDN image URL, shown as artwork on the Tonight's Path card. Add entries when dungeons are added.
- **`AFFIX_BARGAIN`**, **`AFFIX_GUILE`**, **`AFFIX_GUIDANCE`** — static affix name strings for Midnight Season 1.
- **`affixesForLevel(level)`** — derives the correct affix tag list from a numeric key level: nothing for null, Lindormi's Guidance for 2–4, Tyrannical/Fortified + Bargain for 5–11, both forts + Guile for 12+.
- **`SEASON_LABEL`** / **`CURRENT_SEASON`** — season strings used in the footer and page title. Update manually each season.

To update when the season changes: edit `SEASON_DUNGEONS`, `DUNGEON_IMAGES`, `SEASON_LABEL`, `CURRENT_SEASON`, and `affixesForLevel()` thresholds if needed.  
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
- **`rem` scaling**: font-size must be set on `html` (not `body`) for `rem` units to scale. The large-screen media queries target `html`. Never add a hardcoded `px` font size to CSS — use `rem`.
- **Design tokens**: all colors, fonts, and spacing use CSS custom properties defined on `:root`. Gold (`--gold`) is reserved for the dungeon-reveal screen only; use `--keystone` (`#a86bff`) as the primary accent everywhere else.
- **`hidden` attribute**: elements with explicit `display` CSS need `[hidden] { display: none !important }` or `element.hidden = true` has no visual effect.
- **`@netlify/blobs` storage**: raw string round-trip is used (`store.set(key, JSON.stringify(obj))`) rather than the `setJSON` convenience method, for reliability across package versions.
- **Dungeon art img sizing**: the `<img>` inside `.dungeon-art` is `position: absolute; inset: 0` so its intrinsic dimensions don't drive the container height. The container height is set by the flex/grid layout. `object-fit: cover` crops the image to fill.
- **Reveal animation pause**: `runRevealAnimation()` does NOT call `render()` or advance `rPhase` at the end. It DOM-swaps the skip button visibility and enables the advance button in place. Any `render()` call at the end would destroy the settled card DOM state. `advanceToKeystones()` is the only place that sets `rPhase = 'key-entry'` and calls `render()`. The same pattern applies to `runZ2HRevealAnimation()` — it sets `z2hPhase = 'done'` and DOM-swaps the buttons without calling `render()`.
- **Zero 2 Hero is client-side only**: `z2h*` state variables are never persisted to the server. `netlify/functions/state.js` is unaware of Z2H. Do not add Z2H data to `appState` or the PUT payload.
