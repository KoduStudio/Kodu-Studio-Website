# Kodu Studio

Personal portfolio site for Lachlan Sarv. Static HTML/CSS/JS with GSAP — no framework, no npm dependencies.

## Adding / editing projects

See **[content/HOW-TO-ADD-A-PROJECT.md](content/HOW-TO-ADD-A-PROJECT.md)**. Short version:
drop a folder of images + a `project.json` into `content/`, then double-click **Publish.command**.

- **Preview.command** — build + open a local preview at http://localhost:5173
- **Publish.command** — build + commit + push (Vercel auto-deploys from `main`)

## Structure

- `content/<slug>/` — source of truth: original images + `project.json` per project
- `scripts/build.js` — generates everything below from `content/` (macOS `sips` for resizing)
- `images/<slug>/` — generated responsive JPGs (1200 / 2000 / 2800 + covers)
- `projects.js` — generated project data used by `main.js`
- `projects/<slug>.html` — generated standalone project pages (refresh/deep-link safe)
- `index.html` — homepage; the cards between `<!-- projects:start/end -->` are generated
- `main.js` — intro animation, theme toggle, card → project transitions
- `styles.css` — design tokens, layout, light/dark themes

Live: https://www.kodudesignlab.com
