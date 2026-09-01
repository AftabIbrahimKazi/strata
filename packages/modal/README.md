# @strata-packages/modal

> A lightweight, accessible modal component for [Strata CSS](https://github.com/AftabIbrahimKazi/strata). Zero dependencies. Works standalone or as part of Strata.

[![npm](https://img.shields.io/npm/v/@strata-packages/modal)](https://www.npmjs.com/package/@strata-packages/modal)
[![license](https://img.shields.io/npm/l/@strata-packages/modal)](LICENSE)

---

## Installation

```bash
npm install @strata-packages/modal
```

---

## Usage

### Standalone

```html
<link  rel="stylesheet" href="node_modules/@strata-packages/modal/modal.css">
<script src="node_modules/@strata-packages/modal/modal.js"></script>
```

Available as `StrataModal`. CSS tokens are self-contained when Strata is not present — detected automatically via `:root:not([data-strata])`.

### With Strata CSS

The modal is bundled into Strata's component build — do **not** load `modal.js` separately when using the full Strata bundle.

Available as `Strata.Modal`.

---

## HTML Structure

```html
<div id="myModal" class="modal" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">

      <div class="modal-header">
        <h5 class="modal-title">Title</h5>
        <button data-st-dismiss="modal" class="btn-close"></button>
      </div>

      <div class="modal-body">
        Body content here.
      </div>

      <div class="modal-footer">
        <button data-st-dismiss="modal" class="btn-secondary">Cancel</button>
        <button class="btn-primary">Confirm</button>
      </div>

    </div>
  </div>
</div>
```

---

## Triggering

### Declarative — no JS needed

```html
<button data-st-toggle="modal" data-st-target="#myModal">Open</button>
```

### Programmatic

```js
// Standalone
StrataModal.open('#myModal')
StrataModal.close()

// With Strata
Strata.Modal.open('#myModal')
Strata.Modal.close()

// Pass element directly
Strata.Modal.open(document.getElementById('myModal'))
```

---

## Dismissing

```html
<!-- Any element inside the modal -->
<button data-st-dismiss="modal">Close</button>
```

Also dismisses on:
- Clicking the backdrop (unless `data-st-backdrop="static"`)
- Pressing `Escape` (unless static)

---

## Static Backdrop

Prevents closing on backdrop click — shows a shake animation instead.

```html
<div id="myModal" class="modal" data-st-backdrop="static">
```

---

## Size Variants

Applied to the `.modal` element:

```html
<div class="modal modal-sm">   <!-- 300px  -->
<div class="modal modal-lg">   <!-- 800px  -->
<div class="modal modal-xl">   <!-- 1140px -->
<div class="modal modal-fullscreen">
```

Responsive fullscreen (fullscreen below a breakpoint):

```html
<div class="modal modal-fullscreen-md-down">
```

---

## Dialog Variants

```html
<!-- Vertically centered -->
<div class="modal-dialog modal-dialog-centered">

<!-- Scrollable body -->
<div class="modal-dialog modal-dialog-scrollable">
```

---

## Events

Fired on `document`:

```js
document.addEventListener('st:modal:open', e => {
  console.log('opened:', e.detail.modal)
})

document.addEventListener('st:modal:close', e => {
  console.log('closed:', e.detail.modal)
})
```

---

## CSS Variables

When used standalone (without Strata), the modal defines its own tokens:

```css
--st-modal-bg:       /* modal content background */
--st-modal-border:   /* modal border color */
--st-modal-shadow:   /* modal box shadow */
```

Override per-instance:

```css
#myModal .modal-content {
  --st-modal-bg: #1a1a2e;
}
```

---

## Known Limitations

- One modal open at a time — opening a second modal closes the first
- Backdrop is a single shared element appended to `<body>`
- Focus moves to the first `[autofocus]` element, or `.modal-content`, on open

---

## Documentation

Full API reference, options and live examples: **[https://strata-css-docs-site.vercel.app/packages/modal](https://strata-css-docs-site.vercel.app/packages/modal)**

`@strata-packages/modal` is part of **[Strata CSS](https://github.com/AftabIbrahimKazi/strata)** — a JIT CSS framework that pairs Bootstrap-style component classes with Tailwind-style on-demand generation, cascade layers instead of `!important`, variants (`hover:`, `group-hover:`, `peer-checked:`), arbitrary values and three built-in themes.

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
| [`@strata-packages/offcanvas`](https://www.npmjs.com/package/@strata-packages/offcanvas) | Lightweight offcanvas drawer component. Works standalone or with Strata CSS. |
| [`@strata-packages/picker`](https://www.npmjs.com/package/@strata-packages/picker) | Date, time, and datetime picker for Strata CSS. Works standalone or with Strata. |
| [`@strata-packages/shopmap`](https://www.npmjs.com/package/@strata-packages/shopmap) | Lightweight, theme-aware map component with terrain, hypsometric tinting, and procedural hillshading. Zero API keys. Free for commercial use. |
| [`@strata-packages/skeleton-loader`](https://www.npmjs.com/package/@strata-packages/skeleton-loader) | Lightweight skeleton loader plugin. Works standalone or with Strata CSS. |

---

## License

MIT © [Aftab Ibrahim Kazi](https://github.com/AftabIbrahimKazi)
