#!/usr/bin/env node
/*  Kodu Studio — brand logo
    Rebuilds icons/logo.svg from the source export in logos/ and keeps the aspect ratio
    in styles.css in step with it. Run after replacing the file in logos/:

        node scripts/logo.js

    The served file is stripped to a viewBox and paths with fill="currentColor", so the
    wordmark picks up the theme colour wherever it is used (it is painted as a CSS mask).

    The viewBox is also padded. Illustrator exports the artboard tight to the glyphs, which
    left ink on the very edge of the mask: the logo renders about 12px tall at a fractional
    position, so whenever its bottom edge fell between device pixels the renderer dropped a
    row of solid letterform and the wordmark looked sliced off along the baseline. The
    padding gives the raster about a pixel of transparent margin to lose instead.
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOGO_DIR = path.join(ROOT, 'logos');
const OUT = path.join(ROOT, 'icons/logo.svg');
const CSS = path.join(ROOT, 'styles.css');

const sources = fs.readdirSync(LOGO_DIR).filter((f) => f.toLowerCase().endsWith('.svg'));
if (sources.length !== 1) {
  console.error(`Expected exactly one .svg in logos/, found ${sources.length}: ${sources.join(', ')}`);
  process.exit(1);
}
const src = fs.readFileSync(path.join(LOGO_DIR, sources[0]), 'utf8');

// Illustrator names its fill class differently on every export, so match on the tag only
const paths = [...src.matchAll(/<path\b[^>]*\bd="([^"]+)"[^>]*\/?>/g)].map((m) => m[1]);
if (!paths.length) { console.error('No <path> elements found in ' + sources[0]); process.exit(1); }

const viewBox = (src.match(/viewBox="([^"]+)"/) || [])[1];
if (!viewBox) { console.error('No viewBox found in ' + sources[0]); process.exit(1); }
const [x, y, w, h] = viewBox.trim().split(/\s+/).map(Number);

// Cap height of the wordmark, in em, so it sits level with the text beside it. The box is
// then sized up from this to carry the padding, leaving the glyphs exactly this tall.
const GLYPH_EM = 0.758;
// Enough margin to be worth a whole pixel where the logo is smallest (~12px tall), so a
// rounded-off edge costs transparent padding rather than ink.
const PAD = h * 0.085;

const box = { x: x - PAD, y: y - PAD, w: w + PAD * 2, h: h + PAD * 2 };
const round = (n) => Number(n.toFixed(2));
const paddedViewBox = `${round(box.x)} ${round(box.y)} ${round(box.w)} ${round(box.h)}`;
// Every logo size in the CSS is written as glyph height x this, so one number keeps the
// header logo, the footer logo and the roll's padding in step.
const boxRatio = Number((box.h / h).toFixed(5));

fs.writeFileSync(OUT,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${paddedViewBox}" fill="currentColor" role="img" aria-label="Kodu Studio">`
  + paths.map((d) => `<path d="${d}"/>`).join('')
  + '</svg>\n');

let css = fs.readFileSync(CSS, 'utf8');
const ratioRe = /(\.brand__logo\s*\{[^}]*?aspect-ratio:\s*)([\d.]+\s*\/\s*[\d.]+)/;
const heightRe = /(--logo-box-ratio:\s*)([\d.]+)/;
if (!ratioRe.test(css)) { console.error('Could not find .brand__logo aspect-ratio in styles.css'); process.exit(1); }
if (!heightRe.test(css)) { console.error('Could not find --logo-box-ratio in styles.css'); process.exit(1); }
const before = css.match(ratioRe)[2];
const beforeH = css.match(heightRe)[2];
// Both are derived from the padded box, so they can only be changed together
css = css.replace(ratioRe, `$1${round(box.w)} / ${round(box.h)}`);
css = css.replace(heightRe, `$1${boxRatio}`);
fs.writeFileSync(CSS, css);

// The glyphs start below the top of the viewBox; the CSS height assumes that gap stays ~2%
const top = Math.min(...paths.map((d) => Number((d.match(/^M[\d.]+,(-?[\d.]+)/) || [])[1] ?? 0)));
const fill = (h - top) / h;

console.log(`source       ${sources[0]}`);
console.log(`paths        ${paths.length}`);
console.log(`viewBox      ${viewBox}`);
console.log(`padding      ${round(PAD)} units a side  ->  viewBox ${paddedViewBox}`);
console.log(`aspect-ratio ${before}  ->  ${round(box.w)} / ${round(box.h)}`);
console.log(`box ratio    ${beforeH}  ->  ${boxRatio}   (glyphs stay ${GLYPH_EM}em tall in the header)`);
console.log(`glyph fill   ${fill.toFixed(5)} of the box height${Math.abs(fill - 0.9812) > 0.005 ? '   ⚠︎ changed — re-check height/padding in .brand__logo' : ''}`);
