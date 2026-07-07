# momento.motion

Dark, cinematic, music-led website for the momento.motion Afro House / Tech House / House initiative.

Two pages:
- **index.html** — public events landing page (site entry) (hero video, upcoming event, sound, artists, past moments).
- **epk.html** — industry-facing electronic press kit.

## Editable content (no code needed)

All client-editable content lives in **`/content/`** as JSON — nothing is hardcoded in the layout:

| File | Controls |
|------|----------|
| `content/site.json` | social links, ticket links, contact details, legal/footer text |
| `content/events.json` | hero copy, upcoming event (date, venue, lineup, ticket links, poster), sound + artists copy, past events / gallery |
| `content/epk.json` | EPK hero, quick facts, about, philosophy, sound/curation/production, media archive, team, contact |

Change a value, commit, and the site updates. Images referenced in the JSON live in `/assets/`.

## Hosting on GitHub Pages

1. Push this folder to a GitHub repo.
2. Repo → **Settings → Pages** → Source: `main` branch, root.
3. The site is served at `https://<user>.github.io/<repo>/`.
4. The site opens at the root — `index.html` is the Events page; the EPK is at `.../epk.html`.

Everything is static (HTML + JSON + assets). The content JSON is loaded at runtime via `fetch()`, which works on GitHub Pages.

> Note: content loads over `fetch`, so preview it through a local web server (e.g. `npx serve`) rather than opening the file directly with `file://`.

## Optional: Decap CMS (client-friendly editing UI)

A ready Decap CMS setup is in **`/admin/`** so a non-technical client can edit the JSON through a web form. `backend.repo` in `admin/config.yml` is already set to `aleeeksanndraa/momento-motion`.

Auth is handled by **[DecapBridge](https://decapbridge.com)** (Netlify Identity is deprecated, and GitHub Pages can't run its own OAuth handshake):

1. Sign up at decapbridge.com and add a new Site, pointing it at this repo (`aleeeksanndraa/momento-motion`, branch `main`).
2. Generate a GitHub personal access token (repo scope) and paste it into the DecapBridge dashboard when it asks for git access — do this directly on their site, never share the token elsewhere.
3. Pick an auth type (Classic password login, or PKCE for Google/Microsoft SSO).
4. DecapBridge shows a generated `backend:` block for `config.yml` (name/base_url/auth_endpoint). Copy those exact values into `admin/config.yml`, replacing the placeholder `base_url`.
5. Invite collaborators by email from the DecapBridge dashboard.
6. Visit `.../admin/` to log in and edit **Site & Links**, **Events Page**, and **EPK Page**. Saves commit back to the repo and GitHub Pages redeploys.

## Assets

- `assets/hero.mp4` — hero background video (loops, muted).
- `assets/poster-mj.jpg`, `assets/poster-friends.jpg` — event posters.
- `assets/symbol.svg` — the hand/peace brand mark (favicon, nav, watermark).
- `assets/wordmark-clear.png` — MOMENTO wordmark, transparent background.
