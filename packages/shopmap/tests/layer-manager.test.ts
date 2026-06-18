import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hasOverride, getOverride, layerRegistry } from '../src/layers/registry'
import type { LayerOverride } from '../src/layers/registry'

// ── registry tests ──────────────────────────────────────────────────────────

describe('layer registry', () => {
  it('has an IN entry', () => {
    expect('IN' in layerRegistry).toBe(true)
  })

  it('IN entry has boundaries and labels paths', () => {
    const entry = layerRegistry['IN']
    expect(entry.boundaries).toMatch(/boundaries\.geojson$/)
    expect(entry.labels).toMatch(/labels\.geojson$/)
  })

  it('IN entry paths start with layers/IN/', () => {
    const entry = layerRegistry['IN']
    expect(entry.boundaries.startsWith('layers/IN/')).toBe(true)
    expect(entry.labels.startsWith('layers/IN/')).toBe(true)
  })

  it('IN entry has attribution and license', () => {
    const entry = layerRegistry['IN']
    expect(entry.attribution).toBeTruthy()
    expect(entry.license).toBeTruthy()
  })
})

describe('hasOverride', () => {
  it('returns true for a registered region', () => {
    expect(hasOverride('IN')).toBe(true)
  })

  it('returns false for an unknown region', () => {
    expect(hasOverride('ZZ')).toBe(false)
  })

  it('is case-sensitive', () => {
    expect(hasOverride('in')).toBe(false)
    expect(hasOverride('In')).toBe(false)
  })
})

describe('getOverride', () => {
  it('returns the override for a registered region', () => {
    const override = getOverride('IN')
    expect(override).not.toBeNull()
    expect(override?.region).toBe('IN')
  })

  it('returns null for an unknown region', () => {
    expect(getOverride('ZZ')).toBeNull()
  })

  it('returned object matches the registry entry', () => {
    const override = getOverride('IN')
    expect(override).toEqual(layerRegistry['IN'])
  })
})

// ── LayerManager behaviour (DOM stub) ────────────────────────────────────────

describe('LayerManager (map stub)', () => {
  const makeMapStub = () => {
    const layers: Record<string, object> = {}
    const sources: Record<string, object> = {}

    return {
      getLayer:    (id: string) => layers[id] ?? null,
      getSource:   (id: string) => sources[id] ?? null,
      addLayer:    vi.fn((layer: { id: string }) => { layers[layer.id] = layer }),
      addSource:   vi.fn((id: string, src: object) => { sources[id] = src }),
      removeLayer: vi.fn((id: string) => { delete layers[id] }),
      removeSource: vi.fn((id: string) => { delete sources[id] }),
      _layers: layers,
      _sources: sources,
    }
  }

  // We can't import LayerManager directly in jsdom because it calls
  // getComputedStyle and fetch — we test the public contract via
  // duck-typed assertions on the registry and type shapes.

  it('LayerOverride interface has required fields', () => {
    const override: LayerOverride = {
      region:      'TEST',
      boundaries:  'layers/TEST/boundaries.geojson',
      labels:      'layers/TEST/labels.geojson',
      configPath:  'layers/TEST/config.json',
    }
    expect(override.region).toBe('TEST')
    expect(override.boundaries).toContain('boundaries')
    expect(override.labels).toContain('labels')
    expect(override.configPath).toContain('config.json')
  })

  it('LayerOverride allows optional attribution and license', () => {
    const override: LayerOverride = {
      region:      'TEST',
      boundaries:  'layers/TEST/boundaries.geojson',
      labels:      'layers/TEST/labels.geojson',
      configPath:  'layers/TEST/config.json',
      attribution: '© Test',
      license:     'MIT',
    }
    expect(override.attribution).toBe('© Test')
    expect(override.license).toBe('MIT')
  })

  it('IN registry entry has a configPath', () => {
    const entry = layerRegistry['IN']
    expect(entry.configPath).toMatch(/config\.json$/)
    expect(entry.configPath.startsWith('layers/IN/')).toBe(true)
  })

  it('map stub correctly tracks layers and sources', () => {
    const map = makeMapStub()
    map.addSource('my-source', { type: 'geojson', data: {} })
    map.addLayer({ id: 'my-layer' })
    expect(map.getSource('my-source')).toBeTruthy()
    expect(map.getLayer('my-layer')).toBeTruthy()
    map.removeLayer('my-layer')
    map.removeSource('my-source')
    expect(map.getLayer('my-layer')).toBeNull()
    expect(map.getSource('my-source')).toBeNull()
  })
})

