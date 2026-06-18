# @strata-packages/shopmap — Developer Reference

## What it is

A JIT-themed map component for shop location pages. Reads design tokens from CSS custom properties and applies them to a MapLibre GL JS map. Zero runtime backend, zero API keys.

## Architecture

```
src/
  index.ts                  Main ShopMap class — composes all modules
  types/index.ts            All TypeScript interfaces and types
  themes/index.ts           Five presets (light/dark/sepia/high-contrast/auto) + resolveTheme
  icons/index.ts            20 inline SVG icons + getIcon()
  core/
    style-builder.ts        Token resolution (--map-* → --st-* → --bs-* → default) + MapLibre style JSON
    renderer.ts             ShopMapRenderer — MapLibre init, MutationObserver theme sync, 2D/3D toggle
    pin.ts                  ShopPin — HTML marker with CSS-driven theming
    popup.ts                ShopPopup — {{token}} template + createLandmarkPopup
    landmarks.ts            LandmarkLayer — fetch + render landmark.json entries
  cli/
    index.ts                Commander entry point (init / extract commands)
    init.ts                 Interactive Inquirer setup
    extract.ts              Tile and landmark extraction logic
    regions.ts              Region → tile source URL registry
```

## Key design constraints

- **No inline styles on user-facing elements.** All styles are injected via a `<style>` tag with a unique ID (e.g. `smap-pin-styles`). Only CSS custom properties are set via `element.style.setProperty` for per-instance token overrides.
- **No `!important`.** Use specificity and proper cascade instead.
- **State via `data-*` attribute values.** Attributes are never removed — their value changes (e.g. `data-st-active="true"` → `data-st-active="false"`). CSS targets attribute values.
- **Strata compatible.** Reads `--st-*` tokens automatically. Responds to `data-st-theme` changes via MutationObserver.
- **MapLibre GL + PMTiles are runtime peer deps.** The browser build externalises them. The UMD build assumes they're on `window.maplibregl` and `window.pmtiles`.

## CSS token cascade (in order of priority)

```
--map-{token}     package-specific, set per container or globally on :root
--st-{token}      Strata CSS framework tokens
--bs-{token}      Bootstrap tokens
hardcoded default always works
```

Full mapping is in `src/core/style-builder.ts` (`FALLBACKS` and `DEFAULTS` constants).

## Build output

```
dist/shopmap.esm.js    ES module
dist/shopmap.cjs.js    CommonJS
dist/shopmap.umd.js    UMD, global name ShopMap
dist/shopmap.d.ts      TypeScript declarations
dist/cli/index.js      Node.js CLI executable
```

## Adding a new icon

Open `src/icons/index.ts`. Export a new named const as a complete SVG string with `viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`. Add it to the `registry` object.

## Adding a new landmark category

Edit `DEFAULT_CATEGORIES` in `src/core/landmarks.ts`. Add a new entry with `icon`, `color`, `opacity`, and `enabled`.

## Adding a region

Edit `src/cli/regions.ts`. Add a key and tile source URL.

## Versioning

Follows the same `MAJOR.FEATURE.BUGFIX` rules as the rest of the strata repo (see root CONTRIBUTING.md). Never reset FEATURE or BUGFIX mid-era.
