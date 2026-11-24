#!/usr/bin/env node
/*  Kodu Studio — playground image build  (macOS only: uses `sips` and `cwebp`)
    Reads content/_playground/*.{jpg,png} and generates:
      images/playground/      resized webp + jpg variants (never upscaled)
      playground.js           the tile list main.js builds the infinite grid from

    The originals are big (posters at 300dpi, 17MB PNGs); nothing that size ever reaches
    the browser. The grid only ever shows a tile a few hundred pixels wide, so GRID_WIDTHS
    is what gets fetched on load and OPEN_WIDTH is fetched lazily, on click.

    Like build-images.js this writes files that are committed, so the HTML half of the
    build still runs anywhere — including Vercel's Linux builders, which have no sips.
    content/ is in .vercelignore, so the originals never deploy.                        */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'content', '_playground');
const OUT = path.join(ROOT, 'images', 'playground');

const GRID_WIDTHS = [400, 800];   // what the tiles use — small, because they render small
const OPEN_WIDTH = 1600;          // fetched only when a tile is clicked open
const WIDTHS = [...GRID_WIDTHS, OPEN_WIDTH];
const GRID_Q = 76;                // a tile is ~320 CSS px; it does not need more
const OPEN_Q = 84;
const JPEG_Q = 82;                // the <picture> fallback, which almost nobody is served

const log = (...a) => console.log(...a);
const warn = (...a) => console.warn('  ⚠︎', ...a);

function imageSize(file) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file]).toString();
  return { w: +out.match(/pixelWidth:\s*(\d+)/)[1], h: +out.match(/pixelHeight:\s*(\d+)/)[1] };
}

// "NSW-Mining_Web & Phone Mock.jpg" → "nsw-mining-web-phone-mock"
const slugify = (name) => name
  .replace(/\.(jpe?g|png)$/i, '')
  .toLowerCase()
  .replace(/&/g, ' ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '') || 'image';

// Only rebuild when the source is newer than what is already on disk.
const stale = (src, dest) => !fs.existsSync(dest) || fs.statSync(src).mtimeMs > fs.statSync(dest).mtimeMs;

/* ---------- read the source folder ---------- */
/* The originals are deliberately not in git — they are 100MB+ and only this machine needs
   them, because the tiles they produce are committed. So a checkout without the folder is
   normal, not an error: keep the tiles that are already there and move on. */
if (!fs.existsSync(SRC)) {
  const built = fs.existsSync(OUT) && fs.readdirSync(OUT).length;
  if (built && fs.existsSync(path.join(ROOT, 'playground.js'))) {
    log(`  ${path.relative(ROOT, SRC)}/ not on this machine — keeping the committed tiles`);
    return;
  }
  console.error(`No ${path.relative(ROOT, SRC)}/ folder found, and no built tiles to fall back on.`);
  console.error('  The playground originals live outside git. Copy them back in to rebuild.');
  process.exit(1);
}

const files = fs.readdirSync(SRC)
  .filter((f) => /\.(jpe?g|png)$/i.test(f) && !f.startsWith('.'))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

if (!files.length) { console.error(`No images in ${path.relative(ROOT, SRC)}/`); process.exit(1); }

/* OneDrive leaves conflict copies behind ("026 - Copy 2.jpg"), and a duplicate tile in an
   infinite grid reads as a mistake rather than a pattern. Identical bytes win the first name. */
const seen = new Map();
const unique = [];
const dupes = [];
for (const f of files) {
  const hash = crypto.createHash('md5').update(fs.readFileSync(path.join(SRC, f))).digest('hex');
  if (seen.has(hash)) { dupes.push([f, seen.get(hash)]); continue; }
  seen.set(hash, f);
  unique.push(f);
}

/* ---------- build the variants ---------- */
fs.mkdirSync(OUT, { recursive: true });

const tiles = [];
const keep = new Set();
let encoded = 0;

for (const file of unique) {
  const src = path.join(SRC, file);
  const size = imageSize(src);
  const slug = slugify(file);
  if (tiles.some((t) => t.slug === slug)) { warn(`two files slugify to "${slug}" — skipping ${file}`); continue; }

  const widths = [];
  for (const w of WIDTHS) {
    if (w > size.w) continue;                       // never upscale
    if (widths.length && w > size.w * 0.92) continue; // close enough to one we already made
    const q = w === OPEN_WIDTH ? OPEN_Q : GRID_Q;
    const webp = path.join(OUT, `${slug}-${w}.webp`);
    const jpg = path.join(OUT, `${slug}-${w}.jpg`);

    if (stale(src, webp)) {
      // -resize W 0 keeps the aspect; cwebp reads png and jpeg directly, so this is one encode.
      execFileSync('cwebp', ['-q', String(q), '-m', '6', '-resize', String(w), '0', '-quiet', src, '-o', webp]);
      encoded++;
    }
    // The jpg fallback is only worth its bytes at grid sizes. A browser too old for webp
    // (~3%) that opens a tile gets the 800 jpg scaled up rather than a 10MB set of 1600s
    // sitting in the repo for no one.
    if (w !== OPEN_WIDTH) {
      if (stale(src, jpg)) {
        // sips writes the fallback. PNG sources are flattened, which is safe here: every
        // source checked out as opaque apart from a hairline of edge antialiasing.
        execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(JPEG_Q),
          '--resampleWidth', String(w), src, '--out', jpg], { stdio: 'ignore' });
        encoded++;
      }
      keep.add(path.basename(jpg));
    }
    widths.push(w);
    keep.add(path.basename(webp));
  }

  // A source smaller than the smallest standard width still deserves a tile.
  if (!widths.length) {
    const w = size.w;
    const webp = path.join(OUT, `${slug}-${w}.webp`);
    const jpg = path.join(OUT, `${slug}-${w}.jpg`);
    if (stale(src, webp)) { execFileSync('cwebp', ['-q', String(GRID_Q), '-m', '6', '-quiet', src, '-o', webp]); encoded++; }
    if (stale(src, jpg)) { execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(JPEG_Q), src, '--out', jpg], { stdio: 'ignore' }); encoded++; }
    widths.push(w);
    keep.add(path.basename(webp));
    keep.add(path.basename(jpg));
  }

  // jpgWidths is what the <picture> fallback can offer; widths is the webp ladder.
  tiles.push({
    slug,
    src: `images/playground/${slug}`,
    widths,
    jpgWidths: widths.filter((w) => w !== OPEN_WIDTH),
    w: size.w,
    h: size.h,
  });
  log(`  ${file.padEnd(46)} ${String(size.w).padStart(4)}×${String(size.h).padEnd(4)}  [${widths.join(', ')}]`);
}

/* ---------- drop anything the manifest no longer references ---------- */
let removed = 0;
for (const f of fs.readdirSync(OUT)) {
  if (!keep.has(f)) { fs.unlinkSync(path.join(OUT, f)); removed++; }
}

/* Every variant the markup will reference has to actually exist — the same OneDrive
   half-sync that creates conflict copies can also leave a rename behind. */
const missing = [...keep].filter((f) => !fs.existsSync(path.join(OUT, f)));
if (missing.length) {
  console.error(`\n✗ ${missing.length} expected playground file(s) are missing:`);
  missing.forEach((f) => console.error('   images/playground/' + f));
  process.exit(1);
}

/* ---------- write playground.js ---------- */
const js = `/* GENERATED by scripts/build-playground.js from content/_playground/ — do not edit by hand.
   To add or remove images, change that folder and run the build (or Publish.command). */
window.KODU_PLAYGROUND = ${JSON.stringify(tiles, null, 2)};
`;
fs.writeFileSync(path.join(ROOT, 'playground.js'), js);

const bytes = fs.readdirSync(OUT).reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
if (dupes.length) {
  log(`\n  ${dupes.length} duplicate file(s) skipped (identical bytes):`);
  dupes.forEach(([dupe, original]) => log(`    ${dupe}  =  ${original}`));
}
if (removed) log(`  ${removed} stale file(s) removed`);
if (encoded) log(`  ${encoded} variant(s) encoded`);
log(`\n✓ Playground ready: ${tiles.length} tiles, ${(bytes / 1048576).toFixed(1)}MB in images/playground/.`);
