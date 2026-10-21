# Kodu Studio

Personal portfolio site for Lachlan Sarv. Static HTML/CSS/JS with GSAP — no framework, no npm dependencies.

## Adding / editing projects

See **[content/HOW-TO-ADD-A-PROJECT.md](content/HOW-TO-ADD-A-PROJECT.md)**. Short version:
drop a folder of images + a `project.json` into `content/`, then double-click **Publish.command**.

- **Preview.command** — build + open a local preview at http://localhost:5173
- **Publish.command** — build + commit + push the branch you are on

## Staging

Vercel builds every branch, so anything that isn't `main` deploys to its own URL and
leaves the live site alone.

```bash
git checkout staging      # or: git checkout -b whatever-you-are-changing
```

Make the changes, then double-click **Publish.command**. It pushes the branch you are on
and tells you whether that went to the live site or to a preview. The preview URL is in
the Vercel dashboard under Deployments, or on the branch page in GitHub.

When it looks right, merge it into `main` to go live:

```bash
git checkout main && git merge staging && git push origin main
```

## Structure

- `content/<slug>/` — source of truth: original images + `project.json` per project
- `scripts/build.js` — generates everything below from `content/` (macOS `sips` for resizing)
- `images/<slug>/` — generated responsive JPGs (1200 / 2000 / 2800 + covers)
- `projects.js` — generated project data used by `main.js`
- `projects/<slug>.html` — generated standalone project pages (refresh/deep-link safe)
- `index.html` — homepage; the cards between `<!-- projects:start/end -->` are generated
- `main.js` — intro animation, theme toggle, card → project transitions
- `styles.css` — design tokens, layout, light/dark themes

Live: https://www.kodustudio.com
