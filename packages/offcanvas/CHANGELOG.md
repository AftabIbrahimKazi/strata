# Changelog — @strata-packages/offcanvas

## [1.0.1] — 2026-06-28

### Fixed
- README and CLAUDE.md rewritten to match actual implementation — replaced Bootstrap-style direction class references (`offcanvas-start/end/top/bottom`) with `data-st-side` attribute system; fixed Dynamic Direction example to use `setAttribute` instead of `className` manipulation; added `aria-modal="false"` to HTML structure example; corrected attribute state table (`data-st-visible` → `aria-hidden`)

## [1.0.0] — 2026-06-28

### Added
- Initial release — slide-in drawer panel anchored to any viewport edge
- Direction variants: `offcanvas-start` (left), `offcanvas-end` (right), `offcanvas-top`, `offcanvas-bottom`
- Declarative trigger via `data-st-toggle="offcanvas"` + `data-st-target="#id"`
- Declarative dismiss via `data-st-dismiss="offcanvas"`
- Static backdrop mode via `data-st-backdrop="static"` — prevents close on backdrop click
- Escape key closes the offcanvas (unless static)
- Scroll lock on `<body>` while drawer is open (scrollbar-width compensation included)
- Events on `document`: `st:offcanvas:open` / `st:offcanvas:close` — detail: `{ offcanvas }`
- Programmatic API: `StrataOffcanvas.open(selectorOrElement)` / `StrataOffcanvas.close()`
- UMD build — browser global, CommonJS, AMD
- Registers as `Strata.Offcanvas` when Strata is present, otherwise as `StrataOffcanvas`
- Standalone CSS with self-contained tokens — dark mode via `prefers-color-scheme` automatic
- CSS tokens suppressed when Strata CSS is detected on the page (`data-strata` attribute)
