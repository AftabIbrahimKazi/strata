<div align="center">

# Strata CSS

**A modern CSS framework combining Bootstrap's component architecture with Tailwind's JIT processing.**

[![npm version](https://img.shields.io/npm/v/strata-css.svg?color=green)](https://www.npmjs.com/package/strata-css)
[![npm downloads](https://img.shields.io/npm/dt/strata-css.svg?color=blue)](https://www.npmjs.com/package/strata-css)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)]()
[![css-framework](https://img.shields.io/badge/css--framework-%E2%9C%93-blue.svg)]()
[![PostCSS plugin](https://img.shields.io/badge/postcss-plugin-orange.svg)]()
[![JIT](https://img.shields.io/badge/JIT-enabled-green.svg)]()
[![Themes](https://img.shields.io/badge/themes-light%20%7C%20dark%20%7C%20dim-purple.svg)]()

`css-framework` · `tailwindcss` · `bootstrap` · `postcss` · `postcss-plugin` · `jit` · `component-library` · `theming` · `utility-first` · `css-variants` · `cascade-layers` · `arbitrary-values` · `design-system`

[Getting Started](#getting-started) · [Components](#components) · [Utilities](#utilities) · [Variants](#variants--hover-focus-form-state-pseudo-elements) · [Theming](#theming) · [Configuration](#configuration) · [Packages](#standalone-packages)

</div>

---

## What is Strata CSS?

Strata CSS is an open source CSS framework that takes the best from Bootstrap and Tailwind while fixing their biggest pain points.

**From Bootstrap** — component-first classes (`btn-primary`, `card`, `navbar`) that work out of the box with zero configuration.

**From Tailwind** — JIT post-processing that generates only the CSS you actually use, keeping output lean.

**Strata's own contributions:**
- No `!important` anywhere in framework CSS — `@layer` handles all specificity
- Custom CSS is fully compatible and always wins automatically
- Three built-in themes: light, dark, and dim — plus unlimited custom themes
- Buttery smooth transitions built in by default on all interactive elements
- State management via `data-st-*` attributes — no class toggling in JavaScript
- Arbitrary value utilities — `mt-[24px]`, `bg-[#ff0000]`, `w-[347px]`
- Variants for every state — `hover:bg-primary`, `user-invalid:border-danger`, `group-hover:`, `peer-checked:`, `before:`, `marker:`, `print:`
- Native `aspect-ratio` utilities — `aspect-video`, `aspect-md-square`, `aspect-[16/10]`

---

## Benchmarks

Build time for a full cold build — cache invalidated on every run, which is the most conservative measurement available. Warm rebuilds, the common case in development, return cached output and are effectively free.

| Scenario | Unique classes | Mean | Median | p95 | Peak heap |
|---|---|---|---|---|---|
| Small — single component | 20 | **0.39 ms** | 0.37 ms | 0.52 ms | 6.7 MB |
| Medium — marketing page | 105 | **0.64 ms** | 0.62 ms | 0.84 ms | 6.9 MB |
| Large — application shell | 487 | **1.24 ms** | 1.22 ms | 1.46 ms | 7.5 MB |

100 runs per scenario, outliers removed by IQR fence, 95% confidence intervals reported by the script. Measured on Node v24.12.0, AMD Ryzen 7 7730U, Windows 11.

Scaling is close to linear in the number of classes rather than the size of the framework: 24× more classes costs 3.2× more time, because the JIT only ever visits classes your source actually contains.

Run it yourself with `npm run benchmark` — see [`benchmark/`](./benchmark/) for the script and [`benchmark/results/`](./benchmark/results/) for stored runs.

---

## Live Demo

View the full documentation and interactive component showcase: [strata-css-docs-site.vercel.app](https://strata-css-docs-site.vercel.app)

---

## Getting Started

### Installation

```bash
npm install strata-css
```

> **Publishing:** Run `npm publish --dry-run` to verify the package contents, then `npm publish` to release.

### Scaffold a new project

```bash
npx strata-css init
```

> **Note:** Use `strata-css` (with the hyphen), not `strata` — there is an unrelated npm package called `strata` that will be picked up instead.

This creates:
```
strata.config.js    ← configuration
strata.css          ← entry point with @strata directives
postcss.config.js   ← PostCSS setup
dist/               ← generated CSS output
```

### Link the output CSS in your HTML

```html
<link rel="stylesheet" href="dist/strata.output.css">
```

### Set a theme on your HTML element

```html
<html data-st-theme="light">
```

### Run in development

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

---

## How It Works

Strata is a PostCSS plugin. It scans your source files for class names and generates only the CSS those classes need — nothing more.

```
Source files (HTML/JSX/Vue/Astro)
        ↓
    Scanner (extracts class names)
        ↓
    Registry (O(1) Map lookup)
        ↓
    Generator (builds CSS)
        ↓
    @layer st-base, st-components, st-utilities
        ↓
    Output CSS
```

Your custom CSS lives outside any layer and automatically wins over Strata styles — no `!important` needed.

---

## Components

Components are full Bootstrap-style classes with states baked in. They live in `@layer st-components` so your custom CSS always overrides them.

### Buttons

```html
<button class="btn-primary">Primary</button>
<button class="btn-secondary">Secondary</button>
<button class="btn-success">Success</button>
<button class="btn-danger">Danger</button>
<button class="btn-warning">Warning</button>
<button class="btn-info">Info</button>
<button class="btn-light">Light</button>
<button class="btn-dark">Dark</button>
```

### Layout

```html
<div class="container">
  <div class="row">
    <div class="col-md-6 col-lg-4">Column</div>
    <div class="col-md-6 col-lg-8">Column</div>
  </div>
</div>
```

### Cards

```html
<div class="card">
  <div class="card-header">Header</div>
  <div class="card-body">Body</div>
  <div class="card-footer">Footer</div>
</div>
```

---

## Utilities

Utilities follow Bootstrap's naming convention and support arbitrary values via Tailwind-style syntax.

### Spacing

```html
<!-- Scale values (0-5) -->
<div class="mt-3 mb-2 px-4 py-1">
<div class="mx-auto my-3">

<!-- Arbitrary values -->
<div class="mt-[24px] px-[1.5rem]">

<!-- Important variants -->
<div class="!mt-0 !mb-0">
```

### Display

```html
<div class="d-flex">
<div class="d-none">
<div class="d-block">
<div class="d-grid">

<!-- Responsive -->
<div class="d-none d-md-flex">
```

### Colours

```html
<!-- Text -->
<p class="text-primary">
<p class="text-[#ff0000]">

<!-- Background -->
<div class="bg-success">
<div class="bg-[rgba(0,0,0,0.5)]">
```

---

## Variants — hover, focus, form state, pseudo-elements

Prefix any utility with a variant to make it conditional. **One variant per class token.**

```html
<div class="card hover:bg-primary hover:text-white focus-visible:outline-primary">
<input class="form-control user-invalid:border-danger">
<li class="odd:bg-light first:fw-bold marker:text-muted">
```

`hover:[bg-primary text-white]` does **not** work and never can — the HTML parser splits `class` on whitespace into a token list before CSS is ever consulted, so it would become `hover:[bg-primary` plus `text-white]` and leave a bare token applying permanently.

**Breakpoints stay infix**, so a variant is a pure prefix and routing is unchanged:

```html
<div class="hover:w-md-[40%] hover:d-lg-flex motion-safe:hover:shadow-lg">
```

**Variants stack, in any order:** `motion-safe:hover:shadow-lg`, `hover:focus:bg-primary`.

| Group | Variants |
|---|---|
| Interaction | `hover` `focus` `focus-visible` `focus-within` `active` `visited` `target` |
| Form state | `checked` `indeterminate` `disabled` `enabled` `required` `optional` `valid` `invalid` `user-valid` `user-invalid` `in-range` `out-of-range` `read-only` `read-write` `placeholder-shown` `autofill` `default` |
| Structural | `first` `last` `only` `odd` `even` `first-of-type` `last-of-type` `only-of-type` `empty` |
| Pseudo-elements | `placeholder` `marker` `selection` `file` `first-line` `first-letter` `backdrop` `before` `after` |
| Environment | `motion-safe` `motion-reduce` `contrast-more` `contrast-less` `forced-colors` `print` `portrait` `landscape` |
| Direction | `rtl` `ltr` |
| Relational | `group-*` and `peer-*` — e.g. `group-hover`, `peer-checked`, `peer-invalid` |

### Relational variants

```html
<div class="group">
  <span class="group-hover:text-primary">Reacts when the group is hovered</span>
</div>

<input type="checkbox" class="peer">
<span class="peer-checked:text-success">Reacts when the peer is checked</span>
```

`peer-*` uses the general sibling combinator, so the styled element must **share a parent with** its peer and appear after it.

### Behaviours worth knowing

- **`hover:` is emitted inside `@media (hover: hover)`**, so it never sticks on a touch device.
- **Both `invalid:` and `user-invalid:` ship.** `:invalid` fires on page load for empty required fields, so a form styled with it looks angry before anyone types. Prefer `user-invalid:` for validation feedback.
- **`before:` and `after:` emit `content: ""`** — they render nothing without it.
- **`marker:` and `selection:` emit two rules**, the element and its descendants, so `marker:text-muted` on a `<ul>` styles the `<li>` markers.
- **Relational variants use `:where()` on the trigger**, so they contribute zero specificity and score the same as a plain state utility.

### Specificity

A plain utility is (0,1,0); one variant makes it (0,2,0), relational included. Stacking two pseudo-classes necessarily makes it (0,3,0). State rules live in the `st-utilities-*` layers, so they beat a component's own state rule **by layer, not specificity** — which is what makes it deterministic.

Custom CSS is unlayered and therefore beats every Strata layer regardless of specificity, but you must name the state: `.card { background: white }` will **not** suppress a `hover:` background, because layer order is evaluated before specificity. Write `.card:hover { ... }`.

---

## Aspect ratio

```html
<div class="aspect-video">      <!-- 16/9 -->
<div class="aspect-square">     <!-- 1/1  -->
<div class="aspect-md-square">  <!-- responsive -->
<div class="aspect-[16/10]">    <!-- arbitrary -->
<div class="aspect-[var(--r)]">
```

Named ratios: `aspect-square`, `aspect-video`, `aspect-auto`, plus `aspect-1x1`, `aspect-4x3`, `aspect-16x9`, `aspect-21x9`. All accept a breakpoint segment.

`.ratio` / `.ratio-{1x1,4x3,16x9,21x9}` remain for the wrapper-plus-embed pattern and are implemented on `aspect-ratio` rather than the old padding-top hack. Their fill rule is scoped to replaced elements (`img`, `video`, `iframe`, `embed`, `object`), so an overlay child keeps its own size instead of being stretched to the box. Prefer `aspect-*` for new markup — it needs no wrapper and no companion class.


---

## Theming

### Built-in themes

```html
<html data-st-theme="light">   <!-- default -->
<html data-st-theme="dark">    <!-- dark mode -->
<html data-st-theme="dim">     <!-- intermediate -->
```

### System preference

If no `data-st-theme` is set, Strata automatically follows the user's system preference via `prefers-color-scheme`.

### Custom theme

```css
[data-st-theme="brand"] {
  --st-primary: #7c3aed;
  --st-bg:      #0f0f0f;
  --st-text:    #fafafa;
}
```

```html
<html data-st-theme="brand">
```

### Switch theme with JavaScript

```js
document.documentElement.setAttribute('data-st-theme', 'dark')
```

### Theme Toggle

Cycle through all built-in themes with a single button — no framework needed.

```html
<button id="theme-toggle">Toggle Theme</button>

<script>
  const themes = ['light', 'dark', 'dim']
  let current = 0

  document.getElementById('theme-toggle').addEventListener('click', () => {
    current = (current + 1) % themes.length
    document.documentElement.setAttribute('data-st-theme', themes[current])
  })
</script>
```

To start from the user's current theme rather than always resetting to `light`, read the attribute first:

```js
const themes = ['light', 'dark', 'dim']
const initial = document.documentElement.getAttribute('data-st-theme') || 'light'
let current = themes.indexOf(initial)
if (current === -1) current = 0
```

To include your own custom themes in the cycle, add them to the array:

```js
const themes = ['light', 'dark', 'dim', 'brand']
```

Any theme in the array must have its CSS variables defined before it can be toggled to:

```css
[data-st-theme="brand"] {
  --st-primary: #7c3aed;
  --st-bg:      #0f0f0f;
  --st-text:    #fafafa;
}
```

### Override CSS variables

```css
:root {
  --st-primary:        #7c3aed;
  --st-border-radius:  8px;
  --st-duration:       300ms;
}
```

---

## Transitions

Strata builds smooth transitions into every interactive element by default.

### Control globally

```css
/* Slow all transitions */
:root { --st-duration: 400ms; }

/* Kill all transitions */
:root { --st-duration: 0ms; }
```

### Control per component

```css
.btn-primary { --st-duration: 80ms; }
```

### Transition utilities

```html
<div class="transition">
<div class="transition-fast">
<div class="transition-slow">
<div class="transition-none">
<div class="transition-[background-color_0.3s_ease]">
<div class="duration-[400ms]">
<div class="ease-in">
<div class="ease-out">
```

### Reduced motion

Strata automatically respects `prefers-reduced-motion` — no configuration needed.

---

## State Management

States are managed via `data-st-*` attributes. JavaScript sets the attribute, CSS handles the visual change.

```html
<!-- Visibility with fade transition -->
<div data-st-visible="true">Visible</div>
<div data-st-visible="false">Hidden (faded out)</div>

<!-- Collapse with smooth height transition -->
<div data-st-collapsed="false">Expanded</div>
<div data-st-collapsed="true">Collapsed</div>

<!-- Loading state -->
<button data-st-loading="true">Loading...</button>

<!-- Disabled state -->
<button data-st-disabled="true">Disabled</button>
```

```js
// Toggle visibility
element.setAttribute('data-st-visible', 'false')

// Collapse/expand
element.setAttribute('data-st-collapsed', 'true')
```

---

## Standalone Packages

All Strata plugins are available as independent packages. Use them without Strata, or use them with Strata — the API is identical either way.

| Package | Standalone global | With Strata | Install |
|---|---|---|---|
| `@strata-packages/forms` | `StrataForms` | `Strata.Forms` | `npm i @strata-packages/forms` |
| `@strata-packages/picker` | `StrataPicker` | `Strata.Picker` | `npm i @strata-packages/picker` |
| `@strata-packages/skeleton-loader` | `SkeletonLoader` | `Strata.skeleton` | `npm i @strata-packages/skeleton-loader` |
| `@strata-packages/modal` | `StrataModal` | `Strata.Modal` | `npm i @strata-packages/modal` |
| `@strata-packages/chart` | `StrataChart` | `Strata.Chart` | `npm i @strata-packages/chart` |
| `@strata-packages/offcanvas` | `StrataOffcanvas` | `Strata.Offcanvas` | `npm i @strata-packages/offcanvas` |
| `@strata-packages/flipbook` | `StrataFlipbook` | `StrataFlipbook` | `npm i @strata-packages/flipbook` |
| `@strata-packages/shopmap` | `ShopMap` | `ShopMap` | `npm i @strata-packages/shopmap` |
| `@strata-packages/cursorfx` | `StrataCursorFX` | `Strata.CursorFX` | `npm i @strata-packages/cursorfx` |

### Which packages ship in `strata.components.js`

`strata.build` concatenates **four** packages into `dist/strata.components.js` when it finds them in your `node_modules`: `modal`, `offcanvas`, `skeleton-loader` and `chart`. Load that one file and those four are available under `Strata.*`.

The other five — `forms`, `picker`, `flipbook`, `shopmap` and `cursorfx` — install and load with their own `<script>` tag or import. That is deliberate: being in the bundled list makes the CLI warn **every** `strata-css` consumer about a package they never asked for.

Either way the detection below is the same, and each package's own README has its loading snippet.

### How detection works

When `strata.components.js` is loaded it sets `data-strata` on `<html>`. Each plugin checks for this at runtime and registers under the Strata namespace if present, or its own standalone global if not. **No configuration required from you** — it is automatic.

### Standalone usage (no Strata)

```html
<!-- Skeleton -->
<link rel="stylesheet" href="node_modules/@strata-packages/skeleton-loader/skeleton-loader.css">
<script src="node_modules/@strata-packages/skeleton-loader/skeleton-loader.js"></script>
<script>SkeletonLoader.init('.card')</script>

<!-- Modal -->
<link rel="stylesheet" href="node_modules/@strata-packages/modal/modal.css">
<script src="node_modules/@strata-packages/modal/modal.js"></script>
<script>StrataModal.open('#myModal')</script>

<!-- Chart (requires Three.js) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="node_modules/@strata-packages/chart/chart.js"></script>
<script>StrataChart.create('#myChart', { type: 'bar', data: [...] })</script>
```

### Migrating from standalone to Strata

If you installed a standalone package first and later add Strata, **no code changes are required.** Strata's presence is detected automatically and the plugin re-registers under the Strata namespace. Your existing markup and JS calls continue to work.

---

## Skeleton Loader

Skeleton loading shows animated shimmer placeholders while content is fetching — preventing layout shift and giving users instant visual feedback that something is coming.

Strata's skeleton system is entirely attribute-driven. There are no class names to add. Instead, set `data-st-skeleton` on your elements and use the `Strata.skeleton` JS utility to manage the lifecycle.

### Attribute states

| Value | Meaning |
|---|---|
| `"true"` | Element shimmers (CSS applies animated `::before` overlay) |
| `"false"` | Element revealed (shimmer removed, content shows) |
| `"null"` | JS-managed parent — no overlay on the parent itself, children shimmer individually |

### Basic usage

Mark a container and call `Strata.skeleton.init()` — Strata auto-detects the leaf nodes inside and shimmers them individually.

```html
<div class="card" data-st-skeleton="true">
  <div class="card-header">
    <h3>Card Title</h3>
  </div>
  <div class="card-body">
    <p>Some body text that will load soon.</p>
    <button class="btn-primary">Action</button>
  </div>
</div>
```

```js
// Initialise — auto-detects leaf nodes inside all [data-st-skeleton="true"] parents
Strata.skeleton.init()

// Simulate data loading, then reveal
fetchData().then(() => {
  Strata.skeleton.reveal()
})
```

### JS API

```js
Strata.skeleton.init()              // auto-discover all skeleton parents on page
Strata.skeleton.init('.card')       // manage specific elements
Strata.skeleton.show('.card')       // re-enter skeleton state
Strata.skeleton.reveal('.card')     // reveal content (removes shimmer)
Strata.skeleton.toggle('.card')     // toggle between skeleton and revealed
Strata.skeleton.revealAt('.card', 0) // reveal one element by index
Strata.skeleton.isSkeleton(el)      // returns true if element is currently shimmering
```

### Staggered reveal

Reveal a list of cards one by one with a delay between each:

```js
Strata.skeleton.reveal('.card', { stagger: 150 })
```

### Opt out a child element

Set `data-st-skeleton="false"` on any child to exclude it from shimmering entirely:

```html
<div class="card" data-st-skeleton="true">
  <div class="card-header">
    <h3>Title</h3>
    <span data-st-skeleton="false">Always visible badge</span>
  </div>
</div>
```

### Customise the shimmer

Control the shimmer appearance via CSS variables:

```css
:root {
  --st-skeleton-base:     #e2e8f0;  /* bar background colour */
  --st-skeleton-shine:    #f8fafc;  /* highlight colour */
  --st-skeleton-duration: 1.5s;     /* animation speed */
  --st-skeleton-radius:   4px;      /* corner rounding on bars */
}
```

### Realistic card example

A card that shimmers while data loads, then transitions to real content:

```html
<div class="card" id="profile-card" data-st-skeleton="true">
  <div class="card-header">
    <div class="img-wrap">
      <img src="" alt="Avatar" id="avatar">
    </div>
    <h3 id="name"></h3>
  </div>
  <div class="card-body">
    <p id="bio"></p>
    <a href="#" id="profile-link" class="btn-primary">View Profile</a>
  </div>
</div>

<script>
  Strata.skeleton.init('#profile-card')

  loadUser(42).then(user => {
    document.getElementById('avatar').src       = user.avatarUrl
    document.getElementById('name').textContent = user.name
    document.getElementById('bio').textContent  = user.bio
    document.getElementById('profile-link').href = user.profileUrl

    Strata.skeleton.reveal('#profile-card')
  })
</script>
```

> **Note on images:** Browsers do not support `::before` on replaced elements (`img`, `video`, `iframe`). Wrap media in a `div` — Strata will shimmer the wrapper instead.

---

## Modal

Strata's modal is attribute-driven. Open and close modals via `data-st-*` attributes or the JS API — no class toggling.

### Basic usage

```html
<!-- Trigger -->
<button data-st-toggle="modal" data-st-target="#myModal">Open Modal</button>

<!-- Modal -->
<div class="modal" id="myModal" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Title</h5>
        <button data-st-dismiss="modal">&times;</button>
      </div>
      <div class="modal-body">
        <p>Modal content here.</p>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" data-st-dismiss="modal">Close</button>
        <button class="btn-primary">Save</button>
      </div>
    </div>
  </div>
</div>
```

### JS API

```js
Strata.Modal.open('#myModal')   // open by selector or element
Strata.Modal.close()            // close current modal
```

### Static backdrop

```html
<div class="modal" data-st-backdrop="static" ...>
```

Clicking outside the modal shakes it instead of closing it.

### Size variants

```html
<div class="modal modal-sm">   <!-- 300px -->
<div class="modal modal-lg">   <!-- 800px -->
<div class="modal modal-xl">   <!-- 1140px -->
<div class="modal modal-fullscreen">
```

### Events

```js
document.addEventListener('st:modal:open',  e => console.log('opened', e.detail.modal))
document.addEventListener('st:modal:close', e => console.log('closed', e.detail.modal))
```

---

## CursorFX

Modular cursor effects — one shared engine plus ten opt-in presets. `npm i @strata-packages/cursorfx`

Works from markup alone; no script of your own is required:

```html
<!-- the engine's own CSS, plus a preset's CSS only if it has one -->
<link rel="stylesheet" href="node_modules/@strata-packages/cursorfx/cursorfx.css">
<script src="node_modules/@strata-packages/cursorfx/cursorfx.js"></script>
<script src="node_modules/@strata-packages/cursorfx/presets/trail/trail.js"></script>

<body data-st-cursorfx="trail" data-st-cfx-trail-color="var(--st-primary)">
```

Canvas presets (`Trail`, `ClickBurst`, `Electric`, `Spark`, `Smoke`) are JS only — they draw to the shared canvas. The DOM presets (`Magnetic`, `HoverFlicker`, `CursorMorph`, `Reveal`, `LineWave`) each ship a stylesheet alongside their script; load both.

**Presets:** `Trail` · `ClickBurst` · `Electric` · `Spark` · `Smoke` (canvas) — `Magnetic` · `HoverFlicker` · `CursorMorph` · `Reveal` · `LineWave` (DOM/CSS)

The engine owns pointer tracking, one lazily-started RAF loop, one shared canvas, a **global** particle cap, one hover hit-test per frame, colour parsing, reduced-motion handling, visibility pause and full teardown — so mounting a second preset does not mean a second loop or a second canvas.

Every knob is a CSS custom property with a sensible default, and an instance writes an inline property only where you override one — so a stylesheet can retune any effect per theme without touching markup. Colours accept anything CSS accepts, including gradients held in a `var()` token.

Targets are opt-in per element (`data-st-cfx-target="magnetic trail"`), and a target may carry `pointer-events: none` when it is a hit *zone* rather than a click target — it is then matched on geometry, so a wide band never swallows clicks meant for the page beneath it.

Full documentation: [strata-css-docs-site.vercel.app/packages/cursorfx](https://strata-css-docs-site.vercel.app/packages/cursorfx)

---

## Custom CSS

Strata uses CSS `@layer` internally. Any CSS you write outside a layer automatically wins over Strata styles.

```css
/* This overrides Strata's .btn-primary — no !important needed */
.btn-primary {
  background-color: purple;
  border-radius: 0;
}

/* Only overrides what you specify — other properties stay from Strata */
.card {
  border-radius: 16px; /* changed */
  /* padding, shadow etc. stay as Strata defined */
}
```

---

## JavaScript Integration

### Class naming convention

Classes used in JavaScript carry a `-js` suffix. Classes used in TypeScript carry a `-ts` suffix. This signals to any developer reading the code that the element is touched by a script.

```html
<div class="modal-js" id="main-modal-js">
<div class="modal-ts" id="main-modal-ts">
```

### Never toggle classes for state

```js
// Wrong — don't do this
element.classList.add('hidden')
element.classList.toggle('active')

// Right — use data attributes
element.setAttribute('data-st-visible', 'false')
element.setAttribute('data-st-active', 'true')
```

---

## Configuration

```js
// strata.config.js
module.exports = {
  // Files to scan for class names
  content: [
    './src/**/*.{html,jsx,tsx,vue,astro,svelte,js,ts}'
  ],

  // Input and output paths
  input:  './strata.css',
  output: './dist/strata.output.css',

  // Theme overrides
  theme: {
    breakpoints: {
      '3xl': '1600px'  // add custom breakpoints
    },
    colors: {
      primary: '#7c3aed'  // override default colors
    }
  },

  // Include or exclude specific components
  components: {
    exclude: ['carousel']
  }
}
```


### CSS minification

`strata --minify` runs a fixed cascade and prints which engine ran:

1. **`minifier` set in `strata.config.js`** — honoured exactly; hard-errors if unavailable rather than silently substituting the other engine.
2. **Lightning CSS** — the default. Roughly 2% smaller output than cssnano, used whenever it parses the stylesheet cleanly.
3. **cssnano** — on a missing package, a parse failure, *or* a dropped declaration. Announced with the reason.
4. **Unminified** — if neither is installed. Announced.

Both minifiers are optional peer dependencies; neither is required to build.

```js
module.exports = {
  minifier: 'lightningcss',        // 'lightningcss' | 'cssnano' | false
  targets:  { safari: 16 << 16 },  // browser targets passed to Lightning CSS
}
```

The order is fixed rather than "whichever output is smaller", because the two engines are not interchangeable on **your** CSS. `@strata` directives are replaced inside your own stylesheet, so any custom CSS you write there goes through the same minifier — and that is where they diverge:

```css
.legacy { *zoom: 1 }   /* lightningcss:  SyntaxError, build dies   */
                       /*  + errorRecovery: drops the declaration  */
                       /* cssnano:        preserves it             */
```

Strata always enables `errorRecovery`, so a legacy hack can never kill your build, and it treats a recovered error as a **failure** — falling back to cssnano. The dropped-declaration output is smaller precisely *because* something of yours was deleted, so choosing by file size would let compression decide whether your hack ships. Compression only breaks ties between outputs that are equivalent.

Under Vite, Next or webpack this cascade never runs: the PostCSS plugin path is used and the bundler does its own minification.

---

## Breakpoints

Bootstrap-style — breakpoint embedded inside the class name.

| Breakpoint | Prefix | Min-width |
|---|---|---|
| Extra small | `xs` | 0px |
| Small | `sm` | 576px |
| Medium | `md` | 768px |
| Large | `lg` | 992px |
| Extra large | `xl` | 1200px |
| Extra extra large | `xxl` | 1400px |

```html
<div class="col-12 col-md-6 col-lg-4">
<div class="d-none d-md-block">
<div class="mt-2 mt-md-4 mt-lg-5">
```

---

## CSS Variables Reference

| Variable | Default | Purpose |
|---|---|---|
| `--st-primary` | `#0d6efd` | Primary brand colour |
| `--st-secondary` | `#6c757d` | Secondary colour |
| `--st-success` | `#198754` | Success colour |
| `--st-danger` | `#dc3545` | Danger colour |
| `--st-warning` | `#ffc107` | Warning colour |
| `--st-info` | `#0dcaf0` | Info colour |
| `--st-bg` | `#ffffff` | Page background |
| `--st-text` | `#212529` | Body text |
| `--st-border` | `#dee2e6` | Border colour |
| `--st-border-radius` | `0.375rem` | Default radius |
| `--st-duration` | `200ms` | Transition duration |
| `--st-easing` | `cubic-bezier(0.4,0,0.2,1)` | Transition easing |
| `--st-shadow` | `0 0.5rem 1rem rgba(0,0,0,0.15)` | Default shadow |
| `--st-font-family` | System font stack | Body font |

---

## Framework Compatibility

Strata works with any project that can consume a CSS file.

| Framework | Supported |
|---|---|
| Plain HTML | ✓ |
| React / Next.js | ✓ |
| Vue / Nuxt | ✓ |
| Astro | ✓ |
| Svelte / SvelteKit | ✓ |
| Angular | ✓ |
| PHP / Laravel | ✓ |
| Django / Rails | ✓ |

---

## Build Tool Integration

### Vite

```js
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  css: {
    postcss: {
      plugins: [require('strata-css')]
    }
  }
})
```

### Webpack

```js
// webpack.config.js
module.exports = {
  module: {
    rules: [{
      test: /\.css$/,
      use: ['style-loader', 'css-loader', 'postcss-loader']
    }]
  }
}
```

### PostCSS

```js
// postcss.config.js
module.exports = {
  plugins: [
    require('strata-css'),
    require('autoprefixer')
  ]
}
```

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned work.

---

## Acknowledgements

Strata builds on the shoulders of excellent prior work:

- **[Bootstrap](https://getbootstrap.com/)** (MIT) — component class naming conventions, breakpoint scale, color palette, and form patterns that Strata's API is compatible with
- **[Tailwind CSS](https://tailwindcss.com/)** (MIT) — the JIT processing concept and arbitrary value syntax (`mt-[24px]`, `bg-[#ff0000]`)
- **[PostCSS](https://postcss.org/)** (MIT) — the build pipeline that powers Strata's `@strata` directive processing

Strata's component architecture, cascade layer system, `data-st-*` state model, theming engine, and JIT registry are original work.

---

## Creating a GitHub Release

Tag and publish a GitHub Release for the current version:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
# Copy just the X.Y.Z entry out of CHANGELOG.md into notes.md, then:
gh release create vX.Y.Z \
  --title "Strata CSS vX.Y.Z" \
  --notes-file notes.md \
  --verify-tag
```

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

---

## License

[MIT](LICENSE) © 2026 Aftab Ibrahim Kazi
