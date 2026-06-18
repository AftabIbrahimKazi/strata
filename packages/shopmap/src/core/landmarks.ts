import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import type { LandmarksConfig, LandmarkCategory, LandmarkEntry } from '../types/index.js'
import { getIcon } from '../icons/index.js'
import { createLandmarkPopup } from './popup.js'

const STYLE_ID = 'smap-landmark-styles'

interface ResolvedCategory {
  icon: string
  color: string
  opacity: number
  enabled: boolean
}

const DEFAULT_CATEGORIES: Record<string, ResolvedCategory> = {
  transit:    { icon: 'bus',        color: '#3b82f6', opacity: 0.75, enabled: true },
  parking:    { icon: 'parking',    color: '#10b981', opacity: 0.75, enabled: true },
  hospital:   { icon: 'hospital',   color: '#ef4444', opacity: 0.75, enabled: true },
  restaurant: { icon: 'restaurant', color: '#f59e0b', opacity: 0.75, enabled: true },
  cafe:       { icon: 'cafe',       color: '#92400e', opacity: 0.75, enabled: true },
  bank:       { icon: 'bank',       color: '#6366f1', opacity: 0.75, enabled: true },
  pharmacy:   { icon: 'pharmacy',   color: '#ec4899', opacity: 0.75, enabled: true },
}

function resolveCategory(
  name: string,
  override?: LandmarkCategory
): ResolvedCategory {
  const base = DEFAULT_CATEGORIES[name] ?? { icon: 'marker', color: '#888888', opacity: 0.75, enabled: true }
  return {
    icon:    override?.icon    ?? base.icon,
    color:   override?.color   ?? base.color,
    opacity: override?.opacity ?? base.opacity,
    enabled: override?.enabled ?? base.enabled,
  }
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .smap-landmark {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--smap-landmark-color, #888);
      color: #fff;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
      transition: opacity 150ms ease, transform 150ms ease;
      width: 22px;
      height: 22px;
    }

    .smap-landmark:hover {
      transform: scale(1.15);
    }

    .smap-landmark[data-st-active="true"] {
      transform: scale(1.2);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    .smap-landmark[data-st-active="false"] {
      transform: scale(1);
    }

    .smap-landmark__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60%;
      height: 60%;
    }
  `
  document.head.appendChild(style)
}

export class LandmarkLayer {
  private markers: Marker[] = []
  private map: MapLibreMap

  constructor(map: MapLibreMap, config: LandmarksConfig) {
    this.map = map
    ensureStyles()
    this.load(config)
  }

  private async load(config: LandmarksConfig): Promise<void> {
    let entries: LandmarkEntry[]

    try {
      const res = await fetch(config.src)
      if (!res.ok) throw new Error(`Failed to fetch landmarks: ${res.status}`)
      entries = (await res.json()) as LandmarkEntry[]
    } catch (err) {
      console.warn('[ShopMap] Could not load landmarks:', err)
      return
    }

    const ML = (window as unknown as Record<string, unknown>)['maplibregl'] as typeof import('maplibre-gl') | undefined
    if (!ML?.Marker) return

    for (const entry of entries) {
      const cat = resolveCategory(entry.category, config.categories?.[entry.category])
      if (!cat.enabled) continue

      const el = document.createElement('div')
      el.className = 'smap-landmark'
      el.style.setProperty('--smap-landmark-color', cat.color)
      el.style.setProperty('opacity', String(cat.opacity))
      el.setAttribute('data-st-active', 'false')

      const iconWrapper = document.createElement('div')
      iconWrapper.className = 'smap-landmark__icon'
      iconWrapper.innerHTML = getIcon(cat.icon)
      el.appendChild(iconWrapper)

      let activePopup: ReturnType<typeof createLandmarkPopup> = null

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        if (activePopup) {
          activePopup.remove()
          activePopup = null
          el.setAttribute('data-st-active', 'false')
        } else {
          activePopup = createLandmarkPopup(this.map, entry.lat, entry.lng, entry.name, entry.category)
          el.setAttribute('data-st-active', 'true')
        }
      })

      this.map.on('click', () => {
        if (activePopup) {
          activePopup.remove()
          activePopup = null
          el.setAttribute('data-st-active', 'false')
        }
      })

      const marker = new ML.Marker({ element: el, anchor: 'center' })
        .setLngLat([entry.lng, entry.lat])
        .addTo(this.map)

      this.markers.push(marker)
    }
  }

  remove(): void {
    for (const marker of this.markers) {
      marker.remove()
    }
    this.markers = []
  }
}
