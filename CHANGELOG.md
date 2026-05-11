# Changelog

All notable changes to Strata CSS will be documented here.

## [1.0.0] — 2026-05-10

### Components
- `btn-primary`, `btn-secondary`, `btn-success`, `btn-danger`, `btn-warning`, `btn-info`, `btn-light`, `btn-dark` — full semantic button set with hover, focus, and active states baked in
- `card`, `card-header`, `card-body`, `card-footer` — composable card component
- `container`, `row`, `col-*` — Bootstrap-compatible responsive grid across all six breakpoints
- `modal` — dialog component with `data-st-toggle`, `data-st-dismiss`, and `data-st-backdrop` attribute API
- `navbar`, `navbar-brand`, `navbar-nav` — navigation bar component
- Skeleton loader — animated loading placeholder with `Strata.skeleton` JavaScript API

### Utilities
- Spacing: `mt-*`, `mb-*`, `ms-*`, `me-*`, `pt-*`, `pb-*`, `px-*`, `py-*`, `mx-auto`, `my-*`
- Display: `d-flex`, `d-none`, `d-block`, `d-grid`, `d-inline`, `d-inline-flex`, `d-inline-block`
- Colors: `text-*`, `bg-*` — all semantic colors (primary, secondary, success, danger, warning, info, light, dark, muted)
- Sizing: `w-25`, `w-50`, `w-75`, `w-100`, `h-25`, `h-50`, `h-75`, `h-100`, `mw-100`, `mh-100`
- Flexbox: `justify-content-*`, `align-items-*`, `align-self-*`, `flex-wrap`, `flex-nowrap`, `flex-grow-*`, `flex-shrink-*`
- Position: `position-static`, `position-relative`, `position-absolute`, `position-fixed`, `position-sticky`
- Overflow: `overflow-auto`, `overflow-hidden`, `overflow-scroll`, `overflow-visible`
- Opacity: `opacity-0`, `opacity-25`, `opacity-50`, `opacity-75`, `opacity-100`
- Visibility: `visible`, `invisible`
- Z-index: `z-0` through `z-3`
- Cursor: `cursor-pointer`, `cursor-default`, `cursor-not-allowed`, `cursor-wait`
- Shadows: `shadow-none`, `shadow-sm`, `shadow`, `shadow-lg`
- Transitions: `transition`, `transition-fast`, `transition-slow`, `transition-none`
- Easing: `ease-in`, `ease-out`, `ease-in-out`, `ease-linear`
- Arbitrary values: `mt-[24px]`, `bg-[#ff0000]`, `w-[347px]`, `transition-[background-color_0.3s_ease]`
- Important variants: `!mt-0`, `!d-none`, `!p-0`
- Breakpoint variants on all utilities: `col-md-6`, `d-lg-none`, `mt-xl-4`, `px-xxl-5`

### Theming
- Three built-in themes: `light` (default), `dark`, `dim` — applied via `data-st-theme` on `<html>`
- Automatic system preference detection via `prefers-color-scheme` — no configuration needed
- Unlimited custom themes via CSS custom properties: `[data-st-theme="brand"] { --st-primary: #7c3aed }`
- All `--st-*` custom properties fully overridable in `:root` or any selector
- Smooth theme transitions — all elements animate when the theme attribute changes

### State Management
- `data-st-visible="true|false"` — fade + translateY transition for show/hide
- `data-st-collapsed="true|false"` — smooth `max-height` expand/collapse
- `data-st-loading="true|false"` — opacity reduction + pointer-events disabled
- `data-st-disabled="true|false"` — opacity reduction + `cursor: not-allowed`
- `data-st-theme="light|dark|dim|custom"` — live theme switching

### Build System
- PostCSS plugin with O(1) class registry — 1065 pre-computed entries, zero linear scanning
- Multi-layer caching: dirty flag, file mtime, glob hash, config hash, output string cache
- CSS `@layer` hierarchy: `st-base` → `st-components` → `st-utilities` — breakpoint order guaranteed, HTML class order irrelevant
- Bootstrap-style breakpoints: xs (0px), sm (576px), md (768px), lg (992px), xl (1200px), xxl (1400px)
- Custom breakpoints via `strata.config.js` `theme.breakpoints`
- `prefers-reduced-motion` respected automatically — no configuration needed
- CLI: `strata init` (scaffold), `strata --watch` (development), `strata --build` (production), `strata --minify` (minified production)

### Performance (vs Tailwind CSS 3 in watch mode)
- Cold build: 1.89ms avg vs 7.21ms — 3.8× faster
- Warm rebuild: 0.14ms avg vs 2.70ms — 19× faster
- Warm p95: 0.23ms vs 6.12ms — 26× faster

Reproduce via `npm run benchmark`.
