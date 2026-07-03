# Changelog

All notable changes to `@strata-packages/chart` are documented here.

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
