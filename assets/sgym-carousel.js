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
        this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.paused = false;
        if (this.dataset.interval) this.style.setProperty('--sgym-interval', `${Number(this.dataset.interval)}ms`);

        this.prev?.addEventListener('click', () => this.move(-1));
        this.next?.addEventListener('click', () => this.move(1));
        this.viewport.addEventListener('scroll', () => this.update(), { passive: true });
        this.viewport.addEventListener('keydown', (event) => {
          if (event.key === 'ArrowRight') this.move(1);
          if (event.key === 'ArrowLeft') this.move(-1);
        });
        this.bindDrag();

        this.buildDots();
        this.update();
        this.resizeObserver = new ResizeObserver(() => {
          this.buildDots();
          this.update();
        });
        this.resizeObserver.observe(this.viewport);

        if (this.dataset.autoplay === 'true' && !this.reduceMotion) {
          const interval = Number(this.dataset.interval || 6000);
          this.timer = window.setInterval(() => this.move(1), interval);
          this.addEventListener('mouseenter', () => this.pauseAutoplay());
          this.addEventListener('focusin', () => this.pauseAutoplay());
          this.restartRing();
        }
      }

      disconnectedCallback() {
        this.pauseAutoplay();
        this.resizeObserver?.disconnect();
      }

      pauseAutoplay() {
        this.paused = true;
        if (this.timer) window.clearInterval(this.timer);
        this.timer = null;
        this.classList.remove('is-playing');
      }

      bindDrag() {
        let startX = 0;
        let startScroll = 0;
        let dragging = false;
        this.viewport.addEventListener('pointerdown', (event) => {
          if (event.pointerType === 'touch' || event.target.closest('button, a')) return;
          dragging = true;
          startX = event.clientX;
          startScroll = this.viewport.scrollLeft;
          this.viewport.setPointerCapture(event.pointerId);
        });
        this.viewport.addEventListener('pointermove', (event) => {
          if (!dragging) return;
          this.viewport.scrollLeft = startScroll - (event.clientX - startX);
        });
        const end = () => {
          dragging = false;
        };
        this.viewport.addEventListener('pointerup', end);
        this.viewport.addEventListener('pointercancel', end);
      }

      slides() {
        return [...this.track.children].filter((node) => node.nodeType === 1);
      }

      pageSize() {
        const first = this.slides()[0];
        if (!first) return 1;
        const gap = parseFloat(getComputedStyle(this.track).columnGap || getComputedStyle(this.track).gap) || 0;
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
          if (item.offsetLeft <= left + 8) index = i;
        });
        return index;
      }

      buildDots() {
        if (!this.dotsWrap) return;
        const count = this.dotCount();
        this.dotsWrap.replaceChildren();
        if (count < 2) return;
        for (let i = 0; i < count; i += 1) {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.setAttribute('aria-label', `${i + 1}`);
          dot.addEventListener('click', () => this.goTo(i));
          this.dotsWrap.appendChild(dot);
        }
      }

      goTo(index) {
        const items = this.slides();
        const target = items[Math.max(0, Math.min(index, items.length - 1))];
        if (!target) return;
        this.viewport.scrollTo({
          left: target.offsetLeft,
          behavior: this.reduceMotion ? 'auto' : 'smooth',
        });
      }

      move(direction) {
        const index = this.activeIndex();
        if (this.dataset.loop === 'true') {
          const count = this.slides().length;
          this.goTo((index + direction + count) % count);
        } else {
          this.goTo(index + direction);
        }
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
        const maxScroll = this.viewport.scrollWidth - this.viewport.clientWidth - 2;
        if (this.prev) this.prev.disabled = this.viewport.scrollLeft <= 2 && this.dataset.loop !== 'true';
        if (this.next) this.next.disabled = this.viewport.scrollLeft >= maxScroll && this.dataset.loop !== 'true';
      }
    }
  );
}
