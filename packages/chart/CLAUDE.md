# @strata-css/chart — Developer Reference

## What it is

A Three.js-powered interactive chart component with 2D/3D toggle. Supports bar, line, pie, and scatter charts. Works standalone or with Strata CSS.

## Requirements

Three.js must be loaded **before** this script. `window.THREE` must exist.

```html
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
<script src="node_modules/@strata-css/chart/chart.js"></script>
```

## Installation

```bash
npm install @strata-css/chart three
```

## Usage

### Standalone

```html
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
<script src="node_modules/@strata-css/chart/chart.js"></script>
```

Available as `StrataChart.create()`.

### With Strata CSS

```html
<script src="node_modules/strata-css/dist/strata.components.js"></script>
```

Available as `Strata.Chart.create()`. Do **not** load `chart.js` separately.

## Quick Start

```html
<div id="myChart" style="width:600px; height:400px;"></div>

<script>
  const chart = Strata.Chart.create('#myChart', {
    type: 'bar',
    view: '2d',
    data: [
      { label: 'Jan', value: 42 },
      { label: 'Feb', value: 67 },
      { label: 'Mar', value: 53 },
    ],
  })
</script>
```

## Options

```js
Strata.Chart.create(selector, {
  // Required
  type:  'bar' | 'line' | 'pie' | 'scatter',

  // View
  view:  '2d' | '3d',           // default: '2d'
  theme: 'auto' | 'light' | 'dark', // default: 'auto' (follows data-st-theme)

  // Data
  data: [
    { label: string, value: number, category?: string }
  ],
  colors: ['#hex', ...],         // custom color palette

  // Feature flags (all default false)
  gridView:                false, // scale reference grid
  showAxisLabels:          false, // X-axis category labels
  showScale:               false, // Y-axis numeric scale indicators
  showGridLabels:          false, // labels at each horizontal grid line
  highlightGridOnInteract: false, // highlight grid lines on hover/click

  // Callbacks
  onReady:  (chart) => void,     // fires when Three.js scene is ready
  onChange: (view)  => void,     // fires on 2D/3D toggle
  onClick:  (point) => void,     // fires on data point click
})
```

## Methods

```js
const chart = Strata.Chart.create('#myChart', options)

chart.toggleView()               // toggle between 2D and 3D
chart.setView('3d')              // set specific view

chart.update(newData)            // replace all data
chart.addDataPoint({ label, value, category? })
chart.addDataPoints([...])
chart.removeDataPoint(index)
chart.removeDataPoints([0, 2, 4])
chart.updateDataPoint(index, { label?, value?, category? })

chart.destroy()                  // remove canvas, clean up Three.js resources
```

## Data Format

```js
// Minimal
{ label: 'Q1', value: 120 }

// With category (used for grouping / color in some chart types)
{ label: 'Q1', value: 120, category: 'Revenue' }
```

Maximum data points: **100,000**.

## Chart Types

| Type | Best for |
|---|---|
| `bar` | Comparing discrete categories |
| `line` | Trends over time |
| `pie` | Part-to-whole proportions |
| `scatter` | Correlation between variables |

## Data Attributes (set on container)

The chart sets these on the container element for CSS styling hooks:

| Attribute | Values |
|---|---|
| `data-st-chart-view` | `'2d'` / `'3d'` |
| `data-st-chart-type` | `'bar'` / `'line'` / `'pie'` / `'scatter'` |
| `data-st-chart-loading` | `'true'` / `'false'` |
| `data-st-chart-animated` | `'true'` / `'false'` |
| `data-st-chart-hovered` | `'true'` / `'false'` |

```css
/* Style loading state */
[data-st-chart-loading="true"] { opacity: 0.5; }

/* Style by type */
[data-st-chart-type="pie"] { border-radius: 50%; }
```

## Events

All events fire on `document`:

```js
document.addEventListener('st:chart:ready',   (e) => { /* e.detail: { chart, view } */ })
document.addEventListener('st:chart:change',  (e) => { /* e.detail: { chart, from, to } */ })
document.addEventListener('st:chart:update',  (e) => { /* e.detail: { chart } */ })
document.addEventListener('st:chart:click',   (e) => { /* e.detail: { label, value, category, index } */ })
document.addEventListener('st:chart:destroy', (e) => { /* e.detail: { chart } */ })
```

## Theme Integration

`theme: 'auto'` reads `data-st-theme` from the nearest ancestor and updates colors automatically. No manual theme handling needed when using Strata CSS.

```js
// Manually follow Strata theme
const chart = Strata.Chart.create('#myChart', { theme: 'auto', ... })

// Force a theme
const chart = Strata.Chart.create('#myChart', { theme: 'dark', ... })
```

## Camera Positions

The component uses two fixed camera presets:

| View | Position | FOV | Character |
|---|---|---|---|
| `2d` | `(0, 2, 22)` | 18° | Near-orthographic flat projection |
| `3d` | `(3.5, 6.5, 9.5)` | 42° | Elevated diagonal, cinematic |

## Known Limitations

- Requires `window.THREE` — Three.js must be loaded before the chart script.
- Container element must have explicit `width` and `height` (or CSS dimensions). Zero-size containers produce a blank canvas.
- Maximum 100,000 data points before performance degrades.
- SSR/Node environments not supported — requires `window` and `document`.
- Pie chart does not currently support 3D view (falls back to 2D).
