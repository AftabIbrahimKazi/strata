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

## License

MIT © [Aftab Ibrahim Kazi](https://github.com/AftabIbrahimKazi)
