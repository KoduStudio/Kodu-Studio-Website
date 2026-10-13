#!/usr/bin/env node
/*  Kodu Studio — site builder
    Reads content/<slug>/project.json + images and generates:
      images/<slug>/            resized JPG variants (never upscaled)
      projects.js               data consumed by main.js
      projects/<slug>.html      standalone project pages
      index.html                homepage cards (between the <!-- projects --> markers)
    Run with:  node scripts/build.js   (or double-click Publish.command)
    Requires macOS (uses `sips` for resizing). No npm packages needed.            */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://www.kodudesignlab.com';                  // canonical origin (no trailing slash)
const CONTENT = path.join(ROOT, 'content');
const WIDTHS = [1200, 2000, 2800];        // page images
const COVER_WIDTHS = [500, 1000, 1500];   // homepage card covers (pre-cropped to 6:8)
const COVER_RATIO = 3 / 4;                // 6:8 card
const QUALITY = 86;        // page images
const COVER_QUALITY = 88;  // card covers are small files, so spend a little more on sharpness
// Filename hints → columns per row. New style: .2up / .3up (aspect comes from the image itself).
// Old style still accepted: .portrait/.third/.poster (2, 3, 3 per row), .16-9/.16-10 (full width, fixed box).
// .tall = tall images side by side at equal width, each at its own natural height (nothing cropped)
const HINTS = { '2up': 2, '3up': 3, tall: 'tall', full: 1, portrait: 2, third: 3, poster: 3, '16-9': 1, '16-10': 1 };

const log = (...a) => console.log(...a);
const warn = (...a) => console.warn('  ⚠︎', ...a);

/* ---------- helpers ---------- */
function imageSize(file) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file]).toString();
  const w = +out.match(/pixelWidth:\s*(\d+)/)[1];
  const h = +out.match(/pixelHeight:\s*(\d+)/)[1];
  return { w, h };
}

function resize(src, dest, width, srcWidth) {
  // Source already (near) this size? Use its bytes as-is: re-encoding only makes the file bigger and softer.
  if (srcWidth && /\.jpe?g$/i.test(src) && srcWidth <= width * 1.08) { fs.copyFileSync(src, dest); return; }
  const args = ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(QUALITY)];
  if (width) args.push('--resampleWidth', String(width));
  execFileSync('sips', [...args, src, '--out', dest], { stdio: 'ignore' });
}

// Cover: centre-crop to 6:8 so every pixel is used by the card, then size to `width`.
// Two passes (sips ignores flag order) but the intermediate is lossless PNG, so only ONE jpeg encode.
function resizeCover(src, dest, width, size) {
  const height = Math.round(width / COVER_RATIO);
  const tmp = dest + '.tmp.png';
  const scaleArgs = size.w / size.h > COVER_RATIO ? ['--resampleHeight', String(height)] : ['--resampleWidth', String(width)];
  execFileSync('sips', ['-s', 'format', 'png', ...scaleArgs, src, '--out', tmp], { stdio: 'ignore' });
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(COVER_QUALITY), '-c', String(height), String(width), tmp, '--out', dest], { stdio: 'ignore' });
  fs.unlinkSync(tmp);
}

// Only rebuild a variant when the source is newer than the output
function needsBuild(src, dest) {
  if (!fs.existsSync(dest)) return true;
  return fs.statSync(src).mtimeMs > fs.statSync(dest).mtimeMs;
}

// Full-width images sit in a 16:9 or 16:10 box (whichever is closer); side-by-side ones keep their own shape
function fullWidthAspect({ w, h }) {
  return w / h >= 1.7 ? '16 / 9' : '16 / 10';
}

// "07-frame.2up.jpg" → { order: 7, slug: '07-frame', hint: '2up' }
// The number is kept in the slug so two files with the same name can't overwrite each other.
function parseImageName(file) {
  const base = file.replace(/\.(jpe?g|png)$/i, '');
  const parts = base.split('.');
  let hint = null;
  if (parts.length > 1 && HINTS[parts[parts.length - 1].toLowerCase()] !== undefined) hint = parts.pop().toLowerCase();
  const name = parts.join('.');
  const m = name.match(/^(\d+)[-_ ]*(.*)$/);
  const words = (m ? m[2] : name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'image';
  const order = m ? +m[1] : 9999;
  return { order, slug: m ? String(m[1]).padStart(2, '0') + '-' + words : words, name: words, hint };
}

const ratioOf = (aspect) => { const [w, h] = aspect.split('/').map(Number); return w / h; };
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const titleCase = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/* ---------- read content ---------- */
if (!fs.existsSync(CONTENT)) { console.error('No content/ folder found'); process.exit(1); }

const projects = fs.readdirSync(CONTENT)
  .filter((d) => !d.startsWith('_') && !d.startsWith('.') && fs.existsSync(path.join(CONTENT, d, 'project.json')))
  .map((slug) => {
    const dir = path.join(CONTENT, slug);
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'project.json'), 'utf8'));
    const files = fs.readdirSync(dir)
      .filter((f) => /\.(jpe?g|png)$/i.test(f) && !/^cover\./i.test(f)) // a numbered image can double as the cover
      .map((f) => ({ file: f, ...parseImageName(f) }))
      .sort((a, b) => a.order - b.order || a.file.localeCompare(b.file));
    return { slug, dir, meta, files };
  })
  .sort((a, b) => (a.meta.order ?? 999) - (b.meta.order ?? 999) || a.slug.localeCompare(b.slug));

if (!projects.length) { console.error('No projects found in content/'); process.exit(1); }

/* ---------- build images + data ---------- */
const data = {};
const cards = [];

for (const p of projects) {
  const outDir = path.join(ROOT, 'images', p.slug);
  fs.mkdirSync(outDir, { recursive: true });
  log(`\n${p.meta.name}  (${p.slug})${p.meta.draft ? '  — draft' : ''}`);

  // Homepage card cover — ALWAYS the first page image (the hero), so the card → hero
  // transition is seamless. Only a draft with no page images may use a cover.jpg instead.
  if (p.meta.cover) warn(`"cover" in project.json is ignored — the first image is always the cover`);
  let coverFile = p.files[0] && p.files[0].file;
  if (!coverFile) {
    const fallback = fs.readdirSync(p.dir).find((f) => /^cover\.(jpe?g|png)$/i.test(f));
    if (fallback) coverFile = fallback;
  }
  if (!coverFile) {
    warn('no images — the card needs at least one image (or a cover.jpg for a draft)');
  } else {
    const src = path.join(p.dir, coverFile);
    const size = imageSize(src);
    // widest 6:8 crop the source can supply without upscaling
    const maxCoverW = Math.floor(Math.min(size.w, size.h * COVER_RATIO));
    const coverWidths = [];
    for (const cw of COVER_WIDTHS) {
      if (cw > maxCoverW) continue;
      const dest = path.join(outDir, `cover-${cw}.jpg`);
      if (needsBuild(src, dest)) resizeCover(src, dest, cw, size);
      coverWidths.push(cw);
    }
    if (!coverWidths.length || Math.max(...coverWidths) < maxCoverW && maxCoverW < COVER_WIDTHS[COVER_WIDTHS.length - 1]) {
      // keep the largest crop the source allows when it falls between/below the standard sizes
      const dest = path.join(outDir, `cover-${maxCoverW}.jpg`);
      if (needsBuild(src, dest)) resizeCover(src, dest, maxCoverW, size);
      coverWidths.push(maxCoverW);
    }
    cards.push({ slug: p.slug, meta: p.meta, coverWidths });
    log(`  cover ← ${coverFile}  [${coverWidths.join(', ')}]`);
  }

  if (p.meta.draft) continue;
  if (!p.files.length) { warn('no page images'); }

  // Page images
  const images = [];
  for (const f of p.files) {
    const src = path.join(p.dir, f.file);
    const size = imageSize(src);
    const tall = f.hint === 'tall';
    const cols = tall ? 2 : f.hint ? HINTS[f.hint] : (size.w < size.h ? 2 : 1);   // portrait images pair up by default
    let aspect;
    if (tall) aspect = size.w + ' / ' + size.h;
    else if (cols === 1) aspect = f.hint === '16-9' ? '16 / 9' : f.hint === '16-10' ? '16 / 10' : fullWidthAspect(size);
    else if (f.hint === 'portrait' || f.hint === 'third') aspect = '4 / 5';
    else if (f.hint === 'poster') aspect = '1188 / 1680';
    else aspect = size.w + ' / ' + size.h;
    const widths = [];
    for (const w of WIDTHS) {
      if (w > size.w) continue;
      if (size.w <= w * 1.08) continue;                 // covered by the native copy below
      const dest = path.join(outDir, `${f.slug}-${w}.jpg`);
      if (needsBuild(src, dest)) resize(src, dest, w, size.w);
      widths.push(w);
    }
    // native-width copy: untouched bytes when the source is a jpeg near/above the largest useful size
    if (size.w <= WIDTHS[WIDTHS.length - 1] * 1.08 && !widths.includes(size.w)) {
      const dest = path.join(outDir, `${f.slug}-${size.w}.jpg`);
      if (needsBuild(src, dest)) resize(src, dest, size.w, size.w);
      widths.push(size.w);
    }
    widths.sort((a, b) => a - b);
    // Drop any variant that's no smaller in bytes than a larger one: the larger is strictly better
    for (let i = widths.length - 2; i >= 0; i--) {
      const small = path.join(outDir, `${f.slug}-${widths[i]}.jpg`);
      const bigger = widths.slice(i + 1).map((w) => fs.statSync(path.join(outDir, `${f.slug}-${w}.jpg`)).size);
      if (fs.statSync(small).size >= Math.min(...bigger)) { fs.unlinkSync(small); widths.splice(i, 1); }
    }
    images.push({
      src: `images/${p.slug}/${f.slug}`,
      widths,
      cols,
      aspect,
      ...(tall ? { tall: true } : {}),
      alt: `${p.meta.name}: ${titleCase(f.name)}`,
    });
    const layout = tall ? 'tall row' : cols === 1 ? 'full ' + aspect.replace(/ /g, '') : cols + ' per row';
    log(`  ${f.file.padEnd(34)} ${layout.padEnd(12)} [${widths.join(', ')}]`);
  }

  // Warn when a side-by-side row isn't filled or its images have different shapes
  for (let i = 0; i < images.length; ) {
    const c = images[i].cols;
    if (c === 1 || images[i].tall) { i++; continue; }
    const row = images.slice(i, i + c);
    if (row.length < c || row.some((im) => im.cols !== c)) warn(`row starting at ${p.files[i].file} needs ${c} images marked .${c}up`);
    else if (!row.some((im) => im.tall) && row.some((im) => Math.abs(ratioOf(im.aspect) - ratioOf(row[0].aspect)) > 0.02)) {
      // Mixed shapes in a side-by-side row: crop them all to 4:5 so the row lines up (use .tall to avoid cropping)
      row.forEach((im) => { im.aspect = '4 / 5'; });
      log(`  ↳ row starting at ${p.files[i].file}: mixed shapes, cropped to 4:5 (use .tall to keep natural heights)`);
    }
    i += row.length;
  }

  data[p.slug] = {
    name: p.meta.name,
    info: p.meta.info || '',
    // Optional copy block shown after the hero (see content/HOW-TO-ADD-A-PROJECT.md)
    overview: p.meta.overview || '',
    role: Array.isArray(p.meta.role) ? p.meta.role : [],
    roleLabel: p.meta.roleLabel || '',
    team: Array.isArray(p.meta.team) ? p.meta.team : [],
    link: p.meta.link || '',
    linkLabel: p.meta.linkLabel || '',
    // Optional YouTube URL: embedded full-width at the bottom of the page
    video: (() => { const m = String(p.meta.video || '').match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); return m ? m[1] : ''; })(),
    images,
  };

  // Remove stale generated files for this project
  const keep = new Set([
    ...images.flatMap((im) => im.widths.map((w) => `${path.basename(im.src)}-${w}.jpg`)),
    ...(cards.find((c) => c.slug === p.slug)?.coverWidths || []).map((w) => `cover-${w}.jpg`),
  ]);
  for (const f of fs.readdirSync(outDir)) if (!keep.has(f)) fs.unlinkSync(path.join(outDir, f));
}

/* ---------- write projects.js ---------- */
const js = `/* GENERATED by scripts/build.js from content/ — do not edit by hand.
   To add or change a project, edit content/<slug>/ then run the build (or Publish.command). */
window.KODU_PROJECTS = ${JSON.stringify(data, null, 2)};
`;
fs.writeFileSync(path.join(ROOT, 'projects.js'), js);

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
const cardHtml = cards.map(({ slug, meta, coverWidths }, i) => {
  const srcset = coverWidths.map((w) => `images/${slug}/cover-${w}.jpg ${w}w`).join(', ');
  const src = `images/${slug}/cover-${coverWidths[0]}.jpg`;
  const open = meta.draft
    ? `<div class="project-card project-card--draft">`
    : `<a class="project-card" href="projects/${slug}" data-project="${slug}">`;
  const close = meta.draft ? '</div>' : '</a>';
  return `      ${open}
        <div class="project-card__media">
          <img src="${src}" srcset="${srcset}" sizes="${cardSizes}"
               alt="${escapeHtml(meta.name)}" loading="${i < 6 ? 'eager' : 'lazy'}" decoding="async">
        </div>
        <div class="project-card__meta">
          <div class="project-card__row">
            <p class="project-card__name">${escapeHtml(meta.name)}</p>
            <p class="project-card__index">${String(i + 1).padStart(2, '0')}.</p>
          </div>
          <p class="project-card__info">${escapeHtml(meta.info || '')}</p>
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
  ...Object.keys(data).map((slug) => ({ loc: `${SITE}/projects/${slug}`, priority: '0.7' })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

log(`\n✓ Built ${Object.keys(data).length} project page(s), ${cards.length} homepage card(s), sitemap with ${urls.length} URLs.`);
