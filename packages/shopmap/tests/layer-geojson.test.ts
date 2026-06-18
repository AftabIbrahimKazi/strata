// @vitest-environment node
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')
const boundariesPath = path.join(ROOT, 'layers', 'IN', 'boundaries.geojson')
const labelsPath     = path.join(ROOT, 'layers', 'IN', 'labels.geojson')

describe('IN boundaries.geojson', () => {
  it('file exists', () => {
    expect(fs.existsSync(boundariesPath)).toBe(true)
  })

  it('is a valid FeatureCollection with features', () => {
    const geojson = JSON.parse(fs.readFileSync(boundariesPath, 'utf-8')) as {
      type: string; features: unknown[]
    }
    expect(geojson.type).toBe('FeatureCollection')
    expect(Array.isArray(geojson.features)).toBe(true)
    expect(geojson.features.length).toBeGreaterThan(0)
  })

  it('all features are LineStrings with required properties', () => {
    const geojson = JSON.parse(fs.readFileSync(boundariesPath, 'utf-8')) as {
      features: Array<{
        type: string
        geometry: { type: string; coordinates: unknown }
        properties: Record<string, unknown>
      }>
    }
    for (const feature of geojson.features) {
      expect(feature.type).toBe('Feature')
      expect(['LineString', 'MultiLineString']).toContain(feature.geometry.type)
      expect(typeof feature.properties['name']).toBe('string')
      expect(typeof feature.properties['disputed']).toBe('boolean')
      expect(typeof feature.properties['admin_level']).toBe('number')
    }
  })

  it('includes an Arunachal Pradesh / McMahon Line entry', () => {
    const geojson = JSON.parse(fs.readFileSync(boundariesPath, 'utf-8')) as {
      features: Array<{ properties: Record<string, unknown> }>
    }
    expect(geojson.features.some((f) =>
      (f.properties['name'] as string).includes('Arunachal') ||
      (f.properties['name'] as string).includes('McMahon')
    )).toBe(true)
  })

  it('includes an Aksai Chin boundary entry', () => {
    const geojson = JSON.parse(fs.readFileSync(boundariesPath, 'utf-8')) as {
      features: Array<{ properties: Record<string, unknown> }>
    }
    expect(geojson.features.some((f) =>
      (f.properties['name'] as string).includes('Aksai Chin')
    )).toBe(true)
  })

  it('includes a Line of Control / J&K entry', () => {
    const geojson = JSON.parse(fs.readFileSync(boundariesPath, 'utf-8')) as {
      features: Array<{ properties: Record<string, unknown> }>
    }
    expect(geojson.features.some((f) =>
      (f.properties['name'] as string).includes('Line of Control') ||
      (f.properties['name'] as string).includes('J&K') ||
      (f.properties['name'] as string).includes('Azad Kashmir')
    )).toBe(true)
  })

  it('has both disputed and undisputed features (full border coverage)', () => {
    const geojson = JSON.parse(fs.readFileSync(boundariesPath, 'utf-8')) as {
      features: Array<{ properties: { disputed: boolean; name: string } }>
    }
    const disputed    = geojson.features.filter((f) => f.properties.disputed === true)
    const undisputed  = geojson.features.filter((f) => f.properties.disputed === false)
    expect(disputed.length).toBeGreaterThan(0)
    expect(undisputed.length).toBeGreaterThan(0)
  })
})

describe('IN labels.geojson', () => {
  it('file exists', () => {
    expect(fs.existsSync(labelsPath)).toBe(true)
  })

  it('is a valid FeatureCollection with features', () => {
    const geojson = JSON.parse(fs.readFileSync(labelsPath, 'utf-8')) as {
      type: string; features: unknown[]
    }
    expect(geojson.type).toBe('FeatureCollection')
    expect(Array.isArray(geojson.features)).toBe(true)
    expect(geojson.features.length).toBeGreaterThan(0)
  })

  it('all features are Points with valid coordinates', () => {
    const geojson = JSON.parse(fs.readFileSync(labelsPath, 'utf-8')) as {
      features: Array<{
        type: string
        geometry: { type: string; coordinates: [number, number] }
        properties: Record<string, unknown>
      }>
    }
    for (const feature of geojson.features) {
      expect(feature.type).toBe('Feature')
      expect(feature.geometry.type).toBe('Point')
      expect(feature.geometry.coordinates).toHaveLength(2)
      const [lng, lat] = feature.geometry.coordinates
      expect(lng).toBeGreaterThanOrEqual(-180)
      expect(lng).toBeLessThanOrEqual(180)
      expect(lat).toBeGreaterThanOrEqual(-90)
      expect(lat).toBeLessThanOrEqual(90)
      expect(typeof feature.properties['name']).toBe('string')
      expect(typeof feature.properties['disputed']).toBe('boolean')
    }
  })

  it('covers key disputed areas', () => {
    const geojson = JSON.parse(fs.readFileSync(labelsPath, 'utf-8')) as {
      features: Array<{ properties: Record<string, unknown> }>
    }
    const names = geojson.features.map((f) => f.properties['name:en'] as string)
    expect(names.some((n) => n.includes('Aksai Chin'))).toBe(true)
    expect(names.some((n) => n.includes('Arunachal Pradesh'))).toBe(true)
    expect(names.some((n) => n.includes('Gilgit-Baltistan'))).toBe(true)
    expect(names.some((n) => n.includes('Kashmir'))).toBe(true)
  })

  it('all coordinates are within India or claimed territory bounds', () => {
    const geojson = JSON.parse(fs.readFileSync(labelsPath, 'utf-8')) as {
      features: Array<{
        geometry: { coordinates: [number, number] }
        properties: { 'name:en': string }
      }>
    }
    for (const feature of geojson.features) {
      const [lng, lat] = feature.geometry.coordinates
      // India + claimed territories: roughly 8–38°N, 68–98°E
      expect(lng).toBeGreaterThanOrEqual(67)
      expect(lng).toBeLessThanOrEqual(99)
      expect(lat).toBeGreaterThanOrEqual(7)
      expect(lat).toBeLessThanOrEqual(38)
    }
  })
})
