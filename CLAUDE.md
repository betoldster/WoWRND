# CLAUDE.md — WoWRND

## Status

**v1 complete. No open tasks.**

GitHub: https://github.com/betoldster/WoWRND  
Deployed via Netlify CI on push to `main`.

---

## Project Purpose

WoWRND is a Mythic+ randomizer web app for a World of Warcraft group. It randomly assigns each active player a role (Tank/Heal/DPS), class, and spec, then rolls a dungeon from the season pool. Up to 15 players can be on the roster; exactly 5 are selected per roll. State is persisted server-side so all group members see the same result.

---

## Project Structure

```
/
├── index.html                 # Entire frontend: HTML, CSS (inline), JS (inline)
├── netlify.toml               # Netlify config + CSP/security headers
├── netlify/
│   └── functions/
│       └── state.js           # Netlify Function v2: GET/PUT shared group state
├── package.json               # Single runtime dep: @netlify/blobs ^10.7.5
├── README.md
├── LICENSE
└── .gitignore
```

There is no build step. The Netlify publish directory is `.` (repo root). `index.html` is the entire frontend — do not split it into separate JS or CSS files.

---

## Development Commands

```bash
# Install dependencies
npm install

# Start local dev server with live Netlify Functions support
netlify dev
```

Deployment is fully automated: push to `main` and Netlify CI deploys. No build command needed.

Manual testing is done via browser at the URL served by `netlify dev`. There is no test framework.

---

## Architecture Notes

**Frontend (`index.html`)**
- Single file. All CSS and JS are inline — no external scripts, no module bundler.
- Three views rendered in-place: Randomize, Setup, History.
- Dark WoW theme: background `#0a0a0f`, gold accent `#ffd100`.
- Reveal animation: sequential slot reveal (~7s), then dungeon roll with fanfare. All sounds synthesized via Web Audio API — no audio files.
- Communicates with the backend exclusively via `fetch` to `/.netlify/functions/state`.
- Responsive scaling: base 16px font / 1200px layout. At 1440p: 20px / 1500px. At 1920p: 23px / 1800px. All sizing in `rem` so scaling is controlled via `html { font-size }` in media queries.
- Roll results always display in order: Tank → Heal → DPS → DPS → DPS.
- Password cached in `sessionStorage` (cleared on tab close).

**Backend (`netlify/functions/state.js`)**
- Netlify Function v2 — uses `req.method`, `req.headers.get()`, `req.json()`, returns `new Response(...)`.
- `GET` — returns current state JSON. Returns empty default `{ version:1, players:[], history:[] }` on first run.
- `PUT` — validates and persists updated state. Trims history to 200 entries server-side.
- Storage: Netlify Blobs, store `wow-mplus`, key `state`.

**Auth**
- Every request requires `X-Group-Password` header compared against `GROUP_PASSWORD` env var.
- Uses `crypto.timingSafeEqual` on `Buffer` instances. Returns `false` immediately if `GROUP_PASSWORD` is unset or byte lengths differ (never short-circuits on content).

---

## Key Implementation Constraints

**Security**
- Auth MUST use `crypto.timingSafeEqual`. Never `===` on secrets.
- All user-supplied strings rendered into HTML MUST go through `esc()` (the HTML-escape helper). No raw `innerHTML` with user data.
- No `eval`, `new Function(string)`, or dynamic code execution.
- CSP headers in `netlify.toml` — do not weaken them.
- `#pw-overlay[hidden], #app[hidden] { display: none !important }` is required — these elements have explicit `display` values that would otherwise override the `hidden` attribute.

**Randomization**
- MUST use Fisher-Yates shuffle (`shuffle()` helper). Never `Array.sort(() => Math.random() - 0.5)`.

**State**
- Max 15 players (`MAX_PLAYERS = 15` in `state.js`). Validated server-side on every PUT.
- History capped at 200 entries, trimmed in `state.js` on PUT (not in the frontend).

---

## Game Data Constants

All WoW game data lives as JS constants in `index.html`:

- **`CLASSES`** — 13 classes, each with specs and eligible roles (`TANK` / `HEAL` / `DPS`).
- **`CLASS_COLORS`** — official WoW hex color per class, used for colored player names.
- **`SEASON_DUNGEONS`** — 8 dungeons for Mythic+ Midnight Season 1.
- **`ROLE_COLORS`** — Tank `#2a4d8a`, Heal `#2a8a4d`, DPS `#8a2a2a`.

To update when the season changes: edit `SEASON_DUNGEONS` in `index.html` only.  
To update after a class/spec rework: edit `CLASSES` in `index.html` only.

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

- **`rem` scaling**: font-size must be set on `html` (not `body`) for `rem` units to scale. The large-screen media queries target `html`.
- **`hidden` attribute**: elements with explicit `display` CSS need `[hidden] { display: none !important }` or `element.hidden = true` has no visual effect.
- **Netlify Function v2 API**: the function uses `req.method` / `req.headers.get()` / `await req.json()` / `new Response()` — not the v1 `event.httpMethod` / `exports.handler` style.
- **`@netlify/blobs` storage**: uses `store.set(key, JSON.stringify(obj))` and `JSON.parse(await store.get(key))`. The `setJSON` convenience method exists but raw string round-trip is used for reliability across package versions.

---

## Out of Scope / Non-Goals

- No individual user accounts — one shared group password.
- No external database — Netlify Blobs only.
- No test suite — manual browser testing via `netlify dev`.
- No real-time sync — members refresh manually.
- No multi-season support — update `SEASON_DUNGEONS` manually on rotation.
