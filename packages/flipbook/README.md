# @strata-packages/flipbook

> CSS-driven 3D page-flip flipbook for [Strata CSS](https://github.com/AftabIbrahimKazi/strata). Renders HTML pages or PDFs with an organic page-flip animation. Drag to flip, sounds, 6 presets, responsive.

[![npm](https://img.shields.io/npm/v/@strata-packages/flipbook)](https://www.npmjs.com/package/@strata-packages/flipbook)
[![license](https://img.shields.io/npm/l/@strata-packages/flipbook)](LICENSE)

---

## Installation

```bash
npm install @strata-packages/flipbook
```

## Quick Start

```html
<link rel="stylesheet" href="flipbook.css">
<script src="flipbook.js"></script>

<!-- Zero-config: existing children become pages -->
<div id="book">
  <div>Page 1</div>
  <div>Page 2</div>
</div>
<script>StrataFlipbook('#book')</script>
```

Or pass content explicitly:

```html
<div id="book"></div>
<script>
  StrataFlipbook('#book', {
    content:    '.my-pages',   // selector, NodeList, or Element[]
    preset:     'magazine',
    pagination: 'dots',
    drag:       true,
    exportable: true,
    sound:      { enabled: true },
  })
</script>
```

## PDF Viewer

```html
<script>pdfjsLib.GlobalWorkerOptions.workerSrc = '...'</script>
<div id="book"></div>
<script>
  StrataFlipbook('#book', { source: 'pdf', content: '/doc.pdf' })
</script>
```

## Presets

`notebook` (default) · `magazine` · `paperback` · `hardcover` · `comic` · `minimal`

## Pagination modes

`controls` (default) · `dots` · `input` · `thumbnails` · `none` · or array e.g. `['controls', 'dots']`

## Peer dependencies

| Package | When needed |
|---|---|
| `pdfjs-dist` | `source: 'pdf'` |
| `html2canvas` | Export HTML source to PDF |
| `pdf-lib` | Any PDF export |

All MIT or Apache-2.0. None inject inline styles or JS.

See [CLAUDE.md](CLAUDE.md) for full API reference.

---

## Documentation

Full API reference, options and live examples: **[https://strata-css-docs-site.vercel.app/packages/flipbook](https://strata-css-docs-site.vercel.app/packages/flipbook)**

`@strata-packages/flipbook` is part of **[Strata CSS](https://github.com/AftabIbrahimKazi/strata)** — a JIT CSS framework that pairs Bootstrap-style component classes with Tailwind-style on-demand generation, cascade layers instead of `!important`, variants (`hover:`, `group-hover:`, `peer-checked:`), arbitrary values and three built-in themes.

- Framework docs — [https://strata-css-docs-site.vercel.app](https://strata-css-docs-site.vercel.app)
- Source and issues — [https://github.com/AftabIbrahimKazi/strata](https://github.com/AftabIbrahimKazi/strata)
- Framework on npm — [strata-css](https://www.npmjs.com/package/strata-css)

### Other Strata packages

| Package | What it does |
|---|---|
| [`@strata-packages/chart`](https://www.npmjs.com/package/@strata-packages/chart) | Three.js chart component. Works standalone or with Strata CSS. |
| [`@strata-packages/cursorfx`](https://www.npmjs.com/package/@strata-packages/cursorfx) | Modular cursor effects — one shared engine, ten opt-in presets. Works standalone or with Strata CSS. |
| [`@strata-packages/forms`](https://www.npmjs.com/package/@strata-packages/forms) | Interactive form controls for Strata CSS — custom select with every variant developers need. |
| [`@strata-packages/modal`](https://www.npmjs.com/package/@strata-packages/modal) | Lightweight modal component. Works standalone or with Strata CSS. |
| [`@strata-packages/offcanvas`](https://www.npmjs.com/package/@strata-packages/offcanvas) | Lightweight offcanvas drawer component. Works standalone or with Strata CSS. |
| [`@strata-packages/picker`](https://www.npmjs.com/package/@strata-packages/picker) | Date, time, and datetime picker for Strata CSS. Works standalone or with Strata. |
| [`@strata-packages/shopmap`](https://www.npmjs.com/package/@strata-packages/shopmap) | Lightweight, theme-aware map component with terrain, hypsometric tinting, and procedural hillshading. Zero API keys. Free for commercial use. |
| [`@strata-packages/skeleton-loader`](https://www.npmjs.com/package/@strata-packages/skeleton-loader) | Lightweight skeleton loader plugin. Works standalone or with Strata CSS. |

---

## License

MIT © [Aftab Ibrahim Kazi](https://github.com/AftabIbrahimKazi)
