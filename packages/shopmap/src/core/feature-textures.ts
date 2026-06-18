import type { Map as MapLibreMap } from 'maplibre-gl'
import type { FeatureTextureOptions } from '../types/index.js'

const TEX_FACADE   = 'smap-tex-facade'
const TEX_ROAD     = 'smap-tex-road'
const TEX_BRIDGE   = 'smap-tex-bridge'

// ── Noise primitives ─────────────────────────────────────────────────────────

function hash(x: number, y: number, s: number = 0): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.1) * 43758.5453
  return n - Math.floor(n)
}

function valueNoise(x: number, y: number, s: number = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const v00 = hash(xi,   yi,   s), v10 = hash(xi + 1, yi,   s)
  const v01 = hash(xi,   yi + 1, s), v11 = hash(xi + 1, yi + 1, s)
  const ux = xf * xf * (3 - 2 * xf)
  const uy = yf * yf * (3 - 2 * yf)
  return v00*(1-ux)*(1-uy) + v10*ux*(1-uy) + v01*(1-ux)*uy + v11*ux*uy
}

function fbm(x: number, y: number, octaves = 4, seed = 0): number {
  let v = 0, amplitude = 0.5, frequency = 1
  for (let i = 0; i < octaves; i++) {
    v += valueNoise(x * frequency, y * frequency, seed + i * 113) * amplitude
    amplitude *= 0.5
    frequency *= 2
  }
  return Math.max(0, Math.min(1, v))
}

function clamp(v: number, lo = 0, hi = 255): number {
  return Math.max(lo, Math.min(hi, Math.round(v)))
}

// ── Procedural fallback textures ──────────────────────────────────────────────

function generateFacadeTexture(): ImageData {
  const W = 128, H = 128
  const d = new Uint8ClampedArray(W * H * 4)

  const FLOOR_H   = 25
  const FRAME_H_T = 5
  const FRAME_H_B = 7
  const WIN_H     = FLOOR_H - FRAME_H_T - FRAME_H_B
  const CELL_W    = 32
  const WIN_W     = 24

  const SPANDREL  = [186, 181, 173]
  const FRAME_C   = [152, 148, 141]
  const GLASS     = [ 72, 102, 128]
  const REFLECT   = [168, 210, 235]

  for (let y = 0; y < H; y++) {
    const inFloor = y % FLOOR_H
    const isSpandrel = inFloor < FRAME_H_T || inFloor >= FLOOR_H - FRAME_H_B
    const winY = (inFloor - FRAME_H_T) / WIN_H

    for (let x = 0; x < W; x++) {
      const inCell = x % CELL_W
      const isSideFrame = inCell >= WIN_W
      const winX = inCell / WIN_W

      let r, g, b

      if (isSpandrel || isSideFrame) {
        const n = fbm(x / 10, y / 10, 2, 0)
        const dv = Math.floor(-6 + n * 10)
        const c = isSideFrame && !isSpandrel ? FRAME_C : SPANDREL
        r = c[0] + dv; g = c[1] + dv; b = c[2] + dv
      } else {
        const reflect = Math.max(0, 1 - (winX + winY) * 1.4)
        const grain   = fbm(x / 3, y / 3, 2, 42) * 0.12
        r = clamp(GLASS[0] + reflect * (REFLECT[0] - GLASS[0]) + grain * 40)
        g = clamp(GLASS[1] + reflect * (REFLECT[1] - GLASS[1]) + grain * 40)
        b = clamp(GLASS[2] + reflect * (REFLECT[2] - GLASS[2]) + grain * 40)
      }

      const i = (y * W + x) * 4
      d[i] = clamp(r); d[i+1] = clamp(g); d[i+2] = clamp(b); d[i+3] = 255
    }
  }
  return new ImageData(d, W, H)
}

function generateRoadTexture(): ImageData {
  const W = 64, H = 64
  const d = new Uint8ClampedArray(W * H * 4)

  const EDGE_W    = 3
  const CX        = W / 2
  const LINE_HALF = 1
  const DASH      = 20
  const GAP       = 12

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const coarse = fbm(x / 5,   y / 5,   3,  5)
      const fine   = fbm(x / 1.5, y / 1.5, 2, 17)
      const n = coarse * 0.68 + fine * 0.32

      let r = clamp(28 + n * 30)
      let g = clamp(27 + n * 28)
      let b = clamp(30 + n * 28)

      if (x < EDGE_W || x >= W - EDGE_W) {
        const t = x < EDGE_W ? (EDGE_W - x) / EDGE_W : (x - (W - EDGE_W)) / EDGE_W
        const w = clamp(190 + t * 65)
        r = w; g = w; b = w
      }

      const isCentre = Math.abs(x - CX) <= LINE_HALF
      const isDash   = (y % (DASH + GAP)) < DASH
      if (isCentre && isDash) {
        r = 255; g = 210; b = 0
      }

      const i = (y * W + x) * 4
      d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255
    }
  }
  return new ImageData(d, W, H)
}

function generateBridgeTexture(): ImageData {
  const W = 64, H = 64
  const d = new Uint8ClampedArray(W * H * 4)

  const EDGE_W  = 3
  const JOINT_H = 16

  for (let y = 0; y < H; y++) {
    const inJoint = y % JOINT_H
    const isJoint = inJoint === 0 || inJoint === 1

    for (let x = 0; x < W; x++) {
      const n = fbm(x / 6, y / 6, 3, 88)

      let base  = isJoint ? 108 : 155
      let dv    = Math.floor(-4 + n * 20)
      let r = clamp(base + dv + 4)
      let g = clamp(base + dv)
      let b = clamp(base + dv - 8)

      if (x < EDGE_W || x >= W - EDGE_W) {
        const t = x < EDGE_W ? (EDGE_W - x) / EDGE_W : (x - (W - EDGE_W)) / EDGE_W
        const w = clamp(210 + t * 45)
        r = w; g = w; b = w
      }

      const i = (y * W + x) * 4
      d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255
    }
  }
  return new ImageData(d, W, H)
}

// ── External image loading ────────────────────────────────────────────────────

type MapImage = Parameters<MapLibreMap['addImage']>[1]

async function loadRemoteImage(map: MapLibreMap, url: string): Promise<MapImage | null> {
  try {
    // MapLibre 4.x — loadImage returns a Promise<{data: ImageBitmap}>
    const result = await (map.loadImage as (url: string) => Promise<{ data: MapImage }>)(url)
    return result?.data ?? null
  } catch {
    return null
  }
}

async function resolveTexture(
  map: MapLibreMap,
  url: string | undefined,
  fallback: () => ImageData,
): Promise<MapImage> {
  if (url) {
    const remote = await loadRemoteImage(map, url)
    if (remote) return remote
    console.warn(`[shopmap] Failed to load texture from "${url}", using procedural fallback`)
  }
  return fallback()
}

function putImage(map: MapLibreMap, id: string, img: MapImage): void {
  if (map.hasImage(id)) map.removeImage(id)
  map.addImage(id, img)
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function registerFeatureTextures(
  map: MapLibreMap,
  options: FeatureTextureOptions = {},
): Promise<void> {
  const [facade, road, bridge] = await Promise.all([
    resolveTexture(map, options.facadeUrl, generateFacadeTexture),
    resolveTexture(map, options.roadUrl,   generateRoadTexture),
    resolveTexture(map, options.bridgeUrl, generateBridgeTexture),
  ])
  putImage(map, TEX_FACADE,  facade)
  putImage(map, TEX_ROAD,    road)
  putImage(map, TEX_BRIDGE,  bridge)
}

export function unregisterFeatureTextures(map: MapLibreMap): void {
  if (map.hasImage(TEX_FACADE))  map.removeImage(TEX_FACADE)
  if (map.hasImage(TEX_ROAD))    map.removeImage(TEX_ROAD)
  if (map.hasImage(TEX_BRIDGE))  map.removeImage(TEX_BRIDGE)
}

export function applyFeatureTextures(
  map: MapLibreMap,
  options: FeatureTextureOptions,
): Map<string, { prop: string; pattern: string; val: unknown }> {
  const saved = new Map<string, { prop: string; pattern: string; val: unknown }>()
  const style = map.getStyle()
  if (!style?.layers) return saved

  for (const layer of style.layers) {
    const sl   = ((layer as Record<string, unknown>)['source-layer'] as string | undefined) ?? ''
    const type = layer.type as string
    const id   = layer.id
    if (id.startsWith('smap-')) continue

    const idLow    = id.toLowerCase()
    const isCasing = idLow.includes('casing') || idLow.includes('outline') || idLow.includes('border')
    const isBridge = idLow.includes('bridge')

    try {
      if (options.buildings && sl === 'building') {
        // fill-extrusion = 3D buildings only — unambiguous, never large area fills
        if (type === 'fill-extrusion') {
          const orig = map.getPaintProperty(id, 'fill-extrusion-color')
          map.setPaintProperty(id, 'fill-extrusion-pattern', TEX_FACADE)
          saved.set(id, { prop: 'fill-extrusion-color', pattern: 'fill-extrusion-pattern', val: orig })
        } else if (type === 'fill' && idLow.includes('building')) {
          // guard: require 'building' in layer ID to avoid large coastal/landuse area fills
          const orig = map.getPaintProperty(id, 'fill-color')
          map.setPaintProperty(id, 'fill-pattern', TEX_FACADE)
          saved.set(id, { prop: 'fill-color', pattern: 'fill-pattern', val: orig })
        }
      }

      if (sl === 'transportation' && type === 'line' && !isCasing) {
        if (options.bridges && isBridge) {
          const orig = map.getPaintProperty(id, 'line-color')
          map.setPaintProperty(id, 'line-pattern', TEX_BRIDGE)
          saved.set(id, { prop: 'line-color', pattern: 'line-pattern', val: orig })
        } else if (options.roads && !isBridge) {
          const orig = map.getPaintProperty(id, 'line-color')
          map.setPaintProperty(id, 'line-pattern', TEX_ROAD)
          saved.set(id, { prop: 'line-color', pattern: 'line-pattern', val: orig })
        }
      }
    } catch { /* layer may not accept this paint property — skip */ }
  }

  return saved
}

export function removeFeatureTextures(
  map: MapLibreMap,
  saved: Map<string, { prop: string; pattern: string; val: unknown }>,
): void {
  for (const [id, { prop, pattern, val }] of saved) {
    if (!map.getLayer(id)) continue
    try {
      map.setPaintProperty(id, pattern, null)
      if (val !== undefined && val !== null) map.setPaintProperty(id, prop, val)
    } catch { /* ok */ }
  }
  saved.clear()
}
