# @strata-packages/skeleton-loader

> A shimmer skeleton loading plugin for [Strata CSS](https://github.com/AftabIbrahimKazi/strata). Automatically detects content leaves inside a container and overlays a shimmer animation until data is ready. Works standalone or as part of Strata.

[![npm](https://img.shields.io/npm/v/@strata-packages/skeleton-loader)](https://www.npmjs.com/package/@strata-packages/skeleton-loader)
[![license](https://img.shields.io/npm/l/@strata-packages/skeleton-loader)](LICENSE)

---

## Installation

```bash
npm install @strata-packages/skeleton-loader
```

---

## Usage

### Standalone

```html
<link  rel="stylesheet" href="node_modules/@strata-packages/skeleton-loader/skeleton-loader.css">
<script src="node_modules/@strata-packages/skeleton-loader/skeleton-loader.js"></script>
```

Available as `SkeletonLoader`.

### With Strata CSS

```html
<script src="node_modules/strata-css/dist/strata.components.js"></script>
```

Available as `Strata.skeleton`. Do **not** load `skeleton-loader.js` separately.

---

## Quick Start

```html
<div id="card">
  <img src="...">
  <h3>Title</h3>
  <p>Description text.</p>
</div>

<script>
  // Show skeleton
  Strata.skeleton.init('#card')

  // After data loads — reveal
  fetchData().then(() => {
    Strata.skeleton.reveal('#card')
  })
</script>
```

---

## API

### `init(selector?, options?)`

Registers elements for skeleton management. Applies smart detection — finds content leaves automatically.

```js
Strata.skeleton.init()            // init all [data-st-skeleton="true"] on the page
Strata.skeleton.init('#card')     // init a specific element
Strata.skeleton.init('.card')     // init all matching elements
Strata.skeleton.init(el)          // init a DOM element directly
```

### `reveal(selector?, options?)`

Removes the skeleton, revealing content.

```js
Strata.skeleton.reveal()                          // reveal all
Strata.skeleton.reveal('#card')                   // reveal one
Strata.skeleton.reveal('.card', { stagger: 150 }) // stagger reveal (150ms between each)
Strata.skeleton.reveal({ onReveal: () => {} })    // callback after last reveal
```

### `show(selector?)`

Re-applies skeleton (for re-loading states).

```js
Strata.skeleton.show('#card')
```

### `toggle(selector?)`

Toggles between skeleton and revealed state.

### `revealAt(selector, index)`

Reveals the element at a specific index within a matched set.

```js
Strata.skeleton.revealAt('.card', 2) // reveal the third card
```

### `isSkeleton(el)`

Returns `true` if the element is currently in skeleton state.

---

## CSS — `data-st-skeleton` Attribute States

The plugin drives appearance via the `data-st-skeleton` attribute — CSS handles the rest:

| Value | Meaning |
|---|---|
| `"true"` | Shimmer overlay active on this element |
| `"false"` | Content revealed, no shimmer |
| `"null"` | JS-managed parent — children shimmer individually |

---

## Manual CSS-Only Usage

No JS needed for simple cases:

```html
<!-- Single element shimmer -->
<div data-st-skeleton="true" style="height:200px; border-radius:8px;"></div>

<!-- Opt-out a child from shimmer -->
<div data-st-skeleton="true">
  <span data-st-skeleton="false">This is not shimmed</span>
</div>
```

---

## Smart Detection

`init()` walks the DOM tree and identifies "leaf" elements — the actual content nodes that should shimmer. It does not shimmer structural containers directly.

**Content leaves** (shimmed individually):
`p`, `h1-h6`, `span`, `a`, `label`, `strong`, `em`, `small`, `button`, `input`, `textarea`, `select`, `li`, `blockquote`

**Replaced elements** (`img`, `video`, `canvas`): JS marks their wrapper instead — pseudo-elements don't work on replaced elements.

**Structural containers** (`div`, `section`, `article`, etc.): walked recursively, not shimmed directly unless they contain direct text.

---

## CSS Tokens

```css
:root {
  --st-skeleton-base:     #e2e8f0;  /* shimmer bar background */
  --st-skeleton-shine:    #f8fafc;  /* shimmer highlight */
  --st-skeleton-duration: 1.5s;     /* animation speed */
  --st-skeleton-radius:   4px;      /* corner rounding */
}
```

Override globally or per-element:

```css
#my-card {
  --st-skeleton-base:     #2d3748;
  --st-skeleton-shine:    #4a5568;
  --st-skeleton-duration: 1s;
}
```

Dark theme tokens are set automatically when `data-st-theme="dark"` is on an ancestor.

---

## Accessibility

- `pointer-events: none` while shimming — skeleton is not interactive
- `cursor: wait` on shimming parent
- Reduced motion: animation disabled, static placeholder color shown instead

---

## Known Limitations

- `img`, `video`, `canvas` cannot host `::before` pseudo-elements — the plugin marks their wrapper. If you manually apply `data-st-skeleton="true"` directly to an `<img>`, a background shimmer is used and the image content is hidden via `object-position: 9999px`.
- Inline elements (`span`, `a`, etc.) are forced to `display: inline-block` during skeleton state.

---

## License

MIT © [Aftab Ibrahim Kazi](https://github.com/AftabIbrahimKazi)
