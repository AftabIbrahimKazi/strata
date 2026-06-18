import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import type { PinConfig } from '../types/index.js'
import { getIcon } from '../icons/index.js'

const STYLE_ID = 'smap-pin-styles'

const PIN_SIZES: Record<NonNullable<PinConfig['size']>, number> = {
  sm: 24,
  md: 32,
  lg: 44,
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .smap-pin {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--map-marker, var(--st-primary, var(--bs-primary, #0d6efd)));
      color: #fff;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      cursor: pointer;
      position: relative;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      transition: transform 150ms ease, box-shadow 150ms ease;
    }

    .smap-pin:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.35);
    }

    .smap-pin[data-st-active] {
      transform: rotate(-45deg) scale(1.1);
    }

    .smap-pin__icon {
      transform: rotate(45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60%;
      height: 60%;
    }

    .smap-pin__label {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%) rotate(45deg);
      white-space: nowrap;
      font-family: var(--map-font, var(--st-font-family, var(--bs-font-sans-serif, system-ui)));
      font-size: 12px;
      font-weight: 600;
      color: var(--map-labels, var(--st-text, var(--bs-body-color, #333)));
      background: var(--map-land, var(--st-bg, var(--bs-body-bg, #f4f1ec)));
      padding: 2px 6px;
      border-radius: 4px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.15);
      pointer-events: none;
    }

    .smap-pin__pulse {
      position: absolute;
      inset: 0;
      border-radius: 50% 50% 50% 0;
      background: var(--map-marker, var(--st-primary, var(--bs-primary, #0d6efd)));
      opacity: 0;
      animation: smap-pulse 2s ease-out infinite;
    }

    @keyframes smap-pulse {
      0%   { transform: scale(1);   opacity: 0.6; }
      100% { transform: scale(2.5); opacity: 0; }
    }
  `
  document.head.appendChild(style)
}

export class ShopPin {
  private marker: Marker | null = null
  private element: HTMLElement

  constructor(map: MapLibreMap, lat: number, lng: number, config: PinConfig = {}) {
    ensureStyles()

    const maplibregl = (map.constructor as typeof import('maplibre-gl').Map)

    const size = PIN_SIZES[config.size ?? 'md']
    const el = document.createElement('div')
    el.className = 'smap-pin'
    el.style.setProperty('width', `${size}px`)
    el.style.setProperty('height', `${size}px`)

    if (config.color) {
      el.style.setProperty('--map-marker', config.color)
    }

    if (config.pulse) {
      const pulse = document.createElement('div')
      pulse.className = 'smap-pin__pulse'
      el.appendChild(pulse)
    }

    const iconWrapper = document.createElement('div')
    iconWrapper.className = 'smap-pin__icon'

    if (config.icon) {
      if (config.icon.trimStart().startsWith('<svg')) {
        iconWrapper.innerHTML = config.icon
      } else {
        iconWrapper.innerHTML = getIcon(config.icon)
      }
    } else {
      iconWrapper.innerHTML = getIcon('marker')
    }

    el.appendChild(iconWrapper)

    if (config.label) {
      const label = document.createElement('div')
      label.className = 'smap-pin__label'
      label.textContent = config.label
      el.appendChild(label)
    }

    this.element = el

    // MapLibre Marker — use dynamic import shape
    const MapLibre = map as unknown as { _maplibregl?: typeof import('maplibre-gl') }
    const ML = (window as unknown as Record<string, unknown>)['maplibregl'] as typeof import('maplibre-gl') | undefined

    if (ML?.Marker) {
      this.marker = new ML.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(map)
    }
  }

  getElement(): HTMLElement {
    return this.element
  }

  setActive(active: boolean): void {
    if (active) {
      this.element.setAttribute('data-st-active', 'true')
    } else {
      this.element.setAttribute('data-st-active', 'false')
    }
  }

  remove(): void {
    this.marker?.remove()
  }
}
