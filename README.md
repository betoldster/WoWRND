# ⚔️ WoW M+ Randomizer

A private group tool for World of Warcraft Mythic+ teams. Randomly assigns roles, classes, specs, and a dungeon key for each session — with a dramatic animated reveal and sound effects.

## Features

### 🎲 Randomize
- Roster of up to **15 players** — toggle exactly 5 as active for each session
- Assigns **Tank, Healer, and 3× DPS** roles randomly, respecting each player's configured classes
- Results always display in order: **Tank → Heal → DPS → DPS → DPS**
- Animated slot-machine reveal (~7 seconds) with synthesized click and chime sounds
- After the reveal, each player checks which **dungeon keys** they have — duplicates raise the odds of that dungeon being picked
- Final dungeon rolled with a cycling animation and fanfare

### ⚙️ Setup
- Add up to 15 players with custom names and class selections
- Each player can have multiple classes configured (e.g. someone who plays both Druid and Warrior)
- Edit or remove players at any time — changes are saved to the server instantly

### 📜 History
- Tracks every roll with timestamp, full role/class/spec assignments, and dungeon
- Per-player **role distribution bar charts** (Tank / Heal / DPS percentages)
- Shows last 30 rolls in the recent rolls list
- **Reset History** button at the top of the view

### 🔊 Sound
- All sounds synthesized via the Web Audio API — no audio files
- Mute toggle in the header, persisted for the session

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS + HTML + CSS, single file, no build step |
| Backend | Netlify Function (Node.js) |
| Storage | Netlify Blobs |
| Auth | Shared group password via `X-Group-Password` header |
| Hosting | Netlify (free tier) |

---

## Quick Start (Local Dev)

1. **Install the Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file at the repo root:**
   ```
   GROUP_PASSWORD=your_dev_password
   ```

4. **Start the dev server:**
   ```bash
   netlify dev
   ```
   Open [http://localhost:8888](http://localhost:8888), enter the password, and set up your roster.

---

## Deploy to Netlify

1. Push this repo to GitHub or GitLab.

2. In the **Netlify dashboard**: New site → Import from Git → select your repo.

3. **Build settings:**
   - Build command: *(leave empty)*
   - Publish directory: `.`
   - Functions directory: `netlify/functions` *(auto-detected)*

4. **Environment variables** (Site Settings → Environment Variables):
   - `GROUP_PASSWORD` — your group's shared password. **Never commit this value.**

5. **Enable Blobs** (Site Settings → Blobs) if not auto-enabled.

6. Trigger a deploy, open the site URL, enter the password, and start adding players in the Setup tab.

---

## Maintenance

- **New M+ season:** Update `SEASON_DUNGEONS` in `index.html` with the new dungeon list.
- **Class/spec changes:** Update the `CLASSES` constant in `index.html` if Blizzard reworks specs.

---

## Limitations

- **Single shared password** — anyone with the password can edit or delete all data. Intentional for a private friend-group tool.
- **No per-user attribution** — you can't tell who made a specific change.
- **No real-time sync** — group members need to refresh to see the latest roll.
- **No backup UI** — export state manually with a `GET /.netlify/functions/state` request using the `X-Group-Password` header.
- **Password in sessionStorage** — plaintext, cleared when the tab is closed.
