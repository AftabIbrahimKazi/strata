import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resolveTokens, buildMapStyle } from '../src/core/style-builder.js'

describe('resolveTokens', () => {
  beforeEach(() => {
    // Reset computed style mock
    vi.stubGlobal('document', {
      documentElement: {},
      getElementById: () => null,
      createElement: () => ({ textContent: '', id: '' }),
      head: { appendChild: () => {} },
    })
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: () => '',
    }))
  })

  it('returns hardcoded defaults when no CSS vars are set', () => {
    const tokens = resolveTokens()
    expect(tokens.land).toBe('#f4f1ec')
    expect(tokens.water).toBe('#a8d5e2')
    expect(tokens.roads).toBe('#ffffff')
    expect(tokens.labels).toBe('#333333')
    expect(tokens.marker).toBe('#0d6efd')
  })

  it('overrides with explicit token values', () => {
    const tokens = resolveTokens({ marker: '#ff0000', land: '#111111' })
    expect(tokens.marker).toBe('#ff0000')
    expect(tokens.land).toBe('#111111')
    // non-overridden tokens still use defaults
    expect(tokens.water).toBe('#a8d5e2')
  })

  it('reads --map-* CSS vars before framework vars', () => {
    vi.stubGlobal('getComputedStyle', (el: unknown) => ({
      getPropertyValue: (prop: string) => {
        if (prop === '--map-marker') return '#aabbcc'
        if (prop === '--st-primary') return '#0d6efd'
        return ''
      },
    }))
    const tokens = resolveTokens()
    expect(tokens.marker).toBe('#aabbcc')
  })

  it('falls back to --st-* when --map-* is not set', () => {
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (prop: string) => {
        if (prop === '--st-primary') return '#7c3aed'
        if (prop === '--st-bg') return '#fafafa'
        return ''
      },
    }))
    const tokens = resolveTokens()
    expect(tokens.marker).toBe('#7c3aed')
    expect(tokens.land).toBe('#fafafa')
  })

  it('falls back to --bs-* when --st-* is also not set', () => {
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (prop: string) => {
        if (prop === '--bs-primary') return '#0a58ca'
        return ''
      },
    }))
    const tokens = resolveTokens()
    expect(tokens.marker).toBe('#0a58ca')
  })

  it('returns all required keys', () => {
    const tokens = resolveTokens()
    const expected = ['land','water','roads','roadsMinor','buildings','labels','parks','marker','radius','duration','font']
    for (const key of expected) {
      expect(tokens).toHaveProperty(key)
      expect((tokens as Record<string,string>)[key]).toBeTruthy()
    }
  })
})

describe('buildMapStyle', () => {
  it('returns a version 8 style object', () => {
    const tokens = resolveTokens()
    const style = buildMapStyle(tokens) as { version: number; layers: { id: string }[] }
    expect(style.version).toBe(8)
    expect(Array.isArray(style.layers)).toBe(true)
    expect(style.layers.length).toBeGreaterThan(0)
  })

  it('applies land color to background layer', () => {
    const tokens = resolveTokens({ land: '#ff0000' })
    const style = buildMapStyle(tokens) as { layers: { id: string; paint: Record<string,string> }[] }
    const bg = style.layers.find((l) => l.id === 'background')
    expect(bg?.paint['background-color']).toBe('#ff0000')
  })

  it('applies water color to water layer', () => {
    const tokens = resolveTokens({ water: '#0000ff' })
    const style = buildMapStyle(tokens) as { layers: { id: string; paint: Record<string,string> }[] }
    const water = style.layers.find((l) => l.id === 'water')
    expect(water?.paint['fill-color']).toBe('#0000ff')
  })

  it('includes building-3d layer with visibility none by default', () => {
    const tokens = resolveTokens()
    const style = buildMapStyle(tokens) as { layers: { id: string; layout?: Record<string,string> }[] }
    const b3d = style.layers.find((l) => l.id === 'building-3d')
    expect(b3d).toBeDefined()
    expect(b3d?.layout?.visibility).toBe('none')
  })
})
