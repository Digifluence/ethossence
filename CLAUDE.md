# Ethossence Theme Guidelines for Sections

## Section Schema Settings — Standard Order

Settings in every `ethossence-*.liquid` schema should follow this order:

1. `heading` — `inline_richtext`
2. `heading_size` — `select` (5 options, translation keys)
3. `heading_alignment` — `select` (left / center / right)
4. *(section-specific settings here)*
5. `color_scheme` — `color_scheme` (default: `"scheme-1"`)
6. *(optional: accordion checkbox)*
7. Padding header — `{ "type": "header", "content": "t:sections.all.padding.section_padding_heading" }`
8. `padding_top` — `range` (0–100, step 4, px, default: 24)
9. `padding_bottom` — `range` (0–100, step 4, px, default: 24)

Not all sections have headings (e.g. breadcrumbs). Include only what applies, but maintain relative order.

---

## Setting Names and Labels

- Use **sentence case**: capitalize the first word, lowercase the rest
- Applies to all `"name"`, `"label"`, and `"content"` values in section and block schemas
- Examples: `"Heading alignment"`, `"Enable accordion expand/collapse"`, `"Section padding"`
- Exception: translation keys (`t:sections.all...`) — these follow the localization file's casing

---

## Heading Size

- Always include all 5 options: `h2`, `h1`, `h0`, `hxl`, `hxxl`
- Always use translation keys for labels: `t:sections.all.heading_size.options__N.label`
- Default `"h1"` for primary content sections
- Default `"h2"` for supplementary/utility sections

```json
{
  "type": "select",
  "id": "heading_size",
  "options": [
    { "value": "h2", "label": "t:sections.all.heading_size.options__1.label" },
    { "value": "h1", "label": "t:sections.all.heading_size.options__2.label" },
    { "value": "h0", "label": "t:sections.all.heading_size.options__3.label" },
    { "value": "hxl", "label": "t:sections.all.heading_size.options__4.label" },
    { "value": "hxxl", "label": "t:sections.all.heading_size.options__5.label" }
  ],
  "default": "h1",
  "label": "t:sections.all.heading_size.label"
}
```

---

## Heading Alignment

- Always offer three options: left, center, right
- Default `"left"` for all sections
- Never hardcode alignment classes — always use `{{ section.settings.heading_alignment }}`

```json
{
  "type": "select",
  "id": "heading_alignment",
  "options": [
    { "value": "left", "label": "Left" },
    { "value": "center", "label": "Center" },
    { "value": "right", "label": "Right" }
  ],
  "default": "left",
  "label": "Heading alignment"
}
```

**CSS class pattern:**
```css
.component-name__heading--left { text-align: left; }
.component-name__heading--center { text-align: center; }
.component-name__heading--right { text-align: right; }
```

**HTML usage:**
```liquid
<h2 class="component-name__heading {{ section.settings.heading_size }} component-name__heading--{{ section.settings.heading_alignment }}">
```

---

## Padding

- Standard default: **24px** top and bottom
- Always use translation keys for the header and labels
- Range: 0–100, step 4, unit px
- Do **not** wrap heading settings in a `{ "type": "header", "content": "Header" }` group

```json
{
  "type": "header",
  "content": "t:sections.all.padding.section_padding_heading"
},
{
  "type": "range",
  "id": "padding_top",
  "min": 0, "max": 100, "step": 4, "unit": "px",
  "label": "t:sections.all.padding.padding_top",
  "default": 24
},
{
  "type": "range",
  "id": "padding_bottom",
  "min": 0, "max": 100, "step": 4, "unit": "px",
  "label": "t:sections.all.padding.padding_bottom",
  "default": 24
}
```

**Inline style block** (required in every section with padding):
```liquid
{%- style -%}
  .section-{{ section.id }}-padding {
    padding-top: {{ section.settings.padding_top | times: 0.75 | round: 0 }}px;
    padding-bottom: {{ section.settings.padding_bottom | times: 0.75 | round: 0 }}px;
  }

  @media screen and (min-width: 750px) {
    .section-{{ section.id }}-padding {
      padding-top: {{ section.settings.padding_top }}px;
      padding-bottom: {{ section.settings.padding_bottom }}px;
    }
  }
{%- endstyle -%}
```

---

## Color Scheme

- Label: `"t:sections.all.colors.label"`
- Default: `"scheme-1"` (exception: preheader uses `"scheme-4"`)

```json
{
  "type": "color_scheme",
  "id": "color_scheme",
  "label": "t:sections.all.colors.label",
  "default": "scheme-1"
}
```

---

## Accordion (Shared Component)

Eight sections support section-level expand/collapse:
`faqs`, `image-resources`, `video-resources`, `product-solutions`, `product-parts`, `product-description`, `product-specifications`, `product-characteristics`

**Schema setting:**
```json
{
  "type": "header",
  "content": "Accordion"
},
{
  "type": "checkbox",
  "id": "enable_accordion",
  "label": "Enable accordion expand/collapse",
  "default": false
}
```

**Shared assets** (loaded conditionally):
```liquid
{%- if section.settings.enable_accordion -%}
  {{ 'ethossence-accordion.css' | asset_url | stylesheet_tag }}
  <script src="{{ 'ethossence-accordion.js' | asset_url }}" defer="defer"></script>
{%- endif -%}
```

**HTML attributes:**
- Container: `data-ethossence-accordion`
- Toggle button: `data-accordion-toggle` with `data-expand-text` / `data-collapse-text` spans
- Content wrapper: `data-accordion-content`

**HTML pattern:**
```liquid
<div class="wrapper"{% if section.settings.enable_accordion %} data-ethossence-accordion{% endif %}>

  <div class="ethossence-accordion__header">
    <h2>{{ section.settings.heading }}</h2>
    {%- if section.settings.enable_accordion -%}
      <button type="button" class="ethossence-accordion__toggle" data-accordion-toggle>
        <span data-expand-text>+ expand</span>
        <span data-collapse-text>- collapse</span>
      </button>
    {%- endif -%}
  </div>

  <div class="{% if section.settings.enable_accordion %}ethossence-accordion__content{% endif %}"
       {% if section.settings.enable_accordion %} data-accordion-content{% endif %}>
    <!-- section content here -->
  </div>

</div>
```

---

## Asset Naming

- CSS: `assets/ethossence-{section-name}.css`
- JS: `assets/ethossence-{section-name}.js`
- Each section loads its own assets; shared accordion assets are loaded conditionally

---

## Section File Conventions

- File naming: `sections/ethossence-{name}.liquid`
- Begin every file with a comment block identifying the section
- Schema `presets` category: `"Ethossence"`
- Outer HTML wrapping pattern:

```liquid
<div class="color-{{ section.settings.color_scheme }} gradient">
  <div class="page-width section-{{ section.id }}-padding isolate">
    <!-- content -->
  </div>
</div>
```

---

## Metafield Conventions

Sections that pull content from metafields use namespace `ethossence` and support multiple template types:

```liquid
{%- liquid
  assign data = blank
  if template contains 'page'
    assign data = page.metafields.ethossence.field_name.value
  elsif template contains 'article'
    assign data = article.metafields.ethossence.field_name.value
  elsif template contains 'blog'
    assign data = blog.metafields.ethossence.field_name.value
  elsif template contains 'collection'
    assign data = collection.metafields.ethossence.field_name.value
  elsif template contains 'product'
    assign data = product.metafields.ethossence.field_name.value
  endif
-%}
```

Sections using this pattern: `content-headings`, `embed-script`, `faqs`, `image-resources`, `video-resources`, `product-solutions`, `product-parts`, `product-description`, `product-specifications`, `product-characteristics`
