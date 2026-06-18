# ShopMap — Layer Override System Handover

Status as of this session. Next session: continue with remaining border-rendering bugs.

## What this is

A three-tier system for overriding OSM tile borders with a country's official
territorial claims. Built and tuned for India (`IN`); other regions plug in via
`layers/{REGION}/config.json` + GeoJSON.

OSM tiles draw borders at the de-facto line of control (e.g. Aksai Chin under
China, PoK under Pakistan). For India we hide OSM's India-related borders and
overlay India's official claim from public-domain Natural Earth data.

## Architecture (three-tier merge)

`renderer.ts → buildLayerConfig(region, basePath, userOverrides)` merges:
1. **Registry** (`src/layers/registry.ts`) — file paths per region (`boundaries`, `labels`, `configPath`).
2. **config.json** (`layers/IN/config.json`) — `bbox`, `hideLayers`, `osmFilter`, `width`, `attribution`.
3. **User overrides** (`layers.overrides` in ShopMap config) — always win.

Produces `ResolvedLayerConfig`, passed to `LayerManager.applyOverrides()`.

### Key files
- `src/core/layer-manager.ts` — adds GeoJSON source + line/label layers; `hideOsmLayers()` filters OSM boundary layers.
- `src/core/renderer.ts` — `buildLayerConfig()`, `setRegion(region, overrides?)`.
- `src/index.ts` — public `setRegion(region, overrides?)`.
- `layers/IN/boundaries.geojson` — 40 features, India's full claimed border.
- `layers/IN/config.json` — IN filter config.
- `layers/IN/labels.geojson` — disputed-area place labels.

## How OSM hiding works (`hideOsmLayers`)

Auto-detects every line layer whose `source-layer` starts with `boundary`/`admin`,
then for each appends `['!', hidePredicate]` to its filter. A feature is hidden when
it is **within the bbox AND** matches any of (`osmFilter` in config.json):
- `adm0Values` matched against `adm0Fields` (`['adm0_l','adm0_r']`) → IND, BTN
- `hideDisputed` → `disputed === 1`
- `hideSubnational` → `admin_level >= 3` (removes neighbour province lines, e.g. PoK's Azad Kashmir boundary)
- `hidePairs` → mutual border between two neighbours the country claims, e.g. `['PAK','CHN']` (the Karakoram, entirely claimed by India)

Borders NOT matching stay visible (Nepal–China, Bhutan–China, Afghanistan–Pakistan, China–Myanmar).

**Why not `within(claimPolygon)`:** `within` requires a feature be *entirely* inside
the polygon; a border line that *forms* the polygon's edge is never contained, so it
leaks through. We use adm0 codes + `hidePairs` instead — reliable.

### Decoding OSM tiles (debugging aid)
OSM (OpenFreeMap planetiler) boundary features carry `adm0_l`/`adm0_r` (ISO3:
IND, PAK, CHN, NPL, BTN…), `disputed`, `admin_level`. Liberty's boundary layers are
`boundary_2` (country), `boundary_3` (states), `boundary_disputed`.
To inspect actual vertex positions, decode a tile:
```
// run from packages/shopmap (pbf there exports the Pbf constructor directly)
const {VectorTile}=require('@mapbox/vector-tile'); const Pbf=require('pbf')
// fetch https://tiles.openfreemap.org/planet/<ver>/{z}/{x}/{y}.pbf, new VectorTile(new Pbf(buf))
```
This is how the NW connector was snapped to OSM's real Afghan-border vertex.

## Line styling (matches OSM exactly)

`addBoundaryLayers()` replicates liberty `boundary_2`:
- color `hsl(248,1%,41%)` (override via `--map-border`)
- **opacity ramp** zoom `0→0.4, 4→1` (faint when zoomed out, dark when in — this is the zoom-color effect)
- width ramp zoom `3→1, 5→1.2, 12→3` (scaled by config `width`)

`resolveCssVar()` parses `var(--name, fallback)` correctly (earlier bug: it fell through to black).

## India boundary data (`boundaries.geojson`, 40 features)

Built from Natural Earth public-domain files (were in `c:/tmp/ne_land.geojson`,
`c:/tmp/ne_disputed.geojson`; `c:/tmp/liberty.json` = cached style).

- **Undisputed neighbours:** Bangladesh, Nepal (4 segs), Bhutan + **Bhutan–China** (protectorate — drawn as India's), Myanmar, Pakistan trunk (land397) + Rann (land11) + Punjab (land453).
- **India–China verified slivers:** Sikkim (land150), Kalapani (land185), Ladakh/HP/Uttarakhand (land405–412). NOTE: land405 is a tiny **Ladakh** bit (was once mislabelled "Sikkim").
- **Disputed claim lines:** LoC J&K south (disp22 subs [0,3,8,7]), LoC north (disp21), Gilgit-Baltistan west/AGPL (disp41, trimmed — see below), northern Karakoram (land424, the PAK-CHN line India claims), Shaksgam (disp12), Aksai Chin (disp16), McMahon (land32).
- **Connectors** (interpolated bridges over real data gaps): Punjab connector, LoC bridge, Nepal–Sikkim, Bhutan trijunction/Bhutan–China-W, Karakoram–Shaksgam, Shaksgam→Aksai, **NW claim–AGPL junction**.

### NW corner (resolved this session)
The Afghanistan–Pakistan border is an AFG/PAK level-2 line → **not hidden, OSM
renders it**. We must NOT draw it ourselves (that caused a double line). So:
- OSM draws the Afghan–Pak border through the Wakhan.
- disp41 (Gilgit-KP claim) connects up to it; its top was snapped to OSM vertex `[73.703, 36.9108]`.
- land424 (Karakoram) meets it at the Afghan-Pak-China tripoint `[74.542, 37.022]`.
- disp41's leading SE salient (first 49 pts) was trimmed — it doubled back under the connector.

## Connectivity invariant

Run the endpoint audit after any GeoJSON change — every endpoint should have a
neighbour within ~6.6km **except**:
- 2 coastal sea-termini: Sundarbans `[89.134,21.646]`, Sir Creek `[68.113,23.643]`.
- 2 OSM-Afghan-border connection points: land424 `[74.542,37.022]`, NW junction `[73.703,36.9108]` (these connect to OSM's rendered border, not our own feature, so they read as "open" in a self-only audit — that's correct).

## Tests / build
- `npm test` → 90 passing (`tests/layer-manager.test.ts`, `tests/layer-geojson.test.ts` validate registry shape + GeoJSON schema; geojson test expects mixed disputed/undisputed).
- `npm run build` → 6 artifacts (esm/cjs/umd/d.ts/cli + cli d.ts).

## Verified fixed this session
Double-trace (wrong layer IDs, then global hide, then within-polygon) → adm0 filter.
Jammu triangle/loop/W (redundant connectors; disp22 messy subs; PoK province line via hideSubnational).
Shaksgam stub (dropped redundant land139; connector to true terminus).
Sikkim/Bhutan gap (land150 + Bhutan-China added).
land325 tangle (flattened MultiLineString sliced across subs → proper sub-chain).
NW double line + "not sticking" (stop drawing Afghan border; snap to OSM vertex).

## Next session — likely remaining work
- Re-verify the full border at multiple zooms once more (NE Arunachal/McMahon, Sir Creek, Rann of Kutch coastlines).
- Consider whether `width`/opacity ramp needs tuning at very high zoom.
- Generalise: document the per-region workflow (registry + config.json + GeoJSON) in README; add a second region as proof.
- CLI `extract.ts`: copy `config.json` alongside GeoJSON on `--region IN` (still pending from original plan).
- Remaining open items from the package roadmap (see `CLAUDE.md` / package.json).
