# Changelog

All notable changes to `@strata-packages/modal` are documented here.

## [1.0.3] — 2026-09-02

### Changed

- **README rewritten for the npm package page.** It now links to this package's own page on the documentation site, describes what Strata CSS is so the page stands on its own for a reader arriving from a search, and cross-links the other eight packages. Previously the page was a dead end — it linked to neither the docs nor any sibling package, so a reader landing on it from npm had nowhere to go. No code changed in this release.

## [1.0.2] — 2026-06-28

### Fixed
- **Scroll lock via CSS `:has()`** — removed `body.classList.add/remove('modal-open')` and the `--st-scrollbar-width` inline style hack. Scroll lock is now `body:has(.modal[aria-hidden="false"]) { overflow: hidden; scrollbar-gutter: stable; }` — zero JS body manipulation.
- **`aria-hidden` and `aria-modal` are value-toggled, never removed** — `removeAttribute('aria-hidden')` on open → `setAttribute('aria-hidden', 'false')`; `removeAttribute('aria-modal')` on close → `setAttribute('aria-modal', 'false')`. Attributes stay present and queryable at all times.
- **Static shake uses `data-st-shake` attribute** — replaced `classList.add/remove('modal-static')` with `setAttribute('data-st-shake', 'true/false')`. CSS reads `[data-st-shake="true"]` selector.
- **Safe defaults on `DOMContentLoaded`** — any `.modal` missing `aria-hidden` or `aria-modal` gets `aria-hidden="true"` and `aria-modal="false"` set automatically at init time.

## [1.0.1] — 2026-06-09

### Added
- `CLAUDE.md` is now included in the published package — gives AI coding agents (Claude Code and similar) architecture, API, and CSS-token context directly from `node_modules` without needing the source repo.

## [1.0.0] — 2026-06-08

### Added
- Initial standalone release as `@strata-packages/modal`
- Accessible modal component with declarative (`data-st-toggle` / `data-st-target` / `data-st-dismiss`) and programmatic (`StrataModal.open/close`, `Strata.Modal.open/close`) triggering
- Static backdrop mode (`data-st-backdrop="static"`) with shake animation
- Size variants: `modal-sm`, `modal-lg`, `modal-xl`, `modal-fullscreen`, `modal-fullscreen-{bp}-down`
- Dialog variants: `modal-dialog-centered`, `modal-dialog-scrollable`
- Custom events: `st:modal:open`, `st:modal:close`
- Self-contained CSS variable tokens (`--st-modal-bg`, `--st-modal-border`, `--st-modal-shadow`) for standalone use, with automatic detection of Strata CSS via `:root:not([data-strata])`
- Focus management: focuses `[autofocus]` or `.modal-content` on open, restores on close
- Escape-to-close and backdrop-click-to-close (unless static)
