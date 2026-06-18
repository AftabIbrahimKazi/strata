import { describe, it, expectTypeOf } from 'vitest'
import type {
  ShopMapConfig,
  MapMode,
  MapThemePreset,
  MapTokens,
  PinConfig,
  PopupConfig,
  LandmarksConfig,
  ZoomConfig,
  TilesConfig,
  LandmarkEntry,
} from '../src/types/index.js'

describe('TypeScript types compile', () => {
  it('MapMode accepts 2d and 3d', () => {
    expectTypeOf<MapMode>().toEqualTypeOf<'2d' | '3d'>()
  })

  it('MapThemePreset accepts all presets', () => {
    expectTypeOf<MapThemePreset>().toEqualTypeOf<'light' | 'dark' | 'sepia' | 'high-contrast' | 'auto'>()
  })

  it('MapTokens has optional string fields', () => {
    const t: MapTokens = { land: '#fff', marker: '#000' }
    expectTypeOf(t.land).toEqualTypeOf<string | undefined>()
    expectTypeOf(t.marker).toEqualTypeOf<string | undefined>()
  })

  it('PinConfig fields are optional', () => {
    const p: PinConfig = {}
    expectTypeOf(p.pulse).toEqualTypeOf<boolean | undefined>()
    expectTypeOf(p.size).toEqualTypeOf<'sm' | 'md' | 'lg' | undefined>()
  })

  it('PopupConfig tokens is a string record', () => {
    const pc: PopupConfig = { tokens: { name: 'Acme', address: '1 Main St' } }
    expectTypeOf(pc.tokens).toEqualTypeOf<Record<string, string> | undefined>()
  })

  it('ShopMapConfig requires location and tiles', () => {
    const config: ShopMapConfig = {
      location: { lat: 12.9716, lng: 77.5946 },
      tiles: 'public/map.pmtiles',
    }
    expectTypeOf(config.location.lat).toEqualTypeOf<number>()
    expectTypeOf(config.location.lng).toEqualTypeOf<number>()
  })

  it('TilesConfig has local and optional remote', () => {
    const tc: TilesConfig = { local: './public/map.pmtiles', remote: 'https://cdn.example.com/map.pmtiles' }
    expectTypeOf(tc.local).toEqualTypeOf<string>()
    expectTypeOf(tc.remote).toEqualTypeOf<string | undefined>()
  })

  it('LandmarkEntry has required fields', () => {
    const entry: LandmarkEntry = { id: '1', name: 'Cafe', category: 'cafe', lat: 12.97, lng: 77.59 }
    expectTypeOf(entry.id).toEqualTypeOf<string>()
    expectTypeOf(entry.lat).toEqualTypeOf<number>()
  })

  it('ZoomConfig fields are optional numbers', () => {
    const z: ZoomConfig = { default: 15 }
    expectTypeOf(z.min).toEqualTypeOf<number | undefined>()
    expectTypeOf(z.max).toEqualTypeOf<number | undefined>()
  })

  it('LandmarksConfig has required src', () => {
    const lc: LandmarksConfig = { src: './public/landmarks.json' }
    expectTypeOf(lc.src).toEqualTypeOf<string>()
  })
})
