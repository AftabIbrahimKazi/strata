import type { ShopMapConfig, MapMode, MapTokens, MapThemePreset, MapStylePreset, TerrainOptions, LayerOverrideConfig, LayerUserOverrides, PinConfig, PopupConfig, LandmarksConfig } from './types/index.js'
import { ShopMapRenderer } from './core/renderer.js'
import { ShopPin } from './core/pin.js'
import { ShopPopup } from './core/popup.js'
import { LandmarkLayer } from './core/landmarks.js'
import { resolveTheme, watchAutoTheme } from './themes/index.js'

export type { ShopMapConfig, MapMode, MapTokens, MapThemePreset, MapStylePreset, MapProviderName, MapProvider, TerrainOptions, HypsometricStop, FeatureTextureOptions, LayerOverrideConfig, LayerUserOverrides } from './types/index.js'
export { providerStyleUrl, SATELLITE_PRESETS } from './providers/index.js'
export type {
  PinConfig,
  PopupConfig,
  LandmarksConfig,
  LandmarkCategory,
  ZoomConfig,
  TilesConfig,
  LandmarkEntry,
} from './types/index.js'
export type { LayerOverride } from './layers/registry.js'
export { hasOverride, getOverride, layerRegistry } from './layers/registry.js'
export { resolveTheme, watchAutoTheme } from './themes/index.js'
export { light, dark, sepia, highContrast } from './themes/index.js'
export { getIcon } from './icons/index.js'
export { resolveTokens, buildMapStyle } from './core/style-builder.js'

export class ShopMap {
  private renderer: ShopMapRenderer
  private pin: ShopPin | null = null
  private popup: ShopPopup | null = null
  private landmarks: LandmarkLayer | null = null
  private autoThemeCleanup: (() => void) | null = null
  private config: ShopMapConfig

  constructor(container: string | HTMLElement, config: ShopMapConfig) {
    this.config = config

    // Write resolved theme tokens as CSS custom properties scoped to the container
    const el = typeof container === 'string'
      ? (document.querySelector(container) as HTMLElement | null)
      : container

    if (el) {
      const tokens = resolveTheme(config.theme)
      const tokenMap = tokens as Record<string, string | undefined>
      for (const [key, val] of Object.entries(tokenMap)) {
        if (!val) continue
        const cssKey = `--map-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
        el.style.setProperty(cssKey, val)
      }
    }

    this.renderer = new ShopMapRenderer(container, config)
    const map = this.renderer.getMap()

    map.on('load', () => {
      // Pin
      this.pin = new ShopPin(map, config.location.lat, config.location.lng, config.pin ?? {})

      // Popup
      if (config.popup) {
        this.popup = new ShopPopup(map, config.location.lat, config.location.lng, config.popup)
        const pinEl = this.pin.getElement()
        pinEl.addEventListener('click', () => {
          this.popup?.toggle(map)
          this.pin?.setActive(true)
        })
        map.on('click', () => {
          this.pin?.setActive(false)
        })
      }

      // Landmarks
      if (config.landmarks) {
        this.landmarks = new LandmarkLayer(map, config.landmarks)
      }
    })

    // Auto theme watcher
    if (config.theme === 'auto') {
      this.autoThemeCleanup = watchAutoTheme(() => {
        this.renderer['rebuildStyle']()
      })
    }
  }

  setTheme(theme: MapThemePreset | MapTokens): void {
    this.config = { ...this.config, theme }
    this.renderer['config'] = this.config
    this.renderer['rebuildStyle']()
  }

  setMode(mode: MapMode): void {
    this.renderer.setMode(mode)
  }

  switchTileStyle(url: string): void {
    this.renderer.switchTileStyle(url)
  }

  switchStyle(style: MapStylePreset): void {
    this.renderer.switchStyle(style)
  }

  setPin(config: PinConfig): void {
    if (!this.pin) return
    const map = this.renderer.getMap()
    this.pin.remove()
    this.config = { ...this.config, pin: config }
    this.pin = new ShopPin(map, this.config.location.lat, this.config.location.lng, config)
    if (this.popup) {
      const pinEl = this.pin.getElement()
      pinEl.addEventListener('click', () => {
        this.popup?.toggle(map)
        this.pin?.setActive(true)
      })
    }
  }

  updatePopup(config: Partial<PopupConfig>): void {
    this.popup?.update(config)
  }

  enableLandmarks(config: LandmarksConfig): void {
    this.landmarks?.remove()
    const map = this.renderer.getMap()
    this.landmarks = new LandmarkLayer(map, config)
    this.config = { ...this.config, landmarks: config }
  }

  disableLandmarks(): void {
    this.landmarks?.remove()
    this.landmarks = null
  }

  enableTerrain(options?: TerrainOptions): void {
    this.renderer.enableTerrain(options)
  }

  disableTerrain(): void {
    this.renderer.disableTerrain()
  }

  enableFeatureTextures(options?: import('./types/index.js').FeatureTextureOptions): Promise<void> {
    return this.renderer.enableFeatureTextures(options)
  }

  disableFeatureTextures(): void {
    this.renderer.disableFeatureTextures()
  }

  setLocation(lat: number, lng: number, zoom?: number): void {
    if (zoom !== undefined) {
      this.renderer.getMap().flyTo({ center: [lng, lat], zoom, duration: 1200 })
    } else {
      this.renderer.setLocation(lat, lng)
    }
  }

  setRegion(region: string, overrides?: LayerUserOverrides): Promise<void> {
    return this.renderer.setRegion(region, overrides)
  }

  destroy(): void {
    this.autoThemeCleanup?.()
    this.landmarks?.remove()
    this.popup?.remove()
    this.pin?.remove()
    this.renderer.destroy()
  }
}
