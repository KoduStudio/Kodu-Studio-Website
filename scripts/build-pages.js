#!/usr/bin/env node
/*  Kodu Studio — HTML build  (runs anywhere: no sips, no cwebp, no npm packages)
    Reads the committed output of scripts/build-images.js and generates:
      projects/<slug>.html      standalone project pages
      index.html                homepage cards (between the <!-- projects --> markers)
      sitemap.xml
    Run with:  node scripts/build.js   (or on Vercel, npm run build)                  */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://www.kodustudio.com';                  // canonical origin (no trailing slash)

const log = (...a) => console.log(...a);
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/* ---------- read what build-images.js committed ---------- */
// projects.js is a browser file (window.KODU_PROJECTS = {...}), so run it against a stub window
// rather than parsing it — one source of truth, and it fails loudly if the file is malformed.
function readProjects() {
  const src = fs.readFileSync(path.join(ROOT, 'projects.js'), 'utf8');
  const window = {};
  new Function('window', src)(window);
  if (!window.KODU_PROJECTS) { console.error('projects.js did not set window.KODU_PROJECTS — run the image build'); process.exit(1); }
  return window.KODU_PROJECTS;
}

const data = readProjects();
const cardsPath = path.join(__dirname, 'cards.json');
if (!fs.existsSync(cardsPath)) { console.error('scripts/cards.json is missing — run node scripts/build-images.js on a Mac'); process.exit(1); }
const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));

// The webp variants are committed, so ask the filesystem rather than looking for cwebp:
// a Linux builder has no encoder but does have the files.
const hasWebp = (slug, widths) => widths.every((w) => fs.existsSync(path.join(ROOT, 'images', slug, `cover-${w}.webp`)));

/* ---------- write projects/<slug>.html ---------- */
const template = fs.readFileSync(path.join(__dirname, 'templates', 'project.html'), 'utf8');
const pagesDir = path.join(ROOT, 'projects');
fs.mkdirSync(pagesDir, { recursive: true });
const wanted = new Set();
for (const slug of Object.keys(data)) {
  const d = data[slug];
  const hero = d.images[0];
  const description = escapeHtml(`${d.name}${d.info ? ' — ' + d.info : ''}. From the design journey of Lachlan Sarv, Lead UI/UX Designer at BEECH Agency, Newcastle NSW.`);
  const html = template
    .replace(/\{\{TITLE\}\}/g, escapeHtml(d.name))
    .replace(/\{\{SLUG\}\}/g, slug)
    .replace(/\{\{DESCRIPTION\}\}/g, description)
    .replace(/\{\{URL\}\}/g, `${SITE}/projects/${slug}`)
    .replace(/\{\{IMAGE\}\}/g, hero ? `${SITE}/${hero.src}-${Math.max(...hero.widths)}.jpg` : `${SITE}/images/site/og-default.jpg`);
  fs.writeFileSync(path.join(pagesDir, `${slug}.html`), html);
  wanted.add(`${slug}.html`);
}
for (const f of fs.readdirSync(pagesDir)) if (f.endsWith('.html') && !wanted.has(f)) fs.unlinkSync(path.join(pagesDir, f));

/* ---------- write homepage cards ---------- */
const cardSizes = '(max-width: 699px) calc(90vw - 6px), (max-width: 1199px) calc(50vw - 25px), calc(16.66vw - 12px)';
// A phone shows the card ~331px wide. Offering it nothing above 750w caps the download at a
// little over 2x, which is past the point where more pixels are visible on a screen that size.
const PHONE_CAP = 750;
const phoneSizes = 'calc(90vw - 6px)';
const cardHtml = cards.map(({ slug, name, info, draft, coverWidths }, i) => {
  const set = (widths, ext) => widths.map((w) => `images/${slug}/cover-${w}.${ext} ${w}w`).join(', ');
  const phoneWidths = coverWidths.filter((w) => w <= PHONE_CAP);
  const phone = phoneWidths.length ? phoneWidths : coverWidths.slice(0, 1);
  const webp = hasWebp(slug, coverWidths);
  const srcset = set(coverWidths, 'jpg');
  const phoneSrcset = set(phone, 'jpg');
  const webpSrcset = webp ? set(coverWidths, 'webp') : null;
  const phoneWebp = webp ? set(phone, 'webp') : null;
  const src = `images/${slug}/cover-${coverWidths[0]}.jpg`;
  const open = draft
    ? `<div class="project-card project-card--draft">`
    : `<a class="project-card" href="projects/${slug}" data-project="${slug}">`;
  const close = draft ? '</div>' : '</a>';
  return `      ${open}
        <div class="project-card__media">
          <picture>
${phoneWebp ? `            <source type="image/webp" media="(max-width: 699px)" srcset="${phoneWebp}" sizes="${phoneSizes}">\n` : ''}${webpSrcset ? `            <source type="image/webp" srcset="${webpSrcset}" sizes="${cardSizes}">\n` : ''}            <source media="(max-width: 699px)" srcset="${phoneSrcset}" sizes="${phoneSizes}">
            <img src="${src}" srcset="${srcset}" sizes="${cardSizes}"
                 alt="${escapeHtml(name)}" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async"
                 fetchpriority="${i === 0 ? 'high' : 'low'}">
          </picture>
        </div>
        <div class="project-card__meta">
          <div class="project-card__row">
            <p class="project-card__name">${escapeHtml(name)}</p>
            <p class="project-card__index">${String(i + 1).padStart(2, '0')}.</p>
          </div>
          <p class="project-card__info">${escapeHtml(info || '')}</p>
        </div>
      ${close}`;
}).join('\n\n');

const indexPath = path.join(ROOT, 'index.html');
let index = fs.readFileSync(indexPath, 'utf8');
const START = '<!-- projects:start -->', END = '<!-- projects:end -->';
if (!index.includes(START) || !index.includes(END)) {
  console.error(`index.html is missing the ${START} / ${END} markers`); process.exit(1);
}
index = index.replace(
  new RegExp(`${START}[\\s\\S]*?${END}`),
  `${START}\n${cardHtml}\n      ${END}`
);
fs.writeFileSync(indexPath, index);

/* ---------- sitemap.xml ---------- */
const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: `${SITE}/`, priority: '1.0' },
  { loc: `${SITE}/about`, priority: '0.8' },
  { loc: `${SITE}/approach`, priority: '0.8' },
  { loc: `${SITE}/privacy`, priority: '0.3' },
  ...Object.keys(data).map((slug) => ({ loc: `${SITE}/projects/${slug}`, priority: '0.7' })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

log(`\n✓ Built ${Object.keys(data).length} project page(s), ${cards.length} homepage card(s), sitemap with ${urls.length} URLs.`);
