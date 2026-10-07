/* sGym Pro v2 interactions, ported from the static build. */
if (!window.__sgymV2Loaded) {
window.__sgymV2Loaded = true;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Smooth-scroll to an element, leaving room for the fixed header (Figma SCROLL_TO + SCROLL_ANIMATE). */
function scrollToEl(el) {
  if (!el) return;
  const header = document.querySelector('.shopify-section-header-sticky, sticky-header, .section-header, .site-header');
  const offset = (header ? header.getBoundingClientRect().height : 0) + 16;
  const y = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, y), behavior: reduceMotion() ? 'auto' : 'smooth' });
}

/** Accessible accordion toggle: button[aria-expanded] + panel[hidden]. */
function toggleDisclosure(btn, force) {
  const panel = document.getElementById(btn.getAttribute('aria-controls'));
  const open = force ?? btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', String(open));
  if (panel) panel.hidden = !open;
  btn.closest('[data-acc]')?.classList.toggle('is-open', open);
  return open;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const scrollAnims = new WeakMap();

/**
 * Animate a horizontal scroller to `left` with requestAnimationFrame. Independent of `scroll-behavior` and of the
 * browser / OS smooth-scrolling setting (Chrome on Windows can turn `behavior: 'smooth'` into a jump), and scroll-snap
 * is suspended while animating so mandatory snapping cannot pull the scroller back. Reduced motion → instant.
 */
function animateScrollLeft(el, left, { duration } = {}) {
  cancelScrollAnimation(el);
  const start = el.scrollLeft;
  const dist = left - start;
  if (Math.abs(dist) < 1 || reduceMotion()) { el.scrollLeft = left; return Promise.resolve(); }
  const ms = duration || Math.min(700, Math.max(320, Math.abs(dist) * 0.6));
  el.style.scrollSnapType = 'none';
  el.style.scrollBehavior = 'auto';
  el.dataset.animTarget = String(left);
  return new Promise((resolve) => {
    const t0 = performance.now();
    const state = { resolve };
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      el.scrollLeft = start + dist * ease(t);
      if (t < 1) { state.id = requestAnimationFrame(step); return; }
      cancelScrollAnimation(el);
    };
    state.id = requestAnimationFrame(step);
    scrollAnims.set(el, state);
  });
}

function cancelScrollAnimation(el) {
  const state = scrollAnims.get(el);
  if (state) { cancelAnimationFrame(state.id); scrollAnims.delete(el); state.resolve(); }
  el.style.scrollSnapType = '';
  el.style.scrollBehavior = '';
  delete el.dataset.animTarget;
}

/** Swap a counter number with a short slide-up (respects reduced motion). */
function animateNumber(el, value, dir = 1) {
  if (!el || el.textContent === String(value)) return;
  el.textContent = String(value);
  if (reduceMotion() || !el.animate) return;
  el.style.display = el.style.display || 'inline-block';
  el.animate([{ transform: `translateY(${60 * dir}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
}

function mainImageTarget() { return document.querySelector('[data-gallery-main]'); }


// Values from the Figma prototype SET_VARIABLE actions (collection 235:374: kaufbox/*).
const OPTIONS = {
  standard:   { auswahl: 'Standard',          preis: '2.999,00 €', uvp: '3.499,00 €', ersparnis: '500,00 € gespart' },
  allrounder: { auswahl: 'Allrounder Bundle', preis: '3.399,00 €', uvp: '3.999,00 €', ersparnis: '600,00 € gespart' },
  cardio:     { auswahl: 'Cardio Bundle',     preis: '3.299,00 €', uvp: '3.799,00 €', ersparnis: '500,00 € gespart' },
  performer:  { auswahl: 'Performer Bundle',  preis: '3.144,00 €', uvp: '3.999,00 €', ersparnis: '855,00 € gespart' },
};

function optionData() {
  const el = document.getElementById('sgym-v2-options');
  if (!el) return {};
  try { return JSON.parse(el.textContent); } catch (e) { return {}; }
}

function selectOption(key, { scroll = false } = {}) {
  const data = optionData();
  const o = data[key] || OPTIONS[key];
  if (!o) return;
  $$('[data-option]').forEach((b) => {
    const on = b.dataset.option === key;
    b.classList.toggle('is-selected', on);
    b.setAttribute('aria-checked', String(on));
  });
  const set = (name, v) => $$(`[data-var="kaufbox/${name}"]`).forEach((el) => { el.textContent = v; });
  set('auswahl', o.auswahl); set('preis', o.preis); set('uvp', o.uvp); set('ersparnis', o.ersparnis);
  const input = document.querySelector('.sgym-v2 .product-variant-id');
  const vid = o.id || o.fallbackId;
  if (input && vid) {
    input.value = vid;
    input.disabled = o.available === false;
  }
  const cta = document.querySelector('.sgym-v2 [data-add-to-cart]');
  if (cta) {
    const sold = o.available === false;
    cta.disabled = sold;
    cta.setAttribute('aria-disabled', String(sold));
    const label = cta.querySelector('[data-atc-label]');
    if (label && o.atcLabel) label.textContent = sold ? (o.soldLabel || 'Ausverkauft') : o.atcLabel;
  }
  if (o.image && mainImageTarget()) {
    const main = mainImageTarget();
    main.src = o.image;
  }
  if (scroll) {
    const box = $('#kaufbox-optionen');
    scrollToEl(box);
    const sel = $(`[data-option="${key}"]`);
    sel?.classList.add('is-flash');
    setTimeout(() => sel?.classList.remove('is-flash'), 1400);
  }
}

function initProduct() {
  if (window.__sgymV2Product) return;
  window.__sgymV2Product = true;
  // Gallery: thumbnails, prev/next (wraps 1 ↔ 12 like the Figma variants).
  const g = $('[data-gallery]');
  if (g) {
    const imgs = (g.dataset.images || '').split(',').filter(Boolean);
    const main = $('[data-gallery-main]', g);
    const thumbs = $$('[data-gallery-thumb]', g);
    if (main) {
    const srcOf = (t) => t?.dataset.full || t?.querySelector('img')?.currentSrc || t?.querySelector('img')?.src || '';
    let cur = 0;
    const show = (i) => {
      const list = thumbs.length ? thumbs : imgs;
      const n = list.length || imgs.length;
      if (!n) return;
      cur = (i + n) % n;
      main.classList.add('is-swapping');
      setTimeout(() => {
        const src = thumbs.length ? srcOf(thumbs[cur]) : imgs[cur];
        if (src) main.src = src;
        const label = thumbs[cur]?.getAttribute('aria-label') || '';
        if (label) main.alt = label.replace(' anzeigen', '');
        main.classList.remove('is-swapping');
      }, 120);
      thumbs.forEach((t, k) => (k === cur ? t.setAttribute('aria-current', 'true') : t.removeAttribute('aria-current')));
      main.dataset.index = String(cur);
    };
    thumbs.forEach((t, k) => t.addEventListener('click', () => show(k)));
    $$('[data-gallery-step]', g).forEach((b) => b.addEventListener('click', () => show(cur + Number(b.dataset.galleryStep))));
    // swipe on touch
    let x0 = null;
    const stage = $('.gallery__stage', g);
    if (stage) {
      stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
      stage.addEventListener('touchend', (e) => {
        if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1));
      });
    }
    }
  }

  // Buy-box info accordions (Highlights / Lieferung, Garantie & Service).
  $$('.infoacc__head[aria-controls]').forEach((b) => b.addEventListener('click', () => toggleDisclosure(b)));

  // Product options → price / UVP / savings / label.
  $$('[data-option]').forEach((b) => b.addEventListener('click', () => selectOption(b.dataset.option)));

  // Add to cart is the theme product-form (AJAX). This handler only covers the no-product fallback button.
  const fallbackBtn = $('[data-add-to-cart][data-fallback-cart]');
  fallbackBtn?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const label = btn.querySelector('[data-atc-label]');
    const prev = label ? label.textContent : btn.textContent;
    if (label) label.textContent = '✓ Im Warenkorb'; else btn.textContent = '✓ Im Warenkorb';
    btn.disabled = true;
    setTimeout(() => { if (label) label.textContent = prev; else btn.textContent = prev; btn.disabled = false; }, 1600);
  });

  // Ask-a-question chips fill the input.
  const input = $('[data-ask-input]');
  $$('[data-ask-chip]').forEach((c) => c.addEventListener('click', () => { input.value = c.textContent.trim(); input.focus(); }));
}



const MESSAGES = ['+4 Millionen zufriedene Kunden', 'Kostenloser Versand & 30 Tage Rückgaberecht', '0% Finanzierung verfügbar'];

function headerOffset() {
  const sticky = document.querySelector('.shopify-section-header-sticky, sticky-header, .section-header, .site-header');
  return sticky ? Math.round(sticky.getBoundingClientRect().height) : 0;
}
function syncHeaderOffset() {
  const h = headerOffset();
  document.querySelectorAll('.sgym-v2').forEach((el) => el.style.setProperty('--header-h', h + 'px'));
  if (document.querySelector('.sgym-v2')) document.documentElement.style.scrollPaddingTop = (h + 12) + 'px';
}
function initHeader() {
  if (window.__sgymV2Header) return;
  window.__sgymV2Header = true;
  syncHeaderOffset();
  window.addEventListener('resize', syncHeaderOffset, { passive: true });
  window.addEventListener('scroll', syncHeaderOffset, { passive: true });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || !a.closest('.sgym-v2, .sgym-v2-host')) return;
    const id = a.getAttribute('href').slice(1);
    const el = id ? document.getElementById(id) : null;
    if (!el) return;
    e.preventDefault();
    scrollToEl(el);
    history.replaceState(null, '', '#' + id);
  });
}


// Video controls (component 246:1018 Läuft ⇄ Pausiert) and the hero video overlay (246:1108 / 246:1112).
function initMedia() {
  if (window.__sgymV2Media) return;
  window.__sgymV2Media = true;
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-vctrl]');
    if (!c) return;
    const paused = c.getAttribute('aria-pressed') !== 'true';
    c.setAttribute('aria-pressed', String(paused));
    c.setAttribute('aria-label', paused ? 'Video abspielen' : 'Video pausieren');
    const v = c.closest('section')?.querySelector('video');
    if (v) paused ? v.pause() : v.play().catch(() => {});
  });

  // Sound toggle (14 · Sascha Huber "Ton aus" 227:2696 / 246:1103).
  document.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mute]');
    if (!m) return;
    const muted = m.getAttribute('aria-pressed') !== 'true';
    m.setAttribute('aria-pressed', String(muted));
    m.setAttribute('aria-label', muted ? 'Ton einschalten' : 'Ton ausschalten');
    const v = m.closest('section')?.querySelector('video');
    if (v) v.muted = muted;
  });

  // Video tiles in the reviews (243:1001 Pausiert ⇄ Läuft).
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-vtile]');
    if (!t) return;
    const on = t.getAttribute('aria-pressed') !== 'true';
    $$('[data-vtile][aria-pressed="true"]').forEach((x) => x.setAttribute('aria-pressed', 'false')); // one tile plays at a time
    t.setAttribute('aria-pressed', String(on));
    t.setAttribute('aria-label', t.getAttribute('aria-label').replace(/(abspielen|pausieren)$/, on ? 'pausieren' : 'abspielen'));
  });
  // The progress bar (243:1000 "Fortschritt") ends → back to Pausiert.
  document.addEventListener('animationend', (e) => {
    const t = e.target.closest?.('[data-vtile]');
    if (t && e.animationName === 'rv-progress') { t.setAttribute('aria-pressed', 'false'); t.setAttribute('aria-label', t.getAttribute('aria-label').replace(/pausieren$/, 'abspielen')); }
  });

  const dlg = $('#video-overlay');
  if (!dlg) return;
  let lastFocus = null;
  const open = () => {
    lastFocus = document.activeElement;
    dlg.hidden = false;
    requestAnimationFrame(() => dlg.classList.add('is-open'));
    document.documentElement.classList.add('no-scroll');
    const vid = $('video', dlg);
    if (vid && vid.src) vid.play().catch(() => {});
    $('[data-overlay-close]', dlg)?.focus();
  };
  const close = () => {
    dlg.classList.remove('is-open');
    const vid = $('video', dlg);
    if (vid) vid.pause();
    document.documentElement.classList.remove('no-scroll');
    setTimeout(() => { dlg.hidden = true; }, 200);
    lastFocus?.focus?.();
  };
  $$('[data-video-open]').forEach((b) => b.addEventListener('click', open));
  $$('[data-overlay-close]', dlg).forEach((b) => b.addEventListener('click', close));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  document.addEventListener('keydown', (e) => {
    if (dlg.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { e.preventDefault(); $('[data-overlay-close]', dlg)?.focus(); } // the close button is the only control
  });
}




/** Horizontal scroller with prev/next buttons and an optional "n von m" counter (Figma SCROLL_TO on overflow frames). */
function initCarousel(root) {
  const vp = $('[data-carousel-viewport]', root);
  if (!vp) return;
  const MIN_OVERFLOW = 24; // overflow smaller than this = nothing to scroll → both arrows disabled
  const items = () => [...vp.querySelectorAll(':scope > ul > li, :scope > div > *')].filter((el) => el.offsetParent !== null);
  const maxScroll = () => Math.max(0, vp.scrollWidth - vp.clientWidth);
  // Scroll position that brings each card to the snap start (viewport inner edge + scroll-padding), from layout boxes.
  const positions = () => {
    const pad = parseFloat(getComputedStyle(vp).scrollPaddingLeft) || 0;
    const snapLeft = vp.getBoundingClientRect().left + vp.clientLeft + pad;
    const max = maxScroll();
    const cur = vp.scrollLeft;
    return items().map((it) => {
      const p = Math.min(max, Math.max(0, Math.round(cur + it.getBoundingClientRect().left - snapLeft)));
      return p > max - 40 ? max : p;
    });
  };
  const stops = () => [...new Set(positions())].sort((a, b) => a - b);
  const current = () => (vp.dataset.animTarget != null ? Number(vp.dataset.animTarget) : vp.scrollLeft);
  const stopIndex = () => {
    const s = stops(); const left = current();
    let best = 0; s.forEach((p, i) => { if (Math.abs(p - left) < Math.abs(s[best] - left)) best = i; });
    return best;
  };
  let shown = null;
  const update = () => {
    const max = maxScroll();
    const scrollable = max > MIN_OVERFLOW;
    const left = current();
    const s = stops();
    root.classList.toggle('is-static', !scrollable);
    root.classList.toggle('can-next', scrollable && left < max - 2);
    root.classList.toggle('can-prev', scrollable && left > (s[0] || 0) + 2);
    $$('[data-carousel-prev]', root).forEach((b) => { b.disabled = !scrollable || left <= (s[0] || 0) + 2; });
    $$('[data-carousel-next]', root).forEach((b) => { b.disabled = !scrollable || left >= max - 2; });
    const idx = $('[data-carousel-index]', root);
    if (idx) {
      const n = Math.max(1, s.length);
      const i = stopIndex() + 1;
      animateNumber(idx, i, shown == null || i >= shown ? 1 : -1);
      shown = i;
      const tot = $('[data-carousel-total]', root); if (tot) tot.textContent = String(n);
    }
  };
  const move = (dir) => {
    if (maxScroll() <= MIN_OVERFLOW) return;
    const s = stops();
    const i = Math.max(0, Math.min(s.length - 1, stopIndex() + dir));
    animateScrollLeft(vp, s[i]).then(update);
    update();
  };
  $$('[data-carousel-prev]', root).forEach((b) => b.addEventListener('click', () => move(-1)));
  $$('[data-carousel-next]', root).forEach((b) => b.addEventListener('click', () => move(1)));
  // A user wheel / touch scroll cancels a running arrow animation so they never fight.
  ['wheel', 'touchstart'].forEach((t) => vp.addEventListener(t, () => cancelScrollAnimation(vp), { passive: true }));
  let queued = false;
  vp.addEventListener('scroll', () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; update(); }); }, { passive: true });
  new ResizeObserver(update).observe(vp);
  update();
}

/** Tabs (Figma CHANGE_TO between variants). Optional auto-advance (AFTER_TIMEOUT) via data-autoplay="ms". */
function initTabs(root) {
  const tabs = $$('[role="tab"]', root);
  const panels = $$('[role="tabpanel"]', root);
  let cur = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
  const show = (i, focus = false) => {
    cur = (i + tabs.length) % tabs.length;
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === cur)); t.tabIndex = k === cur ? 0 : -1; });
    panels.forEach((p, k) => { p.hidden = k !== cur; p.classList.toggle('is-active', k === cur); });
    root.dataset.active = String(cur);
    if (focus) tabs[cur].focus();
    placeIndicator();
  };
  // Single active-line element spanning the selected tab + its panel (see .poss__indicator).
  const indicator = $('[data-tab-indicator]', root);
  function placeIndicator() {
    if (!indicator || !indicator.offsetParent) return;
    const base = indicator.offsetParent.getBoundingClientRect();
    const t = tabs[cur]?.getBoundingClientRect();
    const p = panels[cur] && !panels[cur].hidden ? panels[cur].getBoundingClientRect() : null;
    if (!t) return;
    const top = t.top - base.top;
    const bottom = Math.max(t.bottom, p ? p.bottom : t.bottom) - base.top;
    indicator.style.setProperty('--ind-top', `${top}px`);
    indicator.style.setProperty('--ind-h', `${bottom - top}px`);
  }
  if (indicator) new ResizeObserver(() => placeIndicator()).observe(indicator.parentElement);
  tabs.forEach((t, k) => {
    t.addEventListener('click', () => { show(k); restart(); });
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); show(cur + 1, true); restart(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); show(cur - 1, true); restart(); }
    });
  });
  const ms = Number(root.dataset.autoplay || 0);
  let timer = null; let inView = false;
  const restart = () => {
    clearInterval(timer);
    if (!ms || reduceMotion() || !inView || root.matches(':hover')) return;
    timer = setInterval(() => show(cur + 1), ms);
  };
  if (ms) {
    new IntersectionObserver(([en]) => { inView = en.isIntersecting; restart(); }, { threshold: 0.35 }).observe(root);
    root.addEventListener('mouseenter', () => clearInterval(timer));
    root.addEventListener('mouseleave', restart);
    root.addEventListener('focusin', () => clearInterval(timer));
  }
  show(cur);
}

/** Crossfade slideshow with dots (Lifestyle-Karussell 255:2451: AFTER_TIMEOUT 3.5 s + ON_CLICK → next). */
function initSlides(root) {
  const slides = $$('[data-slide]', root);
  const dots = $$('[data-slide-dot]', root);
  let cur = 0; let timer = null; let inView = false;
  const ms = Number(root.dataset.autoplay || 3500);
  const show = (i) => {
    cur = (i + slides.length) % slides.length;
    slides.forEach((s, k) => { s.classList.toggle('is-active', k === cur); s.setAttribute('aria-hidden', String(k !== cur)); });
    dots.forEach((d, k) => d.setAttribute('aria-current', String(k === cur)));
  };
  const restart = () => { clearInterval(timer); if (!reduceMotion() && inView && !root.classList.contains('is-paused')) timer = setInterval(() => show(cur + 1), ms); };
  dots.forEach((d, k) => d.addEventListener('click', (e) => { e.stopPropagation(); show(k); restart(); }));
  $('[data-slides-stage]', root)?.addEventListener('click', (e) => { if (e.target.closest('button')) return; show(cur + 1); restart(); });
  $('[data-slides-toggle]', root)?.addEventListener('click', (e) => {
    const b = e.currentTarget; const paused = !root.classList.contains('is-paused');
    root.classList.toggle('is-paused', paused); b.setAttribute('aria-pressed', String(paused));
    b.setAttribute('aria-label', paused ? 'Diashow abspielen' : 'Diashow pausieren'); restart();
  });
  new IntersectionObserver(([en]) => { inView = en.isIntersecting; restart(); }, { threshold: 0.3 }).observe(root);
  show(0);
}

function initSections() {
  if (window.__sgymV2Sections) return;
  window.__sgymV2Sections = true;
  $$('[data-carousel]').forEach(initCarousel);
  $$('[data-tabs]').forEach(initTabs);
  $$('[data-slides]').forEach(initSlides);

  // Generic accordions (specs, FAQ, footer on mobile).
  $$('[data-acc-btn]').forEach((b) => b.addEventListener('click', () => toggleDisclosure(b)));
  // FAQ: the first answer starts open on desktop only (Figma desktop 227:1178 "Offen", mobile 228:362 all "Geschlossen").
  if (window.matchMedia('(max-width: 899px)').matches) $$('[data-open-desktop] [data-acc-btn]').forEach((b) => toggleDisclosure(b, false));

  // Kombinieren cards → select the bundle in the buy box and scroll to the options (Figma SET_VARIABLE + SCROLL_TO 257:1091).
  $$('[data-bundle]').forEach((card) => card.addEventListener('click', (e) => { e.preventDefault(); selectOption(card.dataset.bundle, { scroll: true }); }));

  // Mobile "Empfohlen" strip starts centred on the middle photo, like the Figma frame.
  const strip = $('[data-recs-strip]');
  const centre = () => {
    if (!strip || window.innerWidth >= 900) return;
    const c3 = strip.querySelectorAll('li')[2];
    if (c3) strip.scrollLeft = c3.offsetLeft - 123; // Figma 228:720: 3rd photo at x = 123 of 375
  };
  centre();
}

/** Scale fixed-size illustrations (e.g. 10 · Smart Gym, 1111×700) to their frame width. */
function initStageFit() {
  if (window.__sgymV2Stage) return;
  window.__sgymV2Stage = true;
  const frames = [...document.querySelectorAll('[data-stage-fit]')];
  if (!frames.length) return;
  const fit = (f) => { const w = Number(f.dataset.stageFit); f.style.setProperty('--s', String(Math.min(1, f.clientWidth / w))); };
  const ro = new ResizeObserver((entries) => entries.forEach((e) => fit(e.target)));
  frames.forEach((f) => { fit(f); ro.observe(f); });
}



/**
 * 17 · Bewertungen: rating dropdown, sort/filter chips (243:628 An/Aus), "Alle ansehen" / chevron expanders,
 * "War diese Bewertung hilfreich?" thumbs. Video tiles (243:1001 Pausiert ⇄ Läuft) live in media.js.
 */
function initReviews() {
  if (window.__sgymV2Reviews) return;
  window.__sgymV2Reviews = true;
  const root = $('[data-reviews]');
  if (!root) return;
  const lists = $$('[data-rv-list]', root);
  const empty = $('[data-rv-empty]', root);
  const state = { sort: null, photos: false, verified: false, stars: '5' };

  const apply = () => {
    let anyVisible = false;
    lists.forEach((list) => {
      const cards = $$(':scope > .rv__card', list);
      if (state.sort) {
        const dir = state.sort === 'new' ? -1 : 1;
        cards.map((c, i) => ({ c, i, t: Date.parse(c.dataset.date) }))
          .sort((a, b) => (a.t - b.t) * dir || a.i - b.i)
          .forEach(({ c }) => list.appendChild(c));
      }
      cards.forEach((c) => {
        const show = (!state.photos || c.dataset.photos === 'true')
          && (!state.verified || c.dataset.verified === 'true')
          && (state.stars === 'all' || c.dataset.stars === state.stars);
        c.hidden = !show;
        if (show && list.offsetParent !== null) anyVisible = true;
      });
    });
    if (empty) empty.hidden = anyVisible;
  };

  // Sort chips: Neueste / Älteste are exclusive; filter chips toggle.
  $$('[data-sort]', root).forEach((b) => b.addEventListener('click', () => {
    $$('[data-sort]', root).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    state.sort = b.dataset.sort; apply();
  }));
  $$('[data-filter]', root).forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    state[b.dataset.filter] = on; apply();
  }));

  // Rating dropdown (listbox).
  const btn = $('[data-rating-btn]', root);
  const menu = btn?.nextElementSibling;
  if (btn && menu) {
    const opts = $$('[role="option"]', menu);
    opts.forEach((o) => { o.tabIndex = -1; });
    const setOpen = (open) => {
      btn.setAttribute('aria-expanded', String(open)); menu.hidden = !open;
      if (open) (opts.find((o) => o.getAttribute('aria-selected') === 'true') || opts[0]).focus();
    };
    const choose = (o) => {
      opts.forEach((x) => x.setAttribute('aria-selected', String(x === o)));
      $('[data-rating-label]', btn).textContent = `Bewertung: ${o.textContent}`;
      state.stars = o.dataset.rating; apply(); setOpen(false); btn.focus();
    };
    btn.addEventListener('click', () => setOpen(menu.hidden));
    opts.forEach((o, i) => {
      o.addEventListener('click', () => choose(o));
      o.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); opts[Math.min(opts.length - 1, i + 1)].focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); opts[Math.max(0, i - 1)].focus(); }
        if (e.key === 'Home') { e.preventDefault(); opts[0].focus(); }
        if (e.key === 'End') { e.preventDefault(); opts[opts.length - 1].focus(); }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(o); }
        if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false); if (e.key === 'Escape') btn.focus(); }
      });
    });
    document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('.rv__rating')) setOpen(false); });
  }

  // Expanders: desktop "Alle ansehen" (wraps the carousel) and mobile chevrons (reveal the remaining thumbnails).
  $$('[data-expand]', root).forEach((b) => b.addEventListener('click', () => {
    const block = b.closest('.rv__block, .rv__mblock');
    const open = !block.classList.contains('is-open');
    block.classList.toggle('is-open', open);
    b.setAttribute('aria-expanded', String(open));
  }));

  // Helpful thumbs: one vote per card, click again to undo.
  $$('[data-helpful]', root).forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    $$('[data-helpful]', b.parentElement).forEach((x) => x.setAttribute('aria-pressed', String(x === b && on)));
  }));
}



/** Footer: mobile accordions (228:364 Service / Rechtliches / Unternehmen) and the newsletter form (227:3404 / 228:1766). */
function initFooter() {
  if (window.__sgymV2Footer) return;
  window.__sgymV2Footer = true;
  const mq = window.matchMedia('(max-width: 899px)');
  const accs = $$('[data-ft-acc]');
  const sync = () => accs.forEach((acc) => {
    const btn = $('[data-ft-acc-btn]', acc);
    if (!btn) return;
    const list = document.getElementById(btn.getAttribute('aria-controls'));
    if (!list) return;
    if (mq.matches) {
      btn.tabIndex = 0; btn.removeAttribute('aria-disabled');
      const open = acc.classList.contains('is-open');
      btn.setAttribute('aria-expanded', String(open)); list.hidden = !open;
    } else { // desktop: plain column headings, lists always visible
      btn.tabIndex = -1; btn.setAttribute('aria-disabled', 'true'); btn.removeAttribute('aria-expanded'); list.hidden = false;
    }
  });
  accs.forEach((acc) => $('[data-ft-acc-btn]', acc).addEventListener('click', () => {
    if (!mq.matches) return;
    acc.classList.toggle('is-open'); sync();
  }));
  mq.addEventListener('change', sync);
  sync();

  const form = $('[data-newsletter]');
  if (form) {
    const input = $('input[type="email"]', form);
    const msg = $('.ft-news__msg', form);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
      msg.hidden = false;
      msg.classList.toggle('is-error', !ok);
      msg.textContent = ok
        ? (form.dataset.msgOk || 'Danke! Bitte bestätige deine Anmeldung in deinem Postfach.')
        : (form.dataset.msgBad || 'Bitte gib eine gültige E-Mail-Adresse ein.');
      input.setAttribute('aria-invalid', String(!ok));
      if (ok) form.reset(); else input.focus();
    });
  }
}

// "Mehr als nur dein Smart Gym." — the "X VON 3" badge is a real slideshow control.
// The ring is a progress timer (stroke-dashoffset 100 → 0); when it completes the next slide is shown (1 → 2 → 3 → 1).
// Clicking / Enter / Space on the badge goes to the next slide. The timer pauses on hover / focus, while the section is
// out of view and while the tab is hidden. Reduced motion (and ?qc=1 fidelity runs) keep the static Figma state.


function initSpotlight(root, { slides, interval = 5000, labels = [] }) {
  const counter = $('[data-spot-counter]', root);
  if (!counter || !slides.length) return;
  const qc = new URLSearchParams(location.search).has('qc');
  // Figma wrapper frames are often `display: contents` (no box → opacity/filter/translate do nothing): use their children.
  const expand = (el) => (getComputedStyle(el).display === 'contents' ? [...el.children].flatMap(expand) : [el]);
  const groups = slides.map((ids) => ids.map((id) => root.querySelector(`[data-fig="${id}"], [data-fid="${id}"]`)).filter(Boolean).flatMap(expand));
  const all = groups.flat();
  all.forEach((el) => el.setAttribute('data-spot-group', ''));
  const nums = $$('[data-spot-num]', root);
  const ring = $('[data-spot-ring]', root);
  const total = slides.length;
  $$('[data-spot-total]', root).forEach((el) => { el.textContent = String(total); });

  counter.setAttribute('role', 'button');
  counter.tabIndex = 0;
  counter.classList.add('is-live');

  let cur = -1;
  let elapsed = 0;
  const pause = new Set(['offscreen']);
  const isStatic = () => reduceMotion() || qc;

  const setRing = (f) => { if (ring) ring.style.strokeDashoffset = String(100 - Math.max(0, Math.min(1, f)) * 100); };
  const show = (i) => {
    const prev = cur;
    cur = ((i % total) + total) % total;
    const spot = !isStatic();
    root.classList.toggle('is-spotting', spot);
    groups.forEach((g, k) => g.forEach((el) => {
      el.classList.toggle('is-spot', spot && k === cur);
      el.classList.toggle('is-dim', spot && k !== cur);
    }));
    const dir = prev === -1 || cur > prev || (cur === 0 && prev === total - 1) ? 1 : -1;
    nums.forEach((n) => (prev === -1 ? (n.textContent = String(cur + 1)) : animateNumber(n, cur + 1, dir)));
    counter.setAttribute('aria-label', `Folie ${cur + 1} von ${total}${labels[cur] ? ` (${labels[cur]})` : ''} – nächste Folie anzeigen`);
    elapsed = 0;
    setRing(isStatic() ? 1 : 0);
  };
  const next = () => show(cur + 1);

  counter.addEventListener('click', next);
  counter.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); }
  });
  const hoverEl = root.querySelector('.smart__card') || root;
  hoverEl.addEventListener('mouseenter', () => pause.add('hover'));
  hoverEl.addEventListener('mouseleave', () => pause.delete('hover'));
  root.addEventListener('focusin', () => pause.add('focus'));
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) pause.delete('focus'); });
  document.addEventListener('visibilitychange', () => (document.hidden ? pause.add('hidden') : pause.delete('hidden')));
  new IntersectionObserver(([en]) => (en.isIntersecting ? pause.delete('offscreen') : pause.add('offscreen')), { threshold: 0.35 }).observe(root);

  // Static (reduced motion / qc): show the designed final state ("3 VON 3", everything lit); clicks still step.
  if (isStatic()) { show(total - 1); } else { show(0); }

  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(100, now - last);
    last = now;
    if (!isStatic()) {
      if (!pause.size) elapsed += dt;
      if (elapsed >= interval) next();
      else setRing(elapsed / interval);
    }
    root.classList.toggle('is-paused', pause.size > 0);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  root._spotlight = { show, next, get index() { return cur; }, get elapsed() { return elapsed; }, pause };
}

function initSmart() {
  if (window.__sgymV2Smart) return;
  window.__sgymV2Smart = true;
  const root = document.querySelector('#smart-gym');
  if (!root) return;
  initSpotlight(root, {
    interval: 5000,
    labels: ['Workouts & AI-Coach', 'Trainingsdaten', 'Statistiken & App'],
    slides: [
      ['227:2470', '227:2484', '227:2486', '227:2488'], // Coach phone, Landschaften image + pill, Workouts pill
      ['227:2175', '227:2507'], // display/tablet with training stats + "Trainingsdaten" pill
      ['227:2477', '227:2485', '227:2492', '227:2494', '227:2468'], // stats phone, Rezepte image + pill, Statistiken, "…und vieles mehr"
    ],
  });
}

// Real scroll-triggered reveals (IntersectionObserver). Figma could only fake this with MOUSE_ENTER →
// "Einblenden · Überschrift" (258:1094: Start = opacity 0 / +24 px → Sichtbar).
function initReveal() {
  if (window.__sgymV2Reveal) return;
  window.__sgymV2Reveal = true;
  const els = [...document.querySelectorAll('.reveal')];
  if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-visible')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  els.forEach((el) => io.observe(el));
}


function bootSgymV2() {
  initHeader();
  document.querySelectorAll('[data-gallery]').forEach((g) => {
    if (g.dataset.sgymBound) return;
    g.dataset.sgymBound = '1';
  });
  initProduct();
  initMedia();
  initSections();
  initStageFit();
  initReviews();
  initFooter();
  initSmart();
  initReveal();
}
if (!window.__sgymV2DocBound) {
  window.__sgymV2DocBound = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootSgymV2);
  else bootSgymV2();
  document.addEventListener('shopify:section:load', () => {
    document.querySelectorAll('[data-sgym-bound], [data-sgymBound]').forEach((el) => { delete el.dataset.sgymBound; });
    bootSgymV2();
  });
} else {
  bootSgymV2();
}
}

