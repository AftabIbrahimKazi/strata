# @strata-packages/forms

> Interactive form controls for [Strata CSS](https://github.com/AftabIbrahimKazi/strata) — a fully accessible custom select with every variant developers need. Zero dependencies. Works standalone or as part of Strata.

[![npm](https://img.shields.io/npm/v/@strata-packages/forms)](https://www.npmjs.com/package/@strata-packages/forms)
[![license](https://img.shields.io/npm/l/@strata-packages/forms)](LICENSE)

> Looking for date / time pickers? See [`@strata-packages/picker`](https://www.npmjs.com/package/@strata-packages/picker).

---

## Installation

```bash
npm install @strata-packages/forms
```

---

## Usage

### Standalone

```html
<link rel="stylesheet" href="node_modules/@strata-packages/forms/forms.css">
<script src="node_modules/@strata-packages/forms/forms.js"></script>
```

Available as `StrataForms`.

### With Strata CSS

The forms package is bundled into Strata's component build — do **not** load `forms.js` separately when using the full Strata bundle.

Available as `Strata.Forms`.

---

## Quick Start

### Declarative — auto-inits on DOMContentLoaded

```html
<select data-st-select name="service">
  <option value="">Choose a service…</option>
  <option value="hair">Hair Styling</option>
  <option value="nails">Nails</option>
</select>
```

### Programmatic

```js
const sel = StrataForms.select('#mySelect', options)
```

---

## Select Variants

All variants are composable — combine any set of options together.

### Single select (default)

```js
StrataForms.select('#el', { placeholder: 'Choose…' })
```

### Multi-select with chips

```html
<select data-st-select data-st-multi name="services[]" multiple>
```

```js
StrataForms.select('#el', { multiSelect: true, placeholder: 'Choose services…' })
```

Selected items render as removable chips in the trigger.

### Multi-select with max items

```js
StrataForms.select('#el', { multiSelect: true, maxItems: 3 })
```

### maxDisplay — fixed-height chip trigger

Caps visible chips at N, shows `+N` badge for the rest.

```js
StrataForms.select('#el', { multiSelect: true, maxDisplay: 3 })
```

### Searchable

```html
<select data-st-select data-st-searchable>
```

```js
StrataForms.select('#el', { searchable: true })
```

### Clearable

Shows a `×` button when a value is selected.

```html
<select data-st-select data-st-clearable>
```

### Grouped options

Reads `<optgroup>` from the native select automatically — no config needed.

```html
<select data-st-select>
  <optgroup label="Hair">
    <option value="cut">Hair Cut</option>
    <option value="color">Hair Colour</option>
  </optgroup>
  <optgroup label="Nails">
    <option value="mani">Manicure</option>
  </optgroup>
</select>
```

### Creatable

User can type a new value and add it. Requires `searchable: true`.

```html
<select data-st-select data-st-multi data-st-searchable data-st-creatable multiple>
```

```js
StrataForms.select('#el', { multiSelect: true, searchable: true, creatable: true })
```

### Avatar / custom render

```js
StrataForms.select('#el', {
  renderOption: opt => `
    <img src="${opt.dataset.avatar}" class="st-sel-avatar">
    <span><strong>${opt.text}</strong><small>${opt.dataset.role}</small></span>`,
  renderValue: opt => `<img src="${opt.dataset.avatar}" class="st-sel-avatar"> ${opt.text}`,
})
```

### Async / remote options

```js
StrataForms.select('#el', {
  searchable:  true,
  loadOptions: (query, callback) => {
    fetch(`/api/search?q=${query}`)
      .then(r => r.json())
      .then(items => callback(items))  // items: [{ value, text }]
  },
})
```

### Auto-width

Dropdown expands to fit content. Flips alignment automatically at viewport edge.

```html
<select data-st-select data-st-auto-width data-st-max-width="320">
```

```js
StrataForms.select('#el', { autoWidth: true, maxWidth: 320 })
```

### Checkbox select

Dropdown stays open while ticking. Includes Select All and group-level checkboxes.

```html
<select data-st-select data-st-checkboxes data-st-checkbox-display="count" multiple>
```

```js
StrataForms.select('#el', {
  checkboxes:      true,
  checkboxDisplay: 'count',   // 'chips' | 'count' | 'list'
  selectAll:       true,
})
```

`checkboxDisplay` values:
- `chips` — removable chip tags (default)
- `count` — `"3 of 6 selected"`
- `list` — `"Hair, Nails, Facial"`

---

## All Options

| Option | Type | Data attribute | Description |
|---|---|---|---|
| `placeholder` | string | `data-st-placeholder` | Trigger text when nothing selected |
| `multiSelect` | bool | `data-st-multi` | Multiple selection mode |
| `searchable` | bool | `data-st-searchable` | Search input in dropdown |
| `clearable` | bool | `data-st-clearable` | × clear button |
| `creatable` | bool | `data-st-creatable` | Add new options by typing |
| `maxItems` | number | `data-st-max-items` | Cap multi-select count |
| `maxDisplay` | number | `data-st-max-display` | Cap visible chips, show +N badge |
| `checkboxes` | bool | `data-st-checkboxes` | Checkbox UI, dropdown stays open |
| `checkboxDisplay` | string | `data-st-checkbox-display` | `chips` / `count` / `list` |
| `selectAll` | bool | `data-st-no-select-all` to disable | Select All checkbox header |
| `autoWidth` | bool | `data-st-auto-width` | Expand dropdown to content width |
| `maxWidth` | number | `data-st-max-width` | Cap auto-width expansion |
| `renderOption` | function | JS only | Custom HTML per option in dropdown |
| `renderValue` | function | JS only | Custom HTML for selected value / chip |
| `loadOptions` | function | JS only | Async option loading |

---

## Methods

```js
const sel = StrataForms.select('#el', options)

sel.open()
sel.close()
sel.setValue('hair')           // single — set by value
sel.setValues(['hair','nails']) // multi — set multiple
sel.getValue()                 // single → string; multi → string[]
sel.clear()                    // deselect all
sel.destroy()                  // remove custom select, restore native
```

---

## Events

```js
document.addEventListener('st:select:change', e => {
  // e.detail: { select, value, text, values, index }
  // value / text: string (single) or first item (multi)
  // values: always an array — use this for multi
})
document.addEventListener('st:select:open',  e => { /* e.detail: { select } */ })
document.addEventListener('st:select:close', e => { /* e.detail: { select } */ })
```

---

## Backend Compatibility

- Native `<select>` stays in the DOM — form submission works with any backend
- `name` attribute preserved — `$_POST['service']` or `request.POST['service']` works normally
- Multi-select: use `name="services[]"` (PHP) or `name="services"` (Django / Rails)
- `required` attribute triggers visible error state on the custom trigger when form validation fails
- Pre-selected values: `<option selected>` is respected at init time

---

## CSS Tokens

Override per-instance, per-context, or per-theme — no `!important` needed.

```css
/* Per theme */
[data-st-theme="dark"] .st-select-trigger {
  --st-select-bg: #1e1e2e;
  --st-select-border: #45475a;
}

/* Per instance */
<select style="--st-select-height: 3rem" data-st-select>
```

---

## Known Limitations

- `renderOption` / `renderValue` output is set via `innerHTML` — sanitise untrusted data before passing
- `loadOptions` does not debounce internally — add your own debounce wrapper if needed
- Dynamic `<option>` elements added after init are not reflected — call `destroy()` then re-init to refresh

---

## License

MIT © [Aftab Ibrahim Kazi](https://github.com/AftabIbrahimKazi)
