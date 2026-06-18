import type { Map as MapLibreMap, Popup } from 'maplibre-gl'
import type { PopupConfig } from '../types/index.js'

const STYLE_ID = 'smap-popup-styles'

const DEFAULT_TEMPLATE = `
<div class="smap-popup">
  <div class="smap-popup__name">{{name}}</div>
  <div class="smap-popup__address">{{address}}</div>
  <div class="smap-popup__hours">{{hours}}</div>
  <a class="smap-popup__directions" href="{{directions}}" target="_blank" rel="noopener">
    Get directions
  </a>
</div>
`

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .smap-popup {
      font-family: var(--map-font, var(--st-font-family, var(--bs-font-sans-serif, system-ui)));
      background: var(--map-land, var(--st-bg, var(--bs-body-bg, #f4f1ec)));
      color: var(--map-labels, var(--st-text, var(--bs-body-color, #333333)));
      border-radius: var(--map-radius, var(--st-border-radius, var(--bs-border-radius, 8px)));
      padding: 0;
      min-width: 180px;
    }

    .smap-popup__name {
      font-weight: 700;
      font-size: 1rem;
      margin-bottom: 4px;
    }

    .smap-popup__address {
      font-size: 0.875rem;
      opacity: 0.8;
      margin-bottom: 4px;
    }

    .smap-popup__hours {
      font-size: 0.8125rem;
      opacity: 0.7;
      margin-bottom: 8px;
    }

    .smap-popup__directions {
      display: inline-block;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--map-marker, var(--st-primary, var(--bs-primary, #0d6efd)));
      text-decoration: none;
    }

    .smap-popup__directions:hover {
      text-decoration: underline;
    }

    .smap-landmark-popup {
      font-family: var(--map-font, var(--st-font-family, var(--bs-font-sans-serif, system-ui)));
      background: var(--map-land, var(--st-bg, var(--bs-body-bg, #f4f1ec)));
      color: var(--map-labels, var(--st-text, var(--bs-body-color, #333333)));
      border-radius: var(--map-radius, var(--st-border-radius, var(--bs-border-radius, 8px)));
      padding: 0;
    }

    .smap-landmark-popup__name {
      font-weight: 600;
      font-size: 0.9375rem;
      margin-bottom: 2px;
    }

    .smap-landmark-popup__category {
      font-size: 0.8125rem;
      opacity: 0.65;
      text-transform: capitalize;
    }

    /* MapLibre popup chrome overrides — scoped so they don't bleed */
    .maplibregl-popup-content:has(.smap-popup),
    .maplibregl-popup-content:has(.smap-landmark-popup) {
      padding: 14px 16px;
      background: var(--map-land, var(--st-bg, var(--bs-body-bg, #f4f1ec)));
      border-radius: var(--map-radius, var(--st-border-radius, var(--bs-border-radius, 8px)));
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    }

    .maplibregl-popup-tip {
      border-top-color: var(--map-land, var(--st-bg, var(--bs-body-bg, #f4f1ec)));
    }
  `
  document.head.appendChild(style)
}

function renderTemplate(template: string, tokens: Record<string, string> = {}): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => tokens[key] ?? '')
}

export class ShopPopup {
  private popup: Popup | null = null
  private isOpen = false
  private template: string = DEFAULT_TEMPLATE
  private currentTokens: Record<string, string> = {}

  constructor(
    map: MapLibreMap,
    lat: number,
    lng: number,
    config: PopupConfig = {}
  ) {
    ensureStyles()

    const ML = (window as unknown as Record<string, unknown>)['maplibregl'] as typeof import('maplibre-gl') | undefined
    if (!ML?.Popup) return

    this.template = config.template ?? DEFAULT_TEMPLATE
    this.currentTokens = config.tokens ?? {}
    const html = renderTemplate(this.template, this.currentTokens)

    this.popup = new ML.Popup({
      closeButton: true,
      closeOnClick: false,
      anchor: 'bottom',
      offset: [0, -8],
    })
      .setLngLat([lng, lat])
      .setHTML(html)

    map.on('click', () => {
      if (this.isOpen) {
        this.close()
      }
    })
  }

  open(map: MapLibreMap): void {
    if (!this.popup) return
    this.popup.addTo(map)
    this.isOpen = true
  }

  close(): void {
    if (!this.popup) return
    this.popup.remove()
    this.isOpen = false
  }

  toggle(map: MapLibreMap): void {
    if (this.isOpen) {
      this.close()
    } else {
      this.open(map)
    }
  }

  update(config: Partial<PopupConfig>): void {
    if (!this.popup) return
    if (config.template !== undefined) this.template = config.template
    if (config.tokens !== undefined) this.currentTokens = { ...this.currentTokens, ...config.tokens }
    this.popup.setHTML(renderTemplate(this.template, this.currentTokens))
  }

  remove(): void {
    this.popup?.remove()
    this.popup = null
  }
}

export function createLandmarkPopup(
  map: MapLibreMap,
  lat: number,
  lng: number,
  name: string,
  category: string
): Popup | null {
  const ML = (window as unknown as Record<string, unknown>)['maplibregl'] as typeof import('maplibre-gl') | undefined
  if (!ML?.Popup) return null

  const html = `<div class="smap-landmark-popup"><div class="smap-landmark-popup__name">${name}</div><div class="smap-landmark-popup__category">${category}</div></div>`

  return new ML.Popup({
    closeButton: false,
    closeOnClick: true,
    anchor: 'bottom',
    offset: [0, -6],
  })
    .setLngLat([lng, lat])
    .setHTML(html)
    .addTo(map)
}

export { renderTemplate }
