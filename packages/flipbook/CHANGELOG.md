# @strata-packages/flipbook — Changelog

## 1.5.2

- **Fix — remove corner fold hint triangles** — the `::before`/`::after` gradient triangles on the drag zones (intended as visual "you can grab here" cues) cluttered the UI without adding value. Removed entirely. The drag zones themselves are unchanged — drag-to-flip still works from both sides.

## 1.5.1

- **Fix — single-page (mobile) closed-book layout** — two issues with the closed book in single-page layout (narrow containers, ≤ 500 px), both CSS-only, no API change:
  - **Front cover off-centre** — the closed-book "solo" centring shift (`translateX(±25%)`, meant for the two-page spread) was still applied, pushing the already-full-width single page off-centre and partly off-screen. The transform is now reset in single-page layout (`[data-st-flip-layout="single"][data-st-flip-solo] .st-flipbook-book { transform: none }`).
  - **Back cover blank** — the back cover lives in `page-left`, but single-page layout hides `page-left` *and* the back-cover solo state (`solo="left"`) hides `page-right`, so closing onto the back cover showed nothing. Single-page layout now shows `page-left` full-width when `solo="left"`, so the back cover renders correctly.

## 1.5.0

- **Real 3D page turn** — the flip engine was rebuilt from a flat `clip-path` wipe into a genuine 3D rotation. The turning page is now a rigid leaf hinged at the spine that lifts and rotates through the book's `perspective`, carrying two faces (the page leaving on the front, the page arriving on the back) with `backface-visibility` swapping them at the halfway point. This is what makes it read as paper turning rather than a diagonal reveal.
  - New driver variables (registered via `@property` for smooth interpolation and drag): `--st-flip-angle` (leaf rotation, `0deg` → `±180deg`) and `--st-flip-shade` (`0`–`1` face-shading intensity, peaking edge-on at the mid-turn). These replace `--st-flip-cx`.
  - **Bending-paper look** — to read as a curving sheet rather than a flat panel, the leaf gets (a) a **cylindrical shading** profile across its width (deep shadow at the spine → bright sheen band where the curve faces the light → shadow again at the free edge) and (b) a **bowed silhouette** via `clip-path`: the free edge curves inward as the leaf lifts. Both track `--st-flip-shade`, so the page is flat at rest and bows most when edge-on. (A true geometric mesh bend isn't possible for arbitrary HTML content in pure CSS — this is the shading-and-silhouette illusion that publuu-style viewers also rely on.)
  - **Grab-aware twist** — the grabbed point sets `data-st-flip-grab` (`top` / `bottom` / `side`) and shears the leaf via `skewY` so that corner leads and the opposite one lags, tracking `--st-flip-shade`. Dragging a top or bottom corner peels diagonally from that corner; a side grab or swipe turns straight; button turns peel from the bottom corner. A soft cast shadow sweeps the half-spread beneath the lifting leaf.
  - `perspective` now lives on `.st-flipbook-book` (the leaf's parent) and `transform-style: preserve-3d` on the leaf, so the static pages keep normal stacking.
  - **Simpler, correct covers** — because the rotation model is uniform, the front-cover and back-cover turns no longer need special-casing in `prepareFlipBackward`; the same forward/backward logic handles them. Backward turns now also swap the landed right page under cover in `onFlipDone`, matching the forward path.
  - Single-page (mobile) layout and drag-to-flip both drive the same `--st-flip-angle`, so the snap-complete on release continues seamlessly from the drag position.

- **Closed book reads as a book, and closes like it opens** — in closed mode the cover is shown centred (the blank facing page hidden) by shifting the book half a page, so the cover keeps its exact size and there is no layout shift. Stacked offset box-shadows on the fore-edge give the closed book real page thickness, so a brochure/magazine front (or back) cover presents as a closed book rather than a floating single page. The solo state is now chosen from the flip's **destination** at the *start* of the turn, so the book glides shut concurrently with the page turning onto the cover — a true mirror of the open — instead of snapping centred after the turn finishes. Both the front cover and the back cover (even page counts) behave symmetrically. Driven entirely by `data-st-flip-solo`; no effect when `closed: false`.

- **Corner curl (dog-ear) on the peel** — turning from the **bottom** corner now lifts and curls that corner, revealing a shaded triangle of the page underside. It rides the leaf's `::after` (the only free pseudo-element), is sized by `--st-flip-shade`, and uses `backface-visibility` so it appears only during the first half of the turn (the peel) and never mirrors onto the arriving page. A side/middle turn stays flat; a top-corner turn keeps the clean lean (the curl floated above the page edge there and a deep top bow exposed an edge sliver, so the curl is bottom-grab only). Pure CSS — no inline styles beyond the existing `--st-flip-*` vars.

- **Fix — closed-cover frame** — presets with a book border (`hardcover`, `comic`, `minimal`) drew the frame on the full-width book, so in the closed/solo view it outlined the empty facing half. The preset border is now a `--st-flip-book-border` variable that, when closed, drops from the book and wraps the visible cover instead — so a closed bordered book reads as a single framed cover. The frame returns around the full spread when open. Non-bordered presets are unaffected.

- **Fix — loading shimmer scoped to the cover** — during PDF export / loading the shimmer overlay (`.st-flipbook-book::after`) spanned the full two-page book, lighting up the hidden facing half in the closed view. It is now confined to the visible cover half when `data-st-flip-solo` is set; the open/full-spread case is unchanged.

- **Lazy-loaded peer deps** — `pdf.js`, `html2canvas`, and `pdf-lib` are no longer required up front. They are fetched on demand the first time the feature that needs them is used (PDF source / export), so an HTML-only flipbook ships none of that weight at page load. If the global is already present it is used as-is (fully backward compatible). New options configure the source (CDN defaults provided): `pdfjsUrl`, `pdfjsWorkerUrl`, `html2canvasUrl`, `pdfLibUrl` — set any to `''` to require the host to pre-load that global.

## 1.4.3

- **Fix: `closed` default restored to `true`** — The default is now `closed: true` again, matching real-book behaviour: the flipbook starts as a single closed cover page (scene narrows to 50 % via CSS transition), expands to the full spread when the cover is turned, and narrows back at the back cover. Pass `closed: false` explicitly to keep the always-open two-page-spread layout.

## 1.4.2

- **Fix: cover and back-cover animation** — Two bugs in `prepareFlipBackward`:
  1. **Returning to cover** (`isFrontCover`): previously `flipFront` was set to the cover page (destination-right), which placed it in the *left* half of the book — the wrong side. The source inner-left page now goes into `flipFront` and sweeps backward; `flipBack` is null (blank inside-cover). The cover page sits in `pageR` throughout, stationary on the right, exactly as it should.
  2. **Leaving the back cover** (`isBackCover`): the fix was gated behind `opts.closed`, so with the default `closed: false` the back cover page never entered `flipFront` — it just snapped away from `pageL`. The gate is removed; the back cover now always lifts and sweeps backward regardless of the `closed` option.

## 1.4.1

- **Fix: `closed` default changed to `false`** — The 50 % scene-narrowing solo view (`closed: true`) is a useful alignment option but causes a layout shift on every spread change. The default is now `closed: false`, which uses the full-width two-page spread as-is: the front cover sits on the right side (spread 0 = `[null, cover]`) and the back cover sits on the left (last spread = `[back, null]`), giving a natural closed-book appearance with zero layout change. Pass `closed: true` explicitly to opt into the compact single-cover view.

## 1.4.0

- **Closed-book state** (`closed: true`, now the default) — flipbook starts as a closed single-page cover view rather than an open two-page spread. The cover (or back cover) is shown solo in a scene that is half the spread width. When the user turns the page, the scene smoothly expands via a CSS `width` transition as the book "opens", and contracts when it "closes" back. Front cover and back cover each trigger a full-width fold animation so the entire cover lifts — not just the inner half. Opt out with `closed: false` to restore the original always-open behavior.
  - `data-st-flip-mode="closed"` attribute set on the container when `closed: true`.
  - `data-st-flip-solo="right"` — front cover solo state (right page only).
  - `data-st-flip-solo="left"` — back cover solo state (left page only).
  - Solo scene is `width: 50%` of the max-width scene; animated via CSS `transition: width`.
  - Solo page fills the full solo-book width; spine border and spine shadow hidden in solo.
  - Full-width clip-path overrides for `flipFront` in `solo+direction` combinations.

## 1.3.2

- **Fix: html2canvas `addColorStop` non-finite error on HTML export** — source page elements live inside a `display:none` container, giving them zero computed dimensions. html2canvas resolved percentage-based gradient stops against a zero width/height, producing `NaN`/`Infinity` which `CanvasGradient.addColorStop` rejects. Fix: each element is cloned into an off-screen fixed-position shell sized to the flipbook's actual page pixel dimensions (`pageL.offsetWidth × pageL.offsetHeight`) before capture. The shell is removed immediately after html2canvas resolves or rejects.

## 1.3.1

- **Fix: PDF export stuck at "export started"** — replaced synchronous `canvas.toDataURL()` + `Uint8Array.from(atob(...))` with async `canvas.toBlob()` + `arrayBuffer()`, eliminating the main-thread block that caused the UI to freeze. PDF-source exports now use JPEG (92% quality, ~5× smaller per page than PNG). Added `useObjectStreams: false` to `pdf.save()` to skip a second compression pass on image-heavy documents.

## 1.3.0

- **Page textures per preset** — each preset now renders a distinct CSS-based page texture via pseudo-element overlays (`::before`/`::after`) driven by four CSS custom properties (`--st-flip-page-texture`, `--st-flip-texture-size`, `--st-flip-texture-pos`, `--st-flip-texture-blend`). Textures appear on all four visible surfaces (left page, right page, flip front, flip back) and animate correctly through the fold. Texture types: `notebook` → ruled blue lines; `magazine` → diagonal gloss sheen (`soft-light`); `paperback` → fine cross-grain; `hardcover` → canvas/linen weave; `comic` → Ben-Day halftone dots; `minimal` → none. Override per-instance via the CSS variables.

## 1.2.0

- **Seamless content reveal** — destination pages are visible through the fold during the turn, not after it. `flipBack` now clip-grows from the spine as the fold crosses it; `pageL` is swapped under CSS cover at the end so there is no content pop or `innerHTML` flash
- **Diagonal crease shadow** — fold crease `::after` strip now matches the real fold angle (bottom corner leads, top lags 14%) via `clip-path` polygon; previously the shadow was a vertical bar misaligned with the fold line
- **Single-layout flip-back** — single-page mode reveals destination content on the correct side of the fold line (right for forward flip, left for backward) instead of a thin crease strip

## 1.1.0

- **Organic flip animation** — `translateZ` arc baked into keyframe stops for physical page-lift illusion; no cubic-bezier, no JS animation loops
- **Drag-to-flip** — pointer events drag engine with corner hotspots; progress drives two CSS custom properties (`--st-flip-drag-angle`, `--st-flip-drag-tz`); snap-complete animation on release
- **Web Audio sound engine** — synthesised page-rustle burst (no audio file needed); `sound.src` option for custom file; `sound.mute` toggle; mute button in controls
- **6 visual presets** — `notebook` (default), `magazine`, `paperback`, `hardcover`, `comic`, `minimal`
- **Pagination modes** — `controls` (default), `dots`, `thumbnails`, `input`, `none`, or any combination as array
- **Swiper-like zero-config init** — `StrataFlipbook('#el')` auto-captures existing children; no `source`/`content` required for HTML mode
- **Responsive via ResizeObserver** — container-width breakpoint at 500 px sets `data-st-flip-layout="single"`; no viewport media queries
- **Face shading** — `::after` pseudo-element animations simulate lighting across the flip arc
- **Loop option** — `loop: true` wraps past first/last spread
- **Full destroy/cleanup** — removes DOM, event listeners, ResizeObserver, Audio context

## 1.0.0

- Initial release
- CSS-driven page-flip animation via `data-st-*` attributes — no inline styles
- HTML source: render DOM elements as flipbook pages
- PDF source: render PDF pages via pdfjs-dist (peer dep, Apache-2.0)
- Export to PDF via html2canvas + pdf-lib (peer deps, MIT)
- Spread model: cover, inner spreads, back cover
- Keyboard navigation (arrow keys)
- Responsive single-page view on viewports ≤ 600 px
- Standalone + Strata CSS compatible
- `renderer: '3d'` option reserved for v2 (Three.js scene)
