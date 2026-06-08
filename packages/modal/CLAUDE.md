# @strata-packages/modal — Developer Reference

## What it is

A lightweight, accessible modal component. Works standalone (no dependencies) or integrated with Strata CSS.

## Installation

```bash
# Standalone
npm install @strata-packages/modal

# With Strata (already included in strata.components.js — do not install separately)
npm install strata-css
```

## Usage

### Standalone (no Strata CSS)

```html
<link  rel="stylesheet" href="node_modules/@strata-packages/modal/modal.css">
<script src="node_modules/@strata-packages/modal/modal.js"></script>
```

CSS tokens are self-contained when Strata is not present. Detects Strata via `:root:not([data-strata])`.

### With Strata CSS

```html
<script src="node_modules/strata-css/dist/strata.components.js"></script>
```

Available as `Strata.Modal.open()` / `Strata.Modal.close()`. Do **not** load `modal.js` separately.

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

## Triggering

**Declarative (data attributes — no JS needed):**
```html
<button data-st-toggle="modal" data-st-target="#myModal">Open</button>
```

**Programmatic:**
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

## Dismissing

```html
<!-- Any element inside the modal -->
<button data-st-dismiss="modal">Close</button>
```

Also dismisses on:
- Clicking the backdrop (unless `data-st-backdrop="static"`)
- Pressing `Escape` (unless static)

## Static Backdrop

Prevents closing on backdrop click. Shows a shake animation instead:

```html
<div id="myModal" class="modal" data-st-backdrop="static">
```

## Size Variants

Applied to the `.modal` element:

```html
<div class="modal modal-sm">   <!-- 300px  -->
<div class="modal modal-lg">   <!-- 800px  -->
<div class="modal modal-xl">   <!-- 1140px -->
<div class="modal modal-fullscreen">
```

Responsive fullscreen (fullscreen below breakpoint):
```html
<div class="modal modal-fullscreen-md-down">
```

## Dialog Variants

```html
<!-- Vertically centered -->
<div class="modal-dialog modal-dialog-centered">

<!-- Scrollable body -->
<div class="modal-dialog modal-dialog-scrollable">
```

## Events

Fired on `document`:

```js
document.addEventListener('st:modal:open', (e) => {
  console.log('opened:', e.detail.modal)
})

document.addEventListener('st:modal:close', (e) => {
  console.log('closed:', e.detail.modal)
})
```

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

## Known Limitations

- One modal open at a time. Opening a second modal closes the first.
- Backdrop is a single shared element appended to `<body>`.
- Focus is moved to the first `[autofocus]` element or `.modal-content` on open.
