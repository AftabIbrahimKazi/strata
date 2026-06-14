# @strata-packages/flipbook — Developer Reference

## What it is

A CSS-driven flipbook that renders HTML pages or PDF documents with an organic 3D page-flip animation. The turning page is a real 3D leaf hinged at the spine — it rotates through the book's `perspective`, carrying the leaving page on its front face and the arriving page on its back face (`backface-visibility` swaps them at the halfway point). All animation is driven by CSS keyframes and `data-st-*` attributes — no inline styles. Only CSS custom properties (`--st-flip-angle`, `--st-flip-shade`) are set on the container during an active drag; no other JS-driven style mutations occur.

## Installation

```bash
npm install @strata-packages/flipbook
```

Peer dependencies (install only what you need):

```bash
npm install pdfjs-dist    # required for source: 'pdf'
npm install html2canvas   # required for export of HTML source to PDF
npm install pdf-lib       # required for any PDF export
```

## Usage

### Standalone

```html
<link rel="stylesheet" href="flipbook.css">
<script src="flipbook.js"></script>
```

Available as `StrataFlipbook` globally.

### Zero-config (Swiper-like)

Existing children of the container become pages automatically:

```html
<div id="book">
  <div>Page 1</div>
  <div>Page 2</div>
  <div>Page 3</div>
</div>
<script>StrataFlipbook('#book')</script>
```

### HTML source with options

```html
<div id="my-book"></div>
<script>
  const book = StrataFlipbook('#my-book', {
    source:     'html',
    content:    '.my-pages',   // CSS selector, NodeList, Element, or array
    preset:     'magazine',
    pagination: ['controls', 'dots'],
    drag:       true,
    sound:      { enabled: true, volume: 0.5 },
    exportable: true,
    loop:       true,
  })
</script>
```

### PDF source

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
</script>

<div id="my-book"></div>
<script>
  StrataFlipbook('#my-book', {
    source:  'pdf',
    content: '/documents/brochure.pdf',
  })
</script>
```

## All Options

| Option | Type | Default | Description |
|---|---|---|---|
| `source` | `'html'` \| `'pdf'` | `'html'` | Content source type |
| `content` | `string \| Element \| NodeList \| Element[] \| url` | `[]` | Pages for HTML or PDF URL for PDF source |
| `preset` | `string` | `'notebook'` | Visual preset (see Presets) |
| `pagination` | `string \| string[]` | `'controls'` | Pagination mode(s) (see Pagination) |
| `drag` | `boolean` | `true` | Enable drag-to-flip corner zones |
| `sound` | `object \| false` | see below | Page-turn sound options |
| `exportable` | `boolean` | `false` | Show export-to-PDF button |
| `loop` | `boolean` | `false` | Wrap past first/last spread |
| `closed` | `boolean` | `true` | `true` = closed-book default: the cover and back cover are shown alone, centred with page-stack thickness so they read as a closed book, and open into the full spread with no layout shift. `false` = always show the full two-page spread (cover on right, back cover on left) |
| `renderer` | `'2d'` | `'2d'` | Renderer — `'3d'` reserved for v2 |
| `pdfjsUrl` | `string` | cdnjs pdf.js | Lazy-load source for `pdf.js` (PDF source). Set `''` to require a pre-loaded `window.pdfjsLib` |
| `pdfjsWorkerUrl` | `string` | cdnjs pdf.worker | Worker URL set on `pdfjsLib.GlobalWorkerOptions.workerSrc` if the host hasn't already |
| `html2canvasUrl` | `string` | cdnjs html2canvas | Lazy-load source for `html2canvas` (HTML-source export) |
| `pdfLibUrl` | `string` | cdnjs pdf-lib | Lazy-load source for `pdf-lib` (export) |

### Lazy-loaded peer dependencies

`pdf.js`, `html2canvas`, and `pdf-lib` are **fetched on demand** the first time the feature that needs them runs (PDF source rendering, or export) — never at page load. An HTML-only flipbook with no export loads none of them. If the matching global is already on the page it is used as-is (backward compatible); otherwise it is injected from the configured URL (CDN defaults above). Set any `*Url` option to `''` to opt out and require the host to pre-load that global.

### `sound` options

```js
sound: {
  enabled: true,      // enable/disable sound (default: false)
  src:     null,      // path to custom audio file; null = synthesised burst
  volume:  0.6,       // 0.0 – 1.0
  mute:    false,     // start muted
}
// or
sound: false          // disable entirely, no mute button shown
```

## Presets

| Preset | Aspect ratio | Style | Texture |
|---|---|---|---|
| `notebook` | A4 × 2 (70.7%) | White, light shadow | Ruled horizontal lines (light blue) |
| `magazine` | Landscape (38%) | White, dramatic shadow | Diagonal gloss sheen (`soft-light`) |
| `paperback` | Tall (86%) | Cream `#fffef0` | Fine cross-grain (`multiply`) |
| `hardcover` | Portrait (78%) | Cream `#f8f4e8`, thick dark border | Canvas/linen weave (`multiply`) |
| `comic` | Tall (92%) | Off-white, bold `#222` border | Ben-Day halftone dots (`multiply`) |
| `minimal` | A4 × 2 | No box-shadow, no spine shadows | None |

```js
StrataFlipbook('#el', { preset: 'magazine' })
```

## Pagination modes

| Mode | Description |
|---|---|
| `'controls'` | ← / → buttons + spread counter (default) |
| `'dots'` | Row of dot indicators |
| `'input'` | Numeric page-jump input |
| `'thumbnails'` | Thumbnail strip below the book |
| `'none'` | No pagination UI |

Combine with an array:

```js
pagination: ['controls', 'dots']
pagination: ['controls', 'thumbnails']
```

## Methods

```js
const book = StrataFlipbook('#el', options)

book.next()                  // flip forward one spread
book.prev()                  // flip backward one spread
book.goTo(spreadIndex)       // jump to spread (0-indexed)
book.export()                // trigger PDF download
book.getCurrentSpread()      // returns current spread index (0-indexed)
book.getSpreadCount()        // returns total number of spreads
book.on(event, handler)      // subscribe to event (returns book for chaining)
book.off(event, handler)     // unsubscribe
book.destroy()               // remove flipbook, restore container, clean up
```

## Events

Use instance `.on()` (strips `st:flipbook:` prefix automatically):

```js
book
  .on('ready',       ()  => console.log('ready'))
  .on('flip',        e   => console.log(e.detail.spread, e.detail.direction))
  .on('exportStart', ()  => console.log('exporting…'))
  .on('exportDone',  ()  => console.log('done'))
  .on('destroy',     ()  => console.log('destroyed'))
```

Or listen on `document` with full names:

```js
document.addEventListener('st:flipbook:flip', e => { … })
```

### Event detail shapes

| Event | `e.detail` |
|---|---|
| `ready` | `{ spread: 0, total }` |
| `flip` | `{ spread, direction: 'forward'\|'backward' }` |
| `exportStart` | `{}` |
| `exportDone` | `{}` |
| `destroy` | `{}` |

## Drag-to-flip

Drag zones appear at the bottom corners of the page. On desktop: grab and drag horizontally. On single-page layout (≤ 500 px container width): swipe left/right anywhere on the book.

The grabbed corner sets `data-st-flip-grab` (`top` / `bottom` / `side`), which shears the leaf so the turn peels diagonally from that corner. The only inline values written during drag are two CSS custom properties on the container:
- `--st-flip-angle` — leaf rotation in deg (0 to ±180)
- `--st-flip-shade` — face-shading intensity (0–1, peaks edge-on at the mid-turn; also scales the shear)

On release, either a snap-complete animation fires (`data-st-flip-completing`) or the drag cancels.

## Data Attributes (state)

| Attribute | Values | Meaning |
|---|---|---|
| `data-st-flip-open` | `"true"` / `"false"` | Book visibility |
| `data-st-flip-loading` | `"true"` / `"false"` | Content loading / export in progress |
| `data-st-flip-turning` | `"true"` | Full flip keyframe active |
| `data-st-flip-completing` | `"true"` | Snap-complete keyframe active |
| `data-st-flip-dragging` | `"true"` | Drag in progress (CSS vars drive transform) |
| `data-st-flip-direction` | `"forward"` / `"backward"` | Current flip direction |
| `data-st-flip-layout` | `"spread"` / `"single"` | Layout mode (set by ResizeObserver at 500 px) |
| `data-st-flip-page` | number | Current spread (1-indexed) |
| `data-st-flip-total` | number | Total spread count |
| `data-st-flip-source` | `"html"` / `"pdf"` | Source type |
| `data-st-flip-mode` | `"closed"` | Set when `closed: true` (enables solo CSS) |
| `data-st-flip-solo` | `"right"` / `"left"` | Front/back cover shown alone (closed-book look) |
| `data-st-flip-grab` | `"top"` / `"bottom"` / `"side"` | Grabbed corner — shears the leaf's twist |

## CSS Tokens

```css
/* Global */
:root {
  --st-flip-duration:   400ms;
  --st-flip-max-width:  1200px;
  --st-flip-page-bg:    #fffdf7;
}

/* Per instance */
#my-book {
  --st-flip-page-bg:  #1a1a2e;
  --st-flip-duration: 800ms;
}
```

| Token | Default | Purpose |
|---|---|---|
| `--st-flip-max-width` | `960px` | Max book width |
| `--st-flip-duration` | `620ms` | Page flip animation duration |
| `--st-flip-perspective` | `2400px` | 3D perspective depth |
| `--st-flip-page-bg` | `var(--st-bg)` | Page background colour |
| `--st-flip-page-border` | `var(--st-border)` | Page border / spine divider |
| `--st-flip-page-shadow` | `var(--st-shadow-lg)` | Book drop shadow |
| `--st-flip-spine-shadow` | `rgba(0,0,0,0.18)` | Inner spine gradient depth |
| `--st-flip-blank-bg` | `var(--st-bg-secondary)` | Cover / back cover background |
| `--st-flip-ctrl-bg` | `var(--st-bg-secondary)` | Controls bar background |
| `--st-flip-ctrl-border` | `var(--st-border)` | Controls bar border |
| `--st-flip-ctrl-color` | `var(--st-text)` | Controls icon colour |
| `--st-flip-angle` | `0deg` | Leaf rotation (registered `@property`); set by JS during drag |
| `--st-flip-shade` | `0` | Face-shading intensity 0–1 (registered `@property`); set by JS during drag |
| `--st-flip-skew-k` | `0deg` | Shear coefficient per grabbed corner (set by `data-st-flip-grab`) |
| `--st-flip-book-border` | `none` | Preset book frame (`hardcover`/`comic`/`minimal`); moves onto the cover when closed |
| `--st-flip-page-texture` | `none` | Page texture `background-image` (set by preset) |
| `--st-flip-texture-size` | `auto` | `background-size` for the texture layer |
| `--st-flip-texture-pos` | `0 0` | `background-position` for the texture layer |
| `--st-flip-texture-blend` | `normal` | `mix-blend-mode` for the texture overlay |

## Keyboard Navigation

Arrow keys navigate when the book container is focused:
- `→` / `↓` — next spread
- `←` / `↑` — previous spread

## Spread Model

```
Spread 0 : [null,   page 0]   — front cover (right page only)
Spread 1 : [page 1, page 2]   — first inner spread
Spread 2 : [page 3, page 4]
…
Last     : [page N, null]     — back cover (left page only)
```

`goTo(0)` → cover. `goTo(book.getSpreadCount() - 1)` → back cover.

## Export Pipeline

When `exportable: true` and `book.export()` is called:

- **PDF source** — rendered canvases embedded by pdf-lib.
- **HTML source** — html2canvas captures each original source element at 2× scale; pdf-lib assembles the PDF.

## Animation Architecture

The turning page is a single rigid **leaf** (`.st-flipbook-flip-page`, `transform-style: preserve-3d`) hinged at the spine via `transform-origin`. It rotates through the `perspective` set on `.st-flipbook-book`. Its two children — `.st-flipbook-flip-front` (page leaving) and `.st-flipbook-flip-back` (page arriving, pre-rotated `rotateY(180deg)`) — both use `backface-visibility: hidden`, so the front shows for the first 90° and the back for the rest.

The leaf transform is:
```
rotateY(var(--st-flip-angle)) skewY(calc(var(--st-flip-shade) * var(--st-flip-skew-k)))
```

Two registered `@property` custom properties drive everything (registration enables smooth interpolation for both keyframes and drag):
- `--st-flip-angle` — `0deg` → `±180deg` (the rotation)
- `--st-flip-shade` — `0` → peak → `0` (face shading; also scales the `skewY` twist)

`--st-flip-skew-k` (set per `data-st-flip-grab`) gives the turn its corner-dependent shear.

Three mutually exclusive states select the source of the angle:
1. `[data-st-flip-turning="true"]` → full-duration keyframes (`st-flip-forward` / `st-flip-backward`, plus the parallel `st-flip-shade`)
2. `[data-st-flip-completing="true"]` → short snap keyframes (`st-flip-complete-fwd` / `st-flip-complete-bwd`) — start from the current drag angle seeded on the leaf
3. `[data-st-flip-dragging="true"]` → `--st-flip-angle` / `--st-flip-shade` set live on the container by the pointer handler

Face shading is a gradient overlay (`flip-front::after` / `flip-back::before`) whose opacity is `var(--st-flip-shade)`. It uses a **cylindrical** profile across the width — shadow at the spine, a bright sheen band where the curve faces the light, shadow again at the free edge — so the surface reads as curved. The faces also carry a **bowed `clip-path`** whose free edge curves inward by `calc(var(--st-flip-shade) * …%)`, giving the turning page a bending silhouette. A soft cast shadow on `book::before` sweeps the half-spread beneath the leaf, also scaled by `--st-flip-shade`.

**Corner curl (dog-ear):** a **bottom-corner** grab draws a folded corner on the leaf's `::after` (the faces' own `::before`/`::after` are taken by texture + shading, so the curl rides the leaf). It's a corner triangle via `clip-path` with a crease→tip gradient and a `drop-shadow`, sized by `calc(var(--st-flip-shade) * …)`. `backface-visibility: hidden` makes it show only during the first half (the peel) and vanish past 90°, so it never mirrors onto the arriving page. Top-corner and side/middle turns do not curl (lean only).

> A true geometric (mesh) bend of arbitrary page content isn't achievable in pure CSS — that needs a WebGL/canvas renderer (reserved for the v2 `renderer: '3d'`). The cylindrical shading + bowed silhouette is the CSS illusion that approximates it.

## 3D Renderer (v2 — reserved)

`renderer: '3d'` is accepted but ignored. A future release will render the book inside a Three.js scene with ambient lighting and physical page curl. The public API will remain identical.

## Known Limitations

- HTML pages are cloned — computed styles depending on document context may differ. Design page content to be self-contained.
- `pdfjsLib.GlobalWorkerOptions.workerSrc` must be set before loading a PDF.
- CORS restrictions apply when loading cross-origin PDFs.
- Dynamic class construction in page content (template literals) is not scanned by Strata's JIT scanner — safelist those classes in `strata.config.js`.
