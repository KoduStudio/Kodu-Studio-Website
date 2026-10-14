#!/usr/bin/env node
/*  Kodu Studio — brand logo
    Rebuilds icons/logo.svg from the source export in logos/ and keeps the aspect ratio
    in styles.css in step with it. Run after replacing the file in logos/:

        node scripts/logo.js

    The served file is stripped to a viewBox and paths with fill="currentColor", so the
    wordmark picks up the theme colour wherever it is used (it is painted as a CSS mask).
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
const [, , w, h] = viewBox.trim().split(/\s+/).map(Number);

fs.writeFileSync(OUT,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="currentColor" role="img" aria-label="Kodu Studio">`
  + paths.map((d) => `<path d="${d}"/>`).join('')
  + '</svg>\n');

const css = fs.readFileSync(CSS, 'utf8');
const ratioRe = /(\.brand__logo\s*\{[^}]*?aspect-ratio:\s*)([\d.]+\s*\/\s*[\d.]+)/;
if (!ratioRe.test(css)) { console.error('Could not find .brand__logo aspect-ratio in styles.css'); process.exit(1); }
const before = css.match(ratioRe)[2];
fs.writeFileSync(CSS, css.replace(ratioRe, `$1${w} / ${h}`));

// The glyphs start below the top of the viewBox; the CSS height assumes that gap stays ~2%
const top = Math.min(...paths.map((d) => Number((d.match(/^M[\d.]+,(-?[\d.]+)/) || [])[1] ?? 0)));
const fill = (h - top) / h;

console.log(`source       ${sources[0]}`);
console.log(`paths        ${paths.length}`);
console.log(`viewBox      ${viewBox}`);
console.log(`aspect-ratio ${before}  ->  ${w} / ${h}`);
console.log(`glyph fill   ${fill.toFixed(5)} of the box height${Math.abs(fill - 0.9812) > 0.005 ? '   ⚠︎ changed — re-check height/padding in .brand__logo' : ''}`);
