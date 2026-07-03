# Changelog

All notable changes to `@strata-packages/skeleton-loader` are documented here.

## [1.0.2] — 2026-06-28

### Added
- **`aria-busy` management** — `manage()` now sets `aria-busy="true"` on the container; `reveal()` sets `aria-busy="false"`. Screen readers now announce that content is loading without any developer markup required. CSS-only path: developer must manage `aria-busy` manually alongside their own toggle logic.

## [1.0.1] — 2026-06-09

### Added
- `CLAUDE.md` is now included in the published package — gives AI coding agents (Claude Code and similar) architecture, API, and CSS-token context directly from `node_modules` without needing the source repo.

## [1.0.0] — 2026-06-08

### Added
- Initial standalone release as `@strata-packages/skeleton-loader`
- Smart content-leaf detection — automatically identifies and shimmers text nodes, replaced elements, and structural containers differently
- API: `init`, `reveal`, `show`, `toggle`, `revealAt`, `isSkeleton`
- `data-st-skeleton` attribute states (`"true"` / `"false"` / `"null"`) for CSS-only manual usage
- Staggered reveal support (`reveal(selector, { stagger: ms })`)
- CSS tokens: `--st-skeleton-base`, `--st-skeleton-shine`, `--st-skeleton-duration`, `--st-skeleton-radius`
- Automatic dark theme token adjustment via `data-st-theme="dark"`
- Reduced-motion support — disables animation and shows static placeholder color
