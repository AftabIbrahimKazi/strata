# Changelog — @strata-packages/forms

All notable changes to this package will be documented here.

## [1.0.0] — 2026-06-05

Initial release.

### Added

- **Custom select** — fully accessible replacement for native `<select>`; native element stays in DOM for form submission
- **Single select** — placeholder support, keyboard navigation, click-outside close
- **Multi-select with chips** — selected items render as removable chip tags in the trigger; `maxItems` cap
- **`maxDisplay`** — caps visible chips at N, shows `+N` overflow badge; prevents trigger from growing taller
- **Searchable** — live search input inside the dropdown; works with single and multi modes
- **Clearable** — `×` clear button appears in trigger when a value is selected
- **Grouped options** — reads `<optgroup>` from the native select automatically; no extra config
- **Creatable** — user can type a new value and add it to the list (requires `searchable: true`)
- **Custom render** — `renderOption` and `renderValue` callbacks for fully custom HTML per option and selected value (avatar, role, badge, etc.)
- **Async / remote options** — `loadOptions(query, callback)` for server-side search and pagination
- **Auto-width** — dropdown expands to fit content with viewport edge detection; alignment flips when near right edge; `maxWidth` cap
- **Checkbox select** — dropdown stays open while ticking; `checkboxDisplay`: `chips` / `count` / `list`; Select All row; group-level checkboxes; disable Select All via `data-st-no-select-all`
- **Declarative init** — `data-st-select` attribute auto-inits on `DOMContentLoaded`; all options available as `data-st-*` attributes
- **Programmatic API** — `StrataForms.select()` factory; `open()`, `close()`, `setValue()`, `setValues()`, `getValue()`, `clear()`, `destroy()` methods
- **Custom events** — `st:select:change`, `st:select:open`, `st:select:close`
- **CSS token system** — local CSS variables for per-theme, per-context, and per-instance overrides without `!important`
- **Backend compatible** — native `<select>` preserved in DOM; `name`, `required`, and pre-selected `<option selected>` all respected
- **Zero dependencies** — standalone JS + CSS, no external libraries required
