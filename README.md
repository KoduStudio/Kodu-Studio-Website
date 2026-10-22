# Kodu Studio

Personal portfolio site for Lachlan Sarv. Static HTML/CSS/JS with GSAP — no framework, no
npm dependencies (the build uses only what Node ships with).

Two kinds of content, edited in two different places:

| What | Where you edit it | How it goes live |
|---|---|---|
| Page copy (About, Approach, Privacy, contact details) | [Sanity Studio](https://kodustudio.sanity.studio) | Press **Publish** |
| Projects (images + titles) | `content/<slug>/` on your Mac | Double-click **Publish.command** |

## Editing page copy

Go to **[kodustudio.sanity.studio](https://kodustudio.sanity.studio)**, change the words,
press **Publish**. The site rebuilds itself and is live in about a minute. No Mac, no
terminal, no Claude needed.

- Saving a **draft** deploys nothing — only Publish does, so half-written edits are safe.
- A **blank line** in a text box becomes a real paragraph on the page.
- **Site settings** holds the contact email and social links. Changing the email there
  updates the contact panel, the footer and every `mailto:` on the site.

Behind the scenes: publishing fires a Sanity webhook → a Vercel deploy hook → Vercel
reruns the build → the new copy is written into the pages.

Page markup stays in the repo. Only the words come from Sanity, injected between
`<!-- copy:key --> … <!-- copy:end -->` markers, so the classes and attributes the CSS and
`main.js` rely on stay under version control.

## Adding / editing projects

See **[content/HOW-TO-ADD-A-PROJECT.md](content/HOW-TO-ADD-A-PROJECT.md)**. Short version:
drop a folder of images + a `project.json` into `content/`, then double-click **Publish.command**.

- **Preview.command** — build + open a local preview at http://localhost:5173
- **Publish.command** — build + commit + push the branch you are on
- **Go-Live.command** — merge staging into main and push, i.e. update the live site

Projects stay on this flow rather than in Sanity because resizing the images needs macOS
`sips`, which can't run on Vercel.

## Staging

Vercel builds every branch, so anything that isn't `main` deploys to its own URL and
leaves the live site alone.

```bash
git checkout staging      # or: git checkout -b whatever-you-are-changing
```

Make the changes, then double-click **Publish.command**. It pushes the branch you are on
and tells you whether that went to the live site or to a preview. The preview URL is in
the Vercel dashboard under Deployments, or on the branch page in GitHub.

When it looks right, double-click **Go-Live.command**. It shows you which commits are
about to go live, asks you to confirm, then fast-forwards `main` and pushes — which is what
actually updates www.kodustudio.com. It puts you back on the branch you were on.

The same thing by hand:

```bash
git checkout main && git merge staging --ff-only && git push origin main && git checkout staging
```

Don't use Vercel's "Promote to Production" button for this. It makes a preview build serve
production without moving `main`, so the repo and the live site disagree — and the next
Publish in the Studio rebuilds `main` and silently undoes it.

## The build

`scripts/build.js` is just an orchestrator. The real work is three scripts, split by what
each one needs to run:

| Script | Does | Needs |
|---|---|---|
| `build-images.js` | resizes images, writes `projects.js` + `cards.json` | macOS (`sips`, `cwebp`) |
| `build-copy.js` | fetches copy from Sanity, writes it into the pages + `site.js` | the network |
| `build-pages.js` | writes the project pages, homepage cards and sitemap | neither |

Vercel runs `npm run build` (the last two) against the committed images. That's why the
generated output is committed, and why `scripts/` must stay **out** of `.vercelignore`.

If Sanity is unreachable mid-build, `build-copy.js` falls back to `scripts/content.json`,
a cache of the last good fetch — slightly stale copy rather than an empty page.

## Structure

- `content/<slug>/` — source of truth for projects: original images + `project.json`
- `studio/` — the Sanity Studio (schemas for the page copy); deploy with `npx sanity deploy`
- `scripts/` — the build (see above), plus `templates/project.html` and the `content.json` cache
- `images/<slug>/` — generated responsive JPG + WebP (1200 / 2000 / 2800 + covers)
- `projects.js` — generated project data used by `main.js`
- `site.js` — generated contact details from Sanity, used by `main.js`
- `projects/<slug>.html` — generated standalone project pages (refresh/deep-link safe)
- `index.html` — homepage; the cards between `<!-- projects:start/end -->` are generated
- `about.html` / `approach.html` / `privacy.html` — copy between `<!-- copy:… -->` markers is generated
- `main.js` — intro animation, theme toggle, contact panel, card → project transitions
- `styles.css` — design tokens, layout, light/dark themes

Live: https://www.kodustudio.com
