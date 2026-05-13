# CLAUDE.md — WoWRND

## Project Purpose

WoWRND is a Mythic+ randomizer web app for a 5-person World of Warcraft group. It randomly assigns each player a class, spec, and role for a random dungeon from the current Mythic+ season pool. State (assignments, history) is persisted server-side so all group members see the same result.

---

## Project Structure

```
/
├── index.html                 # Entire frontend: HTML, CSS (inline), JS (inline)
├── netlify.toml               # Netlify config, redirect rules, security headers (CSP)
├── netlify/
│   └── functions/
│       └── state.js           # Serverless function: GET/PUT shared group state
├── package.json               # Single runtime dep: @netlify/blobs
├── README.md
└── .gitignore
```

There is no build step. The Netlify publish directory is `.` (repo root). `index.html` is the entire frontend — do not split it into separate JS or CSS files.

---

## Development Commands

```bash
# Install dependencies (only @netlify/blobs)
npm install

# Start local dev server with live Netlify Functions support
netlify dev
```

Deployment is fully automated: push to the main branch and Netlify CI deploys. There is no manual build command.

Manual testing is done via browser at the URL served by `netlify dev`. There is no test framework.

---

## Architecture Notes

**Frontend (`index.html`)**
- Single file. All CSS and JS are inline — no external scripts, no module bundler.
- Three views rendered in-place: Randomize, Setup, History.
- Dark WoW theme: background `#0a0a0f`, gold accent `#ffd100`. Each WoW class has its own CSS custom property for color.
- Reveal animation uses the Web Audio API (synthesized tones — no audio files).
- Communicates with the backend exclusively via `fetch` calls to `/.netlify/functions/state`.

**Backend (`netlify/functions/state.js`)**
- Single Netlify Function, accessible at `/.netlify/functions/state`.
- `GET` — returns the current shared state JSON (assignments + history). Returns a safe empty default on first run.
- `PUT` — accepts updated state, persists it, trims history to a maximum of 200 entries, returns the saved state.
- State is stored in Netlify Blobs (no external database).

**Auth**
- All mutating requests must include the `X-Group-Password` header.
- The function compares it against the `GROUP_PASSWORD` environment variable using constant-time comparison (`crypto.timingSafeEqual` from Node's built-in `crypto` module — never a plain `===` string compare on secrets).

---

## Key Implementation Constraints

**Security**
- Auth comparison MUST use `crypto.timingSafeEqual`. Do not replace it with `===`.
- All user-supplied strings rendered into HTML MUST be HTML-escaped. No `innerHTML` with raw/unescaped data.
- No `eval`, `new Function(string)`, or dynamic code execution anywhere.
- CSP headers are defined in `netlify.toml` — do not weaken them.

**Randomization**
- Class/spec/dungeon selection MUST use a Fisher-Yates shuffle. Do not use `Array.sort(() => Math.random() - 0.5)` — it produces a statistically biased result.

**State**
- History array is capped at 200 entries. Trimming happens in `state.js` on PUT, not in the frontend.

---

## Game Data Constants

All WoW game data lives as constants inside `index.html`:

- **Classes (13):** Death Knight, Demon Hunter, Druid, Evoker, Hunter, Mage, Monk, Paladin, Priest, Rogue, Shaman, Warlock, Warrior — each with their specs and eligible roles (TANK / HEAL / DPS).
- **Dungeons (8, Mythic+ Season 1 "Midnight" pool):** plain array of dungeon name strings.
- **Roles:** `TANK`, `HEAL`, `DPS` — the randomizer must respect role eligibility per spec.

To update when the season changes: edit only the dungeons array in `index.html`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROUP_PASSWORD` | Yes | Shared password for all group members. Set in Netlify dashboard under Site Settings > Environment Variables. Never commit this value. |

For local development, create a `.env` file at the repo root (gitignored):

```
GROUP_PASSWORD=your_local_dev_password
```

`netlify dev` loads `.env` automatically.

---

## Out of Scope / Non-Goals

- No individual user accounts — one shared group password only.
- No external database — Netlify Blobs only.
- No build/CI test suite — manual browser testing via `netlify dev`.
- No real-time sync — members refresh manually.
- No support for multiple WoW seasons simultaneously — update dungeon list manually on season rotation.
