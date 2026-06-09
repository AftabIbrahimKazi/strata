# Changelog — @strata-packages/picker

All notable changes to this package will be documented here.

## [1.0.4] — 2026-06-09

### Fixed
- Datetime picker: clicking the month/year title button did nothing — `renderMonths` and `renderYears` were missing from the datetime picker scope, so `vLayer` was set but never acted on. Both functions are now present and `render()` routes to them correctly.
- Datetime picker: switching between days/months/years views caused the popup to shift width and height as the calendar panel resized to fit each grid. `.stp-dt-cal` now has a fixed `width` and `min-height` matching the standalone date picker panel, locking the popup size regardless of which layer is shown.
- Standalone date picker: same width/height lock applied to `.stp-cal` — switching to month or year grid no longer collapses the popup height.

## [1.0.3] — 2026-06-09

### Fixed
- Reopening the date or datetime picker after navigating the calendar (without selecting a date) left `vY`/`vM` at whatever month the user had scrolled to. On a subsequent open with an empty input, the calendar rendered that stale month instead of today — producing the "October 2001" regression.
- `openPopup()` in both the date picker and datetime picker now resets the view to today when the input is empty, and to the selected date when a value is present. `vLayer` is also reset to `'days'` on open so the calendar never reopens on a stale month-grid or year-grid view.

## [1.0.2] — 2026-06-09

### Fixed
- Date formatting (`fmt` in the date picker, `fmtD` in the datetime picker) used chained `String.prototype.replace(string, …)` calls, which replace only the first substring match. A format like `"DD MMM YYYY"` matched `MM` inside `MMM`, producing garbled output such as `"08 06M 2026"` instead of a valid date string.
- Both formatters now run a single regex pass (`/YYYY|MMMM|MMM|MM|DD/g`) ordered longest-token-first, eliminating substring collisions.

### Added
- Month-name format tokens `MMM` (e.g. `Jun`) and `MMMM` (e.g. `June`) are now supported in `format` strings, matching the de-facto convention used by dayjs/moment/date-fns.

## [1.0.1] — 2026-06-09

### Added
- `CLAUDE.md` is now included in the published package — gives AI coding agents (Claude Code and similar) architecture, API, and CSS-token context directly from `node_modules` without needing the source repo.

## [1.0.0] — 2026-06-05

Initial release.

### Added

- **Date picker** — calendar popup with month/year navigation, format tokens (`YYYY MM DD`), `min`/`max` constraints, week start day, disable logic (specific dates or `(Date) => bool` functions), `data-st-disabled-days` attribute for weekday masking
- **Time picker** — scrollable hour/minute/second columns, 12h/24h modes, configurable step increment, `showSeconds` option
- **DateTime picker** — combined calendar + time columns in one popup, space-separated format string
- **Date range selection** — two-input range mode, click to set start then end, range highlight between dates
- **Preset shortcuts** — built-in presets (Today, Yesterday, Last 7 / 30 days, This month, Last month) plus fully custom preset arrays
- **Declarative init** — `data-st-datepicker`, `data-st-timepicker`, `data-st-datetimepicker` attributes auto-init on `DOMContentLoaded`
- **Programmatic API** — `StrataPicker.date()`, `.time()`, `.datetime()` factory functions; `open()`, `close()`, `setDate()`, `getDate()`, `getRange()`, `setTime()`, `getTime()`, `destroy()` methods
- **Custom events** — `st:datepicker:change`, `st:datepicker:open`, `st:datepicker:close`, `st:timepicker:change`, `st:datetimepicker:change`
- **`theme` option** — per-instance inline CSS variable overrides (primary, bg, text, radius, shadow, cellSize, fontSize, …)
- **`className` option** — extra class on the popup for targeted CSS overrides
- **CSS variable system** — full `--stp-*` token set; global `:root` override, per-class override, or per-instance via `theme` option
- **Strata CSS integration** — when `data-strata` is present on `<html>`, `--stp-*` variables automatically inherit from `--st-*` tokens; picker follows active Strata theme (light / dark / dim) with zero config
- **Backend compatible** — plain string value written to input `value`, `name` preserved for form submission
- **Zero dependencies** — standalone JS + CSS, no external libraries required
