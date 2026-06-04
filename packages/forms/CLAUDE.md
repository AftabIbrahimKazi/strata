# @strata-css/forms — Developer Reference

## What it is

Interactive form controls — a comprehensive custom select replacement with every select variant developers need. Works standalone or with Strata CSS.

> **Note:** Date, time, and datetime pickers are in a separate package: [`@strata-css/picker`](../picker/CLAUDE.md).

## Installation

```bash
npm install @strata-css/forms
```

## Usage

### Standalone

```html
<link rel="stylesheet" href="node_modules/@strata-css/forms/forms.css">
<script src="node_modules/@strata-css/forms/forms.js"></script>
```

Available as `StrataForms`.

### With Strata CSS

```html
<script src="node_modules/strata-css/dist/strata.components.js"></script>
```

Available as `Strata.Forms`. Do **not** load `forms.js` separately.

---

## Custom Select

A fully accessible replacement for the native `<select>`. The native element stays in the DOM (hidden) for form submission — backend receives values identically to a plain select.

### Quick Start

```html
<!-- Declarative — auto-inits on DOMContentLoaded -->
<select data-st-select name="service">
  <option value="">Choose a service…</option>
  <option value="hair">Hair Styling</option>
  <option value="nails">Nails</option>
</select>
```

```js
// Programmatic
const sel = StrataForms.select('#mySelect', options)
```

---

## All Select Variants

All variants are **composable** — combine any set of options together.

### Single (default)

```js
StrataForms.select('#el', { placeholder: 'Choose…' })
```

### Multi-select — chips

```js
StrataForms.select('#el', {
  multiSelect: true,
  placeholder: 'Choose services…',
})
```
```html
<select data-st-select data-st-multi name="services[]" multiple>
```

Selected items render as removable chips in the trigger.

### Multi-select — max items

```js
StrataForms.select('#el', { multiSelect: true, maxItems: 3 })
```
```html
<select data-st-select data-st-multi data-st-max-items="3" multiple>
```

### maxDisplay — fixed-height chip trigger

Caps visible chips at N, shows `+N` badge for the rest. Prevents trigger from growing taller as more items are selected.

```js
StrataForms.select('#el', { multiSelect: true, maxDisplay: 3 })
```

Useful for avatar-only multi-selects:

```js
StrataForms.select('#el', {
  multiSelect:  true,
  maxDisplay:   3,
  renderValue:  opt => `<img src="${opt.dataset.avatar}" class="st-sel-avatar" title="${opt.text}">`,
})
```

### Searchable

Adds a search input inside the dropdown. Works with both single and multi.

```js
StrataForms.select('#el', { searchable: true })
```
```html
<select data-st-select data-st-searchable>
```

### Clearable

Shows a × button in the trigger when a value is selected.

```js
StrataForms.select('#el', { clearable: true })
```
```html
<select data-st-select data-st-clearable>
```

### Grouped options

Reads `<optgroup>` from the native select automatically — no extra config.

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

User can type a new value and add it to the list. Requires `searchable: true`.

```js
StrataForms.select('#el', { multiSelect: true, searchable: true, creatable: true })
```
```html
<select data-st-select data-st-multi data-st-searchable data-st-creatable multiple>
```

### Avatar / Custom render

```js
StrataForms.select('#el', {
  renderOption: opt => `
    <img src="${opt.dataset.avatar}" class="st-sel-avatar">
    <span><strong>${opt.text}</strong><small>${opt.dataset.role}</small></span>`,
  renderValue: opt => `<img src="${opt.dataset.avatar}" class="st-sel-avatar"> ${opt.text}`,
})
```

`renderOption` controls each option row in the dropdown.
`renderValue` controls how the selected value appears in the trigger (or as a chip in multi).

### Async / Remote

```js
StrataForms.select('#el', {
  searchable:  true,
  loadOptions: function(query, callback) {
    fetch(`/api/search?q=${query}`)
      .then(r => r.json())
      .then(items => callback(items))  // items: [{ value, text }]
  },
})
```

Called on open (with empty query) and on every search input change.

### Auto-width

Dropdown expands to fit its content. Viewport edge detection auto-flips alignment when the dropdown would overflow the right edge of the screen.

```js
StrataForms.select('#el', { autoWidth: true, maxWidth: 320 })
```
```html
<select data-st-select data-st-auto-width data-st-max-width="320">
```

### Checkbox select

Dropdown stays open while ticking. Each option shows a checkbox. Includes Select All row and group-level checkboxes.

```js
StrataForms.select('#el', {
  checkboxes:      true,
  checkboxDisplay: 'count',   // 'chips' | 'count' | 'list'
  selectAll:       true,      // default true when checkboxes: true
})
```
```html
<select data-st-select data-st-checkboxes data-st-checkbox-display="count" multiple>
```

`checkboxDisplay` controls what the trigger shows:
- `chips` — removable chip tags (default)
- `count` — `"3 of 6 selected"`
- `list` — `"Hair, Nails, Facial"`

Disable Select All: `data-st-no-select-all`.

---

## All Options Reference

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
| `selectAll` | bool | `data-st-no-select-all` (to disable) | Select All checkbox header |
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
sel.setValue('hair')          // single: set by value
sel.setValues(['hair','nails'])// multi: set multiple
sel.getValue()                // single → string; multi → string[]
sel.clear()                   // deselect all
sel.destroy()                 // remove custom select, restore native
```

---

## Events

```js
document.addEventListener('st:select:open',   e => { /* e.detail: { select } */ })
document.addEventListener('st:select:close',  e => { /* e.detail: { select } */ })
document.addEventListener('st:select:change', e => {
  // e.detail: { select, value, text, values, index }
  // value / text: string (single) or first item (multi)
  // values: always an array — use this for multi
})
```

---

## Backend Compatibility

- Native `<select>` stays in the DOM — form submission works with any backend
- `name` attribute preserved — `$_POST['service']` or `request.POST['service']` works normally
- Multi-select: use `name="services[]"` (PHP) or `name="services"` (Django/Rails)
- `required` attribute: fires a visible error state on the custom trigger when form validation fails
- Pre-selected values: `<option selected>` is respected at init time

---

## CSS Tokens

All component colors use local CSS variables — override per-instance, per-context, or per-theme:

```css
/* Per theme */
[data-st-theme="dark"] .btn-warning { --st-btn-color: #000; }

/* Per context */
.dark-card .st-select-trigger { border-color: #4a5568; }

/* Per instance (inline) */
<select style="--st-select-height: 3rem" data-st-select>
```

---

## Known Limitations

- `renderOption` / `renderValue` output is set via `innerHTML` — sanitise untrusted data before passing
- `loadOptions` does not debounce internally — add your own debounce wrapper if needed
- Dynamic `<option>` elements added after init are not reflected — call `destroy()` then re-init to refresh
