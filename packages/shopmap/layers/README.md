# ShopMap Layer System

This directory contains curated GeoJSON layers that override or supplement the base tile source for specific regions. The primary use case is **correct border representation** for regions where the default OpenStreetMap tile source does not reflect official government positions.

## Why this exists

OpenStreetMap follows the *on-the-ground* principle — borders are drawn at the line of actual control. For countries like India, this means disputed territories such as Aksai Chin and Arunachal Pradesh are shown under China's control, which does not match India's official position.

ShopMap's layer system lets you overlay curated GeoJSON on top of any tile source, silently replacing boundary lines and place labels with locally sourced data.

## Directory structure

```
layers/
  IN/
    boundaries.geojson   LineString features for India's official boundary claims
    labels.geojson       Point features for disputed and sensitive place names
  README.md              This file
```

## Layer files

### `boundaries.geojson`

LineString features. Each feature has:

| Property | Type | Description |
|---|---|---|
| `name` | string | Official name of the boundary segment |
| `name:en` | string | English name |
| `admin_level` | number | OSM-style level (2 = national, 4 = state) |
| `disputed` | boolean | Whether the boundary is internationally contested |
| `color` | string | Suggested line color (overridden by CSS tokens at runtime) |
| `width` | number | Suggested line width in pixels |

Disputed features are rendered as dashed red lines; non-disputed as solid lines.

### `labels.geojson`

Point features. Each feature has:

| Property | Type | Description |
|---|---|---|
| `name` | string | Place name (official) |
| `name:en` | string | English name |
| `name:hi` | string | Hindi name (where applicable) |
| `place` | string | Place type: city, town, region, state, pass, lake, boundary |
| `admin_level` | number | OSM-style admin level |
| `disputed` | boolean | Whether the territory is disputed |
| `country_claim` | string | ISO 3166-1 alpha-2 code of the claiming country |
| `note` | string | Human-readable context |

Disputed labels are rendered in red; non-disputed in the map's label color.

## Data sources

| Region | Boundaries | Labels |
|---|---|---|
| IN | Curated from [Datameet India Maps](https://github.com/datameet/maps) and [Natural Earth](https://www.naturalearthdata.com/) | Hand-curated, MIT licensed |

**Important:** The included files are simplified. For production applications, download the full dataset from [Datameet India Maps](https://github.com/datameet/maps) and replace the GeoJSON files before publishing.

## License

- `IN/boundaries.geojson` — ODbL (same as Datameet source data)
- `IN/labels.geojson` — MIT

## Legal notice and disclaimer

**The files in this directory are a technical convenience, not a political statement.**

The GeoJSON data shipped here is sourced from [Natural Earth](https://www.naturalearthdata.com/) (public domain) and is provided solely to give developers a starting point for regions where the default OSM tile source does not reflect a particular government's official position. Inclusion of a region's data in this directory does not constitute an endorsement of any territorial claim by the ShopMap authors.

**These files are entirely optional.** The package's three-tier override system means:

1. A developer can ignore these files entirely and use the OSM tile source as-is.
2. A developer can use these files as a starting point and modify them freely.
3. A developer can supply their own GeoJSON from any source they choose.

**The developer deploying this package bears full responsibility** for the border data they choose to render, the tile source they configure, and the legal suitability of their map for display in the countries where their application operates. The package authors accept no liability for the political, legal, or diplomatic consequences of any border representation choices made downstream.

## Adding a new region

1. Create `layers/{REGION_CODE}/boundaries.geojson` and `layers/{REGION_CODE}/labels.geojson` following the schema above.
2. Register the region in `src/layers/registry.ts`:
   ```ts
   MY_REGION: {
     region: 'MY_REGION',
     boundaries: 'layers/MY_REGION/boundaries.geojson',
     labels:     'layers/MY_REGION/labels.geojson',
     attribution: '© Your source',
     license:    'ODbL',
   }
   ```
3. Update the CLI extract command in `src/cli/extract.ts` to copy the files when `--region MY_REGION` is used.
4. Submit a pull request with your data sources clearly documented.

## Contributing

Contributions of additional region data are welcome. Requirements:

- Data must be verifiably open-source (ODbL, CC-BY, MIT, or public domain)
- Source must be cited in the feature's properties or a companion `_source` field
- Boundaries must reflect official government positions of the country being served
- A `_license` field must be present at the FeatureCollection level
