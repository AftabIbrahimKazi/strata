# @strata-packages/picker — Developer Reference

## What it is

A standalone date, time, and datetime picker. Zero dependencies. Works without Strata CSS or with Strata CSS seamlessly — when Strata is detected via `data-strata` on `<html>`, the picker's CSS variables automatically map to Strata's design tokens.

## Installation

```bash
npm install @strata-packages/picker
```

## Usage

### Standalone

```html
<link rel="stylesheet" href="node_modules/@strata-packages/picker/picker.css">
<script src="node_modules/@strata-packages/picker/picker.js"></script>
```

Available as `StrataPicker`.

### With Strata CSS

```html
<script src="node_modules/strata-css/dist/strata.components.js"></script>
```

Available as `Strata.Picker`. Do **not** load `picker.js` separately.

---

## Quick Start

```html
<!-- Declarative — auto-inits on DOMContentLoaded -->
<input data-st-datepicker   name="date"        placeholder="Select date">
<input data-st-timepicker   name="time"        placeholder="Select time">
<input data-st-datetimepicker name="appointment" placeholder="Select date and time">
```

```js
// Programmatic
const dp  = StrataPicker.date('#myDate')
const tp  = StrataPicker.time('#myTime')
const dtp = StrataPicker.datetime('#myDT')
```

---

## Date Picker

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `format` | string | `'YYYY-MM-DD'` | Output format. Tokens: `YYYY MM DD` |
| `weekStart` | `0\|1` | `0` | Week start day: `0`=Sunday, `1`=Monday |
| `min` | string | — | Minimum selectable date (ISO string) |
| `max` | string | — | Maximum selectable date (ISO string) |
| `disable` | array | `[]` | Array of date strings or `(Date) => bool` functions |
| `range` | bool | `false` | Enable date range selection |
| `endInput` | string | — | Selector for range end input |
| `presets` | `bool\|array` | `false` | Show preset shortcuts (`true` = defaults, or custom array) |
| `theme` | object | — | Inline CSS variable overrides (see Theming) |
| `className` | string | — | Extra class(es) added to the popup element |

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
dp.setDate('2026-06-15')       // programmatically select a date
dp.getDate()                   // → Date object or null
dp.getRange()                  // → { start: Date|null, end: Date|null }
dp.destroy()
```

### Events

```js
document.addEventListener('st:datepicker:open',   e => { /* e.detail: { input } */ })
document.addEventListener('st:datepicker:close',  e => { /* e.detail: { input } */ })
document.addEventListener('st:datepicker:change', e => {
  // e.detail: { input, date, dateEnd, formatted, formattedEnd }
})
```

### Disable logic

```js
StrataPicker.date('#el', {
  disable: [
    '2026-12-25',                               // specific date (string)
    '2026-01-01',
    function(date) { return date.getDay() === 0 } // all Sundays
  ]
})
```

Or via attribute for weekdays: `data-st-disabled-days="0,6"` (0=Sun, 6=Sat).

### Date range

```html
<input id="start" data-st-datepicker data-st-range data-st-end-input="#end" name="start">
<input id="end" name="end" readonly>
```

- First click sets start date, highlights it, waits for end date
- Second click sets end date, highlights the range between both dates
- Clicking end input opens the same calendar in end-select mode

### Presets

```js
// Default presets: Today / Yesterday / Last 7 days / Last 30 days / This month / Last month
StrataPicker.date('#el', { presets: true })

// Custom presets
StrataPicker.date('#el', {
  presets: [
    { label: 'Next week',  fn: (today) => { const d = new Date(today); d.setDate(d.getDate()+7); return [d, d] } },
    { label: 'This year',  fn: (today) => [ new Date(today.getFullYear(), 0, 1), new Date(today.getFullYear(), 11, 31) ] },
  ]
})
```

### Navigation

- Click the **month/year title** → switch to month grid
- Click the **year** in month view → switch to year grid
- Click a year → back to month grid
- Click a month → back to day grid

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
tp.setTime(14, 30)        // set to 14:30 (always pass 24h hour)
tp.setTime(14, 30, 45)    // with seconds
tp.getTime()              // → { hour, minute, second, formatted }
tp.destroy()
```

### Events

```js
document.addEventListener('st:timepicker:change', e => {
  // e.detail: { input, value, hour, minute, second, period }
  // hour: 0–23 always; period: 'AM'|'PM' (null in 24h mode)
})
```

---

## DateTime Picker

Combines a calendar and time columns in one popup. Uses a space-separated format: date part + time part.

### Options

All date options + all time options apply. Format covers both parts:

```js
StrataPicker.datetime('#el', {
  format:      'YYYY-MM-DD HH:mm',  // 24h datetime
  // or
  format:      'YYYY-MM-DD hh:mm',  // 12h datetime
  hour24:      true,                // force 24h regardless of format
  step:        15,
  showSeconds: false,
  weekStart:   1,
  disable:     [d => d.getDay() === 0],
})
```

### Methods

```js
const dtp = StrataPicker.datetime('#myDT', options)

dtp.open()
dtp.close()
dtp.setDate('2026-06-15')   // set date part only
dtp.getDate()               // → Date or null
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

Three levels — all composable:

### 1. `theme` option — per instance, no CSS needed

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

### 2. `className` option — target with CSS

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

### 3. Global override — affects all pickers on page

```css
:root {
  --stp-primary:   #7c3aed;
  --stp-radius:    0.5rem;
  --stp-font-size: 1rem;
}
```

### Full CSS variable reference

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
| `--stp-focus` | `0 0 0 0.25rem …` | Focus ring on Apply button |
| `--stp-dur` | `150ms` | Transition speed |
| `--stp-cell` | `2rem` | Day cell width and height |
| `--stp-font-size` | `0.9rem` | Base font size for popup content |

When Strata CSS is present (`data-strata` on `<html>`), `--stp-*` variables automatically inherit from `--st-*` tokens, so the picker follows the active Strata theme (light/dark/dim) without any extra configuration.

---

## Backend Compatibility

- The picker writes its value as a plain string to the input's `value` attribute
- The input keeps its `name` attribute — form submission works normally with any backend
- Range mode uses two separate `<input>` elements, each with their own `name`
- `required` is not set by the picker — add it to the input if needed

---

## Known Limitations

- No inline (always-visible) mode in this version — popup only
- Date range does not support single-input mode (start and end must be separate inputs)
- Time picker does not parse an existing input value on open — starts with no selection
