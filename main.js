/* Kodu Studio — homepage intro, theme toggle, project page + transitions */
(function () {
  const html = document.documentElement;
  const body = document.body;
  const BASE = body.dataset.base || '';           // '' on the homepage, '../' inside /projects
  // Absolute site root, captured before any pushState changes the document base URL
  const SITE_ROOT = new URL(BASE || './', location.href).href;
  const siteUrl = (path) => new URL(path, SITE_ROOT).href;
  const PROJECTS = window.KODU_PROJECTS || {};
  const PROJECT_ORDER = Object.keys(PROJECTS);
  // ======== NEXT PROJECT SECTION — set to false to remove it everywhere (CSS block can stay) ========
  const NEXT_PROJECT = true;
  // ===================================================================================================
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Lucide icon markup (24px grid, 2 stroke, round caps and joins) from its paths */
  const lucide = (paths, cls) =>
    '<svg ' + (cls ? 'class="' + cls + '" ' : '') +
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';

  /* ---------- Smooth scroll (Lenis) ----------
     Light inertia on wheel/trackpad; touch stays native so phones feel normal. Driven by GSAP's
     ticker so it shares one animation clock with everything else. */
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true, syncTouch: false });
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  // Jump to a position with or without Lenis
  const scrollToTop = () => { if (lenis) lenis.scrollTo(0, { immediate: true, force: true }); else window.scrollTo(0, 0); };
  // Freeze scrolling while a page transition plays (wheel, trackpad and touch) so the flying
  // image never has to chase a moving page
  // Keyed, because page transitions and the contact panel both lock: the page only scrolls
  // again once every holder has let go. Unlocking a key twice is harmless.
  const scrollLocks = new Set();
  const applyScrollLock = () => {
    const locked = scrollLocks.size > 0;
    html.classList.toggle('lock-scroll', locked);
    if (lenis) locked ? lenis.stop() : lenis.start();
  };
  const lockScroll = (key = 'transition') => { scrollLocks.add(key); applyScrollLock(); };
  const unlockScroll = (key = 'transition') => { scrollLocks.delete(key); applyScrollLock(); };

  /* ---------- CUSTOM CURSOR ----------
     White dot in difference blend mode that trails the pointer with a light lerp, growing
     1.5× over project cards and any link/button. Pointer devices only; delete this block and
     the matching CSS to remove. */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    dot.setAttribute('aria-hidden', 'true');
    body.appendChild(dot);
    html.classList.add('has-cursor');

    const HOVER_SELECTOR = 'a, button, .project-card, .next-project, .theme-toggle, [role="button"]';
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const cur = { x: pos.x, y: pos.y, s: 1 };
    let targetScale = 1;
    let seen = false;

    addEventListener('pointermove', (e) => {
      pos.x = e.clientX; pos.y = e.clientY;
      if (!seen) { seen = true; cur.x = pos.x; cur.y = pos.y; gsap.to(dot, { opacity: 1, duration: 0.3 }); }
      // Growing over an interactive element (checked here so it also works for elements added later)
      targetScale = e.target.closest && e.target.closest(HOVER_SELECTOR) ? 1.5 : 1;
    }, { passive: true });
    addEventListener('pointerdown', () => { targetScale *= 0.85; });
    addEventListener('pointerup', () => { targetScale /= 0.85; });
    // Hide when the pointer leaves the window
    addEventListener('pointerleave', () => gsap.to(dot, { opacity: 0, duration: 0.2 }));
    addEventListener('pointerenter', () => { if (seen) gsap.to(dot, { opacity: 1, duration: 0.2 }); });

    gsap.ticker.add(() => {
      if (body.lastElementChild !== dot) body.appendChild(dot);   // stay on top as pages are swapped in
      cur.x += (pos.x - cur.x) * 0.2;      // light trail
      cur.y += (pos.y - cur.y) * 0.2;
      cur.s += (targetScale - cur.s) * 0.15;
      gsap.set(dot, { x: cur.x, y: cur.y, scale: cur.s });
    });
  }
  /* ---------- END CUSTOM CURSOR ---------- */

  /* ---------- Header links: make them absolute so they survive pushState URL changes ----------
     (otherwise "about" resolves to /projects/about after opening a project from the homepage) */
  document.querySelectorAll('.brand__link, .nav__item').forEach((a) => {
    const href = a.getAttribute('href');
    if (href && !/^(https?:|mailto:|#)/.test(href)) a.href = siteUrl(href);
  });

  /* ---------- Card images: make their URLs absolute ----------
     They are written relative in index.html. Opening a project pushes /projects/<slug> into
     the address bar, and any later re-run of the picture/srcset selection (a resize, a DPR
     change, the media query flipping) would resolve them against that URL instead. */
  (() => {
    const absSet = (list) => list.split(',').map((part) => {
      const [url, ...rest] = part.trim().split(/\s+/);
      return url ? [siteUrl(url), ...rest].join(' ') : '';
    }).filter(Boolean).join(', ');
    document.querySelectorAll('.project-card__media source, .project-card__media img').forEach((el) => {
      if (el.getAttribute('srcset')) el.setAttribute('srcset', absSet(el.getAttribute('srcset')));
      const src = el.getAttribute('src');
      if (src) el.setAttribute('src', siteUrl(src));
    });
  })();

  /* ---------- Card images on a wide screen ----------
     Cards after the second ship loading="lazy", which is what a phone wants: they sit
     off-screen in the carousel. On the full row every card is meant to be visible at once,
     but the intro starts them below the fold, so the browser would hold them back until the
     animation carried them up. Promote them before that happens. */
  if (matchMedia('(min-width: 1200px)').matches) {
    document.querySelectorAll('.project-card__media img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
  }

  /* ---------- Rolling hover text for brand + nav links ---------- */
  function rollify(els) { els.forEach((el) => {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.textContent = '';
    el.classList.add('roll');
    ['roll__text', 'roll__text roll__text--clone'].forEach((cls) => {
      const line = document.createElement('span');
      line.className = cls;
      line.setAttribute('aria-hidden', 'true');
      // Letters grouped by word so text can only wrap at spaces on narrow screens
      let i = 0;
      text.split(' ').forEach((word, w, words) => {
        const group = document.createElement('span');
        group.className = 'roll__word';
        [...word].forEach((ch) => {
          const s = document.createElement('span');
          s.className = 'char';
          s.style.setProperty('--i', i++);
          s.textContent = ch;
          group.appendChild(s);
        });
        line.appendChild(group);
        if (w < words.length - 1) {
          const sp = document.createElement('span');
          sp.className = 'char';
          sp.style.setProperty('--i', i++);
          sp.textContent = ' ';
          line.appendChild(sp);
        }
      });
      el.appendChild(line);
    });
  }); }
  rollify(document.querySelectorAll('.brand__link:not(.brand__link--logo), .nav__item, .roll-target'));

  /* ---------- CONTACT PANEL ----------
     "Contact" in the nav slides a panel in from the right and dims + blurs the page behind it.
     Built here so it exists on every page without duplicating markup. Delete this block and
     the matching CSS to remove; the nav link falls back to its plain mailto: href. */
  /* Written by the build from Sanity (see site.js), with the current values as the
     fallback so the panel still reads correctly if that file ever fails to load. */
  const SITE = window.KODU_SITE || {};
  const CONTACT_EMAIL = SITE.email || 'kodudesignstudio@gmail.com';
  const CONTACT_HEADING = SITE.contactHeading || 'Like what you see? Let\u2019s talk.';
  const CONTACT_INTRO = SITE.contactIntro ||
    'Whether it\u2019s a brand that needs a look, a website that needs building, or just a rough idea you want to kick around, I\u2019d love to hear what you\u2019re working on.';
  const SOCIALS = Array.isArray(SITE.socialLinks) && SITE.socialLinks.length ? SITE.socialLinks : [
    { label: 'Instagram', url: 'https://www.instagram.com/kodudesignstudio/' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/lachlan-sarv-4192311a4/' },
  ];
  const escAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const contactTriggers = [...document.querySelectorAll('.nav__item[href^="mailto:"], .js-contact')];
  const contactTrigger = contactTriggers[0];
  if (contactTrigger) {
    const arrow = lucide('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>');              // arrow-right
    const extArrow = lucide('<path d="M7 7h10v10"/><path d="M7 17 17 7"/>');             // arrow-up-right
    const scrim = document.createElement('div');
    scrim.className = 'contact-scrim';
    const panel = document.createElement('aside');
    panel.className = 'contact-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Contact');
    panel.innerHTML =
      '<div class="contact-panel__top">' +
        '<div class="contact-panel__bar">' +
          '<span>(Get in touch)</span>' +
          '<button class="contact-panel__close" type="button"><span class="roll-target">Close</span></button>' +
        '</div>' +
        '<div class="contact-panel__body">' +
          '<p class="contact-panel__lead">' + escAttr(CONTACT_HEADING) + ' ' +
            '<span>' + escAttr(CONTACT_INTRO) + '</span>' +
          '</p>' +
          '<div class="contact-panel__portrait">' +
            '<picture>' +
              '<source type="image/webp" data-srcset="' + siteUrl('images/site/contact-320.webp') + ' 320w, ' + siteUrl('images/site/contact-480.webp') + ' 480w" sizes="160px">' +
              '<img data-src="' + siteUrl('images/site/contact-320.jpg') + '" ' +
                'data-srcset="' + siteUrl('images/site/contact-320.jpg') + ' 320w, ' + siteUrl('images/site/contact-480.jpg') + ' 480w" ' +
                'sizes="160px" alt="Lachlan Sarv" decoding="async">' +
            '</picture>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="contact-panel__links">' +
        '<p class="contact-panel__label">Say hello</p>' +
        '<a class="contact-link" href="mailto:' + escAttr(CONTACT_EMAIL) + '"><span class="roll-target">' + escAttr(CONTACT_EMAIL) + '</span>' + arrow + '</a>' +
        SOCIALS.map((s) =>
          '<a class="contact-link contact-link--ext" href="' + escAttr(s.url) + '" target="_blank" rel="noopener"><span class="roll-target">' + escAttr(s.label) + '</span>' + extArrow + '</a>'
        ).join('') +
      '</div>';
    body.appendChild(scrim);
    body.appendChild(panel);
    rollify(panel.querySelectorAll('.roll-target'));

    const closeBtn = panel.querySelector('.contact-panel__close');
    // Keep focus inside the panel while it is open
    const setBackgroundInert = (on) => {
      document.querySelectorAll('.site-header, main').forEach((el) => { el.inert = on; });
    };
    let contactOpen = false;
    let contactTl = null;

    // The panel sits on every page, so its portrait is fetched only once it is opened
    function loadPanelImage() {
      const img = panel.querySelector('.contact-panel__portrait img');
      if (!img || !img.dataset.src) return;
      // the webp source has to be set before the img, or the browser picks the jpeg
      panel.querySelectorAll('.contact-panel__portrait source[data-srcset]').forEach((s) => {
        s.srcset = s.dataset.srcset;
        delete s.dataset.srcset;
      });
      img.srcset = img.dataset.srcset;
      img.src = img.dataset.src;
      delete img.dataset.src;
      delete img.dataset.srcset;
    }

    function openContact() {
      if (contactOpen) return;
      contactOpen = true;
      loadPanelImage();
      lockScroll('contact');
      setBackgroundInert(true);
      panel.scrollTop = 0;
      gsap.set([scrim, panel], { visibility: 'visible' });
      if (contactTl) contactTl.kill();
      contactTl = gsap.timeline()
        .to(scrim, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0)
        .fromTo(panel, { xPercent: 100, x: 0 }, { xPercent: 0, x: 0, duration: 0.75, ease: 'power3.out' }, 0);
      closeBtn.focus({ preventScroll: true });
    }

    function closeContact() {
      if (!contactOpen) return;
      contactOpen = false;
      setBackgroundInert(false);
      if (contactTl) contactTl.kill();
      contactTl = gsap.timeline({
        onComplete() { gsap.set([scrim, panel], { visibility: 'hidden' }); unlockScroll('contact'); }
      })
        .to(panel, { xPercent: 100, x: 0, duration: 0.55, ease: 'power3.in' }, 0)
        .to(scrim, { opacity: 0, duration: 0.45, ease: 'power2.in' }, 0);
      contactTrigger.focus({ preventScroll: true });
    }

    contactTriggers.forEach((t) => t.addEventListener('click', (e) => { e.preventDefault(); openContact(); }));
    closeBtn.addEventListener('click', closeContact);
    scrim.addEventListener('click', closeContact);
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && contactOpen) closeContact(); });
  }
  /* ---------- END CONTACT PANEL ---------- */

  /* ---------- Tagline: "by Lachlan Sarv" ⇄ "Digital & Graphic Design" ----------
     A three-line track (A, B, A) slides up one line every few seconds; after the third
     line it snaps back to the top invisibly, so it reads as an endless upward loop. */
  const swap = document.querySelector('.brand__swap');
  if (swap && !reduceMotion) {
    // One repeating timeline rather than setInterval driving a counter. A counter only
    // resets in onComplete, so anywhere frames are throttled but timers keep firing —
    // iOS Low Power Mode, a backgrounded tab — the tweens never finish, the counter runs
    // away and the track parks part-way up, leaving two half-lines showing under the
    // logo. A timeline is positioned by elapsed time, so it cannot drift: throttling
    // pauses it and it resumes on the right line.
    const line = (i) => -(100 / 3) * i;       // one line = a third of the three-line track
    gsap.set(swap, { yPercent: 0 });
    gsap.timeline({ repeat: -1, defaults: { duration: 0.55, ease: 'power3.inOut' } })
      .to(swap, { yPercent: line(1) }, 2.8)
      .to(swap, { yPercent: line(2) }, 6.15)
      .set(swap, { yPercent: 0 }, 9.5);       // line 3 is line 1 again, so the snap is invisible
  }

  /* ---------- Theme toggle ---------- */
  const toggle = document.querySelector('.theme-toggle');
  function syncToggle() {
    const isDark = html.getAttribute('data-theme') === 'dark';
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  toggle.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    syncToggle();
  });
  syncToggle();

  /* ---------- Shared: line-by-line text reveal ---------- */
  // Split a paragraph into its rendered lines, each wrapped in a mask so it can rise into view.
  // Lines are measured from the real layout, so wrapping is identical to the plain text.
  function splitLines(el) {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.dataset.text = text;
    el.textContent = '';
    const probes = text.split(' ').map((w) => {
      const s = document.createElement('span');
      s.textContent = w + ' ';
      el.appendChild(s);
      return s;
    });
    const lines = [];
    let top = null;
    probes.forEach((p) => {
      if (p.offsetTop !== top) { top = p.offsetTop; lines.push([]); }
      lines[lines.length - 1].push(p.textContent);
    });
    el.textContent = '';
    return lines.map((wordsInLine) => {
      const mask = document.createElement('span');
      mask.className = 'line';
      const inner = document.createElement('span');
      inner.textContent = wordsInLine.join('').trimEnd();
      mask.appendChild(inner);
      el.appendChild(mask);
      return inner;
    });
  }

  const ARROW = lucide('<path d="M7 7h10v10"/><path d="M7 17 17 7"/>', 'ext-link__icon');   // arrow-up-right
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  // Current rendered scale of an element (hover zooms etc.), so a clone can start from exactly what's on screen
  function currentScale(el) {
    const t = el && getComputedStyle(el).transform;
    if (!t || t === 'none') return 1;
    const mtx = new DOMMatrix(t);
    return Math.hypot(mtx.a, mtx.b) || 1;
  }

  // A fixed-position copy of an image that can travel between two rects
  function makeClone(imgSrc, rect) {
    const clone = document.createElement('div');
    clone.className = 'flip-clone';
    const img = document.createElement('img');
    img.src = imgSrc;
    img.alt = '';
    clone.appendChild(img);
    gsap.set(clone, { top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    body.appendChild(clone);
    return clone;
  }

  /* ---------- Project page rendering ---------- */
  // Overview / My Role / The Team / Live Site — same grid + type as the About page
  function buildProjectText(d) {
    if (!d.overview && !d.role.length && !d.team.length && !d.link) return null;
    const sec = document.createElement('section');
    sec.className = 'project-text';
    let html = '<div class="project-text__grid">';
    if (d.overview) html += `<p class="project-text__eyebrow">Overview</p><p class="project-text__lead" data-split>${esc(d.overview)}</p>`;
    // Personal projects (no team) read "What I did"; collaborative ones "My Role". Override with roleLabel.
    const roleLabel = d.roleLabel || (d.team.length ? 'My Role' : 'What I did');
    if (d.role.length) html += `<p class="project-text__eyebrow">${esc(roleLabel)}</p><ul class="project-text__list">${d.role.map((r) => '<li>' + esc(r) + '</li>').join('')}</ul>`;
    if (d.team.length) html += `<p class="project-text__eyebrow">The Team</p><ul class="project-text__list">${d.team.map((t) => '<li>' + esc(t) + '</li>').join('')}</ul>`;
    if (d.link) html += `<p class="project-text__link"><a class="ext-link" href="${esc(d.link)}" target="_blank" rel="noopener"><span class="ext-link__text roll-target">${esc(d.linkLabel || 'Live Site')}</span>${ARROW}</a></p>`;
    html += '</div>';
    sec.innerHTML = html;
    return sec;
  }

  // Animate a project text block in (eyebrows fade, paragraph rises line by line, lists stagger).
  // Returns the timeline so callers can slot it into a larger sequence.
  function revealProjectText(sec, opts = {}) {
    const eyebrows = gsap.utils.toArray(sec.querySelectorAll('.project-text__eyebrow'));
    const leads = gsap.utils.toArray(sec.querySelectorAll('.project-text__lead'));
    const items = gsap.utils.toArray(sec.querySelectorAll('.project-text__list li, .project-text__link'));
    if (reduceMotion) { sec.classList.add('is-revealed'); return gsap.timeline(); }
    const lineSets = leads.map(splitLines);
    const lines = lineSets.flat();
    gsap.set(eyebrows, { opacity: 0, y: 10 });
    gsap.set(lines, { yPercent: 110 });
    gsap.set(items, { opacity: 0, y: 12 });
    sec.classList.add('is-revealed');
    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete() {
        gsap.set([eyebrows, items], { clearProps: 'transform,opacity' });
        leads.forEach((el) => { el.textContent = el.dataset.text; });   // back to plain, crisp text
      },
    });
    let at = 0;
    let li = 0;
    eyebrows.forEach((eb, i) => {
      tl.to(eb, { opacity: 1, y: 0, duration: 0.6, force3D: false }, at);
      if (i < lineSets.length) {
        tl.to(lineSets[i], { yPercent: 0, duration: 1.0, ease: 'power3.out', stagger: 0.09, force3D: false }, at + 0.1);
        at += 0.1 + lineSets[i].length * 0.09 * 0.7;
      } else {
        const list = eb.nextElementSibling ? gsap.utils.toArray(eb.nextElementSibling.querySelectorAll('li')) : [];
        tl.to(list, { opacity: 1, y: 0, duration: 0.7, stagger: 0.07, force3D: false }, at + 0.1);
        at += 0.35;
      }
    });
    const link = sec.querySelector('.project-text__link');
    if (link) tl.to(link, { opacity: 1, y: 0, duration: 0.7, force3D: false }, at + 0.1);
    return tl;
  }

  // How wide each image slot is on screen, so the browser can pick the sharpest variant
  // Below 700px every image is full width, so the browser should pick sizes accordingly
  const SIZES = {
    1: 'calc(100vw - 40px)',
    2: '(max-width: 699px) calc(100vw - 40px), calc(50vw - 30px)',
    3: '(max-width: 699px) calc(100vw - 40px), calc(33.33vw - 27px)',
  };
  function imageSrcset(img, ext = 'jpg') {
    return img.widths.map((w) => `${siteUrl(img.src + '-' + w + '.' + ext)} ${w}w`).join(', ');
  }
  // Wrap an <img> so browsers take the webp and everything else falls back to the jpg
  function withWebp(img, el) {
    const pic = document.createElement('picture');
    const source = document.createElement('source');
    source.type = 'image/webp';
    source.srcset = imageSrcset(img, 'webp');
    source.sizes = el.sizes;
    pic.appendChild(source);
    pic.appendChild(el);
    return pic;
  }
  function largestSrc(img) {
    return siteUrl(img.src + '-' + Math.max(...img.widths) + '.jpg');
  }

  function buildProjectPage(slug) {
    const data = PROJECTS[slug];
    const page = document.createElement('main');
    page.className = 'project-page';
    page.dataset.project = slug;
    if (!data) return page;
    data.images.forEach((img, i) => {
      const fig = document.createElement('figure');
      fig.className = 'project-image project-image--cols-' + (img.cols || 1);
      fig.style.aspectRatio = img.aspect || '16 / 10';
      if (img.tall) fig.classList.add('project-image--tall');   // natural height, top-aligned, never cropped
      if (i === 0) fig.classList.add('project-image--hero');
      const el = document.createElement('img');
      el.src = largestSrc(img);
      el.srcset = imageSrcset(img);
      el.sizes = img.tall ? SIZES[2] : (SIZES[img.cols] || SIZES[1]);
      el.alt = img.alt || '';
      // Quality first: fetch every image straight away (no lazy pop-in), hero at top priority
      el.loading = 'eager';
      el.fetchPriority = i === 0 ? 'high' : 'auto';
      el.decoding = 'async';
      const markLoaded = () => el.classList.add('is-loaded');
      if (el.complete && el.naturalWidth) markLoaded(); else el.addEventListener('load', markLoaded, { once: true });
      fig.appendChild(withWebp(img, el));
      page.appendChild(fig);
      if (i === 0) { const text = buildProjectText(data); if (text) page.appendChild(text); }
    });
    // Optional YouTube embed at the end (privacy-enhanced domain, loads on demand)
    if (data.video) {
      const fig = document.createElement('figure');
      fig.className = 'project-image project-image--cols-1 project-video';
      fig.style.aspectRatio = '16 / 9';
      fig.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${data.video}?rel=0&modestbranding=1" title="${esc(data.name)} video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
      page.appendChild(fig);
    }
    // Next project teaser (see NEXT_PROJECT switch): the next hero, clipped, plus its name
    if (NEXT_PROJECT && PROJECT_ORDER.length > 1) {
      const nextSlug = PROJECT_ORDER[(PROJECT_ORDER.indexOf(slug) + 1) % PROJECT_ORDER.length];
      const next = PROJECTS[nextSlug];
      const nextHero = next.images[0];
      if (nextHero) {
        const a = document.createElement('a');
        a.className = 'next-project';
        a.href = siteUrl('projects/' + nextSlug);
        a.dataset.next = nextSlug;
        a.innerHTML = `<p class="next-project__eyebrow">(Next Project)</p>
          <h2 class="next-project__name">${esc(next.name)}</h2>
          <div class="next-project__window"><div class="next-project__media"><picture><source type="image/webp" srcset="${imageSrcset(nextHero, 'webp')}" sizes="(max-width: 899px) calc(100vw - 40px), 900px"><img src="${largestSrc(nextHero)}" srcset="${imageSrcset(nextHero)}" sizes="(max-width: 899px) calc(100vw - 40px), 900px" alt="" loading="lazy" decoding="async"></picture></div></div>`;
        page.appendChild(a);
      }
    }
    return page;
  }

  /* ---------- Next project: teaser image travels up to become the new hero ---------- */
  let switching = false;
  function wireNextProject(page, onSwitch) {
    const link = page.querySelector('.next-project');
    if (!link) return;
    link.addEventListener('click', (e) => {
      if (reduceMotion || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // normal navigation
      e.preventDefault();
      onSwitch(link.dataset.next, true);
    });
  }
  // Returns the new page element; `after(newPage)` runs once the DOM has been swapped.
  function switchProject(fromPage, nextSlug, after) {
    if (switching || !PROJECTS[nextSlug]) return null;
    switching = true;
    html.classList.add('is-transitioning');
    lockScroll();
    const link = fromPage.querySelector('.next-project');
    const win = link && link.querySelector('.next-project__window');
    const first = win ? win.getBoundingClientRect() : null;
    const heroData = PROJECTS[nextSlug].images[0];

    const newPage = buildProjectPage(nextSlug);
    const hero = newPage.querySelector('.project-image--hero');
    const textBlock = newPage.querySelector('.project-text');
    if (textBlock) rollify(textBlock.querySelectorAll('.roll-target'));
    const rest = gsap.utils.toArray(newPage.querySelectorAll('.project-image:not(.project-image--hero), .project-text, .next-project'));
    gsap.set(rest, { opacity: 0, y: 40 });

    // Everything on the old page except the teaser window fades away
    const fading = [...fromPage.children].filter((el) => el !== link);
    const teaserText = link ? [...link.children].filter((el) => el !== win) : [];
    const tl = gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete() { html.classList.remove('is-transitioning'); switching = false; unlockScroll(); },   // safety net
    });
    window.koduTransition = tl;
    tl.to([...fading, ...teaserText], { opacity: 0, duration: 0.35, ease: 'power2.out' }, 0);

    const SWAP_AT = 0.35;
    tl.add(() => {
      const clone = first ? makeClone(largestSrc(heroData), first) : null;
      let cloneImg = null;
      if (clone) {
        // Replicate the teaser exactly: the image fills the teaser's 16:9 box (centred, cover) and the
        // clone box clips it to the window, so the first frame is pixel-identical to what was on screen.
        // Also match the teaser's hover zoom so nothing snaps at the moment of the click.
        cloneImg = clone.querySelector('img');
        const mediaH = win.querySelector('.next-project__media').getBoundingClientRect().height;
        gsap.set(cloneImg, { height: mediaH, scale: currentScale(win.querySelector('img')), transformOrigin: '50% 50%' });
        gsap.set(hero, { visibility: 'hidden' });
      }
      fromPage.replaceWith(newPage);
      scrollToTop();
      document.title = PROJECTS[nextSlug].name + ' — Kodu Studio';
      after(newPage);

      if (clone) {
        const last = hero.getBoundingClientRect();
        tl.to(clone, { top: last.top, left: last.left, width: last.width, height: last.height, duration: 1.15, ease: 'power3.inOut',
          onComplete() {
            unlockScroll();   // scrolling is free as soon as the image is in place
            const heroImg = hero.querySelector('img');
            const reveal = () => { gsap.set(hero, { clearProps: 'visibility' }); clone.remove(); };
            if (heroImg.complete && heroImg.naturalWidth) reveal();
            else { heroImg.addEventListener('load', reveal, { once: true }); heroImg.addEventListener('error', reveal, { once: true }); }
          } }, SWAP_AT);
        // Image box grows with the clone until it simply fills it (= the hero's own cover fit)
        tl.to(cloneImg, { height: last.height, scale: 1, duration: 1.15, ease: 'power3.inOut' }, SWAP_AT);
      }
      tl.to(rest, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06 }, SWAP_AT + 0.55);
      if (textBlock) tl.add(revealProjectText(textBlock), SWAP_AT + 0.7);
    }, SWAP_AT);
    return newPage;
  }

  /* ---------- Next project teaser: grows from 50% → 100% as it scrolls into view ----------
     Progress 0 = section top reaches the bottom of the viewport, 1 = page scrolled to the end.
     Eased, then lerped every frame so it glides instead of tracking the wheel 1:1. */
  if (NEXT_PROJECT && !reduceMotion) {
    const ease = gsap.parseEase('power2.out');
    let current = null;
    let lastWin = null;
    gsap.ticker.add(() => {
      const win = document.querySelector('.next-project__window');
      if (!win) { lastWin = null; return; }
      const r = win.parentElement.getBoundingClientRect();
      const p = gsap.utils.clamp(0, 1, (innerHeight - r.top) / r.height);
      const target = 0.5 + 0.5 * ease(p);
      if (win !== lastWin || current === null) { current = target; lastWin = win; }   // new page: no lerp from the old value
      current += (target - current) * 0.12;
      gsap.set(win, { scale: current, transformOrigin: '50% 0%' });
    });
  }

  // Standalone project page (direct load / refresh): render and stop here
  const staticPage = document.querySelector('[data-project-page]');
  if (staticPage) {
    const slug = body.dataset.project;
    const built = buildProjectPage(slug);
    staticPage.replaceWith(built);
    if (PROJECTS[slug]) document.title = PROJECTS[slug].name + ' — Kodu Studio';
    html.classList.add('intro-done');
    const text = built.querySelector('.project-text');
    if (text) {
      rollify(text.querySelectorAll('.roll-target'));
      (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => revealProjectText(text));
    }
    // Next-project navigation on a standalone page (with browser back/forward)
    let staticPageEl = built;
    let staticSlug = slug;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    history.replaceState({ view: 'project', slug }, '', location.href);
    const goTo = (nextSlug, pushUrl) => {
      const np = switchProject(staticPageEl, nextSlug, (newPage) => {
        staticPageEl = newPage; staticSlug = nextSlug;
        wireNextProject(newPage, goTo);
      });
      if (np && pushUrl) history.pushState({ view: 'project', slug: nextSlug }, '', siteUrl('projects/' + nextSlug));
    };
    wireNextProject(built, goTo);
    window.addEventListener('popstate', (e) => {
      const s = e.state;
      if (s && s.view === 'project' && s.slug !== staticSlug) goTo(s.slug, false);
    });
    return;
  }

  /* ---------- FAQ accordion (Approach page) ----------
     The answers are plain visible markup; JS collapses them, so without it the page still
     reads as a straightforward Q&A list. */
  const faqList = document.querySelector('.faq__list');
  if (faqList) {
    faqList.classList.add('faq--js');
    const items = [...faqList.querySelectorAll('.faq-item')];

    const setOpen = (item, open, animate = true) => {
      const btn = item.querySelector('.faq-item__q');
      const panel = item.querySelector('.faq-item__a');
      btn.setAttribute('aria-expanded', String(open));
      const target = open ? panel.scrollHeight + 40 : 0;   /* 40 = the padding it gets back */
      if (!animate || reduceMotion || typeof gsap === 'undefined') {
        panel.style.height = open ? 'auto' : '0px';
        panel.style.paddingBottom = open ? '40px' : '0px';
        return;
      }
      gsap.to(panel, {
        height: target ? target : 0,
        paddingBottom: open ? 40 : 0,
        duration: 0.5,
        ease: 'power3.inOut',
        onComplete() { if (open) panel.style.height = 'auto'; },
      });
    };

    items.forEach((item) => {
      const btn = item.querySelector('.faq-item__q');
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') === 'true';
        // one at a time, like the design
        if (!open) items.forEach((other) => { if (other !== item) setOpen(other, false); });
        setOpen(item, !open);
      });
      setOpen(item, false, false);
    });
  }

  /* ---------- Scroll reveals ----------
     Each marked block fades up once as it comes into view. These hide real content, so the
     observer is backed by a sweep that reveals anything already on screen: if the observer
     never fires, the worst case is no animation rather than an invisible page. */
  const revealItems = [...document.querySelectorAll('[data-reveal]')];
  if (revealItems.length && !reduceMotion && 'IntersectionObserver' in window) {
    html.classList.add('reveal-ready');
    const pending = new Set(revealItems);
    const lineSpans = new Map();          // block → the masked lines inside it

    /* The hero owns the first second or so of these pages. Anything that would reveal while
       it is still arriving waits in a queue instead, so the body is not animating underneath
       a headline that has not landed yet. */
    const hasHeroIntro = body.dataset.view === 'approach' || body.dataset.view === 'privacy';
    let gateOpen = !(hasHeroIntro && typeof gsap !== 'undefined');
    const queued = [];

    const paint = (el) => {
      el.classList.add('is-in');
      const spans = lineSpans.get(el);
      if (spans) gsap.to(spans, { yPercent: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07, force3D: false });
    };

    const show = (el) => {
      io.unobserve(el);
      pending.delete(el);
      if (gateOpen) paint(el); else queued.push(el);
    };

    const openGate = () => {
      if (gateOpen) return;
      gateOpen = true;
      // The first block goes immediately — a delayedCall(0) would still cost a frame, and
      // this is the one handing over from the hero.
      queued.forEach((el, i) => { if (i) gsap.delayedCall(i * 0.12, () => paint(el)); else paint(el); });
      queued.length = 0;
    };
    window.koduOpenReveals = openGate;
    // Belt and braces: if the intro never completes, nothing is left hidden.
    setTimeout(openGate, 4000);

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) show(e.target); });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    const sweep = () => {
      if (!pending.size) {
        removeEventListener('scroll', sweep);
        if (lenis) lenis.off('scroll', sweep);
        return;
      }
      [...pending].forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) show(el);
      });
    };

    revealItems.forEach((el) => io.observe(el));
    addEventListener('scroll', sweep, { passive: true });
    if (lenis) lenis.on('scroll', sweep);
    setTimeout(sweep, 1500);          // nothing on screen stays hidden

    /* data-reveal="lines" blocks get the hero's move instead of a plain fade: each line
       rises out of its own mask. Split after the fonts land, since the split measures where
       the lines actually break — doing it earlier would break them against a fallback face. */
    const lineBlocks = [...document.querySelectorAll('[data-reveal="lines"]')];
    if (lineBlocks.length && typeof gsap !== 'undefined') {
      (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
        lineBlocks.forEach((block) => {
          const spans = [...block.querySelectorAll('h1, h2, h3, p')].flatMap(splitLines);
          if (!spans.length) return;
          gsap.set(spans, { yPercent: 110 });
          lineSpans.set(block, spans);
          if (block.classList.contains('is-in')) paint(block);   // revealed while we waited
        });
      });
    }
  }

  /* ---------- Parallax ----------
     The image inside a band is taller than the band and slides across that slack as the band
     crosses the viewport. Driven by scroll rather than a permanent ticker, so it costs
     nothing while the band is off-screen. */
  const bands = [...document.querySelectorAll('.approach-band')];
  if (bands.length && !reduceMotion && typeof gsap !== 'undefined') {
    const SLACK = 28;                     // percent of slack, matches the image height in CSS
    const media = bands
      .map((b) => ({ band: b, el: b.querySelector('picture') || b.querySelector('img') }))
      .filter((x) => x.el);

    const update = () => {
      const vh = innerHeight;
      media.forEach(({ band, el }) => {
        const r = band.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        // 0 as the band enters the bottom of the screen, 1 as it leaves the top
        const p = Math.min(Math.max((vh - r.top) / (vh + r.height), 0), 1);
        gsap.set(el, { yPercent: -SLACK * (1 - p) });
      });
    };
    media.forEach(({ el }) => gsap.set(el, { yPercent: -SLACK }));
    update();
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    if (lenis) lenis.on('scroll', update);
  }

  /* ---------- TEXT SELECTION ----------
     ::selection takes a colour but not a gradient, so the highlight travels through the
     brand gradient's stops instead, only while something is actually selected. The text
     colour flips with the background's brightness so the selection always stays readable. */
  {
    const STOPS = [[240, 225, 206], [147, 81, 29], [61, 42, 35], [16, 16, 16]];
    // Near-black would vanish into the dark theme's page, so that stop is dropped there
    const stopsFor = () => (html.getAttribute('data-theme') === 'dark' ? STOPS.slice(0, 3) : STOPS);
    const CYCLE = 4200;           // ms for a full pass
    const STEP = 70;              // ms between repaints: smooth enough, cheap enough

    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    // Relative luminance, the same maths the contrast ratio uses
    const lum = ([r, g, b]) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };

    let timer = null;

    const paint = () => {
      const stops = stopsFor();
      const t = ((Date.now() % CYCLE) / CYCLE) * stops.length;
      const i = Math.floor(t);
      const rgb = mix(stops[i % stops.length], stops[(i + 1) % stops.length], t - i);
      html.style.setProperty('--selection-bg', 'rgb(' + rgb.join(',') + ')');
      html.style.setProperty('--selection-fg', lum(rgb) > 0.35 ? '#1c1c1c' : '#ffffff');
    };

    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
      html.style.removeProperty('--selection-bg');   // back to the solid orange
      html.style.removeProperty('--selection-fg');
    };

    const hasSelection = () => {
      const sel = getSelection();
      return !!sel && !sel.isCollapsed && String(sel).trim().length > 0;
    };
    const sync = () => {
      if (reduceMotion) return;                      // solid orange, no cycling
      if (hasSelection() && !document.hidden) {
        if (!timer) { paint(); timer = setInterval(paint, STEP); }
      } else {
        stop();
      }
    };

    document.addEventListener('selectionchange', sync);
    // A hidden tab should not repaint a selection, but it should pick up again on return
    document.addEventListener('visibilitychange', sync);
  }
  /* ---------- END TEXT SELECTION ---------- */

  /* ---------- Footer: the time in Newcastle ---------- */
  const clock = document.querySelector('[data-local-time]');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-AU', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Australia/Sydney',
    });
    const tick = () => { clock.textContent = 'NTL ' + fmt.format(new Date()).toUpperCase().replace(/\s/g, ''); };
    tick();
    setInterval(tick, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  }

  /* ---------- Footer: keep the year honest ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Back to top ---------- */
  const toTop = document.querySelector('[data-back-to-top]');
  if (toTop) {
    toTop.addEventListener('click', (e) => {
      e.preventDefault();
      if (lenis) lenis.scrollTo(0, { duration: 1.1 }); else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- MOBILE MENU ----------
     Below the carousel breakpoint the nav collapses to [theme toggle] [Menu], and Menu opens
     a full-screen panel. Built here so it exists on every page. Delete this block and the
     matching CSS to remove. */
  const nav = document.querySelector('.nav');
  if (nav) {
    const menuBtn = document.createElement('button');
    menuBtn.className = 'nav__menu';
    menuBtn.type = 'button';
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.innerHTML = '<span class="roll-target">Menu</span>';
    nav.appendChild(menuBtn);
    rollify(menuBtn.querySelectorAll('.roll-target'));

    const menuArrow = lucide('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>');      // arrow-right
    const menuExtArrow = lucide('<path d="M7 7h10v10"/><path d="M7 17 17 7"/>');    // arrow-up-right

    const panel = document.createElement('div');
    panel.className = 'menu-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Menu');
    panel.innerHTML =
      '<div class="menu-panel__bar">' +
        '<p class="menu-panel__brand">Kodu Studio</p>' +
        '<button class="menu-panel__close" type="button"><span class="roll-target">Close</span></button>' +
      '</div>' +
      '<p class="menu-panel__label">Navigate</p>' +
      '<nav class="menu-panel__nav" aria-label="Mobile">' +
        '<a href="' + siteUrl('./') + '">Work</a>' +
        '<a href="' + siteUrl('approach') + '">Approach</a>' +
        '<a href="' + siteUrl('about') + '">About</a>' +
        '<a class="js-menu-contact" href="mailto:' + escAttr(CONTACT_EMAIL) + '">Contact</a>' +
      '</nav>' +
      // The same classes the contact panel uses, so the two read as one piece of design
      // and there is only one set of styles to maintain.
      '<div class="contact-panel__links menu-panel__contact">' +
        '<p class="contact-panel__label">Say hello</p>' +
        '<a class="contact-link" href="mailto:' + escAttr(CONTACT_EMAIL) + '"><span class="roll-target">' + escAttr(CONTACT_EMAIL) + '</span>' + menuArrow + '</a>' +
        SOCIALS.map((s) =>
          '<a class="contact-link contact-link--ext" href="' + escAttr(s.url) + '" target="_blank" rel="noopener"><span class="roll-target">' + escAttr(s.label) + '</span>' + menuExtArrow + '</a>'
        ).join('') +
      '</div>';
    body.appendChild(panel);
    rollify(panel.querySelectorAll('.roll-target'));

    const closeBtn = panel.querySelector('.menu-panel__close');
    let menuOpen = false;
    let menuTl = null;

    const setMenuInert = (on) => {
      document.querySelectorAll('.site-header, main, .site-footer').forEach((el) => { el.inert = on; });
    };

    function openMenu() {
      if (menuOpen) return;
      menuOpen = true;
      menuBtn.setAttribute('aria-expanded', 'true');
      lockScroll('menu');
      setMenuInert(true);
      gsap.set(panel, { visibility: 'visible' });
      if (menuTl) menuTl.kill();
      menuTl = gsap.timeline()
        .fromTo(panel, { xPercent: 100, x: 0 }, { xPercent: 0, x: 0, duration: 0.6, ease: 'power3.out' });
      closeBtn.focus({ preventScroll: true });
    }

    function closeMenu(then) {
      if (!menuOpen) return;
      menuOpen = false;
      menuBtn.setAttribute('aria-expanded', 'false');
      setMenuInert(false);
      if (menuTl) menuTl.kill();
      menuTl = gsap.timeline({
        onComplete() { gsap.set(panel, { visibility: 'hidden' }); unlockScroll('menu'); if (then) then(); },
      }).to(panel, { xPercent: 100, x: 0, duration: 0.45, ease: 'power3.in' });
      menuBtn.focus({ preventScroll: true });
    }

    menuBtn.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
    closeBtn.addEventListener('click', () => closeMenu());
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) closeMenu(); });
    // Contact inside the menu hands over to the contact panel
    const menuContact = panel.querySelector('.js-menu-contact');
    if (menuContact) menuContact.addEventListener('click', (e) => {
      e.preventDefault();
      closeMenu(() => { const t = document.querySelector('.nav__item[href^="mailto:"]'); if (t) t.click(); });
    });
    // A plain link leaving the page should not leave the scroll locked
    panel.querySelectorAll('.menu-panel__nav a:not(.js-menu-contact)').forEach((a) => {
      a.addEventListener('click', () => { unlockScroll('menu'); setMenuInert(false); });
    });
  }
  /* ---------- END MOBILE MENU ---------- */

  /* ---------- About page ---------- */
  if (body.dataset.view === 'about') {
    const brandLines = gsap.utils.toArray('.brand > *');
    const navItems = gsap.utils.toArray('.nav > *');
    const portrait = document.querySelector('.about__portrait');
    const hero = document.querySelector('.page-intro__text');
    const eyebrows = gsap.utils.toArray('.about__eyebrow');
    const leads = gsap.utils.toArray('.about__lead');
    const listItems = gsap.utils.toArray('.about__list li');
    const linkItems = gsap.utils.toArray('.about__links li');

    html.classList.add('is-loading');
    const ready = document.fonts ? document.fonts.ready : Promise.resolve();
    ready.then(() => {
      if (reduceMotion) { html.classList.remove('is-loading'); html.classList.add('intro-done'); return; }

      const heroLines = hero ? splitLines(hero) : [];
      const lineSets = leads.map(splitLines);
      const lines = lineSets.flat();
      if (heroLines.length) gsap.set(heroLines, { yPercent: 110 });
      gsap.set(brandLines, { y: 14, opacity: 0 });
      gsap.set(navItems, { y: 14, opacity: 0 });
      gsap.set(portrait, { opacity: 0, y: 24, clipPath: 'inset(0 0 100% 0)' });
      gsap.set(eyebrows, { opacity: 0, y: 10 });
      gsap.set(leads, { opacity: 1 });
      gsap.set(lines, { yPercent: 110 });
      gsap.set([listItems, linkItems], { opacity: 0, y: 12 });
      html.classList.remove('is-loading');

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete() {
          html.classList.add('intro-done');
          gsap.set([brandLines, navItems, eyebrows, leads, listItems, linkItems, portrait], { clearProps: 'transform,opacity,clipPath' });
          // Put the paragraphs back to plain text so they render as ordinary, crisp type
          leads.forEach((el) => { el.textContent = el.dataset.text; });
          if (hero && hero.dataset.text) hero.textContent = hero.dataset.text;
        },
      });
      window.koduIntro = tl;
      // Lines were measured at the current width — if the window resizes mid-intro, just finish
      addEventListener('resize', () => { if (tl.isActive()) tl.progress(1); }, { once: true });

      // Nav — top-left first, then the right side
      tl.to(brandLines, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, force3D: false }, 0.1)
        .to(navItems, { y: 0, opacity: 1, duration: 0.9, stagger: 0.06, force3D: false }, 0.3);

      // The serif hero rises first
      if (heroLines.length) tl.to(heroLines, { yPercent: 0, duration: 1.0, stagger: 0.09, force3D: false }, 0.3);

      // Portrait wipes up into view
      tl.to(portrait, { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'power3.inOut' }, 0.25);

      // Each text row: eyebrow fades, then its paragraph rises line by line
      let at = 0.45;
      lineSets.forEach((set, i) => {
        tl.to(eyebrows[i], { opacity: 1, y: 0, duration: 0.6, force3D: false }, at)
          .to(set, { yPercent: 0, duration: 1.0, ease: 'power3.out', stagger: 0.09, force3D: false }, at + 0.1);
        at += 0.1 + set.length * 0.09 * 0.7; // next row starts while this one is still finishing
      });

      // Services list, then social links
      tl.to(eyebrows[lineSets.length], { opacity: 1, y: 0, duration: 0.6, force3D: false }, at)
        .to(listItems, { opacity: 1, y: 0, duration: 0.7, stagger: 0.07, force3D: false }, at + 0.1);
      at += 0.35;
      tl.to(eyebrows[lineSets.length + 1], { opacity: 1, y: 0, duration: 0.6, force3D: false }, at)
        .to(linkItems, { opacity: 1, y: 0, duration: 0.7, stagger: 0.07, force3D: false }, at + 0.1);
    });
    return;
  }

  /* ---------- Approach and Privacy pages ----------
     Same load-in as the About page: nav first, then the opening statement rises line by
     line. The rest of the page is static, so nothing below is animated. */
  if (body.dataset.view === 'approach' || body.dataset.view === 'privacy') {
    const brandLines = gsap.utils.toArray('.brand > *');
    const navItems = gsap.utils.toArray('.nav > *');
    const leads = [...document.querySelectorAll('.page-intro__text')];

    html.classList.add('is-loading');
    const ready = document.fonts ? document.fonts.ready : Promise.resolve();
    ready.then(() => {
      if (reduceMotion || typeof gsap === 'undefined') {
        html.classList.remove('is-loading'); html.classList.add('intro-done');
        if (window.koduOpenReveals) window.koduOpenReveals();
        return;
      }

      const lines = leads.flatMap(splitLines);
      gsap.set(brandLines, { y: 14, opacity: 0 });
      gsap.set(navItems, { y: 14, opacity: 0 });
      if (lines.length) gsap.set(lines, { yPercent: 110 });
      html.classList.remove('is-loading');

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete() {
          html.classList.add('intro-done');
          gsap.set([brandLines, navItems], { clearProps: 'transform,opacity' });
          // back to plain text so the big type renders crisp
          leads.forEach((el) => { if (el.dataset.text) el.textContent = el.dataset.text; });
        },
      });
      window.koduIntro = tl;
      addEventListener('resize', () => { if (tl.isActive()) tl.progress(1); }, { once: true });

      tl.to(brandLines, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, force3D: false }, 0.1)
        .to(navItems, { y: 0, opacity: 1, duration: 0.9, stagger: 0.06, force3D: false }, 0.3);
      if (lines.length) tl.to(lines, { yPercent: 0, duration: 1.0, stagger: 0.09, force3D: false }, 0.35);
      // Bring the body in just after the hero starts, not as it finishes. Anchored to an
      // absolute position rather than the hero's end, because the relationship that matters
      // is to where the hero begins: the About page starts its body 0.15s after its hero and
      // reads as one load, and anything keyed to the end read as two separate events.
      tl.call(() => { if (window.koduOpenReveals) window.koduOpenReveals(); }, null, 0.6);
    });
    return;
  }

  /* ---------- Homepage ---------- */
  const brandLines = gsap.utils.toArray('.brand > *');
  const navItems = gsap.utils.toArray('.nav > *');
  const wrapper = document.querySelector('.project-wrapper');
  const container = document.querySelector('.project-container');
  const cards = gsap.utils.toArray('.project-card');
  const cardMeta = gsap.utils.toArray('.project-card__meta');
  const HOME_TITLE = document.title;
  const mobileMQ = matchMedia('(max-width: 699px)');   // the mobile carousel breakpoint
  lockScroll('intro');                                   // released when the intro completes

  html.classList.add('is-loading');

  // Warm the cache with each project's hero image so the card → hero transition never waits on
  // the network. Uses the same srcset/sizes as the real hero so the browser fetches the exact
  // variant it will later display. Runs when the browser is idle, after the intro.
  /* Warm the project heroes so a card click lands on an image that is already there.
     This is a few MB at full size, so it is spent only where it is free: a wide screen on a
     fast connection. Phones and metered connections fetch the hero when the project opens. */
  function preloadHeroes() {
    const net = navigator.connection || {};
    if (net.saveData) return;
    if (/(^|-)(2g|3g)$/.test(net.effectiveType || '')) return;
    if (matchMedia('(max-width: 1199px)').matches) return;

    /* Warm the webp, not the jpg. The jpg only exists as a fallback for browsers that
       cannot take webp, and it is far heavier — one hero is 3.5MB as jpg against 0.31MB
       as webp, and warming all six in jpg pulled 5.5MB. The cards on this page have
       already negotiated the format through their <picture>, so their chosen file says
       whether this browser takes webp without needing a separate feature test. */
    const card = document.querySelector('.project-card img');
    const ext = card && /\.webp(\?|$)/.test(card.currentSrc) ? 'webp' : 'jpg';

    const run = () => Object.values(PROJECTS).forEach((p) => {
      const im = p.images && p.images[0];
      if (!im) return;
      const i = new Image();
      i.sizes = SIZES[1];
      i.srcset = imageSrcset(im, ext);
      i.src = siteUrl(`${im.src}-${Math.max(...im.widths)}.${ext}`);
    });
    // Speculative, so it waits for a genuinely idle moment rather than elbowing in at
    // the 2s mark, which landed inside the window that still counts against the page.
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 6000 }); else setTimeout(run, 3000);
  }

  function runIntro() {
    if (reduceMotion || typeof gsap === 'undefined') {
      html.classList.remove('is-loading');
      html.classList.add('intro-done');
      unlockScroll('intro');
      preloadHeroes();
      return;
    }

    // Where each card's centre sits in its final layout, relative to the container centre
    const cRect = container.getBoundingClientRect();
    const cx = cRect.left + cRect.width / 2;
    const cy = cRect.top + cRect.height / 2;
    const offsets = cards.map((card) => {
      const r = card.getBoundingClientRect();
      return { x: cx - (r.left + r.width / 2), y: cy - (r.top + r.height / 2) };
    });

    // Set initial states, then remove the CSS "hidden" class so GSAP owns opacity
    gsap.set(brandLines, { y: 14, opacity: 0 });
    gsap.set(navItems, { y: 14, opacity: 0 });
    gsap.set(cardMeta, { opacity: 0 });
    // Cards start stacked at the container centre but pushed fully below the viewport.
    // On mobile the stack sits at 80% so there's breathing room around it before it fans out.
    const belowViewport = window.innerHeight;
    const stackScale = mobileMQ.matches ? 0.8 : 1;
    cards.forEach((card, i) => {
      gsap.set(card, {
        x: offsets[i].x,
        y: offsets[i].y + belowViewport,
        scale: stackScale * 0.96,
        rotation: (i - (cards.length - 1) / 2) * 1.5,
        opacity: 1,
        zIndex: cards.length - i,
        transformOrigin: '50% 50%',
      });
    });
    html.classList.remove('is-loading');

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete() {
        html.classList.add('intro-done');
        unlockScroll('intro');
        // Drop GSAP's inline transforms so text sits on whole pixels and renders crisp
        gsap.set([brandLines, navItems], { clearProps: 'transform,opacity' });
        preloadHeroes();
      },
    });
    window.koduIntro = tl; // handy for scrubbing in devtools

    // 1. Cards slide up from below the viewport and settle stacked in the centre (0 → ~1.25s)
    tl.to(cards, {
      y: (i) => offsets[i].y,
      scale: stackScale,
      duration: 1.0,
      ease: 'power3.out',
      stagger: 0.05,
    }, 0);

    // 2. Nav appears while the cards are mid-slide — top-left first, then the right side
    tl.to(brandLines, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, force3D: false }, 0.35)
      .to(navItems, { y: 0, opacity: 1, duration: 0.9, stagger: 0.06, force3D: false }, 0.6);

    // 3. Spread starts while the slide-up is still settling so the two motions blend with no pause (1.05s → ~2.55s)
    tl.to(cards, {
      x: 0,
      y: 0,
      scale: 1,          // mobile: grow from the 80% stack to full size as they spread
      rotation: 0,
      duration: 1.3,
      ease: 'power3.inOut',
      stagger: { each: 0.04, from: 'center' },
      onComplete() {
        gsap.set(cards, { clearProps: 'transform,zIndex,opacity' });
      },
    }, 1.05);

    // 4. Card text fades in as the spread settles
    tl.to(cardMeta, {
      opacity: 1,
      duration: 0.8,
      ease: 'power2.out',
      stagger: { each: 0.04, from: 'center' },
      onComplete() {
        gsap.set(cardMeta, { clearProps: 'opacity' });
      },
    }, 1.9);
  }

  // Wait for fonts so measured card positions are final
  const ready = document.fonts ? document.fonts.ready : Promise.resolve();
  ready.then(runIntro);

  /* ---------- Card → project page transition (and back) ---------- */
  let currentPage = null;   // the .project-page element while a project is open
  let activeCard = null;    // the card that was clicked
  let busy = false;         // a transition is running
  let projectOpen = false;  // true from the moment a card is clicked until the close finishes
  let currentSlug = null;   // slug of the open project
  let depth = 0;            // history entries above "home" (1 = project, 2 = next project, ...)
  let queued = null;        // 'close' | 'open' requested while busy — runs when the transition ends
  let queuedArgs = null;
  function runQueued() {
    const q = queued; queued = null;
    if (q === 'close') closeProject();
    else if (q === 'open' && queuedArgs) openProject(...queuedArgs);
  }

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  history.replaceState({ view: 'home' }, '', location.href);

  function openProject(card, slug, pushUrl) {
    if (!PROJECTS[slug]) return;
    if (busy || switching) { queued = 'open'; queuedArgs = [card, slug, pushUrl]; return; }
    // Clicked before the intro finished: jump the intro to its end so the two don't fight
    if (window.koduIntro && window.koduIntro.isActive()) window.koduIntro.progress(1);
    html.classList.remove('is-loading');
    html.classList.add('intro-done');
    unlockScroll('intro');
    busy = true;
    projectOpen = true;
    lockScroll();
    activeCard = card;
    html.classList.add('is-transitioning');

    const media = card.querySelector('.project-card__media');
    const otherCards = cards.filter((c) => c !== card);
    const first = media.getBoundingClientRect();

    // Build the page now (hidden) so images start loading immediately
    const page = buildProjectPage(slug);
    currentSlug = slug;
    wireNextProject(page, goToNext);
    const hero = page.querySelector('.project-image--hero');
    const textBlock = page.querySelector('.project-text');
    if (textBlock) rollify(textBlock.querySelectorAll('.roll-target'));
    const rest = gsap.utils.toArray(page.querySelectorAll('.project-image:not(.project-image--hero), .project-text'));
    gsap.set(rest, { opacity: 0, y: 40 });

    const tl = gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete() {
        html.classList.remove('is-transitioning');
        busy = false;
        unlockScroll();
        runQueued();
      },
    });
    window.koduTransition = tl;

    // 1. Other cards (and all card text) fade away
    tl.to(otherCards, { opacity: 0, y: 12, duration: 0.4, ease: 'power2.out', stagger: 0.02 }, 0)
      .to(card.querySelector('.project-card__meta'), { opacity: 0, duration: 0.3, ease: 'power2.out' }, 0);

    // 2. Swap the DOM: card image → travelling clone → project hero
    const SWAP_AT = 0.2;
    tl.add(() => {
      // Start the clone from the card image that's already on screen (instant), then hand it the
      // hero's srcset so the browser upgrades to the hi-res variant as soon as it's available.
      // The <img> keeps showing the current bitmap until the new one has decoded, so no blank frame.
      const cardImg = media.querySelector('img');
      const heroData = PROJECTS[slug].images[0];
      const clone = makeClone(cardImg.currentSrc || cardImg.src, first);
      const cloneImg = clone.querySelector('img');
      cloneImg.sizes = SIZES[1];
      cloneImg.srcset = imageSrcset(heroData);
      // Match the card's hover zoom at the moment of the click, then ease back to 1 in flight
      gsap.set(cloneImg, { scale: currentScale(cardImg), transformOrigin: '50% 50%' });
      tl.to(cloneImg, { scale: 1, duration: 1.15, ease: 'power3.inOut' }, SWAP_AT);
      gsap.set(media, { visibility: 'hidden' });
      gsap.set(hero, { visibility: 'hidden' });

      wrapper.hidden = true;
      body.appendChild(page);
      currentPage = page;
      scrollToTop();

      const last = hero.getBoundingClientRect();
      tl.to(clone, {
        top: last.top, left: last.left, width: last.width, height: last.height,
        duration: 1.15, ease: 'power3.inOut',
        onComplete() {
          unlockScroll();   // scrolling is free as soon as the image is in place
          // Keep the clone in place until the hero underneath has actually loaded
          const heroImg = hero.querySelector('img');
          const reveal = () => { gsap.set(hero, { clearProps: 'visibility' }); clone.remove(); };
          if (heroImg.complete && heroImg.naturalWidth) reveal();
          else {
            heroImg.addEventListener('load', reveal, { once: true });
            heroImg.addEventListener('error', reveal, { once: true });
          }
        },
      }, SWAP_AT);
      tl.to(rest, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06 }, SWAP_AT + 0.55);
      if (textBlock) tl.add(revealProjectText(textBlock), SWAP_AT + 0.7);
    }, SWAP_AT);

    if (pushUrl) { depth = 1; history.pushState({ view: 'project', slug, depth }, '', siteUrl('projects/' + slug)); }
    document.title = PROJECTS[slug].name + ' — Kodu Studio';
  }

  // Next project from within an open project (homepage context): swap pages, keep card state in sync
  function goToNext(nextSlug, pushUrl) {
    if (busy || !currentPage) return;
    const np = switchProject(currentPage, nextSlug, (newPage) => {
      currentPage = newPage;
      currentSlug = nextSlug;
      // The card we originally left had its image/text hidden for the FLIP; put it back to normal
      if (activeCard) gsap.set([activeCard.querySelector('.project-card__media'), activeCard.querySelector('.project-card__meta')], { clearProps: 'visibility,opacity' });
      activeCard = cards.find((c) => c.dataset.project === nextSlug) || activeCard;
      wireNextProject(newPage, goToNext);
    });
    if (np && pushUrl) { depth += 1; history.pushState({ view: 'project', slug: nextSlug, depth }, '', siteUrl('projects/' + nextSlug)); }
  }

  function closeProject() {
    if (busy || switching) { queued = 'close'; return; }
    if (!currentPage) { projectOpen = false; return; }
    busy = true;
    html.classList.add('is-transitioning');
    lockScroll();

    const page = currentPage;
    const card = activeCard;
    const media = card.querySelector('.project-card__media');
    const meta = card.querySelector('.project-card__meta');
    const otherCards = cards.filter((c) => c !== card);
    const hero = page.querySelector('.project-image--hero');
    const rest = gsap.utils.toArray(page.querySelectorAll('.project-image:not(.project-image--hero), .project-text'));

    const tl = gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete() {
        html.classList.remove('is-transitioning');
        busy = false;
        unlockScroll();
        projectOpen = false;
        runQueued();
      },
    });
    window.koduTransition = tl;

    // 1. Other project images fade away
    tl.to(rest, { opacity: 0, y: 24, duration: 0.3, ease: 'power2.in', stagger: 0.015 }, 0);

    // 2. Hero → travelling clone → card image, while the other cards fade back in
    const SWAP_AT = 0.25;
    tl.add(() => {
      const first = hero.getBoundingClientRect();
      const heroImg = hero.querySelector('img');
      const clone = makeClone(heroImg.currentSrc || heroImg.src, first);

      page.remove();
      currentPage = null;
      gsap.set(otherCards, { opacity: 0, y: 12 });
      gsap.set(meta, { opacity: 0 });
      gsap.set(card, { clearProps: 'transform,opacity' });   // may have been faded as an "other card" before a next-project hop
      wrapper.hidden = false;
      scrollToTop();
      if (mobileMQ.matches) card.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' });

      const last = media.getBoundingClientRect();
      tl.to(clone, {
        top: last.top, left: last.left, width: last.width, height: last.height,
        duration: 1.15, ease: 'power3.inOut',
        onComplete() {
          unlockScroll();
          gsap.set(media, { clearProps: 'visibility' });
          clone.remove();
        },
      }, SWAP_AT);
      tl.to(otherCards, {
        opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.03,
        onComplete() { gsap.set(otherCards, { clearProps: 'transform,opacity' }); },
      }, SWAP_AT + 0.75);
      tl.to(meta, {
        opacity: 1, duration: 0.4, ease: 'power2.out',
        onComplete() { gsap.set(meta, { clearProps: 'opacity' }); },
      }, SWAP_AT + 0.95);
    }, SWAP_AT);

    document.title = HOME_TITLE;
  }

  // Card clicks: only cards with project data get the in-page transition
  cards.forEach((card) => {
    card.addEventListener('click', (e) => {
      const slug = card.dataset.project;
      if (!slug || !PROJECTS[slug] || reduceMotion) return; // fall through to a normal navigation
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      openProject(card, slug, true);
    });
  });


  // Brand link acts as "back" while a project is open
  document.querySelector('.brand__link').addEventListener('click', (e) => {
    e.preventDefault();
    if (projectOpen) history.go(-Math.max(1, depth));   // straight home, however many projects deep
    else scrollToTop();
  });

  // Browser back / forward
  window.addEventListener('popstate', (e) => {
    const state = e.state || { view: 'home' };
    depth = state.depth || 0;
    if (state.view === 'home' && projectOpen) {
      closeProject();
    } else if (state.view === 'project' && projectOpen && state.slug !== currentSlug) {
      goToNext(state.slug, false);
    } else if (state.view === 'project' && !projectOpen) {
      const card = cards.find((c) => c.dataset.project === state.slug);
      if (card) openProject(card, state.slug, false);
    }
  });


})();
