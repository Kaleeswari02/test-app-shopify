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
