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

A ready Decap CMS setup is in **`/admin/`** so a non-technical client can edit the JSON through a web form.

1. Edit `admin/config.yml` → set `backend.repo` to `your-user/your-repo`.
2. Choose an auth method:
   - **GitHub OAuth** via a small OAuth proxy (e.g. a free Cloudflare Worker / Netlify function), or
   - **Netlify Identity + Git Gateway** if hosting the admin on Netlify.
3. Visit `.../admin/` to log in and edit **Site & Links**, **Events Page**, and **EPK Page**. Saves commit back to the repo and GitHub Pages redeploys.

## Assets

- `assets/hero.mp4` — hero background video (loops, muted).
- `assets/poster-mj.jpg`, `assets/poster-friends.jpg` — event posters.
- `assets/symbol.svg` — the hand/peace brand mark (favicon, nav, watermark).
- `assets/wordmark-clear.png` — MOMENTO wordmark, transparent background.
