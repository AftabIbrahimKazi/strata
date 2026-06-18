import type { Map as MapLibreMap } from 'maplibre-gl'
import type { ShopMapConfig, MapMode, MapTokens, MapStylePreset, TerrainOptions, FeatureTextureOptions, LayerUserOverrides } from '../types/index.js'
import { resolveTokens, buildMapStyle } from './style-builder.js'
import { resolveTheme } from '../themes/index.js'
import { LayerManager, type ResolvedLayerConfig } from './layer-manager.js'
import { hasOverride, getOverride } from '../layers/registry.js'
import { providerStyleUrl, SATELLITE_PRESETS } from '../providers/index.js'
import { HypsometricSource } from './hypsometric.js'
import {
  registerFeatureTextures,
  unregisterFeatureTextures,
  applyFeatureTextures,
  removeFeatureTextures,
} from './feature-textures.js'

const STYLE_ID = 'smap-renderer-styles'

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .smap-container {
      position: relative;
    }

    .smap-container[data-smap-mode="3d"] .maplibregl-canvas {
      cursor: grab;
    }

    .smap-container[data-smap-mode="3d"] .maplibregl-canvas:active {
      cursor: grabbing;
    }
  `
  document.head.appendChild(style)
}

function resolveContainer(container: string | HTMLElement): HTMLElement {
  if (typeof container === 'string') {
    const el = document.querySelector(container) as HTMLElement | null
    if (!el) throw new Error(`[ShopMap] Container "${container}" not found`)
    return el
  }
  return container
}

function tilesUrl(tiles: NonNullable<ShopMapConfig['tiles']>): string {
  if (typeof tiles === 'string') return tiles
  return tiles.local
}

/** True when the tiles value is a complete hosted MapLibre style JSON URL. */
function isHostedStyleUrl(url: string): boolean {
  return (
    (url.startsWith('http') || url.startsWith('/')) &&
    !url.endsWith('.pmtiles') &&
    !url.includes('pmtiles://') &&
    !url.includes('{z}')
  )
}

export class ShopMapRenderer {
  private map: MapLibreMap | null = null
  private observer: MutationObserver | null = null
  private containerEl: HTMLElement
  private config: ShopMapConfig
  private currentTokens: Required<MapTokens>
  private mode: MapMode
  private hostedStyle = false
  private currentStylePreset: MapStylePreset | null = null
  private layerManager: LayerManager | null = null
  private hypsometricSource: HypsometricSource | null = null
  private hypsometricVersion = 0
  private hypsometricProtocol: string | null = null
  private textureVersion = 0
  private textureProtocol: string | null = null
  private activeTextureUrl: string | null = null
  private featureTextureSaved: Map<string, { prop: string; pattern: string; val: unknown }> = new Map()

  constructor(container: string | HTMLElement, config: ShopMapConfig) {
    this.containerEl = resolveContainer(container)
    this.config = config
    this.mode = config.mode ?? '2d'
    this.currentTokens = resolveTokens(resolveTheme(config.theme))

    ensureStyles()
    this.containerEl.classList.add('smap-container')
    this.containerEl.setAttribute('data-smap-mode', this.mode)

    this.initMap()
  }

  private initMap(): void {
    const ML = (window as unknown as Record<string, unknown>)['maplibregl'] as typeof import('maplibre-gl') | undefined
    const PMTiles = (window as unknown as Record<string, unknown>)['pmtiles'] as typeof import('pmtiles') | undefined

    if (!ML) throw new Error('[ShopMap] maplibre-gl is required. Load it before ShopMap.')

    let tilesSource: string
    let isPMTiles = false
    if (this.config.provider) {
      const preset = this.config.provider.style ?? 'streets'
      this.currentStylePreset = preset
      tilesSource = providerStyleUrl(this.config.provider, preset)
      this.hostedStyle = true
    } else {
      if (!this.config.tiles) throw new Error('[ShopMap] Either tiles or provider is required')
      tilesSource = tilesUrl(this.config.tiles!)
      isPMTiles = tilesSource.endsWith('.pmtiles') || tilesSource.includes('pmtiles://')
      this.hostedStyle = !isPMTiles && isHostedStyleUrl(tilesSource)
    }

    let mapStyle: unknown

    if (this.hostedStyle) {
      // Use a hosted MapLibre style JSON directly — tiles are controlled by the remote style.
      // CSS token theming applies to pins, popups, and landmarks; not to the base tile styling.
      mapStyle = tilesSource
    } else {
      if (isPMTiles) {
        if (!PMTiles) throw new Error('[ShopMap] pmtiles is required for .pmtiles sources.')
        const protocol = new PMTiles.Protocol()
        ML.addProtocol('pmtiles', protocol.tile.bind(protocol))
      }

      const sourceUrl = isPMTiles
        ? (tilesSource.startsWith('pmtiles://') ? tilesSource : `pmtiles://${tilesSource}`)
        : tilesSource

      const style = buildMapStyle(this.currentTokens)
      mapStyle = {
        ...(style as object),
        sources: {
          openmaptiles: isPMTiles
            ? { type: 'vector', url: sourceUrl }
            : { type: 'vector', tiles: [sourceUrl], maxzoom: 14 },
        },
      }
    }

    const zoom = this.config.zoom ?? {}

    this.map = new ML.Map({
      container: this.containerEl,
      style: mapStyle as ConstructorParameters<typeof ML.Map>[0]['style'],
      center: [this.config.location.lng, this.config.location.lat],
      zoom:    zoom.default ?? 15,
      minZoom: zoom.min     ?? 12,
      maxZoom: zoom.max     ?? 18,
      pitch:   this.mode === '3d' ? 45 : 0,
      bearing: this.mode === '3d' ? -15 : 0,
      attributionControl: false,
    })

    if (this.config.attribution !== false) {
      this.map.addControl(
        new ML.AttributionControl({
          customAttribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
          compact: true,
        }),
        'bottom-right'
      )
    }

    this.map.on('load', () => {
      if (this.map) {
        this.layerManager = new LayerManager(this.map)
        this.applyRegionLayers()
        this.rebuildStyle()
      }
    })

    // Silence "Image X could not be loaded" warnings from hosted styles whose sprite
    // references icons not included in the sprite sheet (e.g. liberty POI icons).
    this.map.on('styleimagemissing', (e: { id: string }) => {
      if (!this.map) return
      // Add a 1×1 transparent placeholder so MapLibre stops retrying and warning.
      this.map.addImage(e.id, new ImageData(new Uint8ClampedArray([0, 0, 0, 0]), 1, 1))
    })

    this.watchThemeChanges()
  }

  private applyRegionLayers(): void {
    if (!this.layerManager) return
    const region = this.config.region
    if (!region) return

    const overrideCfg = this.config.layers
    if (overrideCfg?.auto === false) return
    if (!hasOverride(region)) return

    this.buildLayerConfig(region, overrideCfg?.basePath, overrideCfg?.overrides)
      .then((cfg) => {
        if (cfg) return this.layerManager!.applyOverrides(cfg)
      })
      .catch((err) => {
        console.warn('[ShopMap] Layer override failed:', err)
      })
  }

  /**
   * Three-tier merge:
   *   Tier 1 — registry paths (boundaries, labels, configPath)
   *   Tier 2 — config.json values (bbox, hideLayers, width, attribution)
   *   Tier 3 — developer overrides (any field; always wins)
   */
  private async buildLayerConfig(
    region: string,
    basePath?: string,
    userOverrides?: LayerUserOverrides,
  ): Promise<ResolvedLayerConfig | null> {
    const entry = getOverride(region)
    if (!entry) return null

    const base = basePath ? basePath.replace(/\/$/, '') : ''

    const resolvePath = (p: string) =>
      base ? `${base}/${p.replace(/^.*?layers\//, 'layers/')}` : p

    // Tier 1 — registry paths
    const boundaries = resolvePath(entry.boundaries)
    const labels     = resolvePath(entry.labels)
    const configPath = resolvePath(entry.configPath)

    // Tier 2 — config.json
    let tier2: {
      bbox?: [number,number,number,number]
      hideLayers?: string[]
      osmFilter?: ResolvedLayerConfig['osmFilter']
      width?: number
      attribution?: string
    } = {}
    try {
      const res = await fetch(configPath)
      if (res.ok) tier2 = await res.json() as typeof tier2
    } catch { /* config.json is optional; registry paths still work without it */ }

    // Tier 3 — user overrides win over everything
    const resolved: ResolvedLayerConfig = {
      boundaries:  userOverrides?.boundaries ?? boundaries,
      labels:      userOverrides?.labels     ?? labels,
      bbox:        userOverrides?.bbox       ?? tier2.bbox,
      hideLayers:  userOverrides?.hideLayers ?? tier2.hideLayers,
      osmFilter:   tier2.osmFilter,
      width:       userOverrides?.width      ?? tier2.width,
      attribution: tier2.attribution ?? entry.attribution,
    }

    return resolved
  }

  private watchThemeChanges(): void {
    const watched = ['data-st-theme', 'data-bs-theme', 'class', 'style']

    this.observer = new MutationObserver((mutations) => {
      const relevant = mutations.some((m) =>
        m.type === 'attributes' && watched.includes(m.attributeName ?? '')
      )
      if (relevant) this.rebuildStyle()
    })

    this.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: watched,
    })
  }

  applyThemeTokens(): void {
    const tokens = resolveTheme(this.config.theme) as Record<string, string | undefined>
    for (const [key, val] of Object.entries(tokens)) {
      if (!val) continue
      const cssKey = `--map-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
      this.containerEl.style.setProperty(cssKey, val)
    }
  }

  private applyThemeToHostedStyle(): void {
    if (!this.map) return
    const styleLayers = this.map.getStyle()?.layers
    if (!styleLayers) return
    // Pure satellite imagery — no vector base layers to recolour; labels still get themed below
    const satelliteOnly = this.currentStylePreset !== null && SATELLITE_PRESETS.has(this.currentStylePreset)

    const tokens = resolveTokens(resolveTheme(this.config.theme))
    this.currentTokens = tokens

    for (const layer of styleLayers) {
      const sl = (layer as Record<string, unknown>)['source-layer'] as string | undefined ?? ''
      const type = layer.type as string
      const id = layer.id

      try {
        if (!satelliteOnly) {
          if (type === 'background') {
            this.map.setPaintProperty(id, 'background-color', tokens.land)
          } else if ((sl === 'water' || sl === 'waterway') && type === 'line') {
            this.map.setPaintProperty(id, 'line-color', tokens.water)
          } else if (sl === 'water' && type === 'fill') {
            this.map.setPaintProperty(id, 'fill-color', tokens.water)
          } else if (sl === 'building' && type === 'fill') {
            this.map.setPaintProperty(id, 'fill-color', tokens.buildings)
            this.map.setPaintProperty(id, 'fill-outline-color', tokens.roadsMinor)
          } else if (sl === 'building' && type === 'fill-extrusion') {
            this.map.setPaintProperty(id, 'fill-extrusion-color', tokens.buildings)
          } else if (sl === 'landuse' && type === 'fill') {
            const filterStr = JSON.stringify(this.map.getFilter(id) ?? '')
            const isPark = /park|grass|meadow|garden|cemetery/.test(filterStr)
            this.map.setPaintProperty(id, 'fill-color', isPark ? tokens.parks : tokens.land)
          } else if (sl === 'transportation' && type === 'line') {
            const filterStr = JSON.stringify(this.map.getFilter(id) ?? '')
            const isMinor = /minor|service|track|path|pedestrian/.test(filterStr)
            this.map.setPaintProperty(id, 'line-color', isMinor ? tokens.roadsMinor : tokens.roads)
          }
        }
        // Label overrides apply to all styles including satellite
        if (sl === 'transportation_name' && type === 'symbol') {
          this.map.setPaintProperty(id, 'text-color', tokens.labels)
          this.map.setPaintProperty(id, 'text-halo-color', satelliteOnly ? '#000' : tokens.roads)
        } else if (sl === 'place' && type === 'symbol') {
          this.map.setPaintProperty(id, 'text-color', tokens.labels)
          this.map.setPaintProperty(id, 'text-halo-color', satelliteOnly ? '#000' : tokens.land)
        }
      } catch {
        // layer may reject a property mismatch — safe to skip
      }
    }
  }

  private rebuildStyle(): void {
    this.applyThemeTokens()
    if (!this.map) return

    if (this.hostedStyle) {
      this.applyThemeToHostedStyle()
      return
    }

    const tokens = resolveTokens(resolveTheme(this.config.theme))
    this.currentTokens = tokens
    const newStyle = buildMapStyle(tokens)

    const layers = (newStyle as { layers?: object[] }).layers ?? []
    for (const layer of layers) {
      const l = layer as { id: string; paint?: Record<string, unknown>; layout?: Record<string, unknown> }
      try {
        if (l.paint) {
          for (const [prop, val] of Object.entries(l.paint)) {
            this.map.setPaintProperty(l.id, prop, val)
          }
        }
        if (l.layout) {
          for (const [prop, val] of Object.entries(l.layout)) {
            this.map.setLayoutProperty(l.id, prop, val as string)
          }
        }
      } catch {
        // layer may not exist yet if tiles are still loading
      }
    }
  }

  switchTileStyle(url: string): void {
    this.currentStylePreset = null
    this.hostedStyle = isHostedStyleUrl(url)
    this.map?.setStyle(url)
    this.map?.once('styledata', () => {
      if (!this.map) return
      this.layerManager = new LayerManager(this.map)
      this.rebuildStyle()
      this.applyRegionLayers()
    })
  }

  switchStyle(style: MapStylePreset): void {
    if (!this.config.provider) {
      console.warn('[ShopMap] switchStyle() requires a provider in config')
      return
    }
    this.currentStylePreset = style
    this.hostedStyle = true
    const url = providerStyleUrl(this.config.provider, style)
    this.map?.setStyle(url)
    this.map?.once('styledata', () => {
      if (!this.map) return
      this.layerManager = new LayerManager(this.map)
      this.rebuildStyle()
      this.applyRegionLayers()
    })
  }

  getMap(): MapLibreMap {
    if (!this.map) throw new Error('[ShopMap] Map not initialized')
    return this.map
  }

  getTokens(): Required<MapTokens> {
    return this.currentTokens
  }

  isUsingHostedStyle(): boolean {
    return this.hostedStyle
  }

  setMode(mode: MapMode): void {
    if (!this.map) return
    this.mode = mode
    this.containerEl.setAttribute('data-smap-mode', mode)

    if (mode === '3d') {
      this.map.easeTo({ pitch: 45, bearing: -15, duration: 600 })
      if (!this.hostedStyle) {
        try { this.map.setLayoutProperty('building', 'visibility', 'none') } catch { /* ok */ }
        try { this.map.setLayoutProperty('building-3d', 'visibility', 'visible') } catch { /* ok */ }
      }
    } else {
      this.map.easeTo({ pitch: 0, bearing: 0, duration: 600 })
      if (!this.hostedStyle) {
        try { this.map.setLayoutProperty('building-3d', 'visibility', 'none') } catch { /* ok */ }
        try { this.map.setLayoutProperty('building', 'visibility', 'visible') } catch { /* ok */ }
      }
    }
  }

  setLocation(lat: number, lng: number): void {
    this.map?.flyTo({ center: [lng, lat], duration: 800 })
  }

  setRegion(region: string, overrides?: LayerUserOverrides): Promise<void> {
    this.config = { ...this.config, region }
    if (!this.layerManager) return Promise.resolve()

    this.layerManager.removeOverrides()

    if (!hasOverride(region)) return Promise.resolve()

    const layerCfg = this.config.layers
    const mergedOverrides = overrides ?? layerCfg?.overrides

    return this.buildLayerConfig(region, layerCfg?.basePath, mergedOverrides).then((cfg) => {
      if (cfg) return this.layerManager!.applyOverrides(cfg)
    })
  }

  private static readonly DEFAULT_HYPSOMETRIC_STOPS: import('../types/index.js').HypsometricStop[] = [
    { elevation: -6000, color: '#08306b' },
    { elevation: -2000, color: '#08519c' },
    { elevation:  -200, color: '#2171b5' },
    { elevation:   -10, color: '#6baed6' },
    { elevation:     0, color: '#74c476' },
    { elevation:   200, color: '#a1d99b' },
    { elevation:   500, color: '#d4b483' },
    { elevation:  1000, color: '#b8860b' },
    { elevation:  2000, color: '#8b6914' },
    { elevation:  3500, color: '#808080' },
    { elevation:  5000, color: '#ffffff' },
  ]

  enableTerrain(options: TerrainOptions = {}): void {
    if (!this.map || !this.map.getStyle()) return

    const exaggeration       = options.exaggeration       ?? 1.5
    const hillshadeIntensity = options.hillshadeIntensity  ?? 0.5
    const addHillshade       = options.hillshade           ?? true
    const addHypsometric     = options.hypsometric         ?? false
    const hypsometricOpacity = options.hypsometricOpacity  ?? 0.45
    const hypsometricRange   = options.hypsometricRange
    const hypsometricStops       = options.hypsometricStops    ?? ShopMapRenderer.DEFAULT_HYPSOMETRIC_STOPS
    const hillshadeBlend         = options.hillshadeBlend      ?? 0.7
    const sunAzimuth             = options.sunAzimuth          ?? 315
    const sunAltitude            = options.sunAltitude         ?? 45
    const shadingExaggeration    = options.shadingExaggeration ?? 1.5
    const addTexture         = options.texture             ?? false
    const textureOpacity     = options.textureOpacity      ?? 0.6
    const textureUrl         = options.textureUrl          ??
      'https://tile.opentopomap.org/{z}/{x}/{y}.png'
    const textureMaxzoom     = options.textureMaxzoom      ?? 17

    const DEM_SRC = {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      encoding: 'terrarium',
      tileSize: 256,
      maxzoom: 15,
    }

    // Two separate raster-dem sources — MapLibre 4 requires separate sources for terrain + hillshade.
    if (!this.map.getSource('smap-dem'))
      this.map.addSource('smap-dem', DEM_SRC as Parameters<MapLibreMap['addSource']>[1])
    if (addHillshade && !this.map.getSource('smap-dem-hs'))
      this.map.addSource('smap-dem-hs', DEM_SRC as Parameters<MapLibreMap['addSource']>[1])

    // firstSymbol: used for hillshade — sits below labels/symbols
    const firstSymbol = this.map.getStyle()?.layers?.find(l => l.type === 'symbol')?.id

    // aboveAllFills: a stable insertion point above every host-style fill layer (including water
    // fills that come after waterway lines in liberty-style stacks). We skip smap-* layers in the
    // search so the result doesn't depend on what we added in a previous call — those layers will
    // be removed during cleanup before we call addLayer.
    const styleLayers = this.map.getStyle()?.layers ?? []
    let lastFillIdx = -1
    for (let i = 0; i < styleLayers.length; i++) {
      if (styleLayers[i].type === 'fill' && !styleLayers[i].id.startsWith('smap-')) lastFillIdx = i
    }
    const aboveAllFills = styleLayers
      .slice(lastFillIdx + 1)
      .find(l => !l.id.startsWith('smap-'))?.id
      ?? styleLayers.find(l => !l.id.startsWith('smap-') && (l.type === 'line' || l.type === 'symbol'))?.id

    // Hypsometric tinting — a versioned addProtocol handler fetches Terrarium tiles,
    // decodes elevation per-pixel via HypsometricSource.loadTile, and returns an
    // ImageBitmap to a standard raster source. A new protocol name per version busts
    // MapLibre's tile cache so every ramp change forces fresh tile fetches.
    // (MapLibre 4.7.x does not support type:'custom' as a built-in source type.)
    const ML2 = (window as unknown as Record<string, unknown>)['maplibregl'] as typeof import('maplibre-gl') | undefined
    if (addHypsometric && ML2) {
      // Remove previous layer + source + protocol first, so the insertion-point
      // lookup below doesn't accidentally land on our own old layer.
      if (this.map.getLayer('smap-hypsometric')) this.map.removeLayer('smap-hypsometric')
      const prevSrcId = `smap-hypsometric-src-${this.hypsometricVersion}`
      if (this.map.getSource(prevSrcId)) this.map.removeSource(prevSrcId)
      if (this.hypsometricProtocol) {
        try { ML2.removeProtocol(this.hypsometricProtocol) } catch { /* ok */ }
      }


      this.hypsometricVersion++
      const protocol = `smap-hyps-${this.hypsometricVersion}`
      const srcId    = `smap-hypsometric-src-${this.hypsometricVersion}`
      this.hypsometricProtocol = protocol
      this.hypsometricSource   = new HypsometricSource(hypsometricStops, hypsometricRange, {
        hillshadeBlend,
        sunAzimuth,
        sunAltitude,
        shadingExaggeration,
      })

      const hypsSource = this.hypsometricSource
      ML2.addProtocol(protocol, async (
        params: { url: string },
        abortController: AbortController,
      ) => {
        const m = params.url.match(/\/(\d+)\/(\d+)\/(\d+)$/)
        if (!m) return { data: new ArrayBuffer(0) }
        const imageData = await hypsSource.loadTile(
          { z: +m[1], x: +m[2], y: +m[3] },
          { signal: abortController.signal },
        )
        if (!imageData) return { data: new ArrayBuffer(0) }
        const oc  = new OffscreenCanvas(256, 256)
        const ctx = oc.getContext('2d') as OffscreenCanvasRenderingContext2D
        ctx.putImageData(imageData, 0, 0)
        const bitmap = await createImageBitmap(oc)
        return { data: bitmap }
      })

      this.map.addSource(srcId, {
        type: 'raster',
        tiles: [`${protocol}:///{z}/{x}/{y}`],
        tileSize: 256,
        maxzoom: 15,
      } as Parameters<MapLibreMap['addSource']>[1])
      this.map.addLayer({
        id: 'smap-hypsometric',
        type: 'raster',
        source: srcId,
        paint: { 'raster-opacity': hypsometricOpacity },
      } as Parameters<MapLibreMap['addLayer']>[0], aboveAllFills)

    } else if (this.map.getLayer('smap-hypsometric')) {
      this.map.removeLayer('smap-hypsometric')
      const srcId = `smap-hypsometric-src-${this.hypsometricVersion}`
      if (this.map.getSource(srcId)) this.map.removeSource(srcId)
    }

    // Terrain texture overlay — sits above hypsometric and below road lines.
    // Uses a protocol handler to fetch the texture and Terrarium tiles in parallel,
    // then zeros alpha on pixels where elevation < 0 so ocean shows through to the
    // hypsometric depth colours (or base-map water) below.
    // A versioned protocol + source ID busts the tile cache whenever the URL changes.
    if (addTexture && ML2) {
      const urlChanged = textureUrl !== this.activeTextureUrl
      if (urlChanged) {
        // Tear down old protocol + layer + source
        if (this.map.getLayer('smap-texture')) this.map.removeLayer('smap-texture')
        const prevTexSrcId = `smap-texture-src-${this.textureVersion}`
        if (this.map.getSource(prevTexSrcId)) this.map.removeSource(prevTexSrcId)
        if (this.textureProtocol) {
          try { ML2.removeProtocol(this.textureProtocol) } catch { /* ok */ }
        }

        this.textureVersion++
        const texProtocol = `smap-tex-${this.textureVersion}`
        const texSrcId    = `smap-texture-src-${this.textureVersion}`
        this.textureProtocol = texProtocol
        this.activeTextureUrl = textureUrl

        // Capture for closure — resolves {z}/{y}/{x} and {z}/{x}/{y} templates alike
        const capturedUrl = textureUrl
        ML2.addProtocol(texProtocol, async (
          params: { url: string },
          abortController: AbortController,
        ) => {
          const m = params.url.match(/\/(\d+)\/(\d+)\/(\d+)$/)
          if (!m) return { data: new ArrayBuffer(0) }
          const z = +m[1], x = +m[2], y = +m[3]

          const resolvedUrl = capturedUrl
            .replace('{z}', String(z))
            .replace('{x}', String(x))
            .replace('{y}', String(y))

          const [texRes, demRes] = await Promise.all([
            fetch(resolvedUrl, { signal: abortController.signal }).catch(() => null),
            fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
              { signal: abortController.signal }).catch(() => null),
          ])

          if (!texRes?.ok) return { data: new ArrayBuffer(0) }

          const texBitmap = await createImageBitmap(await texRes.blob())
          const oc  = new OffscreenCanvas(256, 256)
          const ctx = oc.getContext('2d') as OffscreenCanvasRenderingContext2D
          ctx.drawImage(texBitmap, 0, 0)
          texBitmap.close()

          // Mask water — zero alpha where Terrarium elevation < 0 m
          if (demRes?.ok) {
            const demBitmap = await createImageBitmap(await demRes.blob())
            const demOc  = new OffscreenCanvas(256, 256)
            const demCtx = demOc.getContext('2d') as OffscreenCanvasRenderingContext2D
            demCtx.drawImage(demBitmap, 0, 0)
            demBitmap.close()

            const texPx = ctx.getImageData(0, 0, 256, 256)
            const demPx = demCtx.getImageData(0, 0, 256, 256)
            const t = texPx.data, d = demPx.data
            for (let i = 0; i < t.length; i += 4) {
              const elev = d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768
              if (elev < 0) t[i + 3] = 0
            }
            ctx.putImageData(texPx, 0, 0)
          }

          return { data: await createImageBitmap(oc) }
        })

        this.map.addSource(texSrcId, {
          type: 'raster',
          tiles: [`${texProtocol}:///{z}/{x}/{y}`],
          tileSize: 256,
          maxzoom: textureMaxzoom,
        } as Parameters<MapLibreMap['addSource']>[1])
      }

      const texSrcId = `smap-texture-src-${this.textureVersion}`
      if (!this.map.getLayer('smap-texture')) {
        this.map.addLayer({
          id: 'smap-texture',
          type: 'raster',
          source: texSrcId,
          paint: { 'raster-opacity': textureOpacity },
        } as Parameters<MapLibreMap['addLayer']>[0], aboveAllFills)
      } else {
        this.map.setPaintProperty('smap-texture', 'raster-opacity', textureOpacity)
      }
    } else if (this.map.getLayer('smap-texture')) {
      this.map.removeLayer('smap-texture')
      const texSrcId = `smap-texture-src-${this.textureVersion}`
      if (this.map.getSource(texSrcId)) this.map.removeSource(texSrcId)
      if (this.textureProtocol && ML2) {
        try { ML2.removeProtocol(this.textureProtocol) } catch { /* ok */ }
        this.textureProtocol = null
      }
      this.activeTextureUrl = null
    }

    // Hillshade — uses its own DEM source to avoid MapLibre 4 shared-source warning.
    if (addHillshade && !this.map.getLayer('smap-hillshade')) {
      this.map.addLayer({
        id: 'smap-hillshade',
        type: 'hillshade',
        source: 'smap-dem-hs',
        paint: {
          'hillshade-exaggeration': hillshadeIntensity,
          'hillshade-illumination-anchor': 'map',
          'hillshade-shadow-color': '#473B24',
          'hillshade-highlight-color': '#FFFEF0',
        },
      } as Parameters<MapLibreMap['addLayer']>[0], firstSymbol)
    } else if (!addHillshade && this.map.getLayer('smap-hillshade')) {
      this.map.removeLayer('smap-hillshade')
    }

    this.map.setTerrain({ source: 'smap-dem', exaggeration })
    this.setMode('3d')
  }

  disableTerrain(): void {
    if (!this.map) return
    try { this.map.setTerrain(null as unknown as Parameters<MapLibreMap['setTerrain']>[0]) } catch { /* ok */ }
    if (this.map.getLayer('smap-hypsometric')) this.map.removeLayer('smap-hypsometric')
    const ML2 = (window as unknown as Record<string, unknown>)['maplibregl'] as typeof import('maplibre-gl') | undefined
    if (this.map.getLayer('smap-hypsometric')) this.map.removeLayer('smap-hypsometric')
    if (this.map.getLayer('smap-texture'))     this.map.removeLayer('smap-texture')
    if (this.map.getLayer('smap-hillshade'))   this.map.removeLayer('smap-hillshade')
    const hypsSrcId = `smap-hypsometric-src-${this.hypsometricVersion}`
    if (this.map.getSource(hypsSrcId))                                this.map.removeSource(hypsSrcId)
    const texSrcId = `smap-texture-src-${this.textureVersion}`
    if (this.map.getSource(texSrcId))                                 this.map.removeSource(texSrcId)
    if (this.map.getSource('smap-dem-hs'))                            this.map.removeSource('smap-dem-hs')
    if (this.map.getSource('smap-dem'))                               this.map.removeSource('smap-dem')
    if (this.hypsometricProtocol) {
      try { ML2?.removeProtocol(this.hypsometricProtocol) } catch { /* ok */ }
      this.hypsometricProtocol = null
    }
    if (this.textureProtocol) {
      try { ML2?.removeProtocol(this.textureProtocol) } catch { /* ok */ }
      this.textureProtocol = null
    }
    this.hypsometricSource = null
    this.activeTextureUrl = null
  }

  async enableFeatureTextures(options: FeatureTextureOptions = {}): Promise<void> {
    if (!this.map) return
    await registerFeatureTextures(this.map, options)
    removeFeatureTextures(this.map, this.featureTextureSaved)
    this.featureTextureSaved = applyFeatureTextures(this.map, options)
  }

  disableFeatureTextures(): void {
    if (!this.map) return
    removeFeatureTextures(this.map, this.featureTextureSaved)
    unregisterFeatureTextures(this.map)
  }

  getLayerManager(): LayerManager | null {
    return this.layerManager
  }

  destroy(): void {
    this.observer?.disconnect()
    this.observer = null
    this.layerManager?.removeOverrides()
    this.layerManager = null
    this.map?.remove()
    this.map = null
    this.containerEl.classList.remove('smap-container')
    this.containerEl.removeAttribute('data-smap-mode')
  }
}
