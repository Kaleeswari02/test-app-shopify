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

        this.prev?.addEventListener('click', () => this.move(-1));
        this.next?.addEventListener('click', () => this.move(1));
        this.viewport.addEventListener('scroll', () => this.update(), { passive: true });
        this.viewport.addEventListener('keydown', (event) => {
          if (event.key === 'ArrowRight') this.move(1);
          if (event.key === 'ArrowLeft') this.move(-1);
        });

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
          this.addEventListener('mouseenter', () => this.stop());
          this.addEventListener('focusin', () => this.stop());
        }
      }

      disconnectedCallback() {
        this.stop();
        this.resizeObserver?.disconnect();
      }

      stop() {
        if (this.timer) window.clearInterval(this.timer);
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
        const count = this.pageCount();
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
        const count = this.pageCount();
        const next = (this.activeIndex() + direction + count) % count;
        this.goTo(next);
      }

      update() {
        const index = Math.min(this.activeIndex(), this.pageCount() - 1);
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
