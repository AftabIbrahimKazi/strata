# @strata-packages/offcanvas — Developer Reference

## What it is

A lightweight, accessible offcanvas drawer component. Works standalone (no dependencies) or integrated with Strata CSS. Slide-in panels anchored to any viewport edge, controlled entirely via data attributes.

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

CSS tokens are self-contained when Strata is not present. Detects Strata via `:root:not([data-strata])`.

### With Strata CSS

```html
<script src="node_modules/strata-css/dist/strata.components.js"></script>
```

Available as `Strata.Offcanvas.open()` / `Strata.Offcanvas.close()`. Do **not** load `offcanvas.js` separately.

## HTML Structure

Two data attributes drive everything — JS never touches classes:

| Attribute        | Purpose                              | Values                          |
|------------------|--------------------------------------|---------------------------------|
| `data-st-side`   | Direction — CSS-driven, set once     | `left` / `right` / `top` / `bottom` |
| `data-st-visible`| Open / close state — JS-toggled only | `true` / `false`                |

```html
<!-- Trigger -->
<button data-st-toggle="offcanvas" data-st-target="#myDrawer">Open</button>

<!-- Drawer -->
<div id="myDrawer" class="offcanvas" data-st-side="right" aria-hidden="true">
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

Set `data-st-side` on the `.offcanvas` element once in HTML — the CSS handles the rest:

```html
<div class="offcanvas" data-st-side="left"   ...>  <!-- slides from left   -->
<div class="offcanvas" data-st-side="right"  ...>  <!-- slides from right  -->
<div class="offcanvas" data-st-side="top"    ...>  <!-- slides from top    -->
<div class="offcanvas" data-st-side="bottom" ...>  <!-- slides from bottom -->
```

Override size via CSS variables:

```css
#myDrawer {
  --st-offcanvas-width:  440px;  /* left / right drawers */
  --st-offcanvas-height: 50vh;   /* top / bottom drawers */
}
```

## Triggering

**Declarative:**
```html
<button data-st-toggle="offcanvas" data-st-target="#myDrawer">Open</button>
```

**Programmatic:**
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

## Dismissing

```html
<button data-st-dismiss="offcanvas">Close</button>
```

Also dismisses on:
- Clicking the backdrop (unless `data-st-backdrop="static"`)
- Pressing `Escape` (unless static)

## Static Backdrop

```html
<div class="offcanvas" data-st-side="right" data-st-backdrop="static">
```

## Events

```js
document.addEventListener('st:offcanvas:open',  (e) => console.log(e.detail.offcanvas))
document.addEventListener('st:offcanvas:close', (e) => console.log(e.detail.offcanvas))
```

## CSS Variables

Override per-instance:

```css
#myDrawer {
  --st-bg:               #1a1a2e;
  --st-border:           transparent;
  --st-offcanvas-width:  440px;
}
```

## Dynamic Direction

Change `data-st-side` before calling `open()` — JS never touches it, so it is always safe to set:

```js
const drawer = document.getElementById('myDrawer')
drawer.setAttribute('data-st-side', 'left')
Strata.Offcanvas.open(drawer)
```

## Known Limitations

- One offcanvas open at a time. Opening a second drawer closes the first.
- Backdrop is a single shared element appended to `<body>`.
- Focus moves to the first `[autofocus]` element or `.offcanvas-body` on open.
