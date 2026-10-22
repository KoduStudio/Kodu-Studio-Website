#!/usr/bin/env node
/*  Kodu Studio — full local build.
    Three steps, split by what each one needs:
      build-images.js   resizes images, writes projects.js + cards.json   (needs macOS/sips)
      build-copy.js     pulls the page copy out of Sanity                 (needs the network)
      build-pages.js    writes the HTML pages and the sitemap             (needs neither)
    All three run here. Vercel runs the last two against the committed images.
    Run with:  node scripts/build.js   (or double-click Publish.command)             */

require('./build-images.js');

require('./build-copy.js').run()
  .then(() => require('./build-pages.js'))
  .catch((err) => { console.error('\n✗ Build failed:', err.message); process.exit(1); });
