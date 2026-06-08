# Changelog

All notable changes to `@strata-packages/skeleton-loader` are documented here.

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
