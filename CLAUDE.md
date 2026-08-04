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
  safelist: [],   // optional — see below
}
```

The `content` globs must cover every file that uses class names. Classes not found by the scanner are not emitted.

Two things worth knowing about how globs are resolved:

- **Relative globs resolve against the project root** — the directory containing `strata.config.js` (i.e. the plugin's `cwd`), not whatever directory the build happens to run from. Builds invoked from a parent directory or another package in a monorepo behave the same as builds run from the root.
- **Any file the glob matches is scanned**, whatever its extension — `.php`, `.blade.php`, `.mdx`, `.md`, `.erb`, `.hbs`, `.twig`, `.mjs`, `.cjs`, `.svg` and so on. Only binary/media formats (images, fonts, audio, video, archives, `.map`, `.lock`) are skipped. The glob is the filter; Strata does not second-guess it.

### `safelist`

Class names to always emit, whether or not the scanner finds them. Use it for classes that cannot exist as a literal in your source — built at runtime from a variable, returned by an API, or present in markup Strata never scans:

```js
safelist: [
  'btn-primary',
  'shadow-lg rounded-pill',   // an entry may hold several space-separated classes
]
```

Safelisted names go through the same registry lookup as scanned ones, so arbitrary values (`w-[320px]`) and responsive variants (`px-md-4`) work here too. A name that matches nothing in the registry is ignored silently.

### Diagnosing a missing class

If a class isn't showing up in the output, check what the scanner actually saw:

```bash
node bin/strata.js --build --verbose
# [Strata]   scanned 35/35 matched file(s), 0 skipped, 788 class name(s) found
# [Strata]   globs: ./src/**/*.{html,jsx,tsx}  (relative to /path/to/project)
```

Two conditions are reported as warnings automatically, with no flag needed — on the CLI and as a PostCSS warning, so they surface through bundlers too:

| Warning | Usual cause |
|---|---|
| `no files matched the content globs …` | Globs don't match your layout, or point at the wrong directory. The message prints the directory they resolved against — compare it with where your source actually lives. |
| `N file(s) matched … but no class names were found` | Files are being read, but classes aren't in `class`/`className` attributes — e.g. assembled in a helper module the scanner never sees. Safelist those. |

If neither warning appears and a specific class is still missing, it's almost certainly built dynamically (`` `btn-${variant}` ``) — no scanner can see those. Safelist it.

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
`offcanvas` — direction via `data-st-side="left|right|top|bottom"`, open/close via `data-st-visible="true|false"`
`offcanvas-header`, `offcanvas-title`, `offcanvas-body`, `offcanvas-backdrop`
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

## Versioning & Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full versioning rules, branch pipeline, commit format, and publishing checklist.

**Short version:** `MAJOR.FEATURE.BUGFIX` — FEATURE and BUGFIX never reset mid-era, only on MAJOR. See CONTRIBUTING.md for details.

## Packages

### How component JS reaches your build

CSS for every component is emitted by the JIT registry and needs nothing extra. **Component JavaScript is separate**: each component is its own published package, and `strata.components.js` bundles whichever ones are installed in your project.

```bash
npm i @strata-packages/modal @strata-packages/offcanvas \
      @strata-packages/skeleton-loader @strata-packages/chart
```

The build resolves them from your `node_modules/@strata-packages/*`, concatenates them into `dist/strata.components.js`, and exposes them under the `Strata.*` namespace (`Strata.Modal`, `Strata.Offcanvas`, `Strata.skeleton`, `Strata.Chart`). Load that one file — not the individual package scripts.

Any component you haven't installed is reported at build time:

```
[Strata] ⚠  2 JS component(s) not bundled: skeleton-loader, chart
[Strata]    install them to include their JS: npm i @strata-packages/skeleton-loader @strata-packages/chart
```

Before v1.8.14 this resolution only looked inside the Strata monorepo, so installs from npm produced a `strata.components.js` containing no components at all, with no warning.

| Package | Description | Docs |
|---|---|---|
| `strata-css` | JIT CSS framework (this package) | This file |
| `@strata-packages/forms` | Custom select — all variants | `packages/forms/CLAUDE.md` |
| `@strata-packages/picker` | Date / time / datetime picker | `packages/picker/CLAUDE.md` |
| `@strata-packages/modal` | Accessible modal component | `packages/modal/CLAUDE.md` |
| `@strata-packages/skeleton-loader` | Shimmer skeleton loader | `packages/skeleton-loader/CLAUDE.md` |
| `@strata-packages/chart` | Three.js data visualisation | `packages/chart/CLAUDE.md` |
| `@strata-packages/offcanvas` | Slide-in drawer component | `packages/offcanvas/CLAUDE.md` |
| `@strata-packages/flipbook` | CSS-driven 3D page-flip flipbook | `packages/flipbook/CLAUDE.md` |
| `@strata-packages/shopmap` | JIT-themed MapLibre GL shop map | `packages/shopmap/CLAUDE.md` |

## New in v1.1.0

### Transition variables
All hardcoded `transition-duration` and `transition-timing-function` values replaced with CSS variables. New variables added to `:root`:

```css
--st-duration-theme:  150ms;
--st-easing-theme:    cubic-bezier(0.22, 1, 0.36, 1);
```

### Sizing utilities
`max-w-{xs/sm/md/lg/xl/xxl/full/none}`, `min-w-{0/full/screen}`, `max-h-{full/screen/none}`, `min-h-{0/full/screen}`

Arbitrary: `max-w-[440px]`, `min-h-[300px]`, `max-h-[500px]`, `min-w-[200px]`

### Responsive variants for 15 utility groups
Every utility group now has full breakpoint variants (`sm md lg xl xxl`):

```
flex-{bp}-{row/column/wrap/nowrap}
fw-{bp}-{light/normal/bold/...}
fst-{bp}-{italic/normal}
text-{bp}-{uppercase/lowercase/capitalize}
text-{bp}-decoration-{none/underline}
rounded-{bp}-{0-5/pill/circle}
shadow-{bp}-{sm/lg/none}
w-{bp}-{25/50/75/100/auto}
h-{bp}-{25/50/75/100/auto}
opacity-{bp}-{0/25/50/75/100}
overflow-{bp}-{auto/hidden/visible/scroll}
position-{bp}-{static/relative/absolute/fixed/sticky}
cursor-{bp}-{pointer/default/not-allowed/...}
lh-{bp}-{1/sm/base/lg}
visible-{bp}, invisible-{bp}
```

### Component CSS variable tokens
All hardcoded color values in component rules replaced with local CSS variables. Override per-theme, per-context, or per-instance without `!important`:

```css
/* Per theme */
[data-st-theme="dark"] .btn-warning { --st-btn-color: #000; }

/* Per instance */
<button class="btn-primary" style="--st-btn-bg: gold; --st-btn-color: navy;">
```

See [Component CSS Variable Tokens](#component-css-variable-tokens) table.

### List utilities
`list-unstyled`, `list-inline`, `list-inline-item`, `list-disc`, `list-decimal`, `list-circle`, `list-square`, `list-none`, `list-lower-alpha`, `list-upper-alpha`, `list-lower-roman`, `list-upper-roman`, `list-inside`, `list-outside`, `list-spaced`

### Outline utilities
`outline-none`, `outline-{primary/secondary/success/danger/warning/info/light/dark}`, `outline-{1-5}`

### Label component (Bootstrap 3 aliases)
`.label` and `.label-{default/primary/secondary/success/info/warning/danger}` — aliases to `.badge` / `.badge-{color}` for Bootstrap 3 compatibility.

### Arbitrary value fixes
- `text-[15px]` → `font-size: 15px` (length unit detected)
- `text-[#f00]` → `color: #f00` (color value detected)
- `#`, `(`, `)`, `,` properly escaped in CSS class selectors

## New in v1.3.0

### Bug fixes
- **`rounded-pill` moved to `'utilities'` layer** — was silently overridden by any `btn-*` class that also set `border-radius`. Now always wins.
- **Spacing arbitrary underscore replacement** — `p-[10px_20px]` now correctly emits `padding: 10px 20px`.
- **`bg-[...]` uses `background` shorthand** — enables gradient values: `bg-[linear-gradient(...)]`.
- **`ps-[...]` / `ms-[...]` arbitrary now work** — regex character class was missing `s`.

### New arbitrary values
- **`fs-[...]`** — always `font-size`. Resolves `text-[var(--token)]` ambiguity.
- **`gap-[...]`**, **`row-gap-[...]`**, **`col-gap-[...]`** — token-based gap: `gap-[var(--space)]`, `gap-[1rem_2rem]`
- **`fw-[...]`** — token-based font-weight: `fw-[var(--heading-weight)]`, `fw-[350]`

## New in v1.4.0

### Positional offset utilities
Named scale: `top-0/50/100`, `bottom-0/50/100`, `start-0/50/100`, `end-0/50/100`, `inset-0`

Arbitrary: `top-[...]`, `bottom-[...]`, `left-[...]`, `right-[...]`, `inset-[0_1rem]`

### object-position arbitrary
`object-position-[center_top]`, `object-position-[var(--pos)]`, `object-position-[80%_20%]`

### Grid template arbitrary
`gtc-[260px_1fr]`, `gtc-[repeat(3,1fr)]`, `gtc-[var(--cols)]` → `grid-template-columns`
`gtr-[auto_1fr_auto]` → `grid-template-rows`

## New in v1.4.1

### Bug fixes
- **`fixed-top`, `fixed-bottom`, `sticky-top`, `sticky-bottom`, `sticky-{bp}-*` moved to `'components'` layer** — their bundled `z-index` can now be overridden by any `z-[n]` or `z-*` utility class.

## New in v1.4.2

### Bug fixes
- **`%` now escaped in CSS selectors** — arbitrary classes like `top-[50%]`, `w-[33%]` previously produced invalid selectors the browser silently ignored. Fixed by adding `%` to `escapeClass()`.

## New in v1.4.10

### Supply chain
- **`strata init` executes no shell commands** — installs are printed for the user to run. Zero `child_process` usage anywhere in the CLI.

## New in v1.4.9

### Dependency slimming
- **`autoprefixer` + `cssnano` moved to optional peer dependencies** — installed only if the consumer wants them. `--minify` requires cssnano (clear error if missing); `strata init` wires autoprefixer into the generated PostCSS config only when present in the host project.

## New in v1.4.8

### Security
- **Chart tooltip XSS fixed** — label/value now rendered via `textContent` instead of `innerHTML` (chart 1.1.2).

### Performance
- **Bracket pre-filter in `lookup()`** — bracket-less class names skip the 40-pattern arbitrary regex loop entirely.

## New in v1.4.7

### Bug fixes
- **`escapeClass` comprehensive escaping** — replaced 11 chained `.replace()` calls with `/[^\w-]/g` covering all non-identifier characters. Resolves CodeQL incomplete-sanitization finding.

## New in v1.4.6

### Bug fixes
- **`resultCache` cleared on `invalidate()`** — any class cached as `null` during a dev build is now flushed when a file changes, preventing stale null entries from silently suppressing CSS on subsequent builds.

## New in v1.4.5

### New arbitrary values
- **`gap-{bp}-[...]`**, **`row-gap-{bp}-[...]`**, **`col-gap-{bp}-[...]`** — responsive arbitrary gap: `gap-sm-[var(--space)]`, `gap-md-[1rem_2rem]`, `row-gap-lg-[var(--space)]`, `col-gap-xl-[2rem]`

## New in v1.4.4

### Bug fixes
- **Modal scroll lock via CSS `:has()`** — `body.modal-open` replaced with `body:has(.modal[aria-hidden="false"]) { overflow: hidden; scrollbar-gutter: stable; }`. No JS body class manipulation needed.
- **Modal static shake uses `[data-st-shake="true"]`** — `.modal.modal-static` replaced with `.modal[data-st-shake="true"]`. Consistent with the attribute-value state pattern used across all components.

## Known Limitations

- The scanner reads **string literals** out of class attributes. It understands plain attributes (`class="..."`, `className="..."`), braced literals, and — since v1.6.13 — any expression inside `className={...}`: `clsx()`, `cn()`, `classnames()`, ternaries, arrays, template-literal static chunks, and strings nested inside `${...}` interpolations. Helper names are not hardcoded; every quoted string in the expression is treated as a class candidate.
- What still cannot be detected is a class name that **never exists as a literal anywhere** — i.e. genuinely dynamic construction: `` className={`btn-${variant}`} `` or `const cls = 'p-' + n`. No scanner can recover these. Use `safelist` in `strata.config.js`:
  ```js
  module.exports = {
    content: ['./src/**/*.{html,jsx,tsx}'],
    safelist: ['btn-primary btn-secondary', 'p-1', 'p-2'],  // entries may hold multiple space-separated classes
  }
  ```
  A related trap: a class assembled into a variable far from the markup (`const cls = clsx('w-[200px]')` in one file, `className={cls}` in another) *is* detected, because `clsx('w-[200px]')` still contains the literal — but only if that call sits inside a `class`/`className` assignment or attribute. A helper in an unrelated module is not scanned; safelist those.
- CSS variables cannot be used in `@media` query values — breakpoints use hardcoded `px` values.
- `text-[value]`: length units → `font-size`, everything else → `color`. Use `fs-[...]` for token-based font-size.
- Arbitrary-value classes (`w-[...]`, `border-[...]`, `p-[...]`, etc.) interpolate the bracket contents directly into the generated CSS with no value-level escaping — only the class selector is escaped. Safe under Strata's JIT model (class names are scanned from your own source files at build time), but never run the scanner over unsanitized user-submitted HTML/content.
