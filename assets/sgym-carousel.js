if (!customElements.get('sgym-carousel')) {
  customElements.define(
    'sgym-carousel',
    class SgymCarousel extends HTMLElement {
      connectedCallback() {
        this.viewport = this.querySelector('[data-sgym-viewport]');
        this.track = this.querySelector('[data-sgym-track]');
        if (!this.viewport || !this.track) return;

        this.prev = this.querySelector('[data-sgym-prev]');
        this.next = this.querySelector('[data-sgym-next]');
        this.dotsWrap = this.querySelector('[data-sgym-dots]');
        this.currentEl = this.querySelector('[data-sgym-current]');
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

        if (this.dataset.autoplay === 'true' && !this.reduceMotion && !this.timer) {
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
        return Math.max(1, Math.round((this.viewport.clientWidth + gap) / (first.getBoundingClientRect().width + gap)));
      }

      pageCount() {
        return Math.max(1, this.slides().length - this.pageSize() + 1);
      }

      dotCount() {
        if (this.dataset.dots === 'per-slide') return this.slides().length;
        return this.pageCount();
      }

      activeIndex() {
        const items = this.slides();
        if (!items.length) return 0;
        const left = this.viewport.scrollLeft;
        let index = 0;
        items.forEach((item, i) => {
          if (this.slideLeft(item) <= left + 8) index = i;
        });
        return index;
      }

      maxScroll() {
        return Math.max(0, this.viewport.scrollWidth - this.viewport.clientWidth);
      }

      ensureReachable() {
        const items = this.slides();
        const spacer = this.track.querySelector('[data-sgym-spacer]');
        if (this.dataset.loop === 'true' || items.length < 2) {
          spacer?.remove();
          return;
        }
        const card = items[0].getBoundingClientRect().width;
        const view = this.viewport.getBoundingClientRect();
        const overflows = items.some((item) => item.getBoundingClientRect().right > view.right + 1);
        if (!overflows || card <= 0 || card >= this.viewport.clientWidth - 1) {
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
        const left = Math.max(0, Math.min(this.slideLeft(target), this.maxScroll()));
        this.viewport.scrollTo({
          left,
          behavior: this.reduceMotion ? 'auto' : 'smooth',
        });
        this.update();
      }

      move(direction) {
        const items = this.slides();
        if (!items.length) return;
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
        if (this.currentEl) this.currentEl.textContent = String(index + 1);
        if (this.totalEl) this.totalEl.textContent = String(this.slides().length);
        const loop = this.dataset.loop === 'true';
        const left = this.viewport.scrollLeft;
        const max = this.maxScroll();
        const items = this.slides();
        const start = items.length ? this.slideLeft(items[0]) : 0;
        const lastLeft = items.length ? this.slideLeft(items[items.length - 1]) : 0;
        if (this.prev) this.prev.disabled = !loop && left <= start + 2;
        if (this.next) this.next.disabled = !loop && (max <= start + 2 || left >= lastLeft - 2 || left >= max - 2);
      }
    }
  );

  document.addEventListener('shopify:section:load', (event) => {
    event.target.querySelectorAll('sgym-carousel').forEach((node) => node.refresh?.());
  });
}
