# @strata-packages/offcanvas

> Lightweight offcanvas drawer component for [Strata CSS](https://github.com/AftabIbrahimKazi/strata). Works standalone (no dependencies) or integrated with Strata CSS.

[![npm](https://img.shields.io/npm/v/@strata-packages/offcanvas)](https://www.npmjs.com/package/@strata-packages/offcanvas)
[![license](https://img.shields.io/npm/l/@strata-packages/offcanvas)](LICENSE)

---

## Installation

```bash
# Standalone
npm install @strata-packages/offcanvas

# With Strata (already included in strata.components.js — do not install separately)
npm install strata-css
```

## Usage

### Standalone (no Strata CSS)

```html
<link  rel="stylesheet" href="node_modules/@strata-packages/offcanvas/offcanvas.css">
<script src="node_modules/@strata-packages/offcanvas/offcanvas.js"></script>
```

### With Strata CSS

```html
<script src="node_modules/strata-css/dist/strata.components.js"></script>
```

Available as `Strata.Offcanvas.open()` / `Strata.Offcanvas.close()`.

## HTML Structure

Two attributes drive everything — JS never touches classes:

| Attribute | Purpose | Values |
|---|---|---|
| `data-st-side` | Slide direction — set once in HTML, CSS-driven | `left` / `right` / `top` / `bottom` |
| `aria-hidden` | Open/close state — JS only updates the value | `"true"` / `"false"` |

```html
<!-- Trigger -->
<button data-st-toggle="offcanvas" data-st-target="#myDrawer">Open</button>

<!-- Drawer (slides from the right) -->
<div id="myDrawer" class="offcanvas" data-st-side="right" aria-hidden="true" aria-modal="false">
  <div class="offcanvas-header">
    <h5 class="offcanvas-title">Title</h5>
    <button data-st-dismiss="offcanvas">&times;</button>
  </div>
  <div class="offcanvas-body">
    Content here.
  </div>
</div>
```

## Direction Variants

Set `data-st-side` on the `.offcanvas` element — CSS handles the rest:

| `data-st-side` | Slides in from |
|---|---|
| `left` | Left |
| `right` | Right |
| `top` | Top |
| `bottom` | Bottom |

## Programmatic API

```js
// Standalone
StrataOffcanvas.open('#myDrawer')
StrataOffcanvas.close()

// With Strata
Strata.Offcanvas.open('#myDrawer')
Strata.Offcanvas.close()

// Pass element directly
Strata.Offcanvas.open(document.getElementById('myDrawer'))
```

## Static Backdrop

Prevents closing on backdrop click:

```html
<div class="offcanvas" data-st-side="right" data-st-backdrop="static" aria-hidden="true" aria-modal="false">
```

## Events

```js
document.addEventListener('st:offcanvas:open', function (e) {
  console.log('opened:', e.detail.offcanvas)
})

document.addEventListener('st:offcanvas:close', function (e) {
  console.log('closed:', e.detail.offcanvas)
})
```

## Dynamic Direction

Set `data-st-side` before calling `open()` — JS never touches it, so it is always safe to change:

```js
const drawer = document.getElementById('myDrawer')
drawer.setAttribute('data-st-side', 'left')
Strata.Offcanvas.open(drawer)
```

---

## Documentation

Full API reference, options and live examples: **[https://strata-css-docs-site.vercel.app/packages/offcanvas](https://strata-css-docs-site.vercel.app/packages/offcanvas)**

`@strata-packages/offcanvas` is part of **[Strata CSS](https://github.com/AftabIbrahimKazi/strata)** — a JIT CSS framework that pairs Bootstrap-style component classes with Tailwind-style on-demand generation, cascade layers instead of `!important`, variants (`hover:`, `group-hover:`, `peer-checked:`), arbitrary values and three built-in themes.

- Framework docs — [https://strata-css-docs-site.vercel.app](https://strata-css-docs-site.vercel.app)
- Source and issues — [https://github.com/AftabIbrahimKazi/strata](https://github.com/AftabIbrahimKazi/strata)
- Framework on npm — [strata-css](https://www.npmjs.com/package/strata-css)

### Other Strata packages

| Package | What it does |
|---|---|
| [`@strata-packages/chart`](https://www.npmjs.com/package/@strata-packages/chart) | Three.js chart component. Works standalone or with Strata CSS. |
| [`@strata-packages/cursorfx`](https://www.npmjs.com/package/@strata-packages/cursorfx) | Modular cursor effects — one shared engine, ten opt-in presets. Works standalone or with Strata CSS. |
| [`@strata-packages/flipbook`](https://www.npmjs.com/package/@strata-packages/flipbook) | PDF and HTML flipbook viewer with page-flip animation. Works standalone or with Strata CSS. |
| [`@strata-packages/forms`](https://www.npmjs.com/package/@strata-packages/forms) | Interactive form controls for Strata CSS — custom select with every variant developers need. |
| [`@strata-packages/modal`](https://www.npmjs.com/package/@strata-packages/modal) | Lightweight modal component. Works standalone or with Strata CSS. |
| [`@strata-packages/picker`](https://www.npmjs.com/package/@strata-packages/picker) | Date, time, and datetime picker for Strata CSS. Works standalone or with Strata. |
| [`@strata-packages/shopmap`](https://www.npmjs.com/package/@strata-packages/shopmap) | Lightweight, theme-aware map component with terrain, hypsometric tinting, and procedural hillshading. Zero API keys. Free for commercial use. |
| [`@strata-packages/skeleton-loader`](https://www.npmjs.com/package/@strata-packages/skeleton-loader) | Lightweight skeleton loader plugin. Works standalone or with Strata CSS. |

---

## License

MIT © [Aftab Ibrahim Kazi](https://github.com/AftabIbrahimKazi)
