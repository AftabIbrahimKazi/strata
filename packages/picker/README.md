# @strata-packages/picker

> Date, time, and datetime picker for [Strata CSS](https://github.com/AftabIbrahimKazi/strata). Zero dependencies. Works standalone or as part of Strata.

[![npm](https://img.shields.io/npm/v/@strata-packages/picker)](https://www.npmjs.com/package/@strata-packages/picker)
[![license](https://img.shields.io/npm/l/@strata-packages/picker)](LICENSE)

---

## Installation

```bash
npm install @strata-packages/picker
```

---

## Usage

### Standalone

```html
<link rel="stylesheet" href="node_modules/@strata-packages/picker/picker.css">
<script src="node_modules/@strata-packages/picker/picker.js"></script>
```

Available as `StrataPicker`.

### With Strata CSS

The picker is bundled into Strata's component build — do **not** load `picker.js` separately when using the full Strata bundle.

Available as `Strata.Picker`.

---

## Quick Start

### Declarative — auto-inits on DOMContentLoaded

```html
<input data-st-datepicker     name="date"        placeholder="Select date">
<input data-st-timepicker     name="time"        placeholder="Select time">
<input data-st-datetimepicker name="appointment" placeholder="Select date and time">
```

### Programmatic

```js
const dp  = StrataPicker.date('#myDate')
const tp  = StrataPicker.time('#myTime')
const dtp = StrataPicker.datetime('#myDT')
```

---

## Date Picker

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `format` | string | `'YYYY-MM-DD'` | Output format. Tokens: `YYYY MMMM MMM MM DD` (MMMM = full month name, MMM = short month name) |
| `weekStart` | `0\|1` | `0` | Week start: `0`=Sunday, `1`=Monday |
| `min` | string | — | Minimum selectable date (ISO string) |
| `max` | string | — | Maximum selectable date (ISO string) |
| `disable` | array | `[]` | Array of date strings or `(Date) => bool` functions |
| `range` | bool | `false` | Enable date range selection |
| `endInput` | string | — | Selector for range end input |
| `presets` | `bool\|array` | `false` | Preset shortcuts (`true` = defaults, or custom array) |
| `theme` | object | — | Inline CSS variable overrides |
| `className` | string | — | Extra class(es) on the popup element |

### Data attributes

```html
<input data-st-datepicker
       data-st-format="DD/MM/YYYY"
       data-st-week-start="1"
       data-st-min="2026-01-01"
       data-st-max="2026-12-31"
       data-st-disabled-days="0,6"
       data-st-range
       data-st-end-input="#endDate"
       data-st-presets>
```

### Methods

```js
const dp = StrataPicker.date('#myDate', options)

dp.open()
dp.close()
dp.setDate('2026-06-15')   // programmatically select a date
dp.getDate()               // → Date object or null
dp.getRange()              // → { start: Date|null, end: Date|null }
dp.destroy()
```

### Events

```js
document.addEventListener('st:datepicker:change', e => {
  // e.detail: { input, date, dateEnd, formatted, formattedEnd }
})
document.addEventListener('st:datepicker:open',  e => { /* e.detail: { input } */ })
document.addEventListener('st:datepicker:close', e => { /* e.detail: { input } */ })
```

### Disable specific dates or weekdays

```js
StrataPicker.date('#el', {
  disable: [
    '2026-12-25',
    '2026-01-01',
    date => date.getDay() === 0,   // all Sundays
  ]
})
```

Or via attribute: `data-st-disabled-days="0,6"` (0=Sun, 6=Sat).

### Date range

```html
<input id="start" data-st-datepicker data-st-range data-st-end-input="#end" name="start">
<input id="end" name="end" readonly>
```

### Presets

```js
// Default presets: Today / Yesterday / Last 7 days / Last 30 days / This month / Last month
StrataPicker.date('#el', { presets: true })

// Custom presets
StrataPicker.date('#el', {
  presets: [
    { label: 'Next week',  fn: today => { const d = new Date(today); d.setDate(d.getDate() + 7); return [d, d] } },
    { label: 'This year',  fn: today => [ new Date(today.getFullYear(), 0, 1), new Date(today.getFullYear(), 11, 31) ] },
  ]
})
```

---

## Time Picker

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `hour24` | bool | `false` | 24-hour format |
| `step` | number | `5` | Minute (and second) increment |
| `showSeconds` | bool | `false` | Show seconds column |
| `theme` | object | — | Inline CSS variable overrides |
| `className` | string | — | Extra class(es) on popup |

### Data attributes

```html
<input data-st-timepicker
       data-st-hour24="true"
       data-st-step="15"
       data-st-show-seconds>
```

### Methods

```js
const tp = StrataPicker.time('#myTime', options)

tp.open()
tp.close()
tp.setTime(14, 30)        // set to 14:30
tp.setTime(14, 30, 45)    // with seconds
tp.getTime()              // → { hour, minute, second, formatted }
tp.destroy()
```

### Events

```js
document.addEventListener('st:timepicker:change', e => {
  // e.detail: { input, value, hour, minute, second, period }
})
```

---

## DateTime Picker

Combines a calendar and time columns in one popup.

```js
StrataPicker.datetime('#el', {
  format:      'YYYY-MM-DD HH:mm',
  hour24:      true,
  step:        15,
  weekStart:   1,
})
```

### Methods

```js
const dtp = StrataPicker.datetime('#myDT', options)

dtp.open()
dtp.close()
dtp.setDate('2026-06-15')
dtp.getDate()             // → Date or null
dtp.destroy()
```

### Events

```js
document.addEventListener('st:datetimepicker:change', e => {
  // e.detail: { input, value, date, hour, minute }
})
```

---

## Theming

### Per-instance via `theme` option

```js
StrataPicker.date('#el', {
  theme: {
    primary:      '#7c3aed',
    primaryHover: '#6d28d9',
    bg:           '#1e1e2e',
    bgAlt:        '#2a2a3e',
    text:         '#cdd6f4',
    muted:        '#a6adc8',
    border:       '#45475a',
    radius:       '0.75rem',
    shadow:       '0 1rem 3rem rgba(0,0,0,0.5)',
    cellSize:     '2.25rem',
    fontSize:     '0.9rem',
  }
})
```

### Per-instance via `className` + CSS

```js
StrataPicker.date('#el', { className: 'my-picker' })
```
```css
.my-picker {
  --stp-primary:   #f59e0b;
  --stp-radius:    0;
  --stp-cell-size: 2.5rem;
}
```

### Global override

```css
:root {
  --stp-primary:   #7c3aed;
  --stp-radius:    0.5rem;
  --stp-font-size: 1rem;
}
```

### CSS variable reference

| Variable | Default | Controls |
|---|---|---|
| `--stp-bg` | `#ffffff` | Popup background |
| `--stp-bg2` | `#f8f9fa` | Hover / secondary background |
| `--stp-text` | `#212529` | Main text colour |
| `--stp-muted` | `#6c757d` | Weekday names, column labels |
| `--stp-border` | `#dee2e6` | All borders |
| `--stp-radius` | `0.375rem` | Corner rounding |
| `--stp-primary` | `#0d6efd` | Selected day, active items, Apply button |
| `--stp-primary-h` | `#0b5ed7` | Primary hover |
| `--stp-shadow` | `0 0.5rem 1rem …` | Popup drop shadow |
| `--stp-focus` | `0 0 0 0.25rem …` | Focus ring |
| `--stp-dur` | `150ms` | Transition speed |
| `--stp-cell` | `2rem` | Day cell width and height |
| `--stp-font-size` | `0.9rem` | Base font size |

When Strata CSS is present (`data-strata` on `<html>`), `--stp-*` variables automatically inherit from Strata's `--st-*` tokens so the picker follows the active theme (light / dark / dim) with no extra config.

---

## Backend Compatibility

- The picker writes its value as a plain string into the input's `value` attribute
- The input keeps its `name` — form submission works with any backend
- Range mode uses two separate `<input>` elements, each with their own `name`
- `required` is not set by the picker — add it to the `<input>` if needed

---

## Known Limitations

- No inline (always-visible) mode — popup only
- Date range requires two separate inputs (no single-input range mode)
- Time picker does not parse an existing input value on open

---

## Documentation

Full API reference, options and live examples: **[https://strata-css-docs-site.vercel.app/packages/picker](https://strata-css-docs-site.vercel.app/packages/picker)**

`@strata-packages/picker` is part of **[Strata CSS](https://github.com/AftabIbrahimKazi/strata)** — a JIT CSS framework that pairs Bootstrap-style component classes with Tailwind-style on-demand generation, cascade layers instead of `!important`, variants (`hover:`, `group-hover:`, `peer-checked:`), arbitrary values and three built-in themes.

- Framework docs — [https://strata-css-docs-site.vercel.app](https://strata-css-docs-site.vercel.app)
- Source and issues — [https://github.com/AftabIbrahimKazi/strata](https://github.com/AftabIbrahimKazi/strata)
- Framework on npm — [strata-css](https://www.npmjs.com/package/strata-css)

### Other Strata packages

| Package | What it does |
|---|---|
| [`@strata-packages/chart`](https://www.npmjs.com/package/@strata-packages/chart) | Three.js chart component. Works standalone or with Strata CSS. |
| [`@strata-packages/cursorfx`](https://www.npmjs.com/package/@strata-packages/cursorfx) | Modular cursor effects — one shared engine, ten opt-in presets. Works standalone or with Strata CSS. |
| [`@strata-packages/flipbook`](https://www.npmjs.com/package/@strata-packages/flipbook) | PDF and HTML flipbook viewer with page-flip animation. Works standalone or with Strata CSS. |
| [`@strata-packages/forms`](https://www.npmjs.com/package/@strata-packages/forms) | Interactive form controls for Strata CSS — custom select with every variant developers need. |
| [`@strata-packages/modal`](https://www.npmjs.com/package/@strata-packages/modal) | Lightweight modal component. Works standalone or with Strata CSS. |
| [`@strata-packages/offcanvas`](https://www.npmjs.com/package/@strata-packages/offcanvas) | Lightweight offcanvas drawer component. Works standalone or with Strata CSS. |
| [`@strata-packages/shopmap`](https://www.npmjs.com/package/@strata-packages/shopmap) | Lightweight, theme-aware map component with terrain, hypsometric tinting, and procedural hillshading. Zero API keys. Free for commercial use. |
| [`@strata-packages/skeleton-loader`](https://www.npmjs.com/package/@strata-packages/skeleton-loader) | Lightweight skeleton loader plugin. Works standalone or with Strata CSS. |

---

## License

MIT © [Aftab Ibrahim Kazi](https://github.com/AftabIbrahimKazi)
