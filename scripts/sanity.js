/*  Reads the page copy out of Sanity for the build.
    The production dataset is public, so this needs no token and no npm packages —
    just the global fetch Node has had since 18.

    scripts/content.json is a committed cache of the last successful fetch. The build
    prefers the live API and falls back to the cache, so a Sanity outage, an offline
    laptop or a network blip on Vercel can only ever ship slightly stale copy — never
    a page with the text missing.                                                      */

const fs = require('fs');
const path = require('path');

const PROJECT = 'ya4b5flc';
const DATASET = 'production';
const API = '2024-10-01';
const CACHE = path.join(__dirname, 'content.json');

// api, not apicdn: the CDN can serve a few seconds stale, and this build is usually
// kicked off by a webhook fired the instant something is published.
const QUERY = `{
  "about": *[_id == "aboutPage"][0]{intro, body, services},
  "approach": *[_id == "approachPage"][0]{intro, approachHeading, steps[]{name, description, tags}, faqIntro, faqs[]{question, answer}},
  "privacy": *[_id == "privacyPage"][0]{title, lastUpdated, sections[]{heading, body}},
  "settings": *[_id == "siteSettings"][0]{email, contactHeading, contactIntro, socialLinks[]{label, url}}
}`;

const PAGES = ['about', 'approach', 'privacy', 'settings'];

function check(result) {
  const empty = PAGES.filter((k) => !result[k]);
  if (empty.length) throw new Error(`Sanity returned nothing for: ${empty.join(', ')}`);
  return result;
}

async function fetchContent() {
  const url = `https://${PROJECT}.api.sanity.io/v${API}/data/query/${DATASET}?query=${encodeURIComponent(QUERY)}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { result } = await res.json();
    check(result || {});
    fs.writeFileSync(CACHE, JSON.stringify(result, null, 2) + '\n');
    return { content: result, source: 'sanity' };
  } catch (err) {
    if (!fs.existsSync(CACHE)) {
      console.error(`\n✗ Could not read the copy from Sanity (${err.message}), and there is no`);
      console.error('  cached copy in scripts/content.json to fall back on.');
      process.exit(1);
    }
    console.warn(`  ⚠︎ Sanity unreachable (${err.message}) — using the cached copy`);
    return { content: check(JSON.parse(fs.readFileSync(CACHE, 'utf8'))), source: 'cache' };
  }
}

module.exports = { fetchContent };
