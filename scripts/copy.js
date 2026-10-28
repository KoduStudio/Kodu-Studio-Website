/*  Renders the Sanity copy into about.html, approach.html and privacy.html.

    Each page keeps its real markup in the file; only the words come from Sanity. The
    build finds a <!-- copy:key --> … <!-- copy:end --> pair and rewrites what sits
    between them, so the structure, classes and data-attributes the CSS and main.js
    depend on stay under version control where they can be read and reviewed.

    A renderer returns lines indented from column zero; inject() re-indents them to
    match the marker it found, so the generated HTML reads like the hand-written
    HTML around it.                                                                   */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const num = (i) => `(${String(i + 1).padStart(2, '0')})`;

// A Studio text field is plain text: a blank line means a new paragraph, and a single
// newline is just where the author's textarea wrapped. one() flattens both, for the
// blocks whose line-splitting animation needs a single run of text; paras() keeps the
// paragraph breaks, for the blocks that can hold more than one.
const one = (text) => String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
const paras = (text) => String(text == null ? '' : text).split(/\n\s*\n/).map(one).filter(Boolean);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Split the Y-M-D string by hand: new Date('2026-10-22') is UTC midnight, which in
// Sydney reads as the 22nd but in New York as the 21st — and the build host varies.
function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return '';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}, ${m[1]}`;
}

const ARROW_UP_RIGHT = '<svg class="about__link-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>';
const PLUS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';

/* ---------- renderers, keyed by marker name ---------- */
const render = {
  'about.intro': (c) => `<p class="page-intro__text" data-split>${esc(one(c.about.intro))}</p>`,

  'about.body': (c) => [
    '<p class="about__lead" data-split>',
    `  ${esc(one(c.about.body))}`,
    '</p>',
  ].join('\n'),

  // One paragraph on purpose: the About intro pairs each eyebrow with one .about__lead by
  // index, so a second block here would shift every heading onto the wrong text.
  'about.background': (c) => [
    '<p class="about__lead" data-split>',
    `  ${esc(one(c.about.background))}`,
    '</p>',
  ].join('\n'),

  'about.services': (c) => (c.about.services || []).map((s) => `<li>${esc(one(s))}</li>`).join('\n'),

  'about.social': (c) => (c.settings.socialLinks || []).map(({ label, url }) =>
    `<li><a class="about__link" href="${esc(one(url))}" target="_blank" rel="noopener"><span class="about__link-text roll-target">${esc(one(label))}</span>${ARROW_UP_RIGHT}</a></li>`
  ).join('\n'),

  'approach.intro': (c) => `<p class="page-intro__text" data-split>${esc(one(c.approach.intro))}</p>`,

  'approach.heading': (c) => `<h1 class="approach-header__title">${esc(one(c.approach.approachHeading))}</h1>`,

  'approach.steps': (c) => (c.approach.steps || []).map((step, i) => [
    '<div class="approach-row" data-reveal>',
    `  <p class="approach-row__num">${num(i)}</p>`,
    `  <h2 class="approach-row__name">${esc(one(step.name))}</h2>`,
    '  <div class="approach-row__content">',
    ...paras(step.description).map((t) => `    <p class="approach-row__text">${esc(t)}</p>`),
    '    <ul class="tag-list">',
    ...(step.tags || []).map((t) => `      <li class="tag">${esc(t)}</li>`),
    '    </ul>',
    '  </div>',
    '</div>',
  ].join('\n')).join('\n\n'),

  'approach.faqIntro': (c) => `<p class="faq__lead">${esc(one(c.approach.faqIntro))}</p>`,

  'approach.faqs': (c) => (c.approach.faqs || []).map((faq, i) => {
    const id = `faq-${String(i + 1).padStart(2, '0')}`;
    return [
      '<li class="faq-item" data-reveal>',
      `  <button class="faq-item__q" type="button" aria-expanded="false" aria-controls="${id}">`,
      `    <span class="faq-item__num">${num(i)}</span>`,
      `    <h3 class="faq-item__heading">${esc(one(faq.question))}</h3>`,
      '    <span class="faq-item__icon" aria-hidden="true">',
      `      ${PLUS_ICON}`,
      '    </span>',
      '  </button>',
      `  <div class="faq-item__a" id="${id}" role="region">`,
      ...paras(faq.answer).map((t) => `    <p>${esc(t)}</p>`),
      '  </div>',
      '</li>',
    ].join('\n');
  }).join('\n'),

  'privacy.intro': (c) => [
    `<p class="page-intro__text" data-split>${esc(one(c.privacy.title))}</p>`,
    `<p class="page-intro__text" data-split>(last updated ${esc(formatDate(c.privacy.lastUpdated))})</p>`,
  ].join('\n'),

  'privacy.sections': (c) => (c.privacy.sections || []).map((s, i) => [
    '<div class="policy-item" data-reveal>',
    `  <p class="policy-item__num">${num(i)}</p>`,
    '  <div class="policy-item__body">',
    `    <h2 class="policy-item__heading">${esc(one(s.heading))}</h2>`,
    ...paras(s.body).map((t) => `    <p class="policy-item__text">${esc(t)}</p>`),
    '  </div>',
    '</div>',
  ].join('\n')).join('\n\n'),
};

/* ---------- marker injection ---------- */
const PAGES = {
  'about.html': ['about.intro', 'about.body', 'about.background', 'about.services', 'about.social'],
  'approach.html': ['approach.intro', 'approach.heading', 'approach.steps', 'approach.faqIntro', 'approach.faqs'],
  'privacy.html': ['privacy.intro', 'privacy.sections'],
};

function injectCopy(content) {
  let count = 0;
  for (const [file, keys] of Object.entries(PAGES)) {
    const filePath = path.join(ROOT, file);
    let html = fs.readFileSync(filePath, 'utf8');
    for (const key of keys) {
      const marker = new RegExp(`([ \\t]*)<!-- copy:${key.replace('.', '\\.')} -->[\\s\\S]*?<!-- copy:end -->`);
      const found = marker.exec(html);
      if (!found) { console.error(`${file} is missing the <!-- copy:${key} --> … <!-- copy:end --> markers`); process.exit(1); }
      const indent = found[1];
      const body = render[key](content)
        .split('\n')
        .map((line) => (line ? indent + line : line))
        .join('\n');
      html = html.replace(marker, `${indent}<!-- copy:${key} -->\n${body}\n${indent}<!-- copy:end -->`);
      count++;
    }
    fs.writeFileSync(filePath, html);
  }
  return count;
}

module.exports = { injectCopy, esc };
