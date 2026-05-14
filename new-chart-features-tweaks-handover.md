# Strata Chart Plugin — Handover & Next Session Roadmap

## Current State (as of this session)

### What is built and working
- **4 chart types:** `bar`, `line`, `pie`, `scatter` — all render in Three.js WebGL
- **Seamless 2D ↔ 3D transition:** single `PerspectiveCamera`, lerps position + FOV + mesh depth + group rotation simultaneously over 600ms cubic ease. No camera swap — fully continuous animation.
- **Cinematic 3D angle:** camera at `(3.5, 6.5, 9.5)`, FOV `42°`. Key + fill lighting.
- **Interaction:** per-frame raycaster, emissive hover highlight, floating tooltip (data-attribute driven opacity), `st:chart:click` event + `onClick` callback.
- **Data pipeline:** validate → normalize → categorical aggregate → render. Mirrors `chart-core` classes.
- **Theme adapter:** reads `--st-*` CSS vars for colors and background. Respects `data-st-theme` on `<html>`.
- **State via data attributes only:** `data-st-chart-view`, `data-st-chart-type`, `data-st-chart-loading`, `data-st-chart-animated`, `data-st-chart-hovered`, `data-st-chart-tooltip`. No class toggling, no inline CSS for state.
- **ResizeObserver:** canvas and camera update on container resize.
- **Full disposal:** `.destroy()` cleans up geometries, materials, RAF loop, ResizeObserver, event listeners, tooltip DOM.
- **TypeScript source** compiled with `"module": "None"` + `outFile` to a single IIFE `.js`. Ambient `declare namespace THREE` in `three-global.d.ts` — no runtime import of Three.js.
- **Two example files:** `examples/chart.html` (live demo) and `examples/chart-guide.html` (full tutorial, 13 sections, every API feature with live chart).

---

## File Map

```
src/components/modules/
├── chart/                          ← TypeScript source
│   ├── src/
│   │   ├── chart.ts                ← main plugin (~430 lines)
│   │   └── three-global.d.ts       ← ambient THREE namespace types
│   └── tsconfig.json               ← "module":"None", outFile: ../chart.js
├── chart.js                        ← compiled output (picked up by build script)
├── modal.js
└── skeleton.js

examples/
├── chart.html                      ← live demo (all 4 types, theme toggle, event log)
└── chart-guide.html                ← complete tutorial / API reference

dist/
└── strata.components.js            ← bundled output (~29 KB, includes chart.js)
```

**Build commands:**
```bash
npm run build:chart    # compile TS only (fast)
npm run build          # compile TS + full Strata build
npm run minify         # compile TS + minified build
```

---

## Known Limitations / Things Not Yet Built

### 1. No axes or labels on the canvas
Charts have no X/Y axis lines, tick marks, or value labels drawn inside the Three.js scene. Developers must infer values from the tooltip only.

### 2. No legend
No built-in legend component showing which color = which category. Developers have to build their own outside the canvas.

### 3. No grid lines in 2D mode
The `GridHelper` is hidden in 2D. There are no 2D axis lines either.

### 4. Pie 2D — orbit controls still technically active in background
Controls are disabled on transition to 2D but the OrbitControls object is still attached to the same camera. On re-enable (going back to 3D) the camera snaps back correctly, but OrbitControls internal state (target, spherical) is not explicitly reset.

### 5. Scatter Z randomisation re-rolls on update
In scatter, `Math.random()` is called for Z positions on every `update()` call, so points jump to different Z positions rather than smoothly updating.

### 6. No data animation on first render
Charts appear instantly — there is no "build up" entrance animation (bars growing from zero, line drawing in, pie slices spinning in).

### 7. No stacked bars or grouped bars
Only single-series aggregated bars. No multi-series grouped or stacked bar support.

### 8. No area chart
Variant of line chart with a filled plane beneath the line. Common and often requested.

### 9. No donut variant
Pie chart uses a full cylinder. An inner radius option (`InnerRadius`) would create a donut hole.

### 10. onClick does not highlight / select the clicked mesh persistently
Click fires the event but nothing visually "stays selected". No selected state.

### 11. No touch / mobile orbit
OrbitControls handles touch on most devices but it hasn't been explicitly tested on mobile. Tooltip positioning on touch events is not handled (mousemove only).

### 12. No animation on data update
`chart.update()` swaps geometry instantly. A smooth morph animation (old bars shrinking, new bars growing) would feel much better.

---

## Planned Features for Next Session

### HIGH PRIORITY

#### A. Axis system (`axes: true` option)
Draw X and Y axis lines using `THREE.Line` inside the scene. Add tick marks at regular intervals. Render value labels using `THREE.Sprite` + `CanvasTexture` (a small canvas rendered to a texture, then applied to a billboard sprite — this is the Three.js way to render text without a font loader).
- X axis: category labels below each bar/point
- Y axis: value ticks (0, 25%, 50%, 75%, max)
- Grid lines on XZ plane (subtle, theme-aware color from `--st-border`)
- Axes should also animate during 2D/3D transitions

```js
// Proposed API
Strata.Chart.create('#chart', {
  type: 'bar',
  data: [...],
  axes: true,           // show axes + labels
  grid: true,           // show grid lines
})
```

#### B. Legend (`legend: true` option)
A DOM-based legend rendered outside the canvas (as an absolutely positioned div inside `.strata-chart`) listing each category with its color swatch. Clicking a legend item should toggle that series visible/hidden.
- Uses data attributes: `data-st-chart-legend="true"`, `data-st-chart-legend-item-active="true|false"`
- Styled with Strata CSS vars — no inline CSS
- Responds to theme changes

```js
Strata.Chart.create('#chart', {
  type: 'pie',
  data: [...],
  legend: true,         // show legend div
  legendPosition: 'bottom', // 'bottom' | 'right'
})
```

#### C. Entrance animation (`animate: true` option — currently defined but not implemented)
On first render, play a build-up animation:
- **Bar:** bars grow from `scaleY = 0` to `scaleY = 1` staggered left to right
- **Line:** line draws in segment by segment using `drawRange` on `BufferGeometry`
- **Pie:** slices spin in from `thetaLength = 0` to full arc
- **Scatter:** spheres fade in (`opacity 0 → 1`) staggered

The `animate` option is already in the `ChartOptions` interface but does nothing. Wire it up.

#### D. Data update animation (`updateAnimate: true`)
When `chart.update(newData)` is called, morph the existing geometry to the new values rather than disposing and rebuilding:
- **Bar:** lerp `scaleY` from old height to new height (keep same geometry, animate scale)
- **Line:** lerp vertex positions
- **Scatter:** lerp sphere positions and sizes
- **Pie:** lerp arc angles

This requires storing the "current visual state" separately from the data state.

### MEDIUM PRIORITY

#### E. Donut chart (`type: 'donut'` or `innerRadius` option on pie)
Modify `CylinderGeometry` to use an inner radius: `new THREE.CylinderGeometry(outerR, outerR, height, 80, 1, false, start, arc)` — add a second cylinder cut-out using `THREE.CSG` or simply use a `RingGeometry` for 2D and a tube approach for 3D. Simplest: use `innerRadius` parameter on `CylinderGeometry` (not available directly) — instead subtract a smaller cylinder using `THREE.BackSide` material trick.

Actually cleanest approach: use `THREE.LatheGeometry` or manually build `BufferGeometry` with inner hole. Store as `type: 'pie'` with `donut: true` option.

#### F. Area chart (`type: 'area'`)
Variant of line chart. After building the line vertices, build a `PlaneGeometry`-like mesh filling the area beneath the line to the baseline (y=0). Semi-transparent fill using `opacity` and `transparent: true` on the material.

#### G. Selected state for clicked mesh
When `chart.click()` fires, mark the mesh as "selected":
- `data-st-chart-selected-index="2"` on the container (CSS can target it)
- Scale the selected mesh slightly larger and keep the emissive on even after unhover
- `chart.clearSelection()` method to deselect
- `chart.getSelection()` returns the current selected point data

#### H. Touch interaction
Handle `touchstart` / `touchmove` / `touchend` in `InteractionManager` for mobile:
- `touchstart` → set mouse position, fire raycaster
- `touchend` → treat as click if position hasn't moved
- Tooltip positioning on touch

#### I. Stacked / grouped bar chart
Multi-series support:
```js
// Grouped — side by side
Strata.Chart.create('#chart', {
  type: 'bar',
  mode: 'grouped',    // 'single' (default) | 'grouped' | 'stacked'
  data: [
    { label: 'Jan', value: 120, category: 'Revenue'  },
    { label: 'Jan', value: 80,  category: 'Cost'     },
    { label: 'Feb', value: 180, category: 'Revenue'  },
    { label: 'Feb', value: 95,  category: 'Cost'     },
  ],
})
```
For grouped: bars per category rendered side by side within the same label group.
For stacked: bars stacked vertically, each segment colored by category.

### LOW PRIORITY / POLISH

#### J. Responsive font scaling for axis labels
Sprite-based text labels should scale relative to container width (not fixed pixel size).

#### K. `chart.getView()` method
Simple getter: `chart.getView()` returns `'2d' | '3d'`. Currently the developer has to read `container.getAttribute('data-st-chart-view')`.

#### L. `chart.getData()` method
Returns the current normalized data array — useful if the developer wants to inspect what the chart is currently showing after aggregation.

#### M. Camera reset method (`chart.resetCamera()`)
After the user orbits in 3D, let them snap back to the default cinematic position:
```js
chart.resetCamera()   // animates back to CAMERA_3D position
```

#### N. Custom tooltip renderer
```js
Strata.Chart.create('#chart', {
  tooltip: function(point) {
    return '<strong>' + point.label + '</strong>: ' + point.value.toFixed(2)
  },
})
```
Currently the tooltip HTML is hardcoded inside `InteractionManager._hover()`. Extract it to a configurable render function.

#### O. Export to PNG
```js
chart.toDataURL()    // returns canvas.toDataURL('image/png')
chart.download('my-chart.png')
```
The WebGLRenderer's canvas is accessible — `renderer.domElement.toDataURL()`. Needs `preserveDrawingBuffer: true` on the renderer constructor.

---

## Implementation Notes for Next Session

### Axis labels via Sprite + CanvasTexture (pattern to follow)
```typescript
function makeTextSprite(text: string, color: string): THREE.Sprite {
  const canvas  = document.createElement('canvas')
  canvas.width  = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.font         = '28px sans-serif'
  ctx.fillStyle    = color
  ctx.textAlign    = 'center'
  ctx.fillText(text, 128, 44)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
  return new THREE.Sprite(mat)
}
// Usage: add to group, position below bar
const label = makeTextSprite(p.label, '#888')
label.position.set(x, -0.4, 0)
label.scale.set(1.2, 0.3, 1)
group.add(label)
```
**Important:** add `CanvasTexture` to `three-global.d.ts` ambient declarations, and `Sprite` + `SpriteMaterial`.

### Legend DOM pattern (matching Strata conventions)
```typescript
// Create outside canvas, inside .strata-chart container
const legend = document.createElement('div')
legend.className = 'strata-chart-legend'
legend.setAttribute('data-st-chart-legend', 'true')
// Each item
points.forEach((p, i) => {
  const item = document.createElement('div')
  item.className = 'strata-chart-legend-item'
  item.setAttribute('data-st-chart-legend-item-active', 'true')
  item.setAttribute('data-st-chart-legend-index', String(i))
  item.innerHTML = `<span class="strata-chart-legend-swatch" style="background:${colors[i]}"></span>
                    <span class="strata-chart-legend-label">${p.label}</span>`
  legend.appendChild(item)
})
container.appendChild(legend)
```

### Entrance animation pattern (using existing RAF loop)
```typescript
// In buildBarGroup — set initial scaleY to 0, animate to 1 via RAF
mesh.scale.y = 0
mesh.position.y = 0   // pivot at base
// In onFrame callback, lerp scale.y toward 1 with stagger based on index
```
Store an `_entering` flag on SceneManager, pass `elapsedMs` to `onFrame`.

### Morph update animation pattern
Instead of `disposeMeshes` + rebuild on `update()`:
1. Keep existing group
2. Store `_targetY` on each mesh's userData
3. In `onFrame`, lerp `mesh.scale.y` toward `mesh.userData._targetY`
4. Only dispose + rebuild if the number of data points changes

---

## Architecture Constraints to Maintain

- **No class toggling for state** — only `data-st-*` attribute mutations
- **No inline CSS for visual state** — CSS reads data attributes
- **IIFE + `window.Strata` namespace** — matches `modal.js` and `skeleton.js` pattern
- **TypeScript source** → compiled to JS via `tsc -p tsconfig.json` (`"module":"None"`, `outFile`)
- **THREE is a global** — declared via `declare namespace THREE` in `three-global.d.ts`, no `import`
- **Security:** HTML-strip all string inputs, max 100k points, no `eval`, no dynamic script injection
- **Disposal contract:** every geometry, material, texture created must be disposed in `destroy()`
- **Single PerspectiveCamera** — do not reintroduce `camOrtho`. The narrow-FOV trick works and keeps transitions seamless.
- **CSS vars for theming** — read `--st-*` vars, never hardcode colors in JS
