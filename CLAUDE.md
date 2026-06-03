# Strata CSS — Developer Reference

## What it is

A JIT CSS framework. You write class names in HTML; Strata scans those files, looks up each class in the registry, and emits only the CSS that is actually used. No purging step needed.

## Architecture

```
strata.css               Entry point — three @strata directives
src/
  index.js               PostCSS plugin + build API (invalidate / build)
  layers/base.js         :root tokens, reset, theme system, skeleton layer
  registry/registry.js   O(1) Map of all known classes + regex arbitrary fallback
  generator/generator.js Routes CSS rules into correct @layer sub-layers
  scanner/scanner.js     Glob + regex scanner — extracts class names from source files
```

**Build pipeline:**
1. `strata.build()` calls `scanFiles(globs)` — finds all class names in content files
2. Passes them to `generate(classNames)` — looks up each in the registry Map
3. Routes each rule to its breakpoint sub-layer (`st-utilities-md`, `st-components-lg`, etc.)
4. String-replaces `@strata base/components/utilities` in the input CSS
5. Writes output CSS to disk

**Warm build:** if nothing changed, returns cached CSS string — zero allocation.

## Configuration

`strata.config.js` (or `.cjs`) in the project root:

```js
module.exports = {
  content: ['./src/**/*.{html,jsx,tsx,vue,astro,svelte,js,ts}'],
  input:   './strata.css',
  output:  './dist/strata.output.css',
}
```

The `content` globs must cover every file that uses class names. Classes not found by the scanner are not emitted.

## CSS Layers

Layer declaration order controls cascade priority — source order in HTML never matters:

```
st-base
st-components  →  st-components-xs  <  sm  <  md  <  lg  <  xl  <  xxl
st-utilities   →  st-utilities-xs   <  sm  <  md  <  lg  <  xl  <  xxl
st-skeleton
```

Higher breakpoint layers always beat lower ones regardless of HTML class order.

## Theme System

Themes are set via `data-st-theme` on any ancestor element (usually `<html>`):

```html
<html data-st-theme="dark">   <!-- dark theme -->
<html data-st-theme="dim">    <!-- dim theme -->
<html data-st-theme="light">  <!-- explicit light -->
```

Without `data-st-theme`, `prefers-color-scheme` is respected automatically.

**Switching themes in JS:**
```js
document.documentElement.setAttribute('data-st-theme', 'dark')
```

**Preventing flash on load:**
```html
<script>
  const t = localStorage.getItem('theme')
  if (t) document.documentElement.setAttribute('data-st-theme', t)
</script>
```

## CSS Custom Properties (tokens)

All tokens are in `src/layers/base.js` under `@layer st-base`. Key groups:

| Prefix | Examples | Purpose |
|---|---|---|
| `--st-primary` / `--st-*-hover` | `--st-primary`, `--st-danger-hover` | Brand colors |
| `--st-bg` / `--st-bg-secondary` | | Background surfaces |
| `--st-text` / `--st-text-muted` | | Text colors |
| `--st-border` / `--st-border-radius` | | Borders |
| `--st-shadow-sm/md/lg` | | Box shadows |
| `--st-duration` / `--st-easing` | `--st-duration: 200ms` | Transitions |
| `--st-duration-fast/slow/theme` | | Transition speed variants |
| `--st-easing-in/out/theme` | | Easing variants |
| `--st-z-*` | `--st-z-modal: 1050` | Z-index scale |
| `--st-focus-ring` | | Focus ring box-shadow |
| `--st-skeleton-*` | | Skeleton loader appearance |

## Utility Classes

### Spacing
`m-{0-5}`, `p-{0-5}`, `mt/mb/ms/me/mx/my-{0-5}`, `pt/pb/ps/pe/px/py-{0-5}`
Responsive: `mt-md-3`, `px-lg-4`, etc.

### Display
`d-none`, `d-inline`, `d-inline-block`, `d-block`, `d-grid`, `d-flex`, `d-inline-flex`, `d-table`, `d-table-row`, `d-table-cell`
Responsive: `d-md-none`, `d-lg-flex`, etc.

### Flexbox
`flex-row`, `flex-column`, `flex-wrap`, `flex-nowrap`, `flex-fill`, `flex-grow-0/1`, `flex-shrink-0/1`
`justify-content-{start/end/center/between/around/evenly}`
`align-items-{start/end/center/baseline/stretch}`
`align-self-{auto/start/end/center/baseline/stretch}`
Responsive: `flex-md-row`, `justify-content-lg-center`, etc.

### Grid
`container`, `container-fluid`, `container-{sm/md/lg/xl/xxl}`
`row`, `col`, `col-{1-12}`, `col-{bp}-{1-12}`, `col-auto`, `offset-{0-11}`
`g/gx/gy-{0-5}` gutters — responsive: `g-md-3`, `gx-lg-4`

### Sizing
`w-{25/50/75/100/auto}`, `h-{25/50/75/100/auto}`
`max-w-{xs/sm/md/lg/xl/xxl/full/none}`, `min-w-{0/full/screen}`
`max-h-{full/screen/none}`, `min-h-{0/full/screen}`
`mw-100`, `mh-100`, `vw-100`, `vh-100`, `min-vh-100`
Responsive: `w-md-50`, `h-lg-auto`

### Typography
`text-{start/center/end/justify}` — responsive: `text-md-center`
`text-{uppercase/lowercase/capitalize/none}` — responsive: `text-md-uppercase`
`fw-{light/lighter/normal/medium/semibold/bold/bolder}` — responsive: `fw-md-bold`
`fst-{italic/normal}` — responsive: `fst-md-italic`
`lh-{1/sm/base/lg}` — responsive: `lh-md-base`
`text-truncate`, `text-wrap`, `text-nowrap`, `text-break`
`text-decoration-{none/underline/line-through}`
`font-monospace`

### Colors
`text-{primary/secondary/success/danger/warning/info/light/dark/white/muted/body}`
`bg-{primary/secondary/success/danger/warning/info/light/dark/white/transparent/body}`

### Borders
`border`, `border-0`, `border-{top/bottom/start/end}`
`border-{1-5}` (width), `border-{color}`
`rounded`, `rounded-{0-5}`, `rounded-pill`, `rounded-circle`
`rounded-{top/bottom/start/end}`

### Shadows
`shadow-sm`, `shadow`, `shadow-lg`, `shadow-none`
Responsive: `shadow-md-sm`, `shadow-lg-lg`

### Position
`position-{static/relative/absolute/fixed/sticky}`
`top/bottom/start/end-{0/50/100}`
`fixed-top`, `fixed-bottom`, `sticky-top`, `sticky-bottom`
`translate-middle`, `translate-middle-x`, `translate-middle-y`
Responsive: `position-md-sticky`

### Overflow
`overflow-{auto/hidden/visible/scroll}`
`overflow-x-{auto/hidden/visible/scroll}`
`overflow-y-{auto/hidden/visible/scroll}`
Responsive: `overflow-md-hidden`, `overflow-x-lg-auto`

### Opacity / Visibility
`opacity-{0/25/50/75/100}` — responsive: `opacity-md-50`
`visible`, `invisible`, `visually-hidden`
`visible-{bp}`, `invisible-{bp}` — show/hide at breakpoint

### Misc
`cursor-{auto/default/pointer/wait/text/move/not-allowed/grab}`
`shadow`, `z-{0/1/2/3/auto/n1}`, `gap-{0-5}`, `row-gap-{0-5}`, `col-gap-{0-5}`
`pe-none`, `pe-auto`, `user-select-{all/auto/none}`
`float-{start/end/none}`, `clearfix`, `hstack`, `vstack`

### Arbitrary Values
Any utility that isn't in the registry can be expressed with square brackets:

```html
<div class="w-[320px]">         <!-- width: 320px -->
<div class="max-w-[440px]">     <!-- max-width: 440px -->
<div class="min-h-[600px]">     <!-- min-height: 600px -->
<p  class="text-[1.125rem]">    <!-- font-size: 1.125rem -->
<p  class="text-[#e63946]">     <!-- color: #e63946 -->
<p  class="text-[rgb(0,128,0)]"><!-- color: rgb(0,128,0) -->
<div class="bg-[#f0f4f8]">      <!-- background-color: #f0f4f8 -->
<div class="shadow-[0_4px_20px_rgba(0,0,0,0.1)]"> <!-- custom shadow -->
<div class="mt-[72px]">         <!-- margin-top: 72px -->
```

`text-[value]` routing:
- Length unit (`px rem em % vw vh ch ex pt cm mm`) → `font-size`
- Everything else → `color`

## Component Classes

### Buttons
`btn-{primary/secondary/success/danger/warning/info/light/dark}`
`btn-outline-{color}`, `btn-sm`, `btn-lg`, `btn-link`, `btn-close`
`btn-group`, `btn-group-sm`, `btn-group-lg`, `btn-toolbar`

**Customising button colors (local CSS variables):**
```css
/* per-theme */
[data-st-theme="dark"] .btn-warning { --st-btn-color: #000; }

/* per-context */
.hero .btn-primary { --st-btn-color: #111; --st-btn-bg: #fff; }

/* per-instance */
<button class="btn-primary" style="--st-btn-color: navy; --st-btn-bg: gold;">
```

Available button tokens: `--st-btn-color`, `--st-btn-bg`, `--st-btn-border`, `--st-btn-hover-bg`, `--st-btn-hover-border`
Outline tokens: `--st-btn-outline-color`, `--st-btn-outline-hover-color`, `--st-btn-outline-hover-bg`

### Cards
`card`, `card-body`, `card-header`, `card-footer`, `card-title`, `card-subtitle`, `card-text`, `card-link`
`card-img-top`, `card-img-bottom`, `card-img`, `card-img-overlay`, `card-group`

### Forms
`form-control`, `form-control-sm`, `form-control-lg`, `form-control-plaintext`, `form-control-color`
`form-label`, `form-group`, `form-text`, `form-floating`
`form-check`, `form-check-input`, `form-check-label`, `form-check-inline`
`form-switch`, `form-range`
`form-select`, `form-select-sm`, `form-select-lg`
`input-group`, `input-group-text`, `input-group-sm`, `input-group-lg`
`is-valid`, `is-invalid`, `was-validated`
`valid-feedback`, `invalid-feedback`

### Navigation
`nav`, `nav-item`, `nav-link`, `nav-tabs`, `nav-pills`, `nav-fill`, `nav-justified`, `nav-underline`
`navbar`, `navbar-brand`, `navbar-nav`, `navbar-toggler`, `navbar-collapse`, `navbar-text`
`navbar-expand-{bp}`, `navbar-dark`, `navbar-light`

### Modals
`modal`, `modal-backdrop`, `modal-dialog`, `modal-content`
`modal-header`, `modal-title`, `modal-body`, `modal-footer`
`modal-sm`, `modal-lg`, `modal-xl`, `modal-fullscreen`
`modal-dialog-centered`, `modal-dialog-scrollable`

Show/hide via `data-st-visible="true/false"` attribute.

### Other Components
`alert`, `alert-{color}`, `alert-dismissible`, `alert-heading`, `alert-link`
`badge`, `badge-{color}`, `badge-pill`
`table`, `table-striped`, `table-hover`, `table-bordered`, `table-sm`, `table-responsive`, `table-dark`
`list-group`, `list-group-item`, `list-group-flush`, `list-group-horizontal`
`pagination`, `page-item`, `page-link`
`progress`, `progress-bar`
`spinner-border`, `spinner-grow`
`accordion`, `accordion-item`, `accordion-button`, `accordion-body`, `accordion-flush`
`dropdown`, `dropdown-menu`, `dropdown-item`, `dropdown-toggle`, `dropdown-divider`
`toast`, `toast-header`, `toast-body`, `toast-container`
`offcanvas`, `offcanvas-{start/end/top/bottom}`
`breadcrumb`, `breadcrumb-item`
`placeholder`, `placeholder-glow`, `placeholder-wave`
`tooltip`, `tooltip-inner`
`popover`, `popover-header`, `popover-body`

## Component CSS Variable Tokens

Every component that previously hardcoded colors now uses local CSS variables:

| Component | Token(s) |
|---|---|
| `.badge` | `--st-badge-color` |
| `.btn-{color}` | `--st-btn-color`, `--st-btn-bg`, `--st-btn-border`, `--st-btn-hover-bg`, `--st-btn-hover-border` |
| `.btn-outline-{color}` | `--st-btn-outline-color`, `--st-btn-outline-hover-color`, `--st-btn-outline-hover-bg` |
| `.nav-pills .active` | `--st-nav-pills-active-color` |
| `.list-group-item.active` | `--st-list-group-active-color` |
| `.page-item.active` | `--st-pagination-active-color` |
| `.dropdown-item.active` | `--st-dropdown-active-color` |
| `.progress-bar` | `--st-progress-bar-color` |
| `.tooltip-inner` | `--st-tooltip-color`, `--st-tooltip-bg` |
| `.navbar-dark` | `--st-navbar-dark-color`, `--st-navbar-dark-color-hover`, `--st-navbar-dark-toggler-border` |
| `.card-img-overlay` | `--st-card-overlay-color` |
| `.carousel-control-*` | `--st-carousel-control-color` |
| `.carousel-indicators` | `--st-carousel-indicator-bg` |
| `.carousel-caption` | `--st-carousel-caption-color` |
| `.table-dark` | `--st-table-dark-bg/color/border/head-bg/head-color` |

## Data Attribute State System

Interactive states are driven by `data-st-*` attributes — no JS framework needed:

| Attribute | Values | Effect |
|---|---|---|
| `data-st-visible` | `"true"` / `"false"` | Fade in/out (opacity + visibility + transform) |
| `data-st-collapsed` | `"true"` / `"false"` | Expand/collapse (max-height + opacity) |
| `data-st-active` | any | Adds transition to color/bg/border/shadow/transform |
| `data-st-loading` | `"true"` | opacity 0.7, pointer-events none, cursor wait |
| `data-st-disabled` | `"true"` | opacity 0.5, pointer-events none, cursor not-allowed |
| `data-st-skeleton` | `"true"` / `"false"` / `"null"` | Shimmer overlay (managed by skeleton plugin) |

## Adding Classes to the Registry

Open `src/registry/registry.js`. Use the `reg(className, layer, css)` helper:

```js
// Static class
reg('my-utility', 'utilities', `.my-utility { color: red; }`)

// Component class
reg('my-component', 'components', `.my-component { display: flex; }`)

// With breakpoint variant
reg('my-utility-md', 'utilities',
  mq('md', `.my-utility-md { color: blue; }`))
```

Layers: `'utilities'` or `'components'`. Components sit in `st-components-*` layers; utilities in `st-utilities-*` layers. Utilities always win over components at the same breakpoint.

## Known Limitations

- Scanner uses a regex on `class="..."` attributes. Dynamic class construction (`class={\`prefix-${value}\`}`) is not detected — use safelisting in `strata.config.js`.
- CSS variables cannot be used in `@media` query values — breakpoints use hardcoded `px` values.
- `text-[value]`: length units → `font-size`, everything else → `color`.
- No built-in datepicker or timepicker — see `@strata-css/forms` (planned).
