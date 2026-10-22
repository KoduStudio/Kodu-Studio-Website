#!/usr/bin/env node
/*  Kodu Studio — full local build.
    Two halves, because only one of them can run on a Mac:
      build-images.js   resizes images and writes projects.js + cards.json   (needs sips)
      build-pages.js    writes the HTML pages and the sitemap               (runs anywhere)
    Both run here; Vercel runs build-pages.js alone against the committed images.
    Run with:  node scripts/build.js   (or double-click Publish.command)              */

require('./build-images.js');
require('./build-pages.js');
