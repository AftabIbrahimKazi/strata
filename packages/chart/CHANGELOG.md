# Changelog

All notable changes to `@strata-packages/chart` are documented here.

## [1.1.3] — 2026-09-02

### Fixed

- **A top-level class shadowed the public `StrataChart` global.** `class StrataChart` sat at the top level of `chart.ts`, outside the IIFE that assigns the public API. A top-level class declaration creates a binding in the global *lexical* environment, and that binding shadows `window.StrataChart` for every script that follows — so the documented standalone entry point, `StrataChart.create(selector, options)`, resolved to the class rather than the API object and threw `TypeError: StrataChart.create is not a function`. The class is renamed `ChartInstance`; it was only ever internal, and nothing outside the file referenced it by name.

  Pages that load `strata.components.js` were never affected: `window.Strata` exists there, so the API is published as `Strata.Chart` and callers reach it by property access, which never touches the shadowed identifier. Only the standalone path broke — and it is the one a new consumer reaches first, which is why this survived earlier verification.

  Verified in Chrome 152: before, the bare identifier resolved to a class whose `.create` was `undefined` and `StrataChart !== window.StrataChart`, with 0 canvases rendered on 4 containers. After, `examples/standalone-chart.html` renders 4/4 with no errors, and the bundle-based pages are unchanged at 6/6 and 14/14.

## [1.1.2] — 2026-07-04

### Security
- **Tooltip XSS fixed** — tooltip label and value were interpolated into `innerHTML`, allowing script execution if chart data contained user-supplied HTML (e.g. `label: '<img src=x onerror=...>'`). Now rendered via `textContent` on created span elements. Visual output unchanged for plain-text labels.

## [1.1.1] — 2026-06-15

### Added
- **Lazy-loaded Three.js** — Three.js no longer has to be loaded before the script. If `window.THREE` is absent when `create()` is called, it is fetched on demand from `threeUrl` (default: `three@0.160.0` on jsDelivr) and the chart builds once it arrives. When `window.THREE` is already present, `create()` stays **synchronous and unchanged**. New `threeUrl` option (set `''` to require a pre-loaded global) and a `Strata.Chart.load(url?)` helper for explicit preloading (e.g. before a chart scrolls into view).

### Changed
- `create()` returns the chart instance synchronously when Three.js is present, or a `Promise<instance | null>` when it must lazy-load Three.js first.

### Fixed
- **API always registers** — the bootstrap previously bailed out entirely (registering nothing) if `window.THREE` was missing at load, which silently disabled `Strata.Chart` / `StrataChart`. It now always registers, so lazy-loading works and a missing dependency no longer removes the whole API.

## [1.0.1] — 2026-06-09

### Added
- `CLAUDE.md` is now included in the published package — gives AI coding agents (Claude Code and similar) architecture, API, and CSS-token context directly from `node_modules` without needing the source repo.

## [1.0.0] — 2026-06-08

### Added
- Initial standalone release as `@strata-packages/chart`
- Three.js-powered chart component with `bar`, `line`, `pie`, and `scatter` types
- 2D / 3D view toggle with fixed camera presets and `toggleView()` / `setView()` methods
- Data manipulation API: `update`, `addDataPoint(s)`, `removeDataPoint(s)`, `updateDataPoint`
- Theme integration — `theme: 'auto'` follows `data-st-theme` automatically, with `light`/`dark` overrides
- Feature flags: `gridView`, `showAxisLabels`, `showScale`, `showGridLabels`, `highlightGridOnInteract`
- Custom events: `st:chart:ready`, `st:chart:change`, `st:chart:update`, `st:chart:click`, `st:chart:destroy`
- Data attribute styling hooks: `data-st-chart-view/type/loading/animated/hovered`
- `destroy()` for full Three.js resource cleanup
