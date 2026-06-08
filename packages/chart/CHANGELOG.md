# Changelog

All notable changes to `@strata-packages/chart` are documented here.

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
