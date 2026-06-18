export interface LayerOverride {
  /** Region code (ISO 3166-1 alpha-2 or custom) */
  region: string
  /** Path to the boundary GeoJSON, relative to the page root */
  boundaries: string
  /** Path to the labels GeoJSON, relative to the page root */
  labels: string
  /** Path to the country config JSON (bbox, hideLayers, width, attribution) */
  configPath: string
  /** Human-readable data source credit */
  attribution?: string
  /** SPDX license identifier */
  license?: string
}

/**
 * Registry of region → layer override file paths.
 * Paths are relative to the page root and are populated by `npx shopmap extract --region IN`.
 * All values can be overridden per-instance via the `layers.overrides` config option.
 */
export const layerRegistry: Record<string, LayerOverride> = {
  IN: {
    region:     'IN',
    boundaries: 'layers/IN/boundaries.geojson',
    labels:     'layers/IN/labels.geojson',
    configPath: 'layers/IN/config.json',
    attribution: '© Natural Earth (Public Domain)',
    license:    'Public Domain',
  },
}

export function hasOverride(region: string): boolean {
  return region in layerRegistry
}

export function getOverride(region: string): LayerOverride | null {
  return layerRegistry[region] ?? null
}
