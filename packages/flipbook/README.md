# @strata-packages/flipbook

CSS-driven flipbook with organic page-flip animation. Renders HTML pages or PDFs. Drag to flip, sounds, 6 presets, responsive.

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
