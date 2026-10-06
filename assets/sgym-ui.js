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
        if (!this.video) return;

        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) {
          this.video.autoplay = false;
          this.video.pause();
        } else if (this.dataset.autoplay === 'true') {
          this.video.muted = true;
          this.video.play().catch(() => {});
        }

        this.pauseBtn?.addEventListener('click', () => {
          if (this.video.paused) this.video.play();
          else this.video.pause();
          this.pauseBtn.setAttribute('aria-pressed', String(!this.video.paused));
        });

        this.muteBtn?.addEventListener('click', () => {
          this.video.muted = !this.video.muted;
          this.muteBtn.setAttribute('aria-pressed', String(this.video.muted));
        });
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
        this.buttons.forEach((button, index) => {
          button.addEventListener('click', () => this.select(index));
        });
      }

      select(index) {
        this.buttons.forEach((button, i) => {
          button.setAttribute('aria-selected', String(i === index));
        });
        this.panels.forEach((panel, i) => panel.classList.toggle('is-active', i === index));
      }
    }
  );
}
