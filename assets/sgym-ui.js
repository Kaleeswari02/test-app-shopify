if (!customElements.get('sgym-dialog')) {
  customElements.define(
    'sgym-dialog',
    class SgymDialog extends HTMLElement {
      connectedCallback() {
        this.dialog = this.querySelector('dialog');
        if (!this.dialog) return;
        this.querySelectorAll('[data-sgym-open]').forEach((button) => {
          button.addEventListener('click', () => {
            if (typeof this.dialog.showModal === 'function') this.dialog.showModal();
          });
        });
        this.querySelector('[data-sgym-close]')?.addEventListener('click', () => this.close());
        this.dialog.addEventListener('cancel', (event) => {
          event.preventDefault();
          this.close();
        });
        this.dialog.addEventListener('click', (event) => {
          if (event.target === this.dialog) this.close();
        });
      }

      close() {
        this.dialog.querySelectorAll('video').forEach((video) => {
          video.pause();
        });
        this.dialog.close();
      }
    }
  );
}

if (!customElements.get('sgym-inline-video')) {
  customElements.define(
    'sgym-inline-video',
    class SgymInlineVideo extends HTMLElement {
      connectedCallback() {
        this.video = this.querySelector('video');
        this.pauseBtn = this.querySelector('[data-sgym-pause]');
        this.muteBtn = this.querySelector('[data-sgym-mute]');
        this.ticks = [...this.querySelectorAll('[data-sgym-step]')];
        this.step = 0;
        this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (this.dataset.interval) this.style.setProperty('--sgym-interval', `${Number(this.dataset.interval)}ms`);

        if (this.video && this.reduce) {
          this.video.autoplay = false;
          this.video.pause();
          this.pauseBtn?.setAttribute('aria-pressed', 'false');
        } else if (this.video && this.dataset.autoplay === 'true') {
          this.video.muted = true;
          this.video.play().catch(() => {});
          this.pauseBtn?.setAttribute('aria-pressed', 'true');
        } else if (!this.video && !this.ticks.length) {
          this.pauseBtn?.setAttribute('aria-pressed', 'false');
        }

        this.pauseBtn?.addEventListener('click', () => this.togglePlay());
        this.muteBtn?.addEventListener('click', () => {
          if (!this.video) return;
          this.video.muted = !this.video.muted;
          this.muteBtn.setAttribute('aria-pressed', String(this.video.muted));
        });
        this.video?.addEventListener('timeupdate', () => this.paintProgress());
        this.video?.addEventListener('play', () => {
          this.pauseBtn?.setAttribute('aria-pressed', 'true');
          this.startSteps();
        });
        this.video?.addEventListener('pause', () => {
          this.pauseBtn?.setAttribute('aria-pressed', 'false');
          this.stopSteps();
        });

        if (this.hasAttribute('data-sgym-observe') && this.video && !this.reduce) {
          this.observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) this.video.play().catch(() => {});
                else this.video.pause();
              });
            },
            { threshold: 0.4 }
          );
          this.observer.observe(this);
        }

        if (!this.video && this.ticks.length > 1 && !this.reduce) this.startSteps();
      }

      disconnectedCallback() {
        this.stopSteps();
        this.observer?.disconnect();
      }

      togglePlay() {
        if (!this.video) {
          const pressed = this.pauseBtn?.getAttribute('aria-pressed') === 'true';
          this.pauseBtn?.setAttribute('aria-pressed', String(!pressed));
          if (pressed) this.stopSteps();
          else this.startSteps();
          return;
        }
        if (this.video.paused) this.video.play();
        else this.video.pause();
      }

      paintProgress() {
        const ring = this.querySelector('[data-sgym-progress]');
        if (!ring || !this.video || !this.video.duration) return;
        ring.style.strokeDashoffset = String(100 * (1 - this.video.currentTime / this.video.duration));
      }

      startSteps() {
        if (this.ticks.length < 2 || this.reduce) return;
        this.stopSteps();
        const ms = Number(this.dataset.interval || 5000);
        this.stepTimer = window.setInterval(() => {
          this.step = (this.step + 1) % this.ticks.length;
          this.ticks.forEach((tick, i) => tick.classList.toggle('is-active', i === this.step));
        }, ms);
      }

      stopSteps() {
        if (this.stepTimer) window.clearInterval(this.stepTimer);
        this.stepTimer = null;
      }
    }
  );
}

if (!customElements.get('sgym-tabs')) {
  customElements.define(
    'sgym-tabs',
    class SgymTabs extends HTMLElement {
      connectedCallback() {
        this.tabs = [...this.querySelectorAll('[data-sgym-tab]')];
        this.panels = [...this.querySelectorAll('[data-sgym-tab-panel]')];
        this.tabs.forEach((tab, index) => {
          tab.addEventListener('click', () => this.select(index));
          tab.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
              event.preventDefault();
              this.select((index + 1) % this.tabs.length);
            }
            if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
              event.preventDefault();
              this.select((index - 1 + this.tabs.length) % this.tabs.length);
            }
          });
        });
      }

      select(index) {
        this.tabs.forEach((tab, i) => {
          const active = i === index;
          tab.closest('.sgym-tab')?.classList.toggle('is-active', active);
          tab.setAttribute('aria-selected', String(active));
          tab.tabIndex = active ? 0 : -1;
          if (active) tab.focus();
        });
        this.panels.forEach((panel, i) => panel.classList.toggle('is-active', i === index));
      }
    }
  );
}

if (!customElements.get('sgym-modes')) {
  customElements.define(
    'sgym-modes',
    class SgymModes extends HTMLElement {
      connectedCallback() {
        this.buttons = [...this.querySelectorAll('[data-sgym-mode]')];
        this.panels = [...this.querySelectorAll('[data-sgym-mode-panel]')];
        this.switcher = this.querySelector('.sgym-modes__switch');
        if (this.switcher) {
          this.switcher.style.setProperty('--sgym-mode-count', String(this.buttons.length || 1));
          this.switcher.style.setProperty('--sgym-mode-index', '0');
        }
        this.buttons.forEach((button, index) => {
          button.addEventListener('click', () => this.select(index));
        });
      }

      select(index) {
        this.buttons.forEach((button, i) => {
          button.setAttribute('aria-selected', String(i === index));
        });
        this.panels.forEach((panel, i) => panel.classList.toggle('is-active', i === index));
        this.switcher?.style.setProperty('--sgym-mode-index', String(index));
      }
    }
  );
}

if (!customElements.get('sgym-show')) {
  customElements.define(
    'sgym-show',
    class SgymShow extends HTMLElement {
      connectedCallback() {
        this.slides = [...this.querySelectorAll('[data-sgym-slide]')];
        this.countEl = this.querySelector('[data-sgym-count]');
        this.numEl = this.querySelector('[data-sgym-num]');
        this.toggleBtn = this.querySelector('[data-sgym-toggle]');
        this.arc = this.querySelector('.sgym-counter__arc');
        this.counter = this.querySelector('.sgym-counter');
        this.word = this.dataset.counterWord || 'OF';
        this.interval = Number(this.dataset.interval || 6000);
        this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.index = 0;
        this.userPaused = false;
        this.inView = false;
        this.hovered = false;
        this.focused = false;
        this.tabHidden = document.hidden;
        this.cycleMs = 0;
        this.remaining = 0;
        this.timer = null;
        this.swapTimer = null;
        this.started = 0;

        const collage = this.slides.findIndex((slide) => slide.classList.contains('sgym-slide--collage'));
        if (this.reduce) {
          this.index = collage >= 0 ? collage : Math.max(0, this.slides.length - 1);
          this.userPaused = true;
          this.classList.add('is-reduced');
        }

        this.toggleBtn?.addEventListener('click', () => this.toggle());
        this.addEventListener('mouseenter', () => this.setHovered(true));
        this.addEventListener('mouseleave', () => this.setHovered(false));
        this.addEventListener('focusin', (event) => {
          if (event.target === this.toggleBtn) return;
          const fromKeyboard = event.target === this ? this.matches(':focus-visible') : event.target.matches(':focus-visible');
          if (!fromKeyboard) return;
          this.focused = true;
          this.freeze();
        });
        this.addEventListener('focusout', (event) => {
          if (this.contains(event.relatedTarget)) return;
          this.focused = false;
          this.resume();
        });
        this.addEventListener('keydown', (event) => {
          if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
          event.preventDefault();
          this.go(this.index + (event.key === 'ArrowRight' ? 1 : -1), true);
        });
        document.addEventListener('visibilitychange', () => {
          this.tabHidden = document.hidden;
          if (this.tabHidden) this.freeze();
          else this.resume();
        });
        this.addEventListener('loadedmetadata', (event) => this.onMeta(event), true);
        this.bindSwipe();
        this.show(this.index, false);
        this.paintPlaying();

        if (!this.reduce && this.dataset.autoplay === 'true' && this.slides.length > 1) {
          this.observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                this.inView = entry.intersectionRatio >= 0.5;
                if (this.inView) this.resume();
                else this.freeze();
              });
            },
            { threshold: [0, 0.5, 1] }
          );
          this.observer.observe(this);
        }
      }

      disconnectedCallback() {
        clearTimeout(this.timer);
        clearTimeout(this.swapTimer);
        this.observer?.disconnect();
      }

      bindSwipe() {
        const panel = this.querySelector('.sgym-show__panel');
        if (!panel) return;
        let startX = 0;
        let tracking = false;
        const begin = (event) => {
          if (event.button != null && event.button !== 0) return;
          if (!event.target.closest('a, button')) event.preventDefault();
          tracking = true;
          startX = event.clientX;
          if (event.pointerId != null && panel.setPointerCapture) {
            try {
              panel.setPointerCapture(event.pointerId);
            } catch (error) {
              /* the pointer may already be captured */
            }
          }
        };
        const end = (event) => {
          if (!tracking) return;
          tracking = false;
          const delta = event.clientX - startX;
          if (Math.abs(delta) < 40) return;
          this.go(this.index + (delta < 0 ? 1 : -1), true);
        };
        panel.addEventListener('pointerdown', begin);
        panel.addEventListener('pointerup', end);
        panel.addEventListener('pointercancel', () => {
          tracking = false;
        });
      }

      toggle() {
        if (this.reduce || this.dataset.staticCounter === 'true') return;
        this.userPaused = !this.userPaused;
        if (this.userPaused) this.freeze();
        else this.resume();
        this.paintPlaying();
      }

      setHovered(on) {
        this.hovered = on;
        if (on) this.freeze();
        else this.resume();
      }

      go(next, manual) {
        const count = this.slides.length;
        if (!count) return;
        const index = (next + count) % count;
        if (manual && !this.reduce) this.userPaused = false;
        this.show(index, true);
        this.arm(this.durationFor(this.slides[index]), true);
      }

      show(index, swap) {
        this.index = index;
        this.cycleMs = 0;
        this.remaining = 0;
        this.slides.forEach((slide, i) => {
          const active = i === index;
          if (!active) {
            slide.classList.remove('is-active');
            slide.querySelectorAll('video').forEach((video) => {
              video.pause();
            });
            return;
          }
          if (!slide.classList.contains('is-active')) slide.classList.add('is-active');
        });
        const applyCount = () => {
          const designed = this.dataset.staticCounter === 'true';
          const label = designed
            ? `${this.dataset.counterIndex || '3'} ${this.word} ${this.dataset.counterTotal || '3'}`
            : `${index + 1} ${this.word} ${this.slides.length}`;
          if (this.countEl) this.countEl.textContent = label;
          if (this.numEl) this.numEl.textContent = designed ? this.dataset.counterIndex || '3' : String(index + 1);
          this.counter?.classList.remove('is-swapping');
        };
        clearTimeout(this.swapTimer);
        if (swap && !this.reduce) {
          this.counter?.classList.add('is-swapping');
          this.swapTimer = setTimeout(applyCount, 300);
        } else {
          applyCount();
        }
        const video = this.slides[index].querySelector('video');
        if (video && this.canPlay()) {
          try {
            video.currentTime = 0;
          } catch (error) {
            /* metadata may still be loading */
          }
          video.play().catch(() => {});
        }
      }

      durationFor(slide) {
        const video = slide?.querySelector('video');
        if (video && Number.isFinite(video.duration) && video.duration > 0) {
          return Math.min(video.duration * 1000, 12000);
        }
        return this.interval;
      }

      onMeta(event) {
        const video = event.target;
        if (!video || video.tagName !== 'VIDEO') return;
        const slide = video.closest('[data-sgym-slide]');
        if (!slide || slide !== this.slides[this.index]) return;
        const want = this.durationFor(slide);
        if (this.cycleMs === want) return;
        const elapsed = this.started ? performance.now() - this.started : 0;
        if (this.cycleMs !== 0 && elapsed >= 500) return;
        if (this.canPlay()) {
          try {
            video.currentTime = 0;
          } catch (error) {
            /* ignore seek errors while metadata settles */
          }
          this.arm(want, true);
          return;
        }
        this.cycleMs = want;
        this.remaining = want;
        this.started = 0;
        this.style.setProperty('--sgym-slide-ms', `${want}ms`);
        if (this.arc) {
          this.arc.style.animation = 'none';
          void this.arc.offsetWidth;
          this.arc.style.animation = '';
        }
      }

      canPlay() {
        return !this.reduce && !this.userPaused && !this.hovered && !this.focused && this.inView && this.dataset.autoplay === 'true' && this.slides.length > 1 && !this.tabHidden;
      }

      paintPlaying() {
        if (this.dataset.staticCounter === 'true' && !this.reduce) {
          this.classList.remove('is-playing', 'is-paused', 'is-held');
          this.toggleBtn?.setAttribute('aria-pressed', 'false');
          this.toggleBtn?.setAttribute('aria-label', 'Slide 3 of 3');
          return;
        }
        const playing = this.canPlay();
        this.classList.toggle('is-playing', this.cycleMs > 0 && !this.reduce);
        this.classList.toggle('is-paused', this.userPaused || this.reduce);
        this.toggleBtn?.setAttribute('aria-pressed', String(playing));
        this.toggleBtn?.setAttribute('aria-label', playing ? 'Pause slideshow' : 'Play slideshow');
        if (this.reduce && this.arc) this.arc.style.strokeDashoffset = '0';
      }

      arm(ms, reset) {
        clearTimeout(this.timer);
        this.timer = null;
        this.cycleMs = ms;
        this.remaining = ms;
        this.started = performance.now();
        this.style.setProperty('--sgym-slide-ms', `${ms}ms`);
        if (reset && this.arc) {
          this.arc.style.animation = 'none';
          void this.arc.offsetWidth;
          this.arc.style.animation = '';
        }
        if (this.canPlay()) this.classList.remove('is-held');
        this.paintPlaying();
        if (!this.canPlay()) return;
        this.timer = setTimeout(() => this.go(this.index + 1, false), ms);
      }

      freeze() {
        if (this.timer) {
          this.remaining = Math.max(0, this.remaining - (performance.now() - this.started));
          clearTimeout(this.timer);
          this.timer = null;
        }
        this.slides[this.index]?.querySelector('video')?.pause();
        if (this.cycleMs > 0) this.classList.add('is-held');
        this.paintPlaying();
      }

      resume() {
        if (!this.canPlay()) {
          this.paintPlaying();
          return;
        }
        const slide = this.slides[this.index];
        const video = slide?.querySelector('video');
        if (video && video.paused) video.play().catch(() => {});
        if (!(this.cycleMs > 0) || !(this.remaining > 0)) {
          this.arm(this.durationFor(slide), true);
          return;
        }
        const ms = this.remaining;
        this.started = performance.now();
        this.classList.remove('is-held');
        this.paintPlaying();
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.go(this.index + 1, false), ms);
      }
    }
  );
}

function sgymReveal(root) {
  const scope = root && root.querySelectorAll ? root : document;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  scope.querySelectorAll('[data-sgym-reveal]:not(.is-in)').forEach((node) => {
    if (reduce) {
      node.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.disconnect();
        });
      },
      { threshold: 0.2 }
    );
    io.observe(node);
  });
}

sgymReveal();
document.addEventListener('shopify:section:load', (event) => sgymReveal(event.target));
