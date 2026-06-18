# Changelog

All notable changes to `@strata-packages/shopmap` are documented here.

Format: `MAJOR.FEATURE.BUGFIX` — FEATURE and BUGFIX never reset within a MAJOR era.

---

## 0.2.0

### Terrain system

- `enableTerrain(options?)` / `disableTerrain()` — full terrain pipeline built on the open-data Terrarium DEM (AWS elevation tiles, public domain). No API keys required.
- 3-D terrain mesh with configurable vertical `exaggeration` (default 1.5×)
- MapLibre hillshade layer with `hillshadeIntensity` control (default 0.5)
- Hypsometric colour ramp (`hypsometric: true`) — per-pixel elevation decoded via the Terrarium formula and mapped through a user-defined colour stop list
- Water/bathymetry depth colouring — negative elevation stops colour ocean depth in the same ramp
- `hypsometricOpacity` and `hypsometricRange` clipping for fine-grained control
- Default colour stop presets: natural earth palette and ocean-depth palette
- Terrain texture overlay (`texture: true`) — independent raster layer with its own `textureOpacity`, `textureUrl`, and `textureMaxzoom`; stacks above the ramp, below roads/labels
- Terrarium pixel masking in the texture overlay — ocean pixels (elevation < 0) are made transparent so the hypsometric depth colours show through
- Correct layer insertion order: background/water fills → hypsometric → texture → hillshade → roads/labels
- Stable insertion-point algorithm that skips `smap-*` layers to prevent "before non-existing layer" errors across repeated `enableTerrain` calls

### Procedural hillshading (new in 0.2.0 — no external tiles needed)

- `hillshadeBlend` (0–1, default 0.7) — bakes directional hillshading directly into the hypsometric tiles; eliminates the need for an external shaded-relief tile source
- `sunAzimuth` (degrees, default 315 NW) and `sunAltitude` (degrees, default 45) — configure the light direction
- `shadingExaggeration` (default 1.5) — vertical scale applied only to the normal computation, independent of the 3-D mesh exaggeration
- Algorithm: two-pass — decode all elevations into `Float32Array`, compute surface normals via central differences (`N = (−∂z/∂x, −∂z/∂y, 1)`), evaluate Lambertian reflectance, blend with hypsometric colour at configurable strength
- 30% ambient floor — shadow areas retain colour rather than going pure black
- Correct East/South/Up coordinate system with proper azimuth-to-light-vector conversion

### Feature textures

- `enableFeatureTextures(options?)` / `disableFeatureTextures()` — apply surface textures to vector map layers
- Three layer targets: `buildings` (fill-extrusion), `roads` (line), `bridges` (line)
- Procedural fallbacks built in: multi-octave FBM noise for asphalt, concrete, and building facades — no external assets required
- External CC0 texture loading: `facadeUrl`, `roadUrl`, `bridgeUrl` — any CORS-accessible JPG/PNG URL loaded via `map.loadImage()` with automatic fallback to procedural on failure
- Safe layer matching: building texture restricted to `fill-extrusion` and `fill` layers whose ID contains `'building'`; prevents accidental texturing of large coastal/landuse fill polygons
- Bridge detection via layer ID (`'bridge'` substring) targeting `source-layer: transportation` line layers

### Map style switching

- `switchTileStyle(url)` — swap the base tile style at runtime; re-applies the active theme and region overlays via the `styledata` event
- `switchStyle(preset)` — switch to a named style preset (`streets`, `satellite`, `hybrid`, `terrain`, `topo`, `light`, `dark`)
- Theme application to hosted styles (`applyThemeToHostedStyle`) — iterates style layers and applies CSS token colours by `source-layer` + layer type, making `setTheme()` work on hosted OpenFreeMap styles

### Licensing and data sources

- All default data sources are free for commercial use: OpenFreeMap tiles (ODbL), Terrarium DEM (open data), OpenTopoMap default texture (CC-BY-SA), USGS Shaded Relief (public domain)
- ESRI ArcGIS tile services removed as defaults — they require a commercial licence

---

## 0.1.0 — Initial release

- `ShopMap` class with `setTheme`, `setMode`, `setLocation`, `destroy`
- CSS token cascade: `--map-*` → `--st-*` (Strata) → `--bs-*` (Bootstrap) → hardcoded defaults
- Five theme presets: `light`, `dark`, `sepia`, `high-contrast`, `auto`
- Pin system with sizes sm/md/lg, built-in icons, pulse animation, label
- Popup system with `{{token}}` template replacement
- Landmark layer loaded from `landmarks.json`
- `data-st-*` attribute state system (no class toggling, no inline styles, no `!important`)
- MutationObserver theme sync — map style updates when `data-st-theme` changes
- 2D/3D mode toggle with `easeTo` transition
- CLI: `shopmap init` and `shopmap extract`
- 20 Tabler-style icons bundled
- OSM attribution built in (non-removable, per ODbL)
- Strata CSS optional peer dependency
