<div align="center">

# Strata CSS

**A modern CSS framework combining Bootstrap's component architecture with Tailwind's JIT processing.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)]()
[![npm](https://img.shields.io/badge/npm-strata--css-red.svg)](https://www.npmjs.com/package/strata-css)
[![css-framework](https://img.shields.io/badge/css--framework-%E2%9C%93-blue.svg)]()
[![PostCSS plugin](https://img.shields.io/badge/postcss-plugin-orange.svg)]()
[![JIT](https://img.shields.io/badge/JIT-enabled-green.svg)]()
[![Themes](https://img.shields.io/badge/themes-light%20%7C%20dark%20%7C%20dim-purple.svg)]()

`css-framework` · `tailwindcss` · `bootstrap` · `postcss` · `postcss-plugin` · `jit` · `component-library` · `theming` · `utility-first`

[Getting Started](#getting-started) · [Live Demo](#live-demo) · [Components](#components) · [Utilities](#utilities) · [Theming](#theming) · [Configuration](#configuration)

</div>

---

## What is Strata?

Strata is an open source CSS framework that takes the best from Bootstrap and Tailwind while fixing their biggest pain points.

**From Bootstrap** — component-first classes (`btn-primary`, `card`, `navbar`) that work out of the box with zero configuration.

**From Tailwind** — JIT post-processing that generates only the CSS you actually use, keeping output lean.

**Strata's own contributions:**
- No `!important` anywhere in framework CSS — `@layer` handles all specificity
- Custom CSS is fully compatible and always wins automatically
- Three built-in themes: light, dark, and dim — plus unlimited custom themes
- Buttery smooth transitions built in by default on all interactive elements
- State management via `data-st-*` attributes — no class toggling in JavaScript
- Arbitrary value utilities — `mt-[24px]`, `bg-[#ff0000]`, `w-[347px]`

---

## Benchmarks

Strata outperforms Tailwind on every metric in watch mode — the speed developers actually feel on every file save.

| Metric | Strata | Tailwind |
|---|---|---|
| Cold build average | 1.89ms | 7.21ms |
| Cold build median | 0.15ms | 4.55ms |
| Warm rebuild average | 0.14ms | 2.70ms |
| Warm rebuild p95 | 0.23ms | 6.12ms |

Results generated via `npm run benchmark`. See [`benchmark/`](./benchmark/) for the reproducible script.

---

## Live Demo

View the interactive component showcase: [aftabibrahimkazi.github.io/strata](https://aftabibrahimkazi.github.io/strata)

To view locally: open `docs/index.html` directly in a browser — no build step required.

---

## Getting Started

### Installation

```bash
npm install strata-css
```

> **Publishing:** Run `npm publish --dry-run` to verify the package contents, then `npm publish` to release.

### Scaffold a new project

```bash
npx strata init
```

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
    './src/**/*.{html,jsx,tsx,vue,astro,svelte}'
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

### v1.0 — Current
Full component library, utility system, JIT processing, three-theme system, transition system.

### v2.0 — Planned
- Formal plugin API
- VSCode IntelliSense extension
- Strata DevTools browser extension
- Design token pipeline (Figma support)
- Storybook integration

---

## Acknowledgements

Strata builds on the shoulders of excellent prior work:

- **[Bootstrap](https://getbootstrap.com/)** (MIT) — component class naming conventions, breakpoint scale, color palette, and form patterns that Strata's API is compatible with
- **[Tailwind CSS](https://tailwindcss.com/)** (MIT) — the JIT processing concept and arbitrary value syntax (`mt-[24px]`, `bg-[#ff0000]`)
- **[PostCSS](https://postcss.org/)** (MIT) — the build pipeline that powers Strata's `@strata` directive processing

Strata's component architecture, cascade layer system, `data-st-*` state model, theming engine, and JIT registry are original work.

---

## Creating a GitHub Release

The v1.0.0 tag already exists. To publish the GitHub Release from it:

```bash
gh release create v1.0.0 \
  --title "Strata CSS v1.0.0" \
  --notes-file CHANGELOG.md \
  --verify-tag
```

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

---

## License

[MIT](LICENSE) © 2026 Aftab Ibrahim Kazi
