# @strata-css/forms — Developer Reference

## What it is

Interactive form controls — custom select, date picker, and time picker. Works standalone (no dependencies) or integrated with Strata CSS.

## Installation

```bash
npm install @strata-css/forms
```

## Usage

### Standalone

```html
<link  rel="stylesheet" href="node_modules/@strata-css/forms/forms.css">
<script src="node_modules/@strata-css/forms/forms.js"></script>
```

Available as `StrataForms`.

### With Strata CSS

```html
<script src="node_modules/strata-css/dist/strata.components.js"></script>
```

Available as `Strata.Forms`. Do **not** load `forms.js` separately.

## Auto-init (declarative)

Add `data-st-select`, `data-st-datepicker`, or `data-st-timepicker` to elements — they initialize automatically on `DOMContentLoaded`.

```html
<select data-st-select name="service">
  <option value="">Choose a service</option>
  <option value="hair">Hair</option>
  <option value="nails">Nails</option>
</select>

<input data-st-datepicker name="date" placeholder="Select date">
<input data-st-timepicker name="time" placeholder="Select time">
```

---

## Custom Select

Replaces a native `<select>` with a fully styled, accessible dropdown. The native `<select>` stays in the DOM (hidden) for form submission.

### Programmatic init

```js
const sel = Strata.Forms.select('#mySelect')
// or
const sel = Strata.Forms.select('#mySelect', { placeholder: 'Choose…' })
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `placeholder` | string | `'Select…'` | Text shown when no value selected |

Or via data attributes on the `<select>`:
```html
<select data-st-select data-st-placeholder="Choose a service">
```

### Methods

```js
sel.open()              // open dropdown
sel.close()             // close dropdown
sel.setValue('hair')    // select by value
sel.getValue()          // → 'hair'
sel.destroy()           // remove custom select, restore native
```

### Events

```js
document.addEventListener('st:select:open',   e => { /* e.detail: { select } */ })
document.addEventListener('st:select:close',  e => { /* e.detail: { select } */ })
document.addEventListener('st:select:change', e => {
  // e.detail: { select, value, text, index }
})
```

### CSS variables

```css
.st-select-trigger {
  --st-select-height: 2.5rem;  /* control height */
}
```

---

## Date Picker

Attaches a calendar popup to any `<input>`. Populates the input with the selected date string.

### Programmatic init

```js
const dp = Strata.Forms.datepicker('#myDate')
const dp = Strata.Forms.datepicker('#myDate', {
  format: 'DD/MM/YYYY',
  min:    '2026-01-01',
  max:    '2026-12-31',
})
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `format` | string | `'YYYY-MM-DD'` | Output format — tokens: `YYYY MM DD` |
| `min` | string | — | Minimum selectable date (ISO string) |
| `max` | string | — | Maximum selectable date (ISO string) |

Or via data attributes:
```html
<input data-st-datepicker
       data-st-format="DD/MM/YYYY"
       data-st-min="2026-01-01"
       data-st-max="2026-12-31">
```

### Methods

```js
dp.open()
dp.close()
dp.setDate('2026-06-15')   // programmatically select a date
dp.getDate()               // → Date object or null
dp.destroy()
```

### Events

```js
document.addEventListener('st:datepicker:open',   e => { /* e.detail: { input } */ })
document.addEventListener('st:datepicker:close',  e => { /* e.detail: { input } */ })
document.addEventListener('st:datepicker:change', e => {
  // e.detail: { input, date, formatted }
  // date: Date object, formatted: string in chosen format
})
```

### UI

- **Header** — month/year label with prev/next navigation buttons
- **Grid** — 7×n calendar grid; today highlighted, selected day filled
- **Footer** — "Today" shortcut and "Clear" button
- Disabled dates shown faded and non-interactive
- Popup flips above input if insufficient space below

---

## Time Picker

Attaches a scrollable hour/minute/period column popup to any `<input>`.

### Programmatic init

```js
const tp = Strata.Forms.timepicker('#myTime')
const tp = Strata.Forms.timepicker('#myTime', {
  hour24: true,
  step:   15,      // minute step
})
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `hour24` | boolean | `false` | Use 24-hour format instead of 12h AM/PM |
| `step` | number | `5` | Minute increment |

Or via data attributes:
```html
<input data-st-timepicker data-st-hour24="true" data-st-step="15">
```

### Methods

```js
tp.open()
tp.close()
tp.setTime(14, 30)    // set to 14:30 (24h) or 2:30 PM (12h)
tp.getTime()          // → { hour, minute, formatted }
tp.destroy()
```

### Events

```js
document.addEventListener('st:timepicker:open',   e => { /* e.detail: { input } */ })
document.addEventListener('st:timepicker:close',  e => { /* e.detail: { input } */ })
document.addEventListener('st:timepicker:change', e => {
  // e.detail: { input, value, hour, minute, period }
  // hour: 0-23 always, period: 'AM'|'PM' (null in 24h mode)
})
```

### UI

- **Hour column** — 1–12 (12h) or 00–23 (24h)
- **Minute column** — scrollable, increment controlled by `step`
- **AM/PM column** — only in 12h mode
- **Set time** button applies value and closes popup
- Selected items scroll into view on open

---

## Keyboard Support

| Component | Key | Action |
|---|---|---|
| Select | `↓` / `↑` | Navigate options (opens if closed) |
| Select | `Enter` / `Space` | Toggle open/close |
| Select | `Escape` | Close |
| Datepicker | `Enter` / `Space` | Open |
| Datepicker | `Escape` | Close |
| Timepicker | `Enter` / `Space` | Open |
| Timepicker | `Escape` | Close |

---

## Destroy all

```js
Strata.Forms.destroy('#mySelect')   // remove a single instance
```

---

## Known Limitations

- Custom select reads options from the native `<select>` at init time — dynamically added `<option>` elements after init are not reflected. Call `destroy()` then re-init to refresh.
- Date picker does not support range selection (start + end date).
- Time picker does not parse an existing input value on open — it starts with no selection each time.
- All popups are appended to `<body>` and positioned with `fixed` — they work inside scroll containers and modals.
