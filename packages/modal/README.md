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

## License

MIT © [Aftab Ibrahim Kazi](https://github.com/AftabIbrahimKazi)
