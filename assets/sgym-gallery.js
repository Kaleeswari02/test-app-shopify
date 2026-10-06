if (!customElements.get('sgym-gallery')) {
  customElements.define(
    'sgym-gallery',
    class SgymGallery extends HTMLElement {
      connectedCallback() {
        this.slides = [...this.querySelectorAll('.sgym-gallery__slide')];
        this.thumbs = [...this.querySelectorAll('[data-sgym-thumb]')];
        this.index = Math.max(
          0,
          this.slides.findIndex((slide) => slide.classList.contains('is-active'))
        );

        this.querySelector('[data-sgym-gallery-prev]')?.addEventListener('click', () => this.go(this.index - 1));
        this.querySelector('[data-sgym-gallery-next]')?.addEventListener('click', () => this.go(this.index + 1));
        this.thumbs.forEach((thumb, index) => {
          thumb.addEventListener('click', () => this.go(index));
        });
        this.addEventListener('keydown', (event) => {
          const tag = event.target?.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          this.go(this.index + (event.key === 'ArrowRight' ? 1 : -1));
        });
        this.querySelectorAll('[data-sgym-jump]').forEach((button) => {
          button.addEventListener('click', () => {
            const mediaId = button.dataset.mediaId;
            const index = this.slides.findIndex((slide) => slide.dataset.mediaId === mediaId);
            if (index >= 0) this.go(index, true);
          });
        });

        const arButton = this.querySelector('[data-sgym-ar]');
        arButton?.addEventListener('click', () => {
          const xr = this.querySelector('[data-shopify-xr]');
          if (xr && !xr.hasAttribute('data-shopify-xr-hidden')) {
            xr.click();
            return;
          }
          const index = this.slides.findIndex((slide) => slide.dataset.mediaType === 'model');
          if (index >= 0) this.go(index, true);
        });

        if (typeof subscribe === 'function' && window.PUB_SUB_EVENTS?.variantChange) {
          this.unsubscribe = subscribe(window.PUB_SUB_EVENTS.variantChange, (payload) => {
            const sectionId = payload?.data?.sectionId;
            if (this.dataset.section && sectionId && sectionId !== this.dataset.section) return;
            const mediaId = payload?.data?.variant?.featured_media?.id;
            if (!mediaId) return;
            const index = this.slides.findIndex((slide) => slide.dataset.mediaId === String(mediaId));
            if (index >= 0) this.go(index);
          });
        }
      }

      disconnectedCallback() {
        this.unsubscribe?.();
      }

      go(index, load) {
        const count = this.slides.length;
        if (!count) return;
        this.index = (index + count) % count;
        if (typeof window.pauseAllMedia === 'function') window.pauseAllMedia();
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.slides.forEach((slide, i) => {
          const active = i === this.index;
          if (active) {
            slide.hidden = false;
            if (reduce) slide.classList.add('is-active');
            else requestAnimationFrame(() => slide.classList.add('is-active'));
          } else {
            slide.classList.remove('is-active');
            const hide = () => {
              if (!slide.classList.contains('is-active')) slide.hidden = true;
            };
            if (reduce) hide();
            else window.setTimeout(hide, 300);
          }
        });
        this.thumbs.forEach((thumb, i) => {
          if (i === this.index) thumb.setAttribute('aria-current', 'true');
          else thumb.removeAttribute('aria-current');
        });
        this.scrollThumbIntoList();

        const status = this.querySelector('[data-sgym-gallery-status]');
        if (status) status.textContent = `${this.index + 1} / ${count}`;

        if (!load) return;
        const poster = this.slides[this.index].querySelector('[id^="Deferred-Poster-"]');
        poster?.click();
      }

      scrollThumbIntoList() {
        const thumb = this.thumbs[this.index];
        const list = this.querySelector('.sgym-gallery__thumbs');
        if (!thumb || !list) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let nextTop = list.scrollTop;
        const thumbTop = thumb.offsetTop;
        const thumbBottom = thumbTop + thumb.offsetHeight;
        if (thumbTop < list.scrollTop) nextTop = thumbTop;
        else if (thumbBottom > list.scrollTop + list.clientHeight) nextTop = thumbBottom - list.clientHeight;
        let nextLeft = list.scrollLeft;
        const thumbLeft = thumb.offsetLeft;
        const thumbRight = thumbLeft + thumb.offsetWidth;
        if (thumbLeft < list.scrollLeft) nextLeft = thumbLeft;
        else if (thumbRight > list.scrollLeft + list.clientWidth) nextLeft = thumbRight - list.clientWidth;
        list.scrollTo({ top: nextTop, left: nextLeft, behavior: reduce ? 'auto' : 'smooth' });
      }
    }
  );
}
