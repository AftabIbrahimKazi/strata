import { describe, it, expect } from 'vitest'
import {
  store, bus, parking, hospital, restaurant, cafe, bank, atm,
  pharmacy, school, park, hotel, gas, train, bike, phone,
  clock, directions, marker, info, getIcon,
} from '../src/icons/index.js'

const ALL_ICONS: [string, string][] = [
  ['store', store], ['bus', bus], ['parking', parking], ['hospital', hospital],
  ['restaurant', restaurant], ['cafe', cafe], ['bank', bank], ['atm', atm],
  ['pharmacy', pharmacy], ['school', school], ['park', park], ['hotel', hotel],
  ['gas', gas], ['train', train], ['bike', bike], ['phone', phone],
  ['clock', clock], ['directions', directions], ['marker', marker], ['info', info],
]

describe('icon registry', () => {
  it('exports exactly 20 icons', () => {
    expect(ALL_ICONS).toHaveLength(20)
  })

  for (const [name, svg] of ALL_ICONS) {
    it(`${name} is a non-empty SVG string`, () => {
      expect(typeof svg).toBe('string')
      expect(svg.length).toBeGreaterThan(0)
      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
      expect(svg).toContain('viewBox="0 0 24 24"')
      expect(svg).toContain('stroke="currentColor"')
    })
  }
})

describe('getIcon', () => {
  it('returns the correct SVG for a known icon name', () => {
    expect(getIcon('store')).toBe(store)
    expect(getIcon('bus')).toBe(bus)
    expect(getIcon('marker')).toBe(marker)
  })

  it('falls back to marker icon for unknown names', () => {
    expect(getIcon('unknown-xyz')).toBe(marker)
    expect(getIcon('')).toBe(marker)
  })

  it('returns marker icon as the fallback (not undefined or empty)', () => {
    const fallback = getIcon('does-not-exist')
    expect(fallback).toBeTruthy()
    expect(fallback).toContain('<svg')
  })
})
