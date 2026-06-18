import type { MapTokens } from '../types/index.js'

const FALLBACKS: Record<keyof MapTokens, [string, string, string]> = {
  land:       ['--map-land',        '--st-bg',              '--bs-body-bg'],
  water:      ['--map-water',       '--st-info',            '--bs-info'],
  roads:      ['--map-roads',       '--st-bg',              '--bs-body-bg'],
  roadsMinor: ['--map-roads-minor', '--st-border',          '--bs-border-color'],
  buildings:  ['--map-buildings',   '--st-secondary',       '--bs-secondary-bg'],
  labels:     ['--map-labels',      '--st-text',            '--bs-body-color'],
  parks:      ['--map-parks',       '--st-success',         '--bs-success'],
  marker:     ['--map-marker',      '--st-primary',         '--bs-primary'],
  radius:     ['--map-radius',      '--st-border-radius',   '--bs-border-radius'],
  duration:   ['--map-duration',    '--st-duration',        ''],
  font:       ['--map-font',        '--st-font-family',     '--bs-font-sans-serif'],
}

const DEFAULTS: Record<keyof MapTokens, string> = {
  land:       '#f4f1ec',
  water:      '#a8d5e2',
  roads:      '#ffffff',
  roadsMinor: '#e0dcd4',
  buildings:  '#e8e4df',
  labels:     '#333333',
  parks:      '#c8e6c9',
  marker:     '#0d6efd',
  radius:     '8px',
  duration:   '200ms',
  font:       'system-ui, sans-serif',
}

function readCSSVar(name: string): string {
  if (!name || typeof document === 'undefined') return ''
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return val
}

export function resolveTokens(overrides: MapTokens = {}): Required<MapTokens> {
  const resolved = {} as Required<MapTokens>
  const keys = Object.keys(DEFAULTS) as (keyof MapTokens)[]

  for (const key of keys) {
    if (overrides[key]) {
      resolved[key] = overrides[key]!
      continue
    }

    const [mapVar, stVar, bsVar] = FALLBACKS[key]
    const fromMap = readCSSVar(mapVar)
    if (fromMap) { resolved[key] = fromMap; continue }

    const fromSt = readCSSVar(stVar)
    if (fromSt) { resolved[key] = fromSt; continue }

    if (bsVar) {
      const fromBs = readCSSVar(bsVar)
      if (fromBs) { resolved[key] = fromBs; continue }
    }

    resolved[key] = DEFAULTS[key]
  }

  return resolved
}

export function buildMapStyle(tokens: Required<MapTokens>): object {
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': tokens.land },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        paint: { 'fill-color': tokens.water },
      },
      {
        id: 'landuse-park',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landuse',
        filter: ['==', 'class', 'park'],
        paint: { 'fill-color': tokens.parks },
      },
      {
        id: 'landuse-grass',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landuse',
        filter: ['in', 'class', 'grass', 'meadow', 'garden', 'cemetery'],
        paint: { 'fill-color': tokens.parks },
      },
      {
        id: 'building',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'building',
        paint: {
          'fill-color': tokens.buildings,
          'fill-outline-color': tokens.roadsMinor,
        },
      },
      {
        id: 'building-3d',
        type: 'fill-extrusion',
        source: 'openmaptiles',
        'source-layer': 'building',
        layout: { visibility: 'none' },
        paint: {
          'fill-extrusion-color': tokens.buildings,
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 10],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.85,
        },
      },
      {
        id: 'road-minor',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'minor', 'service', 'track', 'path'],
        paint: {
          'line-color': tokens.roadsMinor,
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 18, 2],
        },
      },
      {
        id: 'road-secondary',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'secondary', 'tertiary'],
        paint: {
          'line-color': tokens.roads,
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 18, 6],
        },
      },
      {
        id: 'road-primary',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'primary', 'trunk', 'motorway'],
        paint: {
          'line-color': tokens.roads,
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 18, 10],
        },
      },
      {
        id: 'label-place',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 10, 10, 16, 14],
          'text-max-width': 8,
        },
        paint: {
          'text-color': tokens.labels,
          'text-halo-color': tokens.land,
          'text-halo-width': 1,
        },
      },
      {
        id: 'label-road',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'transportation_name',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'symbol-placement': 'line',
        },
        paint: {
          'text-color': tokens.labels,
          'text-halo-color': tokens.roads,
          'text-halo-width': 1,
        },
      },
    ],
  }
}
