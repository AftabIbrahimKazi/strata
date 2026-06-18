import type { MapProvider, MapStylePreset } from '../types/index.js'

const MAPTILER: Record<MapStylePreset, string> = {
  streets:   'streets-v2',
  satellite: 'satellite',
  hybrid:    'hybrid',
  terrain:   'outdoor-v2',
  topo:      'topo-v2',
  light:     'basic-v2-light',
  dark:      'basic-v2-dark',
}

const MAPBOX: Record<MapStylePreset, string> = {
  streets:   'streets-v12',
  satellite: 'satellite-v9',
  hybrid:    'satellite-streets-v12',
  terrain:   'outdoors-v12',
  topo:      'outdoors-v12',
  light:     'light-v11',
  dark:      'dark-v11',
}

/** Styles whose base layer is satellite imagery — map layer theming is skipped for these. */
export const SATELLITE_PRESETS = new Set<MapStylePreset>(['satellite'])

export function providerStyleUrl(provider: MapProvider, style: MapStylePreset): string {
  if (provider.name === 'maptiler') {
    const id = MAPTILER[style] ?? MAPTILER.streets
    return `https://api.maptiler.com/maps/${id}/style.json?key=${provider.key}`
  }
  if (provider.name === 'mapbox') {
    const id = MAPBOX[style] ?? MAPBOX.streets
    return `https://api.mapbox.com/styles/v1/mapbox/${id}?access_token=${provider.key}`
  }
  throw new Error(`[ShopMap] Unknown provider "${provider.name}"`)
}

export type { MapProvider, MapStylePreset }
