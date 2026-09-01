# Using Strata with Shopify

Strata is host-agnostic: it scans source files for class names and emits CSS. Nothing about it is framework-specific, and that includes Liquid. This page covers the parts of a Shopify theme that need a decision rather than a default.

Verified against Shopify's current theme architecture, in which `blocks/` is part of the required directory structure alongside `layout/`, `sections/`, `snippets/`, `templates/`, `config/` and `assets/`.

## Config

```js
// strata.config.js
module.exports = {
  content: [
    './layout/*.liquid',
    './sections/**/*.liquid',
    './snippets/**/*.liquid',
    './blocks/**/*.liquid',        // theme blocks — part of the required structure
    './templates/**/*.liquid',
    './assets/*.js',               // any classes added from theme JS

    // Merchant-configured settings. In Online Store 2.0 these are stored as
    // JSON *in the theme*, so anything a merchant typed into a section setting
    // is scannable — provided you have pulled the live theme down first.
    './templates/**/*.json',
    './sections/*.json',
    './config/settings_data.json',
  ],
  input:  './src/strata.css',
  output: './assets/strata.css',
  safelist: [],
}
```

Then in `layout/theme.liquid`:

```liquid
{{ 'strata.css' | asset_url | stylesheet_tag }}
```

Build before `shopify theme push`, and commit `assets/strata.css` — Shopify does not run a build step for you.

## What Strata sees, and what it doesn't

**Scanned.** Class attributes in any Liquid file, and class strings passed as a filter parameter:

```liquid
<div class="card p-3 hover:shadow-lg">                        ✓
{{ 'Read more' | link_to: product.url, class: 'text-primary' }}  ✓
{{ image | image_tag: class: 'card-img-top' }}                   ✓
{% form 'product', product, class: 'd-grid gap-3' %}             ✓
```

The `class:` parameter form matters because several Liquid filters render the element for you and accept the classes as a named argument — there is no attribute for you to write.

**Not scanned — and no scanner can fix these:**

```liquid
<span class="badge badge-{{ product.type }}">                 ✗ built at runtime
<div class="{{ section.settings.custom_class }}">             ✗ merchant data
```

## Dynamic class names

A class assembled from data never exists as a literal, so nothing can find it. Two answers depending on the value set.

**Finite and known** — safelist it:

```js
safelist: ['badge-success badge-danger badge-warning'],
```

Safelisted names go through the same lookup as scanned ones, so arbitrary values (`w-[320px]`), responsive forms (`px-md-4`) and variants (`hover:bg-primary`) all work there too.

**Unbounded** — an arbitrary merchant tag cannot be safelisted. Map data to literal class names in the Liquid instead:

```liquid
{% case product.type %}
  {% when 'sale'  %}{% assign badge = 'badge-danger'  %}
  {% when 'new'   %}{% assign badge = 'badge-success' %}
  {% else %}        {% assign badge = 'badge-secondary' %}
{% endcase %}
<span class="badge {{ badge }}">
```

This is better Liquid regardless — you control the visual vocabulary instead of letting merchant-entered tag names decide which CSS ships.

## Merchant-entered classes

If your theme exposes a "custom CSS class" setting, the value lives in the theme's JSON, so the globs above pick it up **as of your last `shopify theme pull`**. A merchant editing the live theme after that won't be in your build.

Two ways to make that safe:

- **Publish a palette.** Document the specific classes merchants may use and safelist exactly those. Bounding the set is usually desirable anyway.
- **Use Shopify's own custom CSS setting** instead of a class field. Shopify exposes a custom CSS setting at theme and section level; the CSS is stored in `settings_data.json` under `platform_customizations`, and it is applied by Shopify without going through Strata at all. For merchant-authored one-offs this is the better channel — it needs no rebuild.

## Why variants are classes, not attributes

Strata's state variants are written `hover:bg-primary`, one variant per token. An attribute form — `data-st-hover="bg-primary text-white"` — measures better: constant atomic CSS and roughly 12% less gzipped HTML at six utilities per state.

It was rejected because of Shopify. Theme-editor class fields and filters like `link_to` accept a class string and nothing else, so an attribute-only design would be unavailable on exactly the surfaces a theme author does not control. The class form works everywhere the attribute form works, plus those.

The grouped spelling `hover:[a b c]` is impossible on any host: the HTML parser splits `class` on whitespace into a token list before CSS is consulted, leaving a bare `b` token that applies permanently and a `c]` that carries no record of its state.

## Checklist

- [ ] `content` covers `layout`, `sections`, `snippets`, `blocks`, `templates`, and theme JS
- [ ] JSON globs added if you use merchant class settings
- [ ] `output` points into `assets/`, and the built file is committed
- [ ] `stylesheet_tag` in `layout/theme.liquid`
- [ ] Dynamic class names safelisted or converted to `{% case %}`
- [ ] Build run before every `theme push`
- [ ] Build output checked for the "matched no utility" warning
