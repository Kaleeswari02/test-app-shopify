need to create a 4 pages for the pdp page
 
1.templates/product.premium.json
 
{

  "sections": {

    "main": {

      "type": "main-product-premium"

    }

  },

  "order": [

    "main"

  ]

}
 
 
2.sections/main-product-premium.liquid
 
{{ 'pdp.css' | asset_url | stylesheet_tag }}
 
{%- liquid

  assign current_variant = product.selected_or_first_available_variant

  assign category_label = section.settings.breadcrumb_category

  assign subcategory_label = product.type

-%}
 
<div class="pdp" id="pdp-{{ section.id }}">
<div class="pdp__wrapper">
 
    <!-- ============ LEFT: SCROLLING GALLERY (DESKTOP) ============ -->
<div class="pdp__gallery">
 
      {%- if product.featured_media -%}
<div class="pdp__gallery-hero">
<img

            src="{{ product.featured_media | image_url: width: 1600 }}"

            alt="{{ product.featured_media.alt | escape }}"

            width="{{ product.featured_media.width }}"

            height="{{ product.featured_media.height }}"

            loading="eager"
>
</div>

      {%- endif -%}
 
      {%- assign gallery_media = product.media | where: 'media_type', 'image' -%}

      {%- if gallery_media.size > 1 -%}
<div class="pdp__gallery-grid">

          {%- for media in gallery_media offset: 1 -%}
<div class="pdp__gallery-item">
<img

                src="{{ media | image_url: width: 1000 }}"

                alt="{{ media.alt | escape }}"

                width="{{ media.width }}"

                height="{{ media.height }}"

                loading="lazy"
>
</div>

          {%- endfor -%}
</div>

      {%- endif -%}
 
      {%- if section.settings.show_audio_button -%}
<button type="button" class="pdp__audio-btn" aria-label="{{ section.settings.audio_button_label | default: 'Play audio guide' }}" data-pdp-audio-toggle>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" stroke="currentColor" stroke-width="1.6"/>
<path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
</svg>
</button>

      {%- endif -%}
</div>
 
    <!-- ============ MOBILE-ONLY: SWIPEABLE CAROUSEL + THUMB STRIP ============ -->

    {%- assign all_media = product.media | where: 'media_type', 'image' -%}

    {%- if all_media.size > 0 -%}
<div class="pdp__m-gallery">
<div class="pdp__m-main" data-pdp-m-main>

          {%- for media in all_media -%}
<div class="pdp__m-slide" data-pdp-m-slide data-index="{{ forloop.index0 }}">
<img

                src="{{ media | image_url: width: 1200 }}"

                alt="{{ media.alt | escape }}"

                width="{{ media.width }}"

                height="{{ media.height }}"

                loading="{% if forloop.first %}eager{% else %}lazy{% endif %}"
>
</div>

          {%- endfor -%}
</div>
 
        {%- if section.settings.show_audio_button -%}
<button type="button" class="pdp__audio-btn pdp__audio-btn--mobile" aria-label="{{ section.settings.audio_button_label | default: 'Play audio guide' }}" data-pdp-audio-toggle>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" stroke="currentColor" stroke-width="1.6"/>
<path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
</svg>
</button>

        {%- endif -%}
 
        {%- if all_media.size > 1 -%}
<div class="pdp__m-thumbs-wrap">
<button type="button" class="pdp__m-thumbs-nav pdp__m-thumbs-nav--prev" data-pdp-m-thumbs-prev aria-label="Scroll images left">
<svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true"><path d="M7 1 1 7l6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
</button>
<div class="pdp__m-thumbs" data-pdp-m-thumbs>

              {%- for media in all_media -%}
<button

                  type="button"

                  class="pdp__m-thumb{% if forloop.first %} pdp__m-thumb--active{% endif %}"

                  data-pdp-m-thumb

                  data-index="{{ forloop.index0 }}"

                  aria-label="View image {{ forloop.index }}"
>
<img

                    src="{{ media | image_url: width: 400 }}"

                    alt="{{ media.alt | escape }}"

                    width="200"

                    height="150"

                    loading="lazy"
>
</button>

              {%- endfor -%}
</div>
<button type="button" class="pdp__m-thumbs-nav pdp__m-thumbs-nav--next" data-pdp-m-thumbs-next aria-label="Scroll images right">
<svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true"><path d="M1 1l6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
</button>
</div>

        {%- endif -%}
</div>

    {%- endif -%}
 
    <!-- ============ RIGHT: STICKY PRODUCT INFO ============ -->
<aside class="pdp__sidebar">
<div class="pdp__sidebar-inner">
 
        <div class="pdp__info">

          {%- if category_label != blank or subcategory_label != blank -%}
<p class="pdp__breadcrumb">

              {%- if category_label != blank -%}

                {%- if section.settings.breadcrumb_category_url != blank -%}
<a href="{{ section.settings.breadcrumb_category_url }}">{{ category_label }}</a>

                {%- else -%}
<span>{{ category_label }}</span>

                {%- endif -%}

              {%- endif -%}

              {%- if category_label != blank and subcategory_label != blank -%}
<span class="pdp__breadcrumb-sep">&bull;</span>

              {%- endif -%}

              {%- if subcategory_label != blank -%}
<a href="{{ subcategory_label | url_for_type }}">{{ subcategory_label }}</a>

              {%- endif -%}
</p>

          {%- endif -%}
 
          <h1 class="pdp__title">{{ product.title }}</h1>
 
          {%- if product.metafields.custom.subtitle != blank -%}
<p class="pdp__subtitle">{{ product.metafields.custom.subtitle }}</p>

          {%- elsif product.type != blank -%}
<p class="pdp__subtitle">{{ product.type }}</p>

          {%- endif -%}
 
          {%- if product.has_only_default_variant == false and product.options.size > 0 -%}
<div class="pdp__option">
<p class="pdp__option-label">{{ product.options.first | upcase }}: {{ current_variant.option1 | upcase }}</p>
<div class="pdp__swatches">

                {%- for variant in product.variants -%}

                  {%- liquid

                    assign swatch_image = variant.featured_image | default: product.featured_media

                    assign is_selected = false

                    if variant.id == current_variant.id

                      assign is_selected = true

                    endif

                  -%}

                    href="{{ variant.url }}"

                    class="pdp__swatch{% if is_selected %} pdp__swatch--selected{% endif %}"

                    aria-label="{{ variant.option1 }}"

                    title="{{ variant.option1 }}"
>

                    {%- if swatch_image -%}
<img

                        src="{{ swatch_image | image_url: width: 120 }}"

                        alt="{{ variant.option1 | escape }}"

                        width="60"

                        height="60"

                        loading="lazy"
>

                    {%- endif -%}
</a>

                {%- endfor -%}
</div>
</div>

          {%- endif -%}
 
          {%- if product.description != blank -%}
<div class="pdp__description">{{ product.description | strip_html | truncatewords: 28 }}</div>

          {%- endif -%}
 
          {%- if section.settings.specs_anchor != blank -%}
<a href="#{{ section.settings.specs_anchor }}" class="pdp__specs-link">

              {{ section.settings.specs_label | default: 'Technical Specifications' }}
<svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true"><path d="M1 1l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
</a>

          {%- endif -%}
</div>
 
        <div class="pdp__purchase">
<div class="pdp__price-row">
<p class="pdp__price">{{ current_variant.price | money }}</p>

            {%- if section.settings.availability_text != blank -%}
<p class="pdp__availability">{{ section.settings.availability_text }}</p>

            {%- endif -%}
</div>

          {%- if section.settings.price_note != blank -%}
<p class="pdp__price-note">{{ section.settings.price_note }}</p>

          {%- endif -%}
 
          <div class="pdp__btn-row">

            {%- if section.settings.phone_number != blank -%}
<a href="tel:{{ section.settings.phone_number | remove: ' ' }}" class="pdp__btn">
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>

                {{ section.settings.phone_number }}
</a>

            {%- endif -%}
 
            {%- if section.settings.contact_url != blank -%}
<a href="{{ section.settings.contact_url }}" class="pdp__btn">
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6.5 12 13l9-6.5M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>

                {{ section.settings.contact_label | default: 'Contact us' }}
</a>

            {%- endif -%}
</div>
</div>
 
        {%- if section.blocks.size > 0 -%}
<div class="pdp__accordions">

            {%- for block in section.blocks -%}

              {%- if block.type == 'accordion' -%}
<div class="pdp__accordion" {{ block.shopify_attributes }}>
<button type="button" class="pdp__accordion-trigger" aria-expanded="false" data-pdp-accordion-trigger>
<span>{{ block.settings.title }}</span>
<svg class="pdp__accordion-chevron" width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
<path d="M1 1l5 5 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
</button>
<div class="pdp__accordion-panel" data-pdp-accordion-panel>
<div class="pdp__accordion-panel-inner">

                      {{ block.settings.content }}
</div>
</div>
</div>

              {%- endif -%}

            {%- endfor -%}
</div>

        {%- endif -%}
 
      </div>
</aside>
 
  </div>
</div>
 
<!-- ============ DARK FULL-WIDTH FEATURE CAROUSEL ============ -->

{%- if section.settings.show_feature_carousel -%}
<div class="pfc" style="background-color: {{ section.settings.pfc_background_color }}; color: {{ section.settings.pfc_text_color }};">
<div class="pfc__header">

      {%- if section.settings.show_audio_button -%}
<button type="button" class="pfc__audio-btn" aria-label="Play audio guide">
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" stroke="currentColor" stroke-width="1.6"/>
<path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
</svg>
</button>

      {%- endif -%}

      {%- if section.settings.pfc_heading != blank -%}
<h2 class="pfc__heading">{{ section.settings.pfc_heading }}</h2>

      {%- endif -%}
</div>
 
    {%- assign carousel_blocks = section.blocks | where: 'type', 'slide' -%}

    {%- if carousel_blocks.size > 0 -%}
<div class="pfc__track-wrap">
<div class="pfc__track" data-pfc-track>

          {%- for block in carousel_blocks -%}
<div class="pfc__slide" {{ block.shopify_attributes }}>

              {%- if block.settings.image != blank -%}
<img

                  src="{{ block.settings.image | image_url: width: 900 }}"

                  alt="{{ block.settings.image.alt | escape }}"

                  width="{{ block.settings.image.width }}"

                  height="{{ block.settings.image.height }}"

                  loading="lazy"
>

              {%- endif -%}

              {%- if block.settings.caption != blank -%}
<p class="pfc__caption">{{ block.settings.caption }}</p>

              {%- endif -%}
</div>

          {%- endfor -%}
</div>
 
        <button type="button" class="pfc__nav pfc__nav--prev" data-pfc-prev aria-label="Previous">
<svg width="9" height="16" viewBox="0 0 9 16" fill="none"><path d="M8 1 1 8l7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
</button>
<button type="button" class="pfc__nav pfc__nav--next" data-pfc-next aria-label="Next">
<svg width="9" height="16" viewBox="0 0 9 16" fill="none"><path d="M1 1l7 7-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
</button>
</div>

    {%- endif -%}
</div>

{%- endif -%}
 
<script src="{{ 'pdp.js' | asset_url }}" defer="defer"></script>
 
{% schema %}

{

  "name": "PDP: Technogym style",

  "tag": "section",

  "class": "pdp-section",

  "settings": [

    {

      "type": "header",

      "content": "Breadcrumb"

    },

    {

      "type": "text",

      "id": "breadcrumb_category",

      "label": "Category label",

      "default": "All exercise equipment"

    },

    {

      "type": "url",

      "id": "breadcrumb_category_url",

      "label": "Category link"

    },

    {

      "type": "header",

      "content": "Specifications link"

    },

    {

      "type": "text",

      "id": "specs_label",

      "label": "Label",

      "default": "Technical Specifications"

    },

    {

      "type": "text",

      "id": "specs_anchor",

      "label": "Anchor ID (on this page)",

      "default": "technical-specifications"

    },

    {

      "type": "header",

      "content": "Price"

    },

    {

      "type": "text",

      "id": "price_note",

      "label": "Price note",

      "default": "GST and freight NOT included"

    },

    {

      "type": "text",

      "id": "availability_text",

      "label": "Availability text",

      "default": "Available upon request"

    },

    {

      "type": "header",

      "content": "Contact buttons"

    },

    {

      "type": "text",

      "id": "phone_number",

      "label": "Phone number",

      "default": "+91 98200 52225"

    },

    {

      "type": "url",

      "id": "contact_url",

      "label": "Contact us link"

    },

    {

      "type": "text",

      "id": "contact_label",

      "label": "Contact button label",

      "default": "Contact us"

    },

    {

      "type": "header",

      "content": "Audio button"

    },

    {

      "type": "checkbox",

      "id": "show_audio_button",

      "label": "Show floating audio button",

      "default": true

    },

    {

      "type": "text",

      "id": "audio_button_label",

      "label": "Audio button aria-label",

      "default": "Play audio guide"

    },

    {

      "type": "header",

      "content": "Feature carousel (dark section)"

    },

    {

      "type": "checkbox",

      "id": "show_feature_carousel",

      "label": "Show feature carousel section",

      "default": true

    },

    {

      "type": "text",

      "id": "pfc_heading",

      "label": "Heading",

      "default": "Superior running and walking for any home"

    },

    {

      "type": "color",

      "id": "pfc_background_color",

      "label": "Background color",

      "default": "#1c1c1c"

    },

    {

      "type": "color",

      "id": "pfc_text_color",

      "label": "Text color",

      "default": "#ffffff"

    }

  ],

  "blocks": [

    {

      "type": "accordion",

      "name": "Accordion (sidebar)",

      "settings": [

        {

          "type": "text",

          "id": "title",

          "label": "Title",

          "default": "Key features"

        },

        {

          "type": "richtext",

          "id": "content",

          "label": "Content"

        }

      ]

    },

    {

      "type": "slide",

      "name": "Carousel slide",

      "settings": [

        {

          "type": "image_picker",

          "id": "image",

          "label": "Image"

        },

        {

          "type": "text",

          "id": "caption",

          "label": "Caption"

        }

      ]

    }

  ],

  "presets": [

    {

      "name": "PDP: Technogym style",

      "blocks": [

        { "type": "accordion", "settings": { "title": "Key features" } },

        { "type": "accordion", "settings": { "title": "Dimensions" } },

        { "type": "accordion", "settings": { "title": "FAQs" } },

        { "type": "slide" },

        { "type": "slide" },

        { "type": "slide" },

        { "type": "slide" }

      ]

    }

  ]

}

{% endschema %}
 
 
3.assets/pdp.css
 
/* ==========================================================================

   PDP — Main Product (gallery + sticky sidebar)

   ========================================================================== */
 
.pdp {

  --pdp-bg: #FAF6EC; /* light gray - change this hex value to any color you want */

  --pdp-sidebar-bg: #ffffff;

  --pdp-ink: #1a1a1a;

  --pdp-muted: #6f6f6f;

  --pdp-border: #e5e5e5;

  --pdp-sidebar-width: 520px; /* increase this to give the right side more room (was 420px) */

  --pdp-gap: 4px;

  color: var(--pdp-ink);

  font-family: inherit;

}
 
.pdp__wrapper {

  display: grid;

  grid-template-columns: 1fr var(--pdp-sidebar-width);

  align-items: start;

  background: var(--pdp-bg);

}
 
/* ---------------- Gallery ---------------- */
 
.pdp__gallery {

  position: relative;

  background: var(--pdp-bg);

}
 
.pdp__gallery-hero {

  width: 100%;

  aspect-ratio: 16 / 9; /* shorter than the native 4:3 (1920x1440) - adjust to taste, e.g. 3/2 for a bit taller, 21/9 for even shorter */

  overflow: hidden;

  display: flex;

  align-items: center;

  justify-content: center;

}
 
.pdp__gallery-hero img {

  display: block;

  width: 100%;

  height: 100%;

  object-fit: contain; /* shows the full image, no cropping - since the box is now shorter than the native 4:3 ratio, this may leave empty space on the left/right */

}
 
.pdp__gallery-grid {

  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: var(--pdp-gap);

}
 
.pdp__gallery-item {

  aspect-ratio: 954 / 716; /* 4:3 - matches your source image size exactly */

  overflow: hidden;

  background: var(--pdp-bg);

}
 
.pdp__gallery-item img {

  width: 100%;

  height: 100%;

  object-fit: cover;

  display: block;

}
 
.pdp__audio-btn {

  position: fixed;

  left: 24px;

  bottom: 24px;

  width: 44px;

  height: 44px;

  border-radius: 50%;

  background: #000;

  color: #fff;

  border: none;

  display: flex;

  align-items: center;

  justify-content: center;

  cursor: pointer;

  z-index: 20;

  transition: transform 0.15s ease;

}
 
.pdp__audio-btn:hover {

  transform: scale(1.06);

}
 
/* ---------------- Sidebar ---------------- */
 
.pdp__sidebar {

  position: sticky;

  top: 24px;

  align-self: start;

  max-height: calc(100vh - 48px);

  overflow-y: auto;

  overflow-x: hidden;

  background: var(--pdp-sidebar-bg);

  border-radius: 16px;

  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.10);

  margin: 24px 24px 24px 8px;

}
 
.pdp__sidebar-inner {

  display: flex;

  flex-direction: column;

  min-height: 100%;

}
 
.pdp__info {

  padding: 40px 44px 24px;

  border-bottom: 1px solid var(--pdp-border);

}
 
.pdp__breadcrumb {

  font-size: 13px;

  color: var(--pdp-muted);

  margin: 0 0 18px;

}
 
.pdp__breadcrumb a {

  color: var(--pdp-muted);

  text-decoration: none;

}
 
.pdp__breadcrumb a:hover {

  text-decoration: underline;

}
 
.pdp__breadcrumb-sep {

  margin: 0 6px;

}
 
.pdp__title {

  font-size: 34px;

  line-height: 1.08;

  font-weight: 600;

  letter-spacing: 0.01em;

  text-transform: uppercase;

  margin: 0 0 8px;

}
 
.pdp__subtitle {

  font-size: 13px;

  letter-spacing: 0.08em;

  text-transform: uppercase;

  color: var(--pdp-muted);

  margin: 0 0 18px;

}
 
.pdp__option {

  margin: 0 0 18px;

}
 
.pdp__option-label {

  font-size: 13px;

  letter-spacing: 0.04em;

  text-transform: uppercase;

  color: var(--pdp-ink);

  margin: 0 0 10px;

}
 
.pdp__swatches {

  display: flex;

  flex-wrap: wrap;

  gap: 8px;

}
 
.pdp__swatch {

  display: block;

  width: 56px;

  height: 56px;

  padding: 2px;

  border: 1px solid transparent;

  border-radius: 2px;

  overflow: hidden;

  transition: border-color 0.15s ease;

}
 
.pdp__swatch img {

  width: 100%;

  height: 100%;

  object-fit: cover;

  display: block;

}
 
.pdp__swatch:hover {

  border-color: var(--pdp-muted);

}
 
.pdp__swatch--selected {

  border-color: var(--pdp-ink);

}
 
.pdp__description {

  font-size: 15px;

  line-height: 1.5;

  color: #333;

  margin: 0 0 18px;

}
 
.pdp__specs-link {

  display: inline-flex;

  align-items: center;

  gap: 8px;

  font-size: 15px;

  font-weight: 600;

  color: var(--pdp-ink);

  text-decoration: none;

}
 
.pdp__specs-link svg {

  flex-shrink: 0;

}
 
.pdp__specs-link:hover {

  text-decoration: underline;

}
 
.pdp__purchase {

  padding: 28px 44px;

  text-align: center;

  border-bottom: 1px solid var(--pdp-border);

}
 
.pdp__price {

  font-size: 24px;

  font-weight: 600;

  margin: 0 0 4px;

}
 
.pdp__price-note {

  font-size: 12.5px;

  color: var(--pdp-muted);

  margin: 0 0 14px;

}
 
.pdp__availability {

  font-size: 16px;

  font-weight: 600;

  margin: 0 0 20px;

}
 
.pdp__btn {

  display: flex;

  align-items: center;

  justify-content: center;

  gap: 10px;

  width: 100%;

  padding: 14px 18px;

  margin-top: 10px;

  border: 1px solid var(--pdp-ink);

  border-radius: 2px;

  background: transparent;

  color: var(--pdp-ink);

  font-size: 14px;

  font-weight: 600;

  letter-spacing: 0.03em;

  text-decoration: none;

  text-transform: uppercase;

  cursor: pointer;

  transition: background 0.15s ease, color 0.15s ease;

}
 
.pdp__btn:hover {

  background: var(--pdp-ink);

  color: #fff;

}
 
.pdp__accordions {

  display: flex;

  flex-direction: column;

}
 
.pdp__accordion {

  border-bottom: 1px solid var(--pdp-border);

}
 
.pdp__accordion-trigger {

  width: 100%;

  display: flex;

  align-items: center;

  justify-content: space-between;

  padding: 22px 44px;

  background: none;

  border: none;

  font-size: 17px;

  font-weight: 500;

  color: var(--pdp-ink);

  cursor: pointer;

  text-align: left;

}
 
.pdp__accordion-chevron {

  flex-shrink: 0;

  transition: transform 0.25s ease;

}
 
.pdp__accordion-trigger[aria-expanded="true"] .pdp__accordion-chevron {

  transform: rotate(180deg);

}
 
.pdp__accordion-panel {

  height: 0;

  overflow: hidden;

  transition: height 0.25s ease;

}
 
.pdp__accordion-panel-inner {

  padding: 0 44px 24px;

  font-size: 15px;

  line-height: 1.6;

  color: #333;

}
 
.pdp__accordion-panel-inner :is(ul, ol) {

  padding-left: 18px;

  margin: 0;

}
 
.pdp__accordion-panel-inner li + li {

  margin-top: 6px;

}
 
/* ---------------- Responsive ---------------- */
 
@media (max-width: 989px) {

  .pdp {

    --pdp-sidebar-width: 360px;

  }
 
  .pdp__info,

  .pdp__purchase,

  .pdp__accordion-trigger,

  .pdp__accordion-panel-inner {

    padding-left: 28px;

    padding-right: 28px;

  }

}
 
@media (max-width: 749px) {

  .pdp {

    overflow-x: hidden; /* safety net: prevents any child from bleeding past the viewport edge */

  }
 
  .pdp__wrapper {

    grid-template-columns: 1fr;

  }
 
  .pdp__sidebar {

    position: static;

    max-height: none;

    margin: 16px;

    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);

  }
 
  .pdp__title {

    font-size: 28px;

  }
 
  .pdp__audio-btn {

    left: 16px;

    bottom: 16px;

    width: 40px;

    height: 40px;

  }

}

/* ==========================================================================

   PDP — Feature carousel (full-width dark section, horizontal scroll)

   ========================================================================== */
 
.pfc {

  position: relative;

  padding: 72px 0 64px;

  overflow: hidden;

}
 
.pfc__header {

  position: relative;

  max-width: 460px;

  margin: 0 0 40px;

  padding: 0 44px;

}
 
.pfc__heading {

  font-size: 30px;

  line-height: 1.2;

  font-weight: 500;

  margin: 0;

}
 
.pfc__audio-btn {

  width: 44px;

  height: 44px;

  border-radius: 50%;

  background: rgba(255, 255, 255, 0.08);

  color: currentColor;

  border: 1px solid rgba(255, 255, 255, 0.25);

  display: flex;

  align-items: center;

  justify-content: center;

  cursor: pointer;

  margin-bottom: 24px;

  transition: background 0.15s ease;

}
 
.pfc__audio-btn:hover {

  background: rgba(255, 255, 255, 0.18);

}
 
.pfc__track-wrap {

  position: relative;

}
 
.pfc__track {

  display: flex;

  gap: 4px;

  overflow-x: auto;

  scroll-snap-type: x mandatory;

  scroll-behavior: smooth;

  padding: 0 44px;

  -ms-overflow-style: none;

  scrollbar-width: none;

}
 
.pfc__track::-webkit-scrollbar {

  display: none;

}
 
.pfc__slide {

  position: relative;

  flex: 0 0 auto;

  width: min(360px, 78vw);

  scroll-snap-align: start;

}
 
.pfc__slide img {

  width: 100%;

  aspect-ratio: 3 / 4;

  object-fit: cover;

  display: block;

}
 
.pfc__caption {

  margin: 14px 0 0;

  font-size: 14px;

  line-height: 1.4;

  color: inherit;

  opacity: 0.85;

}
 
.pfc__nav {

  position: absolute;

  top: 40%;

  transform: translateY(-50%);

  width: 44px;

  height: 44px;

  border-radius: 50%;

  border: 1px solid rgba(255, 255, 255, 0.3);

  background: rgba(0, 0, 0, 0.35);

  color: #fff;

  display: flex;

  align-items: center;

  justify-content: center;

  cursor: pointer;

  transition: background 0.15s ease;

}
 
.pfc__nav:hover {

  background: rgba(0, 0, 0, 0.6);

}
 
.pfc__nav--prev {

  left: 8px;

}
 
.pfc__nav--next {

  right: 8px;

}
 
@media (max-width: 749px) {

  .pfc {

    padding: 48px 0;

  }
 
  .pfc__header {

    padding: 0 20px;

  }
 
  .pfc__heading {

    font-size: 24px;

  }
 
  .pfc__track {

    padding: 0 20px;

  }
 
  .pfc__nav {

    display: none;

  }

}
 
/* ==========================================================================

   NEW — Mobile-only gallery carousel + thumbnail strip

   (Everything below is additive. Nothing above this comment was changed.)

   ========================================================================== */
 
/* Hidden by default (desktop) - shown only inside the mobile media query below */

.pdp__m-gallery {

  display: none;

}
 
@media (max-width: 749px) {

  /* Swap desktop bento-grid gallery for the mobile swipe carousel */

  .pdp__gallery {

    display: none;

  }
 
  .pdp__m-gallery {

    display: block;

    position: relative;

    padding: 16px 16px 0;

    overflow-x: hidden; /* clips any sub-pixel bleed from the swipeable tracks below */

    box-sizing: border-box;

    max-width: 100%;

  }
 
  .pdp__m-main {

    display: flex;

    width: 100%;

    max-width: 100%;

    box-sizing: border-box;

    overflow-x: auto;

    scroll-snap-type: x mandatory;

    scroll-behavior: smooth;

    border-radius: 16px;

    background: var(--pdp-bg);

    -ms-overflow-style: none;

    scrollbar-width: none;

  }
 
  .pdp__m-main::-webkit-scrollbar {

    display: none;

  }
 
  .pdp__m-slide {

    flex: 0 0 100%;

    box-sizing: border-box;

    scroll-snap-align: start;

    aspect-ratio: 4 / 3;

    display: flex;

    align-items: center;

    justify-content: center;

  }
 
  .pdp__m-slide img {

    width: 100%;

    height: 100%;

    object-fit: contain;

    display: block;

  }
 
  .pdp__audio-btn--mobile {

    left: 28px;

    bottom: 12px;

    z-index: 5;

  }
 
  .pdp__m-thumbs-wrap {

    position: relative;

    margin-top: 8px;

    max-width: 100%;

  }
 
  .pdp__m-thumbs {

    display: flex;

    gap: 4px;

    width: 100%;

    max-width: 100%;

    box-sizing: border-box;

    overflow-x: auto;

    scroll-snap-type: x proximity;

    -ms-overflow-style: none;

    scrollbar-width: none;

  }
 
  .pdp__m-thumbs::-webkit-scrollbar {

    display: none;

  }
 
  .pdp__m-thumb {

    flex: 0 0 31%;

    aspect-ratio: 4 / 3;

    padding: 0;

    border: none;

    border-bottom: 3px solid transparent;

    border-radius: 0;

    overflow: hidden;

    background: var(--pdp-bg);

    cursor: pointer;

    scroll-snap-align: start;

    box-sizing: border-box;

  }
 
  .pdp__m-thumb img {

    width: 100%;

    height: 100%;

    object-fit: cover;

    display: block;

  }
 
  .pdp__m-thumb--active {

    border-bottom-color: #e02020; /* change this hex to match your exact brand red */

  }
 
  .pdp__m-thumbs-nav {

    position: absolute;

    top: 50%;

    transform: translateY(-50%);

    width: 32px;

    height: 32px;

    border-radius: 50%;

    border: none;

    background: rgba(0, 0, 0, 0.55);

    color: #fff;

    display: flex;

    align-items: center;

    justify-content: center;

    cursor: pointer;

    z-index: 4;

  }
 
  .pdp__m-thumbs-nav--prev {

    left: 4px;

  }
 
  .pdp__m-thumbs-nav--next {

    right: 4px;

  }
 
  /* Price + availability side-by-side, buttons side-by-side (mobile only) */

  .pdp__price-row {

    display: flex;

    align-items: baseline;

    justify-content: space-between;

    flex-wrap: wrap;

    gap: 8px;

    text-align: left;

  }
 
  .pdp__availability {

    margin: 0;

    font-size: 13px;

    text-transform: uppercase;

    letter-spacing: 0.02em;

  }
 
  .pdp__price-note {

    text-align: left;

  }
 
  .pdp__btn-row {

    display: flex;

    gap: 10px;

  }
 
  .pdp__btn-row .pdp__btn {

    flex: 1 1 0;

    margin-top: 0;

    padding-left: 10px;

    padding-right: 10px;

    font-size: 13px;

    white-space: nowrap;

  }

}
 
4.assets/pdp.js
 
/**

* PDP — Technogym style product page

* Combines:

*  1. Sidebar accordion open/close (Key features / Dimensions / FAQs)

*  2. Floating audio button toggle state

*  3. Dark feature-carousel prev/next arrow scrolling

*  4. (NEW) Mobile main/thumbnail gallery carousel sync

*/

(function () {

  'use strict';
 
  /* -------------------- Accordions -------------------- */
 
  function initAccordions(root) {

    var triggers = root.querySelectorAll('[data-pdp-accordion-trigger]');
 
    triggers.forEach(function (trigger) {

      var panel = trigger.nextElementSibling;

      if (!panel) return;
 
      trigger.addEventListener('click', function () {

        var isOpen = trigger.getAttribute('aria-expanded') === 'true';

        setPanelState(trigger, panel, !isOpen);

      });

    });

  }
 
  function setPanelState(trigger, panel, open) {

    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
 
    if (open) {

      var inner = panel.querySelector('.pdp__accordion-panel-inner');

      var height = inner ? inner.offsetHeight : panel.scrollHeight;

      panel.style.height = height + 'px';
 
      window.setTimeout(function () {

        if (trigger.getAttribute('aria-expanded') === 'true') {

          panel.style.height = 'auto';

        }

      }, 260);

    } else {

      if (panel.style.height === 'auto' || panel.style.height === '') {

        panel.style.height = panel.scrollHeight + 'px';

        panel.offsetHeight; // force reflow

      }

      requestAnimationFrame(function () {

        panel.style.height = '0px';

      });

    }

  }
 
  /* -------------------- Audio buttons -------------------- */
 
  function initAudioButtons(root) {

    var buttons = root.querySelectorAll('[data-pdp-audio-toggle], .pfc__audio-btn');

    buttons.forEach(function (btn) {

      btn.addEventListener('click', function () {

        var isActive = btn.classList.toggle('is-active');

        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');

        // Hook your audio-guide playback logic here.

      });

    });

  }
 
  /* -------------------- Feature carousel -------------------- */
 
  function initCarousel(wrap) {

    var track = wrap.querySelector('[data-pfc-track]');

    var prev = wrap.querySelector('[data-pfc-prev]');

    var next = wrap.querySelector('[data-pfc-next]');

    if (!track) return;
 
    function scrollByAmount(direction) {

      var slide = track.querySelector('.pfc__slide');

      var amount = slide ? slide.getBoundingClientRect().width + 4 : track.clientWidth * 0.8;

      track.scrollBy({ left: amount * direction, behavior: 'smooth' });

    }
 
    if (prev) prev.addEventListener('click', function () { scrollByAmount(-1); });

    if (next) next.addEventListener('click', function () { scrollByAmount(1); });

  }
 
  /* -------------------- Mobile main/thumbnail carousel sync (NEW) -------------------- */
 
  function initMobileGallery(root) {

    var galleries = root.querySelectorAll('.pdp__m-gallery');
 
    galleries.forEach(function (gallery) {

      var main = gallery.querySelector('[data-pdp-m-main]');

      var thumbs = gallery.querySelectorAll('[data-pdp-m-thumb]');

      var thumbsTrack = gallery.querySelector('[data-pdp-m-thumbs]');

      var prevBtn = gallery.querySelector('[data-pdp-m-thumbs-prev]');

      var nextBtn = gallery.querySelector('[data-pdp-m-thumbs-next]');

      if (!main) return;
 
      var slides = main.querySelectorAll('[data-pdp-m-slide]');
 
      function setActiveThumb(index) {

        thumbs.forEach(function (t, i) {

          t.classList.toggle('pdp__m-thumb--active', i === index);

        });

      }
 
      // Clicking a thumbnail scrolls the main image to that slide.

      thumbs.forEach(function (thumb, index) {

        thumb.addEventListener('click', function () {

          var target = slides[index];

          if (target) {

            main.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });

          }

          setActiveThumb(index);

        });

      });
 
      // Swiping the main image updates which thumbnail looks active.

      var scrollTimeout;

      main.addEventListener('scroll', function () {

        window.clearTimeout(scrollTimeout);

        scrollTimeout = window.setTimeout(function () {

          var index = Math.round(main.scrollLeft / main.clientWidth);

          setActiveThumb(index);

        }, 100);

      });
 
      // Prev/next arrows scroll the thumbnail row itself (not the main image).

      if (prevBtn && thumbsTrack) {

        prevBtn.addEventListener('click', function () {

          thumbsTrack.scrollBy({ left: -200, behavior: 'smooth' });

        });

      }
 
      if (nextBtn && thumbsTrack) {

        nextBtn.addEventListener('click', function () {

          thumbsTrack.scrollBy({ left: 200, behavior: 'smooth' });

        });

      }

    });

  }
 
  /* -------------------- Init -------------------- */
 
  function init(root) {

    root = root || document;

    root.querySelectorAll('.pdp').forEach(function (section) {

      initAccordions(section);

      initAudioButtons(section);

      initMobileGallery(section);

    });

    root.querySelectorAll('.pfc').forEach(initAudioButtons);

    root.querySelectorAll('.pfc__track-wrap').forEach(initCarousel);

  }
 
  if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', function () { init(document); });

  } else {

    init(document);

  }
 
  // Re-init when a new section instance is loaded in the theme editor.

  document.addEventListener('shopify:section:load', function (event) {

    init(event.target);

  });

})();
 