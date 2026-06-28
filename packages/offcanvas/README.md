# @strata-packages/offcanvas

Lightweight offcanvas drawer component. Works standalone (no dependencies) or integrated with Strata CSS.

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

```html
<!-- Trigger -->
<button data-st-toggle="offcanvas" data-st-target="#myDrawer">Open</button>

<!-- Drawer (slides from the right) -->
<div id="myDrawer" class="offcanvas offcanvas-end" aria-hidden="true">
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

Add one direction class to `.offcanvas`:

| Class             | Slides in from |
|-------------------|----------------|
| `offcanvas-start` | Left           |
| `offcanvas-end`   | Right          |
| `offcanvas-top`   | Top            |
| `offcanvas-bottom`| Bottom         |

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
<div id="myDrawer" class="offcanvas offcanvas-end" data-st-backdrop="static">
```

## Events

```js
document.addEventListener('st:offcanvas:open', (e) => {
  console.log('opened:', e.detail.offcanvas)
})

document.addEventListener('st:offcanvas:close', (e) => {
  console.log('closed:', e.detail.offcanvas)
})
```

## Dynamic Direction

Set `data-st-side` before calling `open()` to change direction at runtime:

```js
const drawer = document.getElementById('myDrawer')
drawer.className = 'offcanvas offcanvas-start'  // swap direction class
Strata.Offcanvas.open(drawer)
```
