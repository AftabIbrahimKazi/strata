import type { MapTokens, MapThemePreset } from '../types/index.js'

export const light: MapTokens = {
  land: '#f4f1ec',
  water: '#a8d5e2',
  roads: '#ffffff',
  roadsMinor: '#e0dcd4',
  buildings: '#e8e4df',
  labels: '#333333',
  parks: '#c8e6c9',
  marker: '#0d6efd',
  radius: '8px',
  duration: '200ms',
  font: 'system-ui, sans-serif',
}

export const dark: MapTokens = {
  land: '#1a1f2e',
  water: '#1a3a4a',
  roads: '#2a2f3e',
  roadsMinor: '#252a38',
  buildings: '#222636',
  labels: '#e8e8f0',
  parks: '#1a2e1a',
  marker: '#4d8eff',
  radius: '8px',
  duration: '200ms',
  font: 'system-ui, sans-serif',
}

export const sepia: MapTokens = {
  land: '#f2ead8',
  water: '#7aabb8',
  roads: '#f8f3e8',
  roadsMinor: '#e4dac8',
  buildings: '#ddd5c0',
  labels: '#4a3728',
  parks: '#b8d4a8',
  marker: '#b45309',
  radius: '6px',
  duration: '200ms',
  font: 'Georgia, serif',
}

export const highContrast: MapTokens = {
  land: '#ffffff',
  water: '#0055aa',
  roads: '#eeeeee',
  roadsMinor: '#cccccc',
  buildings: '#dddddd',
  labels: '#000000',
  parks: '#006600',
  marker: '#cc0000',
  radius: '4px',
  duration: '150ms',
  font: 'system-ui, sans-serif',
}

let autoMediaQuery: MediaQueryList | null = null
let autoListener: ((e: MediaQueryListEvent) => void) | null = null

export function resolveTheme(theme: MapThemePreset | MapTokens | undefined): MapTokens {
  if (!theme || theme === 'auto') {
    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      return prefersDark ? dark : light
    }
    return light
  }

  if (theme === 'light') return light
  if (theme === 'dark') return dark
  if (theme === 'sepia') return sepia
  if (theme === 'high-contrast') return highContrast

  return theme as MapTokens
}

export function watchAutoTheme(cb: (tokens: MapTokens) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  if (autoMediaQuery && autoListener) {
    autoMediaQuery.removeEventListener('change', autoListener)
  }

  autoMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  autoListener = (e: MediaQueryListEvent) => {
    cb(e.matches ? dark : light)
  }

  autoMediaQuery.addEventListener('change', autoListener)

  return () => {
    if (autoMediaQuery && autoListener) {
      autoMediaQuery.removeEventListener('change', autoListener)
    }
    autoMediaQuery = null
    autoListener = null
  }
}
