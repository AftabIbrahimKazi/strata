# Changelog

All notable changes to Strata CSS will be documented here.

## [1.0.0] — 2026-05-10

### Initial release

**Core architecture**
- PostCSS-based JIT engine — generates only CSS that is used
- CSS `@layer` hierarchy — `st-base`, `st-components`, `st-utilities`
- Custom CSS fully compatible — wins over framework styles automatically
- O(1) class registry with 1065 pre-computed entries
- Multi-layer caching — dirty flag, file mtime, glob, config, output string

**Component system**
- Single component tier — `btn-primary`, `card`, `navbar`, `modal` etc.
- Purely structural components — `container`, `row`, `col-*`
- States baked into components automatically — hover, focus, active

**Utility system**
- Bootstrap naming convention — `mt-3`, `d-flex`, `text-center`
- Arbitrary value syntax — `mt-[24px]`, `bg-[#ff0000]`, `w-[347px]`
- Important variants — `!mt-3`, `!d-none`
- Breakpoint variants — `col-md-6`, `d-lg-none`, `mt-xl-4`

**Theme system**
- Three built-in themes — light, dark, dim
- Triggered via `data-st-theme` on `<html>`
- System preference via `prefers-color-scheme` — automatic
- Unlimited custom themes via CSS variables
- All `--st-` custom properties fully overridable

**Transition system**
- Automatic transitions on all interactive elements
- Theme switching transitions — smooth across all elements
- Data attribute state transitions — `data-st-visible`, `data-st-collapsed`
- Transition utilities — `transition`, `transition-fast`, `transition-none`
- `prefers-reduced-motion` respected automatically
- Developer control via `--st-duration` and `--st-easing` variables

**State management**
- `data-st-visible` — fade in/out with translateY
- `data-st-collapsed` — smooth max-height expand/collapse
- `data-st-loading` — opacity + pointer-events
- `data-st-disabled` — opacity + cursor
- `data-st-theme` — theme switching

**Performance** (vs Tailwind)
- Cold build: 1.89ms avg vs 7.21ms (3.8x faster)
- Warm rebuild: 0.14ms avg vs 2.70ms (19x faster)
- Warm p95: 0.23ms vs 6.12ms (26x faster)

**Breakpoints**
- Bootstrap-style: xs, sm (576px), md (768px), lg (992px), xl (1200px), xxl (1400px)
- Custom breakpoints via `strata.config.js`

**CLI**
- `strata init` — scaffold a new project
- `strata --watch` — development mode with file watching
- `strata --build` — production build
- `strata --minify` — production build with minification
