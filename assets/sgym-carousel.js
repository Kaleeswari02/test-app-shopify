/*
 * Horizontal scroller with prev/next arrows, dots, an "X of N" counter and optional autoplay.
 *
 * Card positions come from bounding boxes relative to the snapport (the viewport edge plus
 * scroll-padding). offsetLeft is relative to the nearest positioned ancestor, so it included
 * the row's own page offset and sent "next" past the card (or nowhere, once clamped).
 *
 * Arrow movement is a requestAnimationFrame tween with scroll-snap and scroll-behavior
 * suspended for the whole tween. Native smooth scrolling plus mandatory snap snaps or jumps
 * the track on Windows Chrome, so the tween never relies on it. Reduced motion jumps.
 */
if (!customElements.get('sgym-carousel')) {
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const OVERFLOW_EPS = 8;

  customElements.define(
    'sgym-carousel',
    class SgymCarousel extends HTMLElement {
      connectedCallback() {
        this.viewport = this.querySelector('[data-sgym-viewport]');
        this.track = this.querySelector('[data-sgym-track]');
        if (!this.viewport || !this.track) return;

        this.prev = this.querySelector('[data-sgym-prev]');
        this.next = this.querySelector('[data-sgym-next]');
        this.counter = this.querySelector('[data-sgym-counter]');
        this.dotsWrap = this.querySelector('[data-sgym-dots]');
        this.currentEl = this.querySelector('[data-sgym-current]');
        this.totalEl = this.querySelector('[data-sgym-total]');
        this.arc = this.querySelector('.sgym-counter__arc');
        this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.reduceMotion = this.motion.matches;
        this.destination = null;
        this.animTarget = null;
        this.shownStop = -1;
        this.pauseReasons = new Set();
        this.interval = Math.max(1500, Number(this.dataset.interval || 5000));
        this.elapsed = 0;

        this.abort?.abort();
        this.abort = new AbortController();
        const { signal } = this.abort;

        this.prev?.addEventListener('click', () => this.move(-1), { signal });
        this.next?.addEventListener('click', () => this.move(1), { signal });
        this.counter?.addEventListener('click', () => this.move(1), { signal });
        this.viewport.addEventListener('scroll', () => this.scheduleUpdate(), { passive: true, signal });
        this.viewport.addEventListener('scrollend', () => {
          if (this.animTarget != null) return;
          this.destination = null;
          this.update();
        }, { signal });
        this.viewport.addEventListener('keydown', (event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            this.move(1);
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            this.move(-1);
          }
        }, { signal });
        ['wheel', 'touchstart'].forEach((type) => {
          this.viewport.addEventListener(type, () => this.cancelAnimation(), { passive: true, signal });
        });
        this.motion.addEventListener('change', () => {
          this.reduceMotion = this.motion.matches;
          this.update();
        }, { signal });
        this.bindDrag(signal);

        this.resizeObserver?.disconnect();
        this.resizeObserver = new ResizeObserver(() => this.refresh());
        this.resizeObserver.observe(this.viewport);
        this.resizeObserver.observe(this.track);

        this.refresh();
        if (this.dataset.autoplay === 'true') this.setupAutoplay(signal);
      }

      disconnectedCallback() {
        this.resizeObserver?.disconnect();
        this.intersection?.disconnect();
        cancelAnimationFrame(this.tickId);
        this.tickId = null;
        this.cancelAnimation();
        this.abort?.abort();
      }

      refresh() {
        if (!this.viewport || !this.track) return;
        this.ensureReachable();
        this.buildDots();
        this.update();
      }

      bindDrag(signal) {
        let startX = 0;
        let startScroll = 0;
        let dragging = false;
        const end = () => {
          if (!dragging) return;
          dragging = false;
          const delta = this.viewport.scrollLeft - startScroll;
          this.viewport.classList.remove('is-animating');
          if (Math.abs(delta) > 24) this.goTo(this.activeIndex());
          else this.update();
        };
        this.viewport.addEventListener('pointerdown', (event) => {
          if (event.pointerType === 'touch' || event.button !== 0) return;
          if (event.target.closest('button, a, input, select, textarea')) return;
          if (!this.isScrollable()) return;
          this.cancelAnimation();
          dragging = true;
          this.destination = null;
          startX = event.clientX;
          startScroll = this.viewport.scrollLeft;
          this.viewport.classList.add('is-animating');
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

      maxScroll() {
        return Math.max(0, this.viewport.scrollWidth - this.viewport.clientWidth);
      }

      isScrollable() {
        return this.maxScroll() > OVERFLOW_EPS;
      }

      /* Scroll position that parks each slide on the snapport, clamped to the scroll range. */
      positions() {
        const items = this.slides();
        if (!items.length || !this.viewport) return [];
        const vp = this.viewport;
        const style = getComputedStyle(vp);
        const scrollPad = parseFloat(style.scrollPaddingLeft) || 0;
        const snapLeft = vp.getBoundingClientRect().left + vp.clientLeft + scrollPad;
        const current = vp.scrollLeft;
        const max = this.maxScroll();
        return items.map((item) => {
          const raw = current + item.getBoundingClientRect().left - snapLeft;
          const pos = Math.min(max, Math.max(0, raw));
          return pos > max - OVERFLOW_EPS ? max : pos;
        });
      }

      activeIndex() {
        const pos = this.positions();
        if (!pos.length) return 0;
        const left = this.animTarget ?? this.viewport.scrollLeft;
        let best = 0;
        pos.forEach((p, i) => {
          if (Math.abs(p - left) < Math.abs(pos[best] - left) - 0.5) best = i;
        });
        return best;
      }

      /* Distinct resting positions. Cards past the last reachable stop share one entry. */
      stops() {
        const unique = [];
        this.positions().forEach((pos) => {
          const rounded = Math.round(pos);
          if (!unique.length || Math.abs(unique[unique.length - 1] - rounded) > OVERFLOW_EPS) unique.push(rounded);
        });
        return unique.length ? unique : [0];
      }

      stopIndex() {
        const stops = this.stops();
        const here = Math.round((this.positions()[this.activeIndex()] ?? 0));
        const found = stops.findIndex((pos) => Math.abs(pos - here) <= OVERFLOW_EPS);
        return found < 0 ? 0 : found;
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
        return this.isScrollable() ? this.pageCount() : 1;
      }

      ensureReachable() {
        const items = this.slides();
        const spacer = this.track.querySelector('[data-sgym-spacer]');
        if (this.dataset.loop === 'true' || items.length < 2) {
          spacer?.remove();
          return;
        }
        const card = items[0].getBoundingClientRect().width;
        if (card <= 0) return;
        const last = items[items.length - 1];
        const spacerWidth = spacer ? spacer.getBoundingClientRect().width : 0;
        const lastPos = this.slideOffset(last);
        const maxWithout = Math.max(0, this.maxScroll() - spacerWidth);
        const overflows = last.getBoundingClientRect().right > this.viewport.getBoundingClientRect().right + 1
          || maxWithout > OVERFLOW_EPS;
        if (!overflows) {
          spacer?.remove();
          return;
        }
        const needed = Math.max(0, Math.ceil(lastPos - maxWithout));
        if (needed < 1) {
          spacer?.remove();
          return;
        }
        if (spacer && Math.abs(spacerWidth - needed) < 2) return;
        const node = spacer || document.createElement('li');
        if (!spacer) {
          node.setAttribute('data-sgym-spacer', '');
          node.setAttribute('aria-hidden', 'true');
          this.track.append(node);
        }
        node.style.flex = `0 0 ${needed}px`;
        node.style.width = `${needed}px`;
        node.style.scrollSnapAlign = 'none';
        node.style.pointerEvents = 'none';
      }

      /* Card start in scroll coordinates, ignoring the spacer so the spacer math cannot recurse. */
      slideOffset(item) {
        const vp = this.viewport;
        const style = getComputedStyle(vp);
        const scrollPad = parseFloat(style.scrollPaddingLeft) || 0;
        const snapLeft = vp.getBoundingClientRect().left + vp.clientLeft + scrollPad;
        return vp.scrollLeft + item.getBoundingClientRect().left - snapLeft;
      }

      buildDots() {
        if (!this.dotsWrap) return;
        const count = this.dotCount();
        if (this.dotsWrap.childElementCount === (count < 2 ? 0 : count)) return;
        this.dotsWrap.replaceChildren();
        if (count < 2) return;
        for (let i = 0; i < count; i += 1) {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.setAttribute('aria-label', `Show slide ${i + 1}`);
          dot.addEventListener('click', () => {
            this.destination = i;
            this.goTo(i, { wrap: this.dataset.loop === 'true' });
            this.resetTimer();
          });
          this.dotsWrap.appendChild(dot);
        }
      }

      move(direction) {
        const items = this.slides();
        if (!items.length) return;
        const loop = this.dataset.loop === 'true';
        if (!loop && !this.isScrollable()) return;
        const pos = this.positions();
        const from = this.destination == null ? this.activeIndex() : this.destination;
        let to = from + direction;
        if (loop) {
          if (to >= items.length || to < 0) {
            this.destination = (to + items.length) % items.length;
            this.goTo(this.destination, { wrap: true });
            this.resetTimer();
            return;
          }
        } else {
          to = Math.max(0, Math.min(items.length - 1, to));
          const sign = Math.sign(direction) || 1;
          while (to > 0 && to < items.length - 1 && Math.abs(pos[to] - pos[from]) <= OVERFLOW_EPS) to += sign;
          if (Math.abs(pos[to] - pos[from]) <= OVERFLOW_EPS) return;
        }
        this.destination = to;
        this.goTo(to, { wrap: loop });
        this.resetTimer();
      }

      goTo(index, { wrap = false } = {}) {
        const pos = this.positions();
        if (!pos.length) return;
        const target = pos[Math.max(0, Math.min(index, pos.length - 1))];
        if (wrap && !this.reduceMotion) this.crossfadeTo(target);
        else this.animateTo(target);
      }

      suspendSnap() {
        const view = this.viewport;
        view.classList.add('is-animating');
        view.style.scrollSnapType = 'none';
        view.style.scrollBehavior = 'auto';
        // Flush so Windows Chrome drops mandatory snap before the first scrollLeft write.
        void view.offsetWidth;
      }

      animateTo(target) {
        this.cancelAnimation();
        const view = this.viewport;
        const start = view.scrollLeft;
        const distance = target - start;
        this.animTarget = target;
        this.suspendSnap();
        if (this.reduceMotion || Math.abs(distance) < 1) {
          view.scrollLeft = target;
          this.finishAnimation();
          return;
        }
        const duration = Math.min(700, Math.max(320, Math.abs(distance) * 0.55));
        const token = this.scrollToken;
        const t0 = performance.now();
        const step = (now) => {
          if (token !== this.scrollToken) return;
          const t = Math.min(1, (now - t0) / duration);
          view.scrollLeft = start + distance * easeOut(t);
          if (t < 1) this.animId = requestAnimationFrame(step);
          else {
            view.scrollLeft = target;
            this.finishAnimation();
          }
        };
        this.animId = requestAnimationFrame(step);
        this.update();
      }

      crossfadeTo(target) {
        this.cancelAnimation();
        const view = this.viewport;
        this.animTarget = target;
        this.suspendSnap();
        const out = view.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          { duration: 220, easing: 'ease-out', fill: 'forwards' }
        );
        this.fade = out;
        out.onfinish = () => {
          if (this.fade !== out) return;
          view.scrollLeft = target;
          const fadeIn = view.animate(
            [{ opacity: 0 }, { opacity: 1 }],
            { duration: 320, easing: 'ease-in' }
          );
          this.fade = fadeIn;
          fadeIn.onfinish = () => {
            if (this.fade !== fadeIn) return;
            this.fade = null;
            out.cancel();
            this.finishAnimation();
          };
        };
        this.update();
      }

      cancelAnimation() {
        this.scrollToken = (this.scrollToken || 0) + 1;
        if (this.animId) cancelAnimationFrame(this.animId);
        this.animId = null;
        if (this.fade) {
          this.fade.cancel();
          this.fade = null;
        }
        if (this.animTarget != null) this.finishAnimation(false);
      }

      finishAnimation(snap = true) {
        this.animTarget = null;
        const view = this.viewport;
        if (!view) return;
        view.classList.remove('is-animating');
        view.style.scrollSnapType = '';
        view.style.scrollBehavior = '';
        view.style.opacity = '';
        if (snap) {
          this.destination = null;
          this.update();
        }
      }

      scheduleUpdate() {
        if (this.updateQueued) return;
        this.updateQueued = true;
        requestAnimationFrame(() => {
          this.updateQueued = false;
          this.update();
        });
      }

      update() {
        if (!this.viewport) return;
        const loop = this.dataset.loop === 'true';
        const scrollable = this.isScrollable();
        this.classList.toggle('is-static', !scrollable && !loop);

        const index = this.dataset.dots === 'per-slide'
          ? this.activeIndex()
          : Math.min(this.activeIndex(), this.dotCount() - 1);
        this.dotsWrap?.querySelectorAll('button').forEach((dot, i) => {
          if (i === index) dot.setAttribute('aria-current', 'true');
          else dot.removeAttribute('aria-current');
        });

        const stop = this.stopIndex();
        if (this.totalEl) this.totalEl.textContent = String(this.stops().length);
        if (this.currentEl && stop !== this.shownStop) {
          this.currentEl.textContent = String(stop + 1);
          if (this.shownStop !== -1 && !this.reduceMotion && this.currentEl.animate) {
            const dir = stop > this.shownStop || (stop === 0 && this.shownStop > 0) ? 1 : -1;
            this.currentEl.animate(
              [
                { transform: `translateY(${dir * 60}%)`, opacity: 0 },
                { transform: 'translateY(0)', opacity: 1 },
              ],
              { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' }
            );
          }
          this.shownStop = stop;
        }

        const left = this.animTarget ?? this.viewport.scrollLeft;
        const pos = this.positions();
        const scrolled = this.viewport.scrollLeft;
        this.classList.toggle('has-more', !loop && pos.some((p) => p > scrolled + OVERFLOW_EPS));
        const setDisabled = (button, disabled) => {
          if (!button) return;
          button.disabled = disabled;
          button.setAttribute('aria-disabled', String(disabled));
        };
        if (loop) {
          setDisabled(this.prev, false);
          setDisabled(this.next, false);
        } else {
          setDisabled(this.prev, !scrollable || !pos.some((p) => p < left - OVERFLOW_EPS));
          setDisabled(this.next, !scrollable || !pos.some((p) => p > left + OVERFLOW_EPS));
        }
      }

      setupAutoplay(signal) {
        cancelAnimationFrame(this.tickId);
        this.style.setProperty('--sgym-interval', `${this.interval}ms`);
        const pause = (reason) => () => this.pauseReasons.add(reason);
        const resume = (reason) => () => this.pauseReasons.delete(reason);
        this.addEventListener('mouseenter', pause('hover'), { signal });
        this.addEventListener('mouseleave', resume('hover'), { signal });
        this.addEventListener('focusin', pause('focus'), { signal });
        this.addEventListener('focusout', (event) => {
          if (!this.contains(event.relatedTarget)) this.pauseReasons.delete('focus');
        }, { signal });
        this.onVisibility = () => {
          if (document.hidden) this.pauseReasons.add('hidden');
          else this.pauseReasons.delete('hidden');
        };
        document.addEventListener('visibilitychange', this.onVisibility, { signal });
        this.pauseReasons.add('offscreen');
        this.intersection?.disconnect();
        this.intersection = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) this.pauseReasons.delete('offscreen');
            else this.pauseReasons.add('offscreen');
          });
        }, { threshold: 0.35 });
        this.intersection.observe(this);
        this.classList.add('is-autoplay');

        let last = performance.now();
        const tick = (now) => {
          const dt = Math.min(100, now - last);
          last = now;
          if (this.reduceMotion) {
            this.setRing(1);
          } else if (!this.pauseReasons.size && this.animTarget == null) {
            this.elapsed += dt;
            if (this.elapsed >= this.interval) {
              this.elapsed = 0;
              this.move(1);
            }
            this.setRing(this.elapsed / this.interval);
          }
          this.classList.toggle('is-paused', this.pauseReasons.size > 0 || this.reduceMotion);
          this.tickId = requestAnimationFrame(tick);
        };
        this.tickId = requestAnimationFrame(tick);
      }

      resetTimer() {
        this.elapsed = 0;
        this.setRing(0);
      }

      setRing(progress) {
        if (!this.arc) return;
        const clamped = Math.max(0, Math.min(1, progress));
        this.arc.style.strokeDashoffset = String(100 - clamped * 100);
      }
    }
  );

  document.addEventListener('shopify:section:load', (event) => {
    event.target.querySelectorAll('sgym-carousel').forEach((node) => node.refresh?.());
  });
}
