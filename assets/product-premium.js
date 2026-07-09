/**
 * Product Premium (PDP)
 * Vanilla JS custom element powering the gallery, variant picker,
 * quantity stepper, accordion and mobile sticky bar for
 * sections/main-product-premium.liquid.
 */
(function () {
  'use strict';

  if (customElements.get('product-premium')) return;

  var DESKTOP_QUERY = '(min-width: 990px)';

  function parseJSON(el) {
    if (!el) return null;
    try {
      return JSON.parse(el.textContent);
    } catch (err) {
      return null;
    }
  }

  customElements.define(
    'product-premium',
    class extends HTMLElement {
      connectedCallback() {
        this.sectionId = this.dataset.sectionId;
        this.addToCartLabel = this.dataset.addToCartLabel || 'Add to Cart';
        this.buyNowLabel = this.dataset.buyNowLabel || 'Buy Now';
        this.variants = parseJSON(this.querySelector('[data-pp-variants]')) || [];
        this.variantMoney = parseJSON(this.querySelector('[data-pp-variant-money]')) || {};

        this.form = this.querySelector('form[data-type="add-to-cart-form"]');
        this.variantInputs = Array.from(this.querySelectorAll('[data-pp-variant-input]'));
        this.installmentInput = this.querySelector('[data-pp-installment-input]');
        this.priceWrap = this.querySelector('[data-pp-price]');
        this.priceEl = this.priceWrap ? this.priceWrap.querySelector('.price') : null;
        this.discountBadge = this.querySelector('[data-pp-discount]');
        this.addBtn = this.querySelector('[data-pp-add-btn]');
        this.addBtnText = this.querySelector('[data-pp-add-btn-text]');
        this.buyNowBtn = this.querySelector('[data-pp-buy-now]');
        this.buyNowText = this.querySelector('[data-pp-buy-now-text]');
        this.comboMessage = this.querySelector('[data-pp-combo-message]');
        this.stickyBar = this.querySelector('[data-pp-sticky-bar]');
        this.stickyPrice = this.querySelector('[data-pp-sticky-price]');
        this.stickyAddBtn = this.querySelector('[data-pp-sticky-add]');
        this.stickyAddText = this.querySelector('[data-pp-sticky-add-text]');

        var initialId = this.variantInputs.length ? this.variantInputs[0].value : null;
        var initialVariant = this.getVariantById(initialId);
        this.selectedOptions = initialVariant
          ? [initialVariant.option1, initialVariant.option2, initialVariant.option3]
          : [null, null, null];

        this.initGallery();
        this.initVariantCards();
        this.initOptionPills();
        this.initQuantity();
        this.initAccordion();
        this.initBuyNow();
        this.initStickyBar();
      }

      disconnectedCallback() {
        if (this._stickyObserver) this._stickyObserver.disconnect();
      }

      getVariantById(id) {
        if (id === null || id === undefined) return null;
        var idStr = String(id);
        for (var i = 0; i < this.variants.length; i++) {
          if (String(this.variants[i].id) === idStr) return this.variants[i];
        }
        return null;
      }

      findMatchingVariant(selectedOptions) {
        for (var i = 0; i < this.variants.length; i++) {
          var variant = this.variants[i];
          var matches = true;
          for (var pos = 0; pos < 3; pos++) {
            var wanted = selectedOptions[pos];
            if (wanted === null || wanted === undefined) continue;
            var key = 'option' + (pos + 1);
            if (variant[key] !== wanted) {
              matches = false;
              break;
            }
          }
          if (matches) return variant;
        }
        return null;
      }

      /* ---------------------------------------------------------------- */
      /* Gallery                                                          */
      /* ---------------------------------------------------------------- */

      initGallery() {
        this.stage = this.querySelector('[data-pp-stage]');
        if (!this.stage) return;

        this.slides = Array.from(this.querySelectorAll('[data-pp-slide]'));
        this.thumbs = Array.from(this.querySelectorAll('[data-pp-thumb]'));
        this.activeSlideIndex = Math.max(
          0,
          this.slides.findIndex((slide) => slide.classList.contains('pp__slide--active'))
        );

        this.thumbs.forEach((thumb) => {
          thumb.addEventListener('click', () => {
            var index = parseInt(thumb.dataset.index, 10);
            this.selectSlide(index);
          });
        });

        var prevBtn = this.querySelector('[data-pp-prev]');
        var nextBtn = this.querySelector('[data-pp-next]');
        if (prevBtn) {
          prevBtn.addEventListener('click', () => {
            this.selectSlide(this.activeSlideIndex - 1);
          });
        }
        if (nextBtn) {
          nextBtn.addEventListener('click', () => {
            this.selectSlide(this.activeSlideIndex + 1);
          });
        }

        if (this.stage.hasAttribute('data-pp-zoom-enabled')) {
          this.initZoom();
        }

        this.initSwipe();
      }

      selectSlide(index) {
        if (!this.slides.length) return;
        var total = this.slides.length;
        var nextIndex = ((index % total) + total) % total;
        var currentSlide = this.slides[this.activeSlideIndex];
        var nextSlide = this.slides[nextIndex];
        if (!nextSlide || nextSlide === currentSlide) return;

        if (currentSlide) {
          currentSlide.classList.remove('pp__slide--active');
          var currentVideo = currentSlide.querySelector('video');
          if (currentVideo) currentVideo.pause();
        }
        nextSlide.classList.add('pp__slide--active');

        this.thumbs.forEach((thumb) => {
          var isActive = parseInt(thumb.dataset.index, 10) === nextIndex;
          thumb.classList.toggle('pp__thumb--active', isActive);
          thumb.setAttribute('aria-selected', String(isActive));
          if (isActive && typeof thumb.scrollIntoView === 'function') {
            thumb.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
          }
        });

        this.activeSlideIndex = nextIndex;
      }

      selectSlideByMediaId(mediaId) {
        if (!mediaId) return;
        var index = this.slides.findIndex((slide) => slide.dataset.mediaId === String(mediaId));
        if (index >= 0) this.selectSlide(index);
      }

      initZoom() {
        this.stage.addEventListener('mousemove', (event) => {
          if (window.matchMedia(DESKTOP_QUERY).matches === false) return;
          var activeSlide = this.slides[this.activeSlideIndex];
          var img = activeSlide ? activeSlide.querySelector('img') : null;
          if (!img) return;
          var rect = activeSlide.getBoundingClientRect();
          var x = ((event.clientX - rect.left) / rect.width) * 100;
          var y = ((event.clientY - rect.top) / rect.height) * 100;
          img.style.transformOrigin = x + '% ' + y + '%';
          img.classList.add('pp__slide-img--zoomed');
        });

        this.stage.addEventListener('mouseleave', () => {
          var activeSlide = this.slides[this.activeSlideIndex];
          var img = activeSlide ? activeSlide.querySelector('img') : null;
          if (img) img.classList.remove('pp__slide-img--zoomed');
        });
      }

      initSwipe() {
        var startX = null;
        var threshold = 40;

        this.stage.addEventListener(
          'touchstart',
          (event) => {
            startX = event.touches[0].clientX;
          },
          { passive: true }
        );

        this.stage.addEventListener(
          'touchend',
          (event) => {
            if (startX === null) return;
            var deltaX = event.changedTouches[0].clientX - startX;
            if (Math.abs(deltaX) > threshold) {
              this.selectSlide(this.activeSlideIndex + (deltaX < 0 ? 1 : -1));
            }
            startX = null;
          },
          { passive: true }
        );
      }

      /* ---------------------------------------------------------------- */
      /* Variant selection                                                */
      /* ---------------------------------------------------------------- */

      initVariantCards() {
        var cards = Array.from(this.querySelectorAll('[data-pp-variant-card]'));
        cards.forEach((card) => {
          card.addEventListener('click', () => {
            var variantId = card.dataset.variantId;
            var variant = this.getVariantById(variantId);
            if (!variant) return;

            cards.forEach((otherCard) => {
              var isSelected = otherCard === card;
              otherCard.classList.toggle('pp__variant-card--selected', isSelected);
              otherCard.setAttribute('aria-checked', String(isSelected));
            });

            this.selectedOptions = [variant.option1, variant.option2, variant.option3];
            this.updateVariant(variant);
          });
        });
      }

      initOptionPills() {
        var pills = Array.from(this.querySelectorAll('[data-pp-option-value-btn]'));
        if (!pills.length) return;

        pills.forEach((pill) => {
          pill.addEventListener('click', () => {
            var optionIndex = parseInt(pill.dataset.optionIndex, 10) - 1;
            var value = pill.dataset.value;

            this.querySelectorAll(
              '[data-pp-option-value-btn][data-option-index="' + pill.dataset.optionIndex + '"]'
            ).forEach((sibling) => {
              var isSelected = sibling === pill;
              sibling.classList.toggle('pp__option-pill--selected', isSelected);
              sibling.setAttribute('aria-pressed', String(isSelected));
            });

            var optionValueLabel = this.querySelector(
              '[data-pp-option][data-option-index="' + pill.dataset.optionIndex + '"] [data-pp-option-value]'
            );
            if (optionValueLabel) optionValueLabel.textContent = value;

            this.selectedOptions[optionIndex] = value;
            var matched = this.findMatchingVariant(this.selectedOptions);

            if (matched) {
              if (this.comboMessage) this.comboMessage.hidden = true;
              this.updateVariant(matched);
            } else {
              this.setUnavailableCombo();
            }
          });
        });
      }

      setUnavailableCombo() {
        if (this.comboMessage) this.comboMessage.hidden = false;
        this.toggleAddButtons(false, 'Unavailable');
        this.variantInputs.forEach((input) => {
          input.value = '';
        });
      }

      updateVariant(variant) {
        var money = this.variantMoney[String(variant.id)];

        this.variantInputs.forEach((input) => {
          input.value = variant.id;
          input.disabled = !variant.available;
        });
        if (this.installmentInput) this.installmentInput.value = variant.id;

        this.updatePrice(variant, money);
        this.toggleAddButtons(
          variant.available,
          variant.available ? null : 'Sold out'
        );

        if (this.stickyPrice && money) this.stickyPrice.textContent = money.price;

        var featuredImageId = variant.featured_image && variant.featured_image.id;
        if (featuredImageId) this.selectSlideByMediaId(featuredImageId);

        if (window.history && window.history.replaceState) {
          var url = new URL(window.location.href);
          url.searchParams.set('variant', variant.id);
          window.history.replaceState({}, '', url);
        }
      }

      updatePrice(variant, money) {
        if (!money) return;

        if (this.priceEl) {
          this.priceEl.classList.toggle('price--on-sale', !!money.onSale);
          this.priceEl.classList.toggle('price--sold-out', !variant.available);

          var regularItem = this.priceEl.querySelector('.price__regular .price-item--regular');
          var saleCompareItem = this.priceEl.querySelector('.price__sale s.price-item--regular');
          var saleItem = this.priceEl.querySelector('.price__sale .price-item--sale');

          if (regularItem) regularItem.textContent = money.price;
          if (saleItem) saleItem.textContent = money.price;
          if (saleCompareItem && money.compareAtPrice) saleCompareItem.textContent = money.compareAtPrice;
        }

        if (this.discountBadge) {
          if (money.onSale && money.savingsPercent > 0) {
            this.discountBadge.hidden = false;
            this.discountBadge.textContent = 'Save ' + money.savingsPercent + '%';
          } else {
            this.discountBadge.hidden = true;
          }
        }
      }

      toggleAddButtons(available, unavailableLabel) {
        [
          { btn: this.addBtn, text: this.addBtnText, fallback: this.addToCartLabel },
          { btn: this.stickyAddBtn, text: this.stickyAddText, fallback: this.addToCartLabel },
          { btn: this.buyNowBtn, text: this.buyNowText, fallback: this.buyNowLabel },
        ].forEach((entry) => {
          if (!entry.btn) return;
          entry.btn.disabled = !available;
          if (entry.text) {
            entry.text.textContent = available ? entry.fallback : unavailableLabel || 'Sold out';
          }
        });
      }

      /* ---------------------------------------------------------------- */
      /* Quantity                                                         */
      /* ---------------------------------------------------------------- */

      initQuantity() {
        var input = this.querySelector('[data-pp-qty-input]');
        var minusBtn = this.querySelector('[data-pp-qty-minus]');
        var plusBtn = this.querySelector('[data-pp-qty-plus]');
        if (!input) return;

        var clamp = (value) => Math.max(parseInt(input.min, 10) || 1, value);

        if (minusBtn) {
          minusBtn.addEventListener('click', () => {
            input.value = clamp((parseInt(input.value, 10) || 1) - 1);
            input.dispatchEvent(new Event('change', { bubbles: true }));
          });
        }
        if (plusBtn) {
          plusBtn.addEventListener('click', () => {
            input.value = clamp((parseInt(input.value, 10) || 1) + 1);
            input.dispatchEvent(new Event('change', { bubbles: true }));
          });
        }
        input.addEventListener('change', () => {
          input.value = clamp(parseInt(input.value, 10) || 1);
        });
      }

      /* ---------------------------------------------------------------- */
      /* Accordion                                                        */
      /* ---------------------------------------------------------------- */

      initAccordion() {
        var triggers = Array.from(this.querySelectorAll('[data-pp-accordion-trigger]'));
        triggers.forEach((trigger) => {
          trigger.addEventListener('click', () => {
            var panel = this.querySelector('#' + trigger.getAttribute('aria-controls'));
            var isOpen = trigger.getAttribute('aria-expanded') === 'true';

            trigger.setAttribute('aria-expanded', String(!isOpen));
            if (panel) panel.classList.toggle('pp__accordion-panel--open', !isOpen);
          });
        });
      }

      /* ---------------------------------------------------------------- */
      /* Buy now                                                          */
      /* ---------------------------------------------------------------- */

      initBuyNow() {
        if (!this.buyNowBtn || !this.form) return;

        this.buyNowBtn.addEventListener('click', () => {
          if (this.buyNowBtn.disabled) return;

          var spinner = this.buyNowBtn.querySelector('.loading__spinner');
          this.buyNowBtn.setAttribute('aria-disabled', 'true');
          if (spinner) spinner.classList.remove('hidden');

          var formData = new FormData(this.form);
          var addUrl = (window.routes && window.routes.cart_add_url) || '/cart/add.js';

          fetch(addUrl, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: formData,
          })
            .then((response) => response.json())
            .then((data) => {
              if (data && data.status) {
                throw new Error(data.description || data.message || 'Unable to add to cart');
              }
              window.location.href = '/checkout';
            })
            .catch(() => {
              this.buyNowBtn.removeAttribute('aria-disabled');
              if (spinner) spinner.classList.add('hidden');
              if (this.form.requestSubmit) this.form.requestSubmit();
              else this.form.submit();
            });
        });
      }

      /* ---------------------------------------------------------------- */
      /* Mobile sticky bar                                                */
      /* ---------------------------------------------------------------- */

      initStickyBar() {
        if (!this.stickyBar || !this.addBtn) return;

        this._stickyObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              this.stickyBar.classList.toggle('pp__sticky-bar--visible', !entry.isIntersecting);
            });
          },
          { threshold: 0 }
        );
        this._stickyObserver.observe(this.addBtn);
      }
    }
  );
})();
