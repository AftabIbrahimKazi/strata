import type { Map as MapLibreMap, GeoJSONSourceSpecification, FilterSpecification } from 'maplibre-gl'

const SOURCE_BOUNDARIES = 'smap-boundaries'
const SOURCE_LABELS     = 'smap-labels'
const LAYER_LINE        = 'smap-boundary-line'
const LAYER_LABELS      = 'smap-boundary-label'

/**
 * Criteria for suppressing OSM boundary features that belong to the overridden
 * country — so only that country's borders (and disputed lines) are hidden,
 * while every neighbour-vs-neighbour border stays visible.
 */
export interface OsmBoundaryFilter {
  /** Feature property fields holding the country code on each side (default adm0_l / adm0_r) */
  adm0Fields?: string[]
  /** Country codes to hide (e.g. ['IND']) — matched against adm0Fields */
  adm0Values?: string[]
  /** Also hide disputed lines (disputed === 1) inside the bbox (default true) */
  hideDisputed?: boolean
  /**
   * Also hide sub-national lines (admin_level >= 3 — states/provinces) inside the
   * bbox. Removes neighbour-country internal divisions that intrude on claimed
   * territory (e.g. Pakistan's Azad Kashmir provincial boundary in PoK). Default false.
   */
  hideSubnational?: boolean
  /**
   * Country-code PAIRS whose mutual border to hide inside the bbox — for borders
   * the overridden country claims but OSM attributes to two neighbours (e.g.
   * ['PAK','CHN'] for the Karakoram, all of which India claims). Order-independent.
   * This reliably hides edge-straddling border lines that a polygon `within` test
   * cannot (a border line is never fully "within" a region whose edge it forms).
   */
  hidePairs?: string[][]
}

/** Fully resolved config — produced by renderer after merging registry + config.json + user overrides. */
export interface ResolvedLayerConfig {
  boundaries: string
  labels: string
  bbox?: [number, number, number, number]
  hideLayers?: string[]
  osmFilter?: OsmBoundaryFilter
  width?: number
  attribution?: string
}

interface HiddenLayer {
  id: string
  originalFilter: FilterSpecification | null | undefined
}

interface GeoJsonFeatureCollection {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: { type: string; coordinates: unknown }
    properties: Record<string, unknown> | null
  }>
}

/**
 * Resolves a `var(--name, fallback)` expression against :root.
 * Correctly parses the fallback (the previous version passed "--name, fallback"
 * as the property name, which always failed and produced black).
 */
function resolveCssVar(value: string): string {
  if (!value.startsWith('var(')) return value
  const inner = value.slice(4, -1).trim()           // "--map-border, #9e9cab"
  const commaIdx = inner.indexOf(',')
  const name     = (commaIdx === -1 ? inner : inner.slice(0, commaIdx)).trim()
  const fallback = (commaIdx === -1 ? '' : inner.slice(commaIdx + 1)).trim()
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return resolved || fallback || '#9e9cab'
}

export class LayerManager {
  private map: MapLibreMap
  private applied = false
  private currentConfig: ResolvedLayerConfig | null = null
  private hiddenOsmLayers: HiddenLayer[] = []

  constructor(map: MapLibreMap) {
    this.map = map
  }

  async applyOverrides(config: ResolvedLayerConfig): Promise<void> {
    if (this.applied) this.removeOverrides()
    this.currentConfig = config

    const [boundariesData, labelsData] = await Promise.all([
      this.fetchGeoJson(config.boundaries),
      this.fetchGeoJson(config.labels),
    ])

    if (!boundariesData || !labelsData) return

    this.addBoundarySource(boundariesData)
    this.addLabelSource(labelsData)
    this.addBoundaryLayers(config.width ?? 1.5)
    this.addLabelLayers()

    this.hideOsmLayers(config.hideLayers ?? [], config.bbox, config.osmFilter)

    this.applied = true
  }

  removeOverrides(): void {
    if (!this.applied) return

    this.restoreOsmLayers()

    for (const id of [LAYER_LINE, LAYER_LABELS]) {
      if (this.map.getLayer(id)) this.map.removeLayer(id)
    }
    for (const id of [SOURCE_BOUNDARIES, SOURCE_LABELS]) {
      if (this.map.getSource(id)) this.map.removeSource(id)
    }

    this.applied = false
    this.currentConfig = null
  }

  isApplied(): boolean {
    return this.applied
  }

  getConfig(): ResolvedLayerConfig | null {
    return this.currentConfig
  }

  // ── private ───────────────────────────────────────────────────────────────

  private async fetchGeoJson(url: string): Promise<GeoJsonFeatureCollection | null> {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
      return await res.json() as GeoJsonFeatureCollection
    } catch (err) {
      console.warn('[ShopMap] LayerManager: could not fetch', url, err)
      return null
    }
  }

  private addBoundarySource(data: GeoJsonFeatureCollection): void {
    if (!this.map.getSource(SOURCE_BOUNDARIES)) {
      const spec: GeoJSONSourceSpecification = {
        type: 'geojson',
        data: data as unknown as GeoJSONSourceSpecification['data'],
      }
      this.map.addSource(SOURCE_BOUNDARIES, spec)
    }
  }

  private addLabelSource(data: GeoJsonFeatureCollection): void {
    if (!this.map.getSource(SOURCE_LABELS)) {
      const spec: GeoJSONSourceSpecification = {
        type: 'geojson',
        data: data as unknown as GeoJSONSourceSpecification['data'],
      }
      this.map.addSource(SOURCE_LABELS, spec)
    }
  }

  private addBoundaryLayers(width: number): void {
    // Match OpenFreeMap liberty's boundary_2 exactly so our line is indistinguishable
    // from OSM's: constant mid-grey colour, with a zoom-driven OPACITY ramp (faint when
    // zoomed out → solid/dark when zoomed in) and a zoom-driven WIDTH ramp.
    // The width ramp is scaled by `width` (default 1.5 ⇒ OSM's native ramp).
    if (!this.map.getLayer(LAYER_LINE)) {
      const k = width / 1.5
      this.map.addLayer({
        id:     LAYER_LINE,
        type:   'line',
        source: SOURCE_BOUNDARIES,
        paint:  {
          'line-color':   resolveCssVar('var(--map-border, hsl(248, 1%, 41%))'),
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.4, 4, 1],
          'line-width':   ['interpolate', ['linear'], ['zoom'], 3, 1 * k, 5, 1.2 * k, 12, 3 * k],
        },
      })
    }
  }

  private addLabelLayers(): void {
    if (!this.map.getLayer(LAYER_LABELS)) {
      this.map.addLayer({
        id:     LAYER_LABELS,
        type:   'symbol',
        source: SOURCE_LABELS,
        layout: {
          'text-field':            ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font':             ['Noto Sans Regular', 'Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size':             12,
          'text-anchor':           'center',
          'text-allow-overlap':    false,
          'text-ignore-placement': false,
        },
        paint: {
          'text-color':      resolveCssVar('var(--map-labels, #1a1a1a)'),
          'text-halo-color': 'rgba(255,255,255,0.85)',
          'text-halo-width': 1.5,
        },
      })
    }
  }

  /**
   * Suppresses ONLY the overridden country's OSM boundary features, scoped to the
   * region bbox — so our overlay is the single source of truth for that country's
   * borders while every neighbour-vs-neighbour border (and the rest of the world)
   * stays untouched.
   *
   * A feature is hidden when it is inside the bbox AND it belongs to the country
   * (adm0_l / adm0_r matches a configured code) OR it is a disputed line. This is
   * why e.g. Nepal–China and Bhutan–China borders inside the box remain visible.
   *
   * Target layers: ALWAYS auto-detect every line layer whose source-layer starts
   * with boundary/admin (covers OpenMapTiles, OpenFreeMap, MapTiler, Shortbread),
   * merged with any explicit IDs from config.
   *
   * Original filters are stored and restored by restoreOsmLayers().
   */
  private hideOsmLayers(
    layerIds: string[],
    bbox?: [number, number, number, number],
    osmFilter?: OsmBoundaryFilter,
  ): void {
    // Without a bbox we cannot scope spatially — skip rather than nuke all borders globally.
    if (!bbox) return
    const [west, south, east, north] = bbox
    const bboxPolygon = {
      type: 'Polygon' as const,
      coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
    }

    // Build the "is this the overridden country / a disputed line" predicate
    const adm0Fields  = osmFilter?.adm0Fields  ?? ['adm0_l', 'adm0_r']
    const adm0Values  = osmFilter?.adm0Values  ?? []
    const hideDisputed = osmFilter?.hideDisputed ?? true

    const countryMatches: unknown[] = []

    // Single-country: feature touches the overridden country on either side
    for (const field of adm0Fields) {
      for (const val of adm0Values) {
        countryMatches.push(['==', ['get', field], val])
      }
    }

    // Country PAIRS: mutual border between two neighbours the country claims
    // (e.g. PAK–CHN Karakoram). Order-independent across the two adm0 fields.
    const [fL, fR] = [adm0Fields[0] ?? 'adm0_l', adm0Fields[1] ?? 'adm0_r']
    for (const pair of osmFilter?.hidePairs ?? []) {
      const [a, b] = pair
      countryMatches.push(['all', ['==', ['get', fL], a], ['==', ['get', fR], b]])
      countryMatches.push(['all', ['==', ['get', fL], b], ['==', ['get', fR], a]])
    }

    if (hideDisputed) countryMatches.push(['==', ['get', 'disputed'], 1])
    if (osmFilter?.hideSubnational) countryMatches.push(['>=', ['get', 'admin_level'], 3])

    // If we have no way to identify the country's features, fall back to pure bbox.
    const belongsToCountry: unknown = countryMatches.length
      ? ['any', ...countryMatches]
      : true

    // Hide features inside the bbox that belong to the country / are disputed / are a claimed pair.
    const hidePredicate = ['all', ['within', bboxPolygon], belongsToCountry]

    const style = this.map.getStyle()
    const autoDetected = (style.layers ?? [])
      .filter((l) => {
        if (l.type !== 'line') return false
        const sl = String((l as Record<string, unknown>)['source-layer'] ?? '')
        return /^(boundary|boundaries|admin)/i.test(sl)
      })
      .map((l) => l.id)

    const explicit = layerIds.filter((id) => !!this.map.getLayer(id))
    const targets = Array.from(new Set([...autoDetected, ...explicit]))

    for (const id of targets) {
      try {
        const originalFilter = this.map.getFilter(id) as FilterSpecification | null | undefined
        const exclude        = ['!', hidePredicate]
        const newFilter      = originalFilter
          ? ['all', originalFilter, exclude]
          : exclude
        this.map.setFilter(id, newFilter as unknown as FilterSpecification)
        this.hiddenOsmLayers.push({ id, originalFilter })
      } catch { /* layer may not support filters / within */ }
    }
  }

  private restoreOsmLayers(): void {
    for (const { id, originalFilter } of this.hiddenOsmLayers) {
      try {
        this.map.setFilter(id, originalFilter ?? null)
      } catch { /* ok */ }
    }
    this.hiddenOsmLayers = []
  }
}
