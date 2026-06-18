export type MapMode = '2d' | '3d'

export type MapThemePreset = 'light' | 'dark' | 'sepia' | 'high-contrast' | 'auto'

export type MapProviderName = 'maptiler' | 'mapbox'

export type MapStylePreset = 'streets' | 'satellite' | 'hybrid' | 'terrain' | 'topo' | 'light' | 'dark'

export interface MapProvider {
  name: MapProviderName
  key: string
  style?: MapStylePreset
}

export interface FeatureTextureOptions {
  /** Apply texture to building fill and extrusion layers. Default: false */
  buildings?: boolean
  /** Apply texture to road line layers. Default: false */
  roads?: boolean
  /** Apply texture to bridge line layers. Default: false */
  bridges?: boolean
  /**
   * Direct image URL (CORS-enabled JPG/PNG) for the building facade texture.
   * Falls back to procedural if omitted or the fetch fails.
   * Recommended: a CC0 brick/concrete diffuse map from polyhaven.com or ambientcg.com.
   */
  facadeUrl?: string
  /**
   * Direct image URL for the road surface texture.
   * Falls back to procedural if omitted or the fetch fails.
   * Recommended: search "asphalt" on polyhaven.com — use the *_diff_1k.jpg URL.
   */
  roadUrl?: string
  /**
   * Direct image URL for the bridge deck texture.
   * Falls back to procedural if omitted or the fetch fails.
   * Recommended: search "concrete" on polyhaven.com — use the *_diff_1k.jpg URL.
   */
  bridgeUrl?: string
}

export interface HypsometricStop {
  /** Elevation in metres. Negative values colour water/bathymetry. */
  elevation: number
  color: string
}

export interface TerrainOptions {
  /** Vertical exaggeration multiplier. 1 = true scale, 2 = doubled relief. Default: 1.5 */
  exaggeration?: number
  /** Render a hillshade layer from the elevation data. Default: true */
  hillshade?: boolean
  /** @deprecated MapLibre GL JS 4 removed the sky layer type — this option is ignored. */
  sky?: boolean
  /** Hillshade intensity 0–1. Default: 0.5 */
  hillshadeIntensity?: number
  /** Enable elevation/depth colour ramp (hypsometric tinting). Default: false */
  hypsometric?: boolean
  /** Opacity of the hypsometric layer 0–1. Default: 0.45 */
  hypsometricOpacity?: number
  /**
   * Enable a terrain texture overlay (e.g. satellite or shaded-relief imagery).
   * Can be used alone, with the colour ramp, or both together. Default: false
   */
  texture?: boolean
  /** Opacity of the texture layer 0–1. Default: 0.6 */
  textureOpacity?: number
  /**
   * Tile URL for the texture layer. Supports {z}/{x}/{y} and {z}/{y}/{x} templates.
   * Defaults to OpenTopoMap (CC-BY-SA, free for commercial use, no API key required).
   */
  textureUrl?: string
  /**
   * Maximum tile zoom for the texture source. Should match the provider's actual tile ceiling
   * to avoid over-zoomed blurriness. Defaults to 17 (OpenTopoMap limit).
   * Use 13 for USGS Shaded Relief.
   */
  textureMaxzoom?: number
  /**
   * Blend procedural hillshading into the hypsometric tiles (0 = flat colour, 1 = full shading).
   * Shading is computed from the same Terrarium DEM tiles — no external texture source needed.
   * Default: 0.7
   */
  hillshadeBlend?: number
  /**
   * Sun azimuth in degrees clockwise from north for the procedural hillshading.
   * 0 = N, 90 = E, 180 = S, 270 = W. Default: 315 (NW — traditional cartographic convention).
   */
  sunAzimuth?: number
  /**
   * Sun altitude in degrees above the horizon for the procedural hillshading.
   * 0 = grazing light, 90 = directly overhead. Default: 45.
   */
  sunAltitude?: number
  /**
   * Vertical exaggeration applied only to the shading normal computation — does not affect
   * the 3-D terrain mesh. Increase to make gentle slopes more visible. Default: 1.5.
   */
  shadingExaggeration?: number
  /**
   * Clip the colour ramp to [minMetres, maxMetres].
   * Pixels outside this range are clamped to the nearest boundary colour.
   * Defaults to the elevation span of the provided stops.
   */
  hypsometricRange?: [number, number]
  /**
   * Colour stops for the ramp. Elevation in metres (negative = water depth).
   * At least 2 stops required. Default preset covers sea → peak.
   */
  hypsometricStops?: HypsometricStop[]
}

export interface MapTokens {
  land?: string
  water?: string
  roads?: string
  roadsMinor?: string
  buildings?: string
  labels?: string
  parks?: string
  marker?: string
  radius?: string
  duration?: string
  font?: string
}

export interface PinConfig {
  color?: string
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  pulse?: boolean
  label?: string
}

export interface PopupConfig {
  template?: string
  tokens?: Record<string, string>
}

export interface LandmarkCategory {
  icon?: string
  color?: string
  opacity?: number
  enabled?: boolean
}

export interface LandmarksConfig {
  src: string
  categories?: {
    transit?: LandmarkCategory
    parking?: LandmarkCategory
    hospital?: LandmarkCategory
    restaurant?: LandmarkCategory
    cafe?: LandmarkCategory
    bank?: LandmarkCategory
    pharmacy?: LandmarkCategory
    [key: string]: LandmarkCategory | undefined
  }
}

export interface ZoomConfig {
  default?: number
  min?: number
  max?: number
}

export interface TilesConfig {
  local: string
  remote?: string
}

/**
 * Per-field overrides the developer can supply to replace any part of the
 * package's country defaults (loaded from layers/{REGION}/config.json).
 * Only the fields you set are replaced — everything else falls through to the
 * country config. Supply all fields to bypass the registry entirely.
 */
export interface LayerUserOverrides {
  /** Custom boundary GeoJSON path (replaces package default) */
  boundaries?: string
  /** Custom labels GeoJSON path (replaces package default) */
  labels?: string
  /**
   * Bounding box [west, south, east, north] used to spatially filter
   * which tile-source layers are suppressed. Replaces country config value.
   */
  bbox?: [number, number, number, number]
  /**
   * MapLibre layer IDs whose features inside `bbox` will be hidden so our
   * GeoJSON overlay is the single source of truth for that area.
   * Replaces country config value.
   */
  hideLayers?: string[]
  /** Override line width in pixels */
  width?: number
}

export interface LayerOverrideConfig {
  /** Enable automatic layer overrides for the configured region (default: true when region has overrides) */
  auto?: boolean
  /** Base path prefix used to resolve all layer file paths (useful when serving from a subdirectory) */
  basePath?: string
  /** Per-field overrides applied on top of the country config. Developer overrides always win. */
  overrides?: LayerUserOverrides
}

export interface ShopMapConfig {
  location: { lat: number; lng: number }
  region?: string
  tiles?: string | TilesConfig
  provider?: MapProvider
  landmarks?: LandmarksConfig
  mode?: MapMode
  zoom?: ZoomConfig
  theme?: MapThemePreset | MapTokens
  pin?: PinConfig
  popup?: PopupConfig
  attribution?: boolean
  /** Layer override configuration — controls disputed boundary rendering */
  layers?: LayerOverrideConfig
}

export interface LandmarkEntry {
  id: string
  name: string
  category: string
  lat: number
  lng: number
}
