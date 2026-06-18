# @strata-packages/shopmap

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@strata-packages/shopmap)](https://www.npmjs.com/package/@strata-packages/shopmap)

A lightweight, theme-aware map component for shop location pages — with terrain, hypsometric tinting, and procedural hillshading built in. Zero API keys. All default data sources are free for commercial use.

- **Zero runtime dependencies** beyond MapLibre GL JS (peer dependency)
- **CSS token theming** — reads `--map-*`, `--st-*` (Strata), and `--bs-*` (Bootstrap) variables automatically
- **Full terrain pipeline** — 3-D mesh, hypsometric colour ramp, procedural hillshading, texture overlay, all from open-data sources
- **Region-aware tile extraction** — CLI generates a local `.pmtiles` file

---

## Quickstart

```bash
npx @strata-packages/shopmap init
```

```html
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css" />
<script src="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js"></script>
<script src="https://unpkg.com/pmtiles@3/dist/pmtiles.js"></script>
<script src="https://unpkg.com/@strata-packages/shopmap/dist/shopmap.umd.js"></script>

<div id="map" style="width:100%;height:400px"></div>

<script>
  const map = new ShopMap.ShopMap('#map', {
    location: { lat: 12.9716, lng: 77.5946 },
    tiles: 'https://tiles.openfreemap.org/styles/liberty',
    pin: { icon: 'store', pulse: true, label: 'Our Shop' },
  })
</script>
```

---

## Config API

| Field | Type | Default | Description |
|---|---|---|---|
| `location` | `{ lat, lng }` | required | Shop coordinates |
| `tiles` | `string \| TilesConfig` | required | Hosted style URL or path to `.pmtiles` |
| `region` | `string` | `'default'` | Region code for boundary overlays (`IN`, `US`, `GB`, …) |
| `mode` | `'2d' \| '3d'` | `'2d'` | Initial map mode |
| `theme` | `MapThemePreset \| MapTokens` | `undefined` | Theme preset or token object |
| `zoom.default` | `number` | `15` | Initial zoom |
| `zoom.min` | `number` | `12` | Minimum zoom |
| `zoom.max` | `number` | `18` | Maximum zoom |
| `pin` | `PinConfig` | `{}` | Primary marker |
| `popup` | `PopupConfig` | — | Popup (omit to disable) |
| `landmarks` | `LandmarksConfig` | — | Landmark overlay |
| `attribution` | `boolean` | `true` | OSM attribution (cannot be fully removed) |

---

## Public Methods

| Method | Description |
|---|---|
| `setTheme(preset \| tokens)` | Switch theme at runtime |
| `setMode('2d' \| '3d')` | Toggle 2D/3D map mode |
| `setLocation(lat, lng, zoom?)` | Fly to new coordinates |
| `setRegion(code, overrides?)` | Apply region boundary overlays |
| `switchTileStyle(url)` | Swap the base tile style URL |
| `switchStyle(preset)` | Switch to a named style preset |
| `enableTerrain(options?)` | Enable terrain with optional settings |
| `disableTerrain()` | Remove all terrain layers |
| `enableFeatureTextures(options?)` | Apply surface textures to buildings/roads/bridges |
| `disableFeatureTextures()` | Remove feature textures |
| `enableLandmarks(config)` | Add or replace the landmark layer |
| `disableLandmarks()` | Remove the landmark layer |
| `setPin(config)` | Update pin appearance |
| `updatePopup(config)` | Patch popup tokens or template |
| `destroy()` | Tear down the map and clean up |

---

## Terrain

The terrain pipeline uses the open-data [Terrarium DEM](https://registry.opendata.aws/terrain-tiles/) (AWS elevation tiles, public domain). No API keys. No ESRI. Fully commercial-safe.

```js
map.enableTerrain({
  // 3-D mesh
  exaggeration: 1.5,          // vertical scale for the 3-D mesh (default: 1.5)

  // MapLibre hillshade layer
  hillshade: true,            // render a standard hillshade layer (default: true)
  hillshadeIntensity: 0.5,    // 0–1 (default: 0.5)

  // Hypsometric colour ramp
  hypsometric: true,          // enable elevation/depth colour tinting (default: false)
  hypsometricOpacity: 0.45,   // ramp layer opacity 0–1 (default: 0.45)
  hypsometricRange: [-6000, 5000],  // clamp elevation to this range (metres)
  hypsometricStops: [         // colour stops — negative = water depth
    { elevation: -6000, color: '#0a1929' },
    { elevation: -200,  color: '#0d3b6e' },
    { elevation: 0,     color: '#1a6b8a' },
    { elevation: 1,     color: '#4a9e6b' },
    { elevation: 500,   color: '#8bc34a' },
    { elevation: 1500,  color: '#d4a843' },
    { elevation: 3000,  color: '#9e6b3a' },
    { elevation: 5000,  color: '#f5f5f5' },
  ],

  // Procedural hillshading — baked into the ramp tiles, no external source needed
  hillshadeBlend: 0.7,        // 0 = flat colour only, 1 = full shading (default: 0.7)
  sunAzimuth: 315,            // degrees clockwise from N (default: 315 = NW)
  sunAltitude: 45,            // degrees above horizon (default: 45)
  shadingExaggeration: 1.5,   // amplify gentle slope shading (default: 1.5)

  // Optional external texture overlay (independent of ramp)
  texture: false,             // enable texture overlay (default: false)
  textureUrl: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',  // CC-BY-SA, free
  textureOpacity: 0.6,        // 0–1 (default: 0.6)
  textureMaxzoom: 17,         // match the provider's tile ceiling (default: 17)
})

map.disableTerrain()
```

### How the procedural hillshading works

When `hillshadeBlend > 0`, the protocol handler runs a two-pass algorithm on each 256×256 Terrarium tile:

1. **Pass 1** — decode all 65,536 pixels into a `Float32Array` of real elevation values
2. **Pass 2** — for each pixel, compute the surface normal `N = (−∂z/∂x, −∂z/∂y, 1)` via central differences, evaluate Lambertian reflectance against the sun direction vector, blend the resulting intensity into the hypsometric colour

The result is a fully procedural shaded-relief + elevation-colour map with zero external tile dependencies beyond the Terrarium DEM.

### Texture overlay sources (free for commercial use)

| Source | URL pattern | `textureMaxzoom` | Licence |
|---|---|---|---|
| OpenTopoMap (default) | `https://tile.opentopomap.org/{z}/{x}/{y}.png` | 17 | CC-BY-SA |
| USGS Shaded Relief (US) | `https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}` | 13 | Public domain |

---

## Feature Textures

Apply surface textures to vector map layers. Procedural fallbacks are always available — no external assets required.

```js
// Procedural textures (built-in FBM noise patterns)
await map.enableFeatureTextures({
  buildings: true,   // building fill-extrusion layers
  roads: true,       // transportation line layers
  bridges: true,     // bridge line layers
})

// Real CC0 photo textures (from polyhaven.com or any CORS-enabled URL)
// Falls back to procedural if the fetch fails
await map.enableFeatureTextures({
  buildings: true,
  roads: true,
  bridges: true,
  facadeUrl: 'https://example.com/brick_diff_1k.jpg',
  roadUrl:   'https://example.com/asphalt_diff_1k.jpg',
  bridgeUrl: 'https://example.com/concrete_diff_1k.jpg',
})

map.disableFeatureTextures()
```

`enableFeatureTextures` returns a `Promise` — await it to know when textures are loaded.

**Finding CC0 textures:** [polyhaven.com/textures](https://polyhaven.com/textures) provides CC0 (public domain) photographic textures. Search "brick wall" or "concrete" for buildings, "asphalt" for roads, "concrete floor" for bridges. Copy the `*_diff_1k.jpg` download URL.

**Visibility:** Road and bridge textures require zoom ≥ 14. Building textures require 3D mode + zoom ≥ 15.

---

## Map Style Switching

```js
// Switch to a different hosted style
map.switchTileStyle('https://tiles.openfreemap.org/styles/bright')
map.switchTileStyle('https://tiles.openfreemap.org/styles/positron')

// Named preset (uses the configured provider)
map.switchStyle('satellite')
map.switchStyle('terrain')
```

The active theme colours and region overlays are re-applied automatically after the style loads.

---

## CSS Token Reference

| Token | Purpose | Strata | Bootstrap |
|---|---|---|---|
| `--map-land` | Land / background fill | `--st-bg` | `--bs-body-bg` |
| `--map-water` | Water bodies | `--st-info` | `--bs-info` |
| `--map-roads` | Primary roads | `--st-bg` | `--bs-body-bg` |
| `--map-roads-minor` | Minor roads | `--st-border` | `--bs-border-color` |
| `--map-buildings` | Building fill | `--st-secondary` | `--bs-secondary-bg` |
| `--map-labels` | Text labels | `--st-text` | `--bs-body-color` |
| `--map-parks` | Parks and green areas | `--st-success` | `--bs-success` |
| `--map-marker` | Primary pin colour | `--st-primary` | `--bs-primary` |
| `--map-radius` | Popup border radius | `--st-border-radius` | `--bs-border-radius` |
| `--map-duration` | Transition duration | `--st-duration` | — |
| `--map-font` | Popup font family | `--st-font-family` | `--bs-font-sans-serif` |

---

## Framework Compatibility

### Plain HTML
```html
<script src="shopmap.umd.js"></script>
<script>new ShopMap.ShopMap('#map', config)</script>
```

### ES module / Vite / webpack
```js
import { ShopMap } from '@strata-packages/shopmap'
new ShopMap('#map', config)
```

### With Strata CSS
```html
<html data-st-theme="dark">
<!-- ShopMap reads --st-* tokens and updates the map automatically -->
```

### With Bootstrap
```html
<html data-bs-theme="dark">
```

### With Tailwind
```html
<div id="map" style="--map-marker: #7c3aed; --map-land: #f8fafc">
```

---

## Theme Presets

```js
new ShopMap('#map', { theme: 'dark' })
new ShopMap('#map', { theme: 'sepia' })
new ShopMap('#map', { theme: 'high-contrast' })
new ShopMap('#map', { theme: 'auto' })   // follows prefers-color-scheme

// Custom tokens
new ShopMap('#map', { theme: { land: '#1a1a2e', water: '#16213e', marker: '#e94560' } })

// Runtime switch
map.setTheme('dark')
map.setTheme({ marker: '#ff6b6b' })
```

---

## Pin Customization

```js
pin: { icon: 'store', size: 'lg', pulse: true, label: 'HQ' }
pin: { icon: '<svg viewBox="0 0 24 24">…</svg>', color: '#e63946' }
```

Icons: `store bus parking hospital restaurant cafe bank atm pharmacy school park hotel gas train bike phone clock directions marker info`

---

## Popup Customization

```js
popup: {
  tokens: { name: 'My Shop', address: '123 Main St', hours: 'Mon–Fri 9–5', directions: 'https://…' }
}

// Custom template
popup: {
  template: '<div class="my-popup"><strong>{{name}}</strong><p>{{tagline}}</p></div>',
  tokens: { name: 'Acme', tagline: 'Fresh every day' },
}
```

---

## Landmarks

```js
landmarks: {
  src: 'public/landmarks.json',
  categories: {
    cafe:    { color: '#7c3aed', opacity: 0.9 },
    parking: { enabled: false },
    transit: { icon: 'train' },
  }
}
```

Generate `landmarks.json`:
```bash
npx shopmap extract --lat 12.97 --lng 77.59 --landmarks --radius 500 --out public/
```

---

## Region and Borders

```js
// Auto-apply curated GeoJSON overlays for a region
new ShopMap('#map', { region: 'IN' })

// Full override
new ShopMap('#map', {
  region: 'IN',
  layers: {
    overrides: {
      boundaries: '/my-data/custom-boundaries.geojson',
      labels:     '/my-data/custom-labels.geojson',
      bbox:       [68, 8, 98, 38],
      hideLayers: ['boundary_disputed'],
      width:      2,
    }
  }
})

// Runtime switch
map.setRegion('IN')
map.setRegion('IN', { width: 2 })
```

### Border representation — legal notice

This package is a rendering tool. It does not make, endorse, or represent any territorial claim. The developer deploying this package is solely responsible for selecting appropriate tile sources and border data for their jurisdiction and audience. See [CONTRIBUTING.md](CONTRIBUTING.md) for full details.

---

## Data Sources and Licensing

| Source | Used for | Licence |
|---|---|---|
| OpenFreeMap tiles | Base map | ODbL (attribution required) |
| Terrarium DEM (AWS) | Terrain, hillshading, hypsometric | Open data (public domain) |
| OpenTopoMap | Default texture overlay | CC-BY-SA (attribution required) |
| USGS | Shaded relief (US only) | Public domain |
| Poly Haven | Optional CC0 photo textures | CC0 (public domain) |

The ShopMap package code is MIT licensed. OSM-derived data (tiles, landmarks) is ODbL licensed.

---

## Attribution

OSM attribution is built into the map and cannot be disabled. OpenStreetMap data is © OpenStreetMap contributors ([ODbL](https://www.openstreetmap.org/copyright)).

---

## License

MIT — see [LICENSE](LICENSE).
