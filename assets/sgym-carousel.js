if (!customElements.get('sgym-carousel')) {
  // cubic-bezier(.22, .61, .36, 1) — one card step eases out over 500ms.
  const featureEase = (() => {
    const x1 = 0.22;
    const y1 = 0.61;
    const x2 = 0.36;
    const y2 = 1;
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;
    const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
    const sampleY = (t) => ((ay * t + by) * t + cy) * t;
    const sampleDX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i += 1) {
        const dx = sampleX(t) - x;
        const d = sampleDX(t);
        if (Math.abs(dx) < 1e-5 || Math.abs(d) < 1e-6) break;
        t -= dx / d;
      }
      return sampleY(Math.max(0, Math.min(1, t)));
    };
  })();

  customElements.define(
    'sgym-carousel',
    class SgymCarousel extends HTMLElement {
      connectedCallback() {
        this.viewport = this.querySelector('[data-sgym-viewport]');
        this.track = this.querySelector('[data-sgym-track]');
        if (!this.viewport || !this.track) {
          if (!this.pendingBind) {
            this.pendingBind = true;
            const retry = () => {
              this.pendingBind = false;
              if (this.isConnected) this.connectedCallback();
            };
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', retry, { once: true });
            else requestAnimationFrame(retry);
          }
          return;
        }
        this.pendingBind = false;

        this.prev = this.querySelector('[data-sgym-prev]');
        this.next = this.querySelector('[data-sgym-next]');
        this.dotsWrap = this.querySelector('[data-sgym-dots]');
        this.currentEls = this.querySelectorAll('[data-sgym-current]');
        this.totalEl = this.querySelector('[data-sgym-total]');
        this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.reduceMotion = this.motion.matches;
        this.paused = false;
        this.destination = null;
        if (this.dataset.interval) this.style.setProperty('--sgym-interval', `${Number(this.dataset.interval)}ms`);

        this.abort?.abort();
        this.abort = new AbortController();
        const signal = this.abort.signal;

        this.prev?.addEventListener('click', () => this.move(-1), { signal });
        this.next?.addEventListener('click', () => this.move(1), { signal });
        this.viewport.addEventListener('scroll', () => this.update(), { passive: true, signal });
        this.viewport.addEventListener('wheel', () => {
          if (!this.closest('.sgym-showcase')) return;
          this.scrollToken = (this.scrollToken || 0) + 1;
          this.destination = null;
        }, { passive: true, signal });
        this.viewport.addEventListener('scrollend', () => {
          this.destination = null;
          this.update();
        }, { signal });
        this.viewport.addEventListener('keydown', (event) => {
          if (event.key === 'ArrowRight') this.move(1);
          if (event.key === 'ArrowLeft') this.move(-1);
        }, { signal });
        this.motion.addEventListener('change', () => {
          this.reduceMotion = this.motion.matches;
        }, { signal });
        this.bindDrag(signal);

        this.resizeObserver?.disconnect();
        this.resizeObserver = new ResizeObserver(() => this.refresh());
        this.resizeObserver.observe(this.viewport);

        this.refresh();

        if (this.dataset.autoplay === 'true' && !this.reduceMotion && !this.timer && this.slides().length > 1) {
          const interval = Number(this.dataset.interval || 6000);
          this.timer = window.setInterval(() => this.move(1), interval);
          this.addEventListener('mouseenter', () => this.pauseAutoplay(), { signal });
          this.addEventListener('focusin', () => this.pauseAutoplay(), { signal });
          this.restartRing();
        }
      }

      disconnectedCallback() {
        this.pauseAutoplay();
        this.resizeObserver?.disconnect();
        this.abort?.abort();
      }

      refresh() {
        if (!this.viewport || !this.track) return;
        this.centerTrack();
        this.ensureReachable();
        this.buildDots();
        this.update();
      }

      pauseAutoplay() {
        this.paused = true;
        if (this.timer) window.clearInterval(this.timer);
        this.timer = null;
        this.classList.remove('is-playing');
      }

      bindDrag(signal) {
        let startX = 0;
        let startScroll = 0;
        let dragging = false;
        const end = () => {
          dragging = false;
        };
        this.viewport.addEventListener('pointerdown', (event) => {
          if (event.pointerType === 'touch' || event.target.closest('button, a')) return;
          dragging = true;
          this.scrollToken = (this.scrollToken || 0) + 1;
          this.destination = null;
          startX = event.clientX;
          startScroll = this.viewport.scrollLeft;
        }, { signal });
        document.addEventListener('pointermove', (event) => {
          if (!dragging) return;
          this.viewport.scrollLeft = startScroll - (event.clientX - startX);
        }, { signal });
        document.addEventListener('pointerup', end, { signal });
        document.addEventListener('pointercancel', end, { signal });
      }

      slides() {
        return [...this.track.children].filter((node) => node.nodeType === 1 && !node.hasAttribute('data-sgym-spacer'));
      }

      gap() {
        const style = getComputedStyle(this.track);
        return parseFloat(style.columnGap || style.gap) || 0;
      }

      slideLeft(item) {
        const view = this.viewport.getBoundingClientRect();
        const rect = item.getBoundingClientRect();
        return this.viewport.scrollLeft + rect.left - view.left;
      }

      pageSize() {
        const first = this.slides()[0];
        if (!first) return 1;
        const gap = this.gap();
        const pad = this.scrollPad();
        const width = Math.max(0, this.viewport.clientWidth - pad * 2);
        const count = (width + gap) / (first.getBoundingClientRect().width + gap);
        // A partial card is still hidden. Floor it so the page step matches
        // the cards that are fully on screen.
        const visible = this.closest('.sgym-showcase') ? Math.floor(count) : Math.round(count);
        return Math.max(1, visible);
      }

      pageCount() {
        return Math.max(1, this.slides().length - this.pageSize() + 1);
      }

      dotCount() {
        if (this.dataset.dots === 'per-slide') return this.slides().length;
        return this.pageCount();
      }

      scrollPad() {
        return parseFloat(getComputedStyle(this.viewport).scrollPaddingLeft) || 0;
      }

      activeIndex() {
        const items = this.slides();
        if (!items.length) return 0;
        const left = this.viewport.scrollLeft + this.scrollPad();
        let index = 0;
        items.forEach((item, i) => {
          if (this.slideLeft(item) <= left + 8) index = i;
        });
        return index;
      }

      maxScroll() {
        return Math.max(0, this.viewport.scrollWidth - this.viewport.clientWidth);
      }

      // Scroll offset where the last card's right edge meets the viewport's
      // right edge. Trailing padding can make maxScroll larger than that.
      revealEnd() {
        const items = this.slides();
        const last = items[items.length - 1];
        const max = this.maxScroll();
        if (!last) return max;
        const view = this.viewport.getBoundingClientRect();
        const rect = last.getBoundingClientRect();
        const end = this.viewport.scrollLeft + rect.right - view.right;
        return Math.max(0, Math.min(max, end));
      }

      // Centre a scrolling row on its section. Track padding and
      // scroll-padding use one inset, so the first and last cards share it.
      centerTrack() {
        if (!this.closest('.sgym-coach, .sgym--dark, .sgym-strip')) return;
        this.track.querySelector('[data-sgym-spacer]')?.remove();
        const items = this.slides();
        if (!items.length) return;
        const available = this.viewport.clientWidth;
        const card = items[0].getBoundingClientRect().width;
        const gap = this.gap();
        if (available <= 0 || card <= 0) return;
        const count = items.length;
        const stride = card + gap;
        const content = count * card + Math.max(0, count - 1) * gap;
        let visibleCount = Math.max(1, Math.min(count, Math.floor((available + gap) / stride)));
        while (visibleCount < count) {
          const wider = (visibleCount + 1) * card + visibleCount * gap;
          if (wider <= available + 1) visibleCount += 1;
          else break;
        }
        const visible = Math.min(content, visibleCount * card + Math.max(0, visibleCount - 1) * gap);
        const inset = Math.max(0, (available - Math.min(visible, available)) / 2);
        this.style.setProperty('--sgym-track-inset', `${inset}px`);
      }

      ensureReachable() {
        if (this.closest('.sgym-showcase')) {
          this.ensureShowcaseSteps();
          return;
        }
        if (this.closest('.sgym-coach, .sgym--dark, .sgym-strip')) {
          this.track.querySelector('[data-sgym-spacer]')?.remove();
          return;
        }
        const items = this.slides();
        const spacer = this.track.querySelector('[data-sgym-spacer]');
        if (this.dataset.loop === 'true' || items.length < 2) {
          spacer?.remove();
          return;
        }
        const card = items[0].getBoundingClientRect().width;
        const last = items[items.length - 1];
        const lastRight = this.slideLeft(last) + last.getBoundingClientRect().width;
        // Dark rows bleed to the screen edge. A card that merely touches that
        // edge still has to be scrollable, or the next arrow looks live and
        // does nothing.
        const slack = this.closest('.sgym--dark') ? 48 : 1;
        if (lastRight <= this.viewport.clientWidth - slack || card <= 0 || card >= this.viewport.clientWidth - 1) {
          spacer?.remove();
          return;
        }
        const lastPos = this.slideLeft(items[items.length - 1]);
        const spacerWidth = spacer ? spacer.getBoundingClientRect().width : 0;
        const maxWithout = this.maxScroll() - spacerWidth;
        const needed = Math.max(0, Math.ceil(lastPos - maxWithout));
        if (needed < 1) {
          spacer?.remove();
          return;
        }
        const node = spacer || document.createElement('li');
        if (!spacer) {
          node.setAttribute('data-sgym-spacer', '');
          node.setAttribute('aria-hidden', 'true');
          this.track.append(node);
        }
        if (Math.abs((spacerWidth || 0) - needed) < 2) return;
        node.style.flex = `0 0 ${needed}px`;
        node.style.width = `${needed}px`;
        node.style.scrollSnapAlign = 'none';
        node.style.pointerEvents = 'none';
      }

      // One click moves a single card. The track has to be long enough
      // to park every card on the left edge, or the step clamps early.
      ensureShowcaseSteps() {
        const items = this.slides();
        const spacer = this.track.querySelector('[data-sgym-spacer]');
        if (items.length < 2) {
          spacer?.remove();
          return;
        }
        const stride = items[0].getBoundingClientRect().width + this.gap();
        if (stride <= 1) return;
        const target = this.slideLeft(items[items.length - 1]);
        const spacerWidth = spacer ? spacer.getBoundingClientRect().width : 0;
        const maxWithout = this.maxScroll() - spacerWidth;
        const needed = Math.max(0, Math.ceil(target - maxWithout));
        if (needed < 1) {
          spacer?.remove();
          return;
        }
        const node = spacer || document.createElement('li');
        if (!spacer) {
          node.setAttribute('data-sgym-spacer', '');
          node.setAttribute('aria-hidden', 'true');
          this.track.append(node);
        }
        if (spacer && Math.abs(spacerWidth - needed) < 2) return;
        node.style.flex = `0 0 ${needed}px`;
        node.style.width = `${needed}px`;
        node.style.scrollSnapAlign = 'none';
        node.style.pointerEvents = 'none';
      }

      buildDots() {
        if (!this.dotsWrap) return;
        const count = this.dotCount();
        const existing = this.dotsWrap.children.length;
        if (existing === count) return;
        this.dotsWrap.replaceChildren();
        if (count < 2) return;
        for (let i = 0; i < count; i += 1) {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.setAttribute('aria-label', `Show slide ${i + 1}`);
          dot.addEventListener('click', () => {
            this.destination = i;
            this.goTo(i);
          });
          this.dotsWrap.appendChild(dot);
        }
      }

      goTo(index) {
        const items = this.slides();
        const target = items[Math.max(0, Math.min(index, items.length - 1))];
        if (!target) return;
        const left = Math.max(0, Math.min(this.slideLeft(target) - this.scrollPad(), this.maxScroll()));
        this.animateScroll(left);
        this.update();
      }

      animateScroll(left, options = {}) {
        const view = this.viewport;
        this.scrollToken = (this.scrollToken || 0) + 1;
        const token = this.scrollToken;
        const finish = () => {
          if (token !== this.scrollToken) return;
          view.style.scrollSnapType = '';
          this.destination = null;
          this.update();
        };
        view.style.scrollSnapType = 'none';
        const target = Math.max(0, Math.min(left, this.maxScroll()));
        if (this.reduceMotion || Math.abs(target - view.scrollLeft) < 1) {
          view.scrollLeft = target;
          finish();
          return;
        }
        const start = view.scrollLeft;
        const change = target - start;
        const duration = options.duration || 480;
        const ease = options.ease || ((p) => 1 - Math.pow(1 - p, 3));
        const t0 = performance.now();
        const step = (now) => {
          if (token !== this.scrollToken) return;
          const p = Math.min(1, (now - t0) / duration);
          view.scrollLeft = start + change * ease(p);
          if (p < 1) requestAnimationFrame(step);
          else {
            view.scrollLeft = target;
            finish();
          }
        };
        requestAnimationFrame(step);
      }

      move(direction) {
        const items = this.slides();
        if (!items.length) return;
        // Key features: exactly one card plus its gap, clamped to the ends.
        if (this.closest('.sgym-showcase') && this.dataset.loop !== 'true') {
          const stride = items[0].getBoundingClientRect().width + this.gap();
          if (stride <= 1) return;
          const base = this.destination == null
            ? Math.round(this.viewport.scrollLeft / stride)
            : this.destination;
          const next = Math.max(0, Math.min(items.length - 1, base + direction));
          if (next === base) return;
          this.destination = next;
          this.animateScroll(this.slideLeft(items[next]), { duration: 500, ease: featureEase });
          this.restartRing();
          return;
        }
        // A short track can hit the end before the next card's snap point.
        // Previous still has to return to the start.
        if (direction < 0 && this.destination == null && this.viewport.scrollLeft > 2 && this.activeIndex() === 0) {
          this.destination = 0;
          this.animateScroll(0);
          this.restartRing();
          return;
        }
        const base = this.destination == null ? this.activeIndex() : this.destination;
        let next = base + direction;
        if (this.dataset.loop === 'true') next = (next + items.length) % items.length;
        else next = Math.max(0, Math.min(items.length - 1, next));
        if (next === base && this.dataset.loop !== 'true') return;
        this.destination = next;
        this.goTo(next);
        this.restartRing();
      }

      restartRing() {
        this.classList.remove('is-playing');
        if (this.dataset.autoplay !== 'true' || this.reduceMotion || this.paused) return;
        void this.offsetWidth;
        this.classList.add('is-playing');
      }

      update() {
        const index = this.dataset.dots === 'per-slide' ? this.activeIndex() : Math.min(this.activeIndex(), this.pageCount() - 1);
        this.dotsWrap?.querySelectorAll('button').forEach((dot, i) => {
          if (i === index) dot.setAttribute('aria-current', 'true');
          else dot.removeAttribute('aria-current');
        });
        this.currentEls?.forEach((el) => {
          el.textContent = String(index + 1);
        });
        if (this.totalEl) this.totalEl.textContent = String(this.slides().length);
        const loop = this.dataset.loop === 'true';
        const left = this.viewport.scrollLeft;
        const max = this.maxScroll();
        const items = this.slides();
        const start = items.length ? this.slideLeft(items[0]) : 0;
        const lastLeft = items.length ? this.slideLeft(items[items.length - 1]) : 0;
        const showcase = this.closest('.sgym-showcase');
        if (showcase) {
          const stride = items[0] ? items[0].getBoundingClientRect().width + this.gap() : 0;
          const stepEnd = stride > 0 && items.length ? this.slideLeft(items[items.length - 1]) : 0;
          const limit = Math.min(stepEnd, max);
          const atStart = left <= 2;
          const atEnd = limit <= 2 || left >= limit - 2;
          this.classList.toggle('is-scrolled', !atStart);
          this.classList.toggle('is-at-end', atEnd);
          if (this.prev) this.prev.disabled = !loop && atStart;
          if (this.next) this.next.disabled = !loop && atEnd;
          return;
        }
        if (this.prev) this.prev.disabled = !loop && left <= start + 2;
        if (this.next) this.next.disabled = !loop && (max <= 2 || left >= lastLeft - 2 || left >= max - 2);
      }
    }
  );

  document.addEventListener('shopify:section:load', (event) => {
    event.target.querySelectorAll('sgym-carousel').forEach((node) => node.refresh?.());
  });
}
