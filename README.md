# ⚔️ WoW M+ Randomizer

A group tool for a 5-player World of Warcraft Mythic+ team. Randomly assigns roles (Tank, Healer, DPS), class, spec, and a dungeon for each session.

## Quick Start (Local Dev)

1. **Install the Netlify CLI** (if you don't have it):
   ```bash
   npm install -g netlify-cli
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a local `.env` file:**
   ```
   GROUP_PASSWORD=your_dev_password
   ```

4. **Start the dev server:**
   ```bash
   netlify dev
   ```
   Open [http://localhost:8888](http://localhost:8888) in your browser and enter the password you set above.

## Deploy to Netlify

1. **Push to a GitHub or GitLab repository.**

2. **In the Netlify dashboard:** New site → Import from Git → select your repo.

3. **Build settings:**
   - Build command: *(leave empty)*
   - Publish directory: `.`
   - Functions directory: `netlify/functions` *(auto-detected)*

4. **Environment variables** (Site Settings → Environment Variables):
   - `GROUP_PASSWORD` — the shared password for your group. Pick something memorable but not trivial. **Never commit this value.**

5. **Enable Blobs** (Site Settings → Blobs) if it isn't enabled automatically.

6. **Trigger a deploy.** Open the site URL, enter the password, and set up your roster in the Setup tab.

## Usage

1. **Setup tab** — Add up to 7 players. For each player, set their name and which classes they play.
2. **Randomize tab** — Toggle exactly 5 active players, then hit **🎲 RANDOMIZE ROLES**. Watch the dramatic reveal, then check which dungeons each player has a key for and hit **🗝️ ROLL KEY**.
3. **History tab** — View role distribution stats per player and a log of past rolls.

## Maintenance

- **New M+ season:** Update the `SEASON_DUNGEONS` array in `index.html` with the new season's dungeons.
- **Class/spec changes:** Update the `CLASSES` constant in `index.html` if Blizzard reworks specs.

## Limitations

- **Single shared password** — anyone who knows the password can edit or delete all data. This is intentional for a private friend-group tool.
- **No per-user attribution** — you can't see who made a specific change.
- **No real-time sync** — group members need to refresh to see the latest roll.
- **No backup UI** — you can manually export the current state by hitting `GET /.netlify/functions/state` with the `X-Group-Password` header.
- **No rate limiting in code** — Netlify's free-tier function limits are sufficient for private group use.
- **Password in sessionStorage** — stored in plaintext, cleared when the browser tab is closed.
