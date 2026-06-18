import { describe, it, expect, vi, afterEach } from 'vitest'
import { light, dark, sepia, highContrast, resolveTheme } from '../src/themes/index.js'
import type { MapTokens } from '../src/types/index.js'

const TOKEN_KEYS: (keyof MapTokens)[] = [
  'land', 'water', 'roads', 'roadsMinor', 'buildings',
  'labels', 'parks', 'marker', 'radius', 'duration', 'font',
]

function assertValidTokens(tokens: MapTokens, label: string): void {
  for (const key of TOKEN_KEYS) {
    expect(tokens[key], `${label}.${key}`).toBeTruthy()
    expect(typeof tokens[key]).toBe('string')
  }
}

describe('preset token objects', () => {
  it('light has all required tokens', () => assertValidTokens(light, 'light'))
  it('dark has all required tokens',  () => assertValidTokens(dark,  'dark'))
  it('sepia has all required tokens', () => assertValidTokens(sepia, 'sepia'))
  it('highContrast has all required tokens', () => assertValidTokens(highContrast, 'highContrast'))
})

describe('resolveTheme', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('returns light preset for "light"', () => {
    expect(resolveTheme('light')).toEqual(light)
  })

  it('returns dark preset for "dark"', () => {
    expect(resolveTheme('dark')).toEqual(dark)
  })

  it('returns sepia preset for "sepia"', () => {
    expect(resolveTheme('sepia')).toEqual(sepia)
  })

  it('returns highContrast preset for "high-contrast"', () => {
    expect(resolveTheme('high-contrast')).toEqual(highContrast)
  })

  it('passes through a MapTokens object unchanged', () => {
    const custom: MapTokens = { marker: '#abcdef', land: '#123456' }
    expect(resolveTheme(custom)).toBe(custom)
  })

  it('returns light for "auto" when prefers-color-scheme is light', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false }),
    })
    expect(resolveTheme('auto')).toEqual(light)
  })

  it('returns dark for "auto" when prefers-color-scheme is dark', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: true }),
    })
    expect(resolveTheme('auto')).toEqual(dark)
  })

  it('returns light when theme is undefined', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false }),
    })
    const result = resolveTheme(undefined)
    expect(result).toEqual(light)
  })
})
