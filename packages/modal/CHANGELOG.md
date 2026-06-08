# Changelog

All notable changes to `@strata-packages/modal` are documented here.

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
