import type { HypsometricStop } from '../types/index.js'

const LUT_SIZE = 512

function parseColor(color: string): [number, number, number, number] {
  const h = color.trim()
  if (h.startsWith('#')) {
    const hex = h.slice(1)
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
        255,
      ]
    }
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        255,
      ]
    }
    if (hex.length === 8) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        parseInt(hex.slice(6, 8), 16),
      ]
    }
  }
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1; canvas.height = 1
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    return [d[0], d[1], d[2], d[3]]
  } catch {
    return [128, 128, 128, 255]
  }
}

function buildLUT(
  stops: HypsometricStop[],
  range?: [number, number],
): { lut: Uint8ClampedArray; minElev: number; maxElev: number } {
  const sorted = [...stops]
    .filter(s => typeof s.elevation === 'number' && isFinite(s.elevation))
    .sort((a, b) => a.elevation - b.elevation)

  if (sorted.length < 2) {
    const fallback = new Uint8ClampedArray(LUT_SIZE * 4).fill(128)
    return { lut: fallback, minElev: -6000, maxElev: 5000 }
  }

  const minElev = range?.[0] ?? sorted[0].elevation
  const maxElev = range?.[1] ?? sorted[sorted.length - 1].elevation
  const span = maxElev - minElev || 1
  const parsed = sorted.map(s => parseColor(s.color))
  const lut = new Uint8ClampedArray(LUT_SIZE * 4)

  for (let i = 0; i < LUT_SIZE; i++) {
    const elev = minElev + (i / (LUT_SIZE - 1)) * span

    let lo = 0
    for (let j = 0; j < sorted.length - 1; j++) {
      if (elev >= sorted[j].elevation) lo = j
    }
    const hi = Math.min(sorted.length - 1, lo + 1)
    const segSpan = sorted[hi].elevation - sorted[lo].elevation
    const t = segSpan === 0 ? 0 : (elev - sorted[lo].elevation) / segSpan
    const tc = Math.max(0, Math.min(1, t))

    const [r0, g0, b0, a0] = parsed[lo]
    const [r1, g1, b1, a1] = parsed[hi]
    lut[i * 4]     = Math.round(r0 + (r1 - r0) * tc)
    lut[i * 4 + 1] = Math.round(g0 + (g1 - g0) * tc)
    lut[i * 4 + 2] = Math.round(b0 + (b1 - b0) * tc)
    lut[i * 4 + 3] = Math.round(a0 + (a1 - a0) * tc)
  }

  return { lut, minElev, maxElev }
}

export interface ShadingOptions {
  /** 0 = flat hypsometric colour only, 1 = full hillshade blend. Default: 0.7 */
  hillshadeBlend: number
  /** Sun azimuth in degrees clockwise from north. 0=N, 90=E, 180=S, 270=W. Default: 315 (NW) */
  sunAzimuth: number
  /** Sun altitude in degrees above horizon. 0=horizon, 90=overhead. Default: 45 */
  sunAltitude: number
  /**
   * Vertical exaggeration applied only to the shading normal computation.
   * Does not affect the 3-D terrain mesh. Higher values make gentle slopes appear steeper.
   * Default: 1.5
   */
  shadingExaggeration: number
}

export const DEFAULT_SHADING: ShadingOptions = {
  hillshadeBlend:      0.7,
  sunAzimuth:          315,
  sunAltitude:         45,
  shadingExaggeration: 1.5,
}

/**
 * Fetches Terrarium elevation tiles, decodes elevation per-pixel, applies the
 * hypsometric colour ramp, and optionally bakes in procedural hillshading by
 * computing surface normals from the elevation grid and evaluating Lambertian
 * reflectance against a configurable sun direction.
 *
 * All computation is done CPU-side in an OffscreenCanvas — no external texture
 * tiles are required. The result is a self-contained, commercially-free terrain
 * visualisation using only the open-data Terrarium DEM.
 */
export class HypsometricSource {
  readonly type = 'custom' as const
  readonly tileSize = 256
  readonly minzoom  = 0
  readonly maxzoom  = 15
  readonly attribution = '© <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank">Terrain Tiles</a>'

  private lut:     Uint8ClampedArray
  private minElev: number
  private maxElev: number
  private shading: ShadingOptions

  constructor(
    stops: HypsometricStop[],
    range?: [number, number],
    shading?: Partial<ShadingOptions>,
  ) {
    const built    = buildLUT(stops, range)
    this.lut       = built.lut
    this.minElev   = built.minElev
    this.maxElev   = built.maxElev
    this.shading   = { ...DEFAULT_SHADING, ...shading }
  }

  updateStops(stops: HypsometricStop[], range?: [number, number]): void {
    const built  = buildLUT(stops, range)
    this.lut     = built.lut
    this.minElev = built.minElev
    this.maxElev = built.maxElev
  }

  updateShading(shading: Partial<ShadingOptions>): void {
    this.shading = { ...this.shading, ...shading }
  }

  async loadTile(
    tile: { z: number; x: number; y: number },
    { signal }: { signal: AbortSignal },
  ): Promise<ImageData | null> {
    const url =
      `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${tile.z}/${tile.x}/${tile.y}.png`

    let response: Response
    try {
      response = await fetch(url, { signal })
    } catch {
      return null
    }
    if (!response.ok) return null

    const blob = await response.blob()
    let bitmap: ImageBitmap
    try {
      bitmap = await createImageBitmap(blob)
    } catch {
      return null
    }

    const canvas = new OffscreenCanvas(256, 256)
    const ctx    = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | null
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()

    const imageData = ctx.getImageData(0, 0, 256, 256)
    const raw       = imageData.data   // Terrarium-encoded RGBA

    const W = 256, H = 256
    const { lut, minElev, maxElev, shading } = this
    const span = maxElev - minElev || 1

    // ── Pass 1: decode all elevations into a Float32Array ─────────────────────
    // We need the full grid before computing central-difference normals.
    const elev = new Float32Array(W * H)
    for (let p = 0; p < W * H; p++) {
      const i = p * 4
      elev[p] = raw[i] * 256 + raw[i + 1] + raw[i + 2] / 256 - 32768
    }

    // ── Hillshade pre-computation ─────────────────────────────────────────────
    //
    // Coordinate system: (East, South, Up)
    //   x increases east, y increases south (tile pixel coordinates).
    //   Surface normal for height field z=f(x,y):
    //     T_east  = (1, 0, ∂z/∂x)
    //     T_south = (0, 1, ∂z/∂y)
    //     N = T_east × T_south = (-∂z/∂x, -∂z/∂y, 1)   (points upward out of surface)
    //
    // Sun direction L (from surface toward sun):
    //   Azimuth θ measured clockwise from North (North = -South = -y direction).
    //   Lx (east)  =  cos(alt) * sin(az)
    //   Ly (south) = -cos(alt) * cos(az)   ← minus because North = -y
    //   Lz (up)    =  sin(alt)
    //
    // Lambertian term: max(0, N̂ · L̂)
    //
    // zScale converts elevation differences (metres) to dimensionless gradient:
    //   One pixel spans metersPerPixel metres at this zoom level.
    //   zScale = shadingExaggeration / metersPerPixel
    //   So ∂z/∂x ≈ (elev[x+1] - elev[x-1]) * zScale / 2 (central difference over 2 pixels)

    const { hillshadeBlend, sunAzimuth, sunAltitude, shadingExaggeration } = shading
    const doShading = hillshadeBlend > 0

    const azRad  = sunAzimuth  * (Math.PI / 180)
    const altRad = sunAltitude * (Math.PI / 180)
    const Lx =  Math.cos(altRad) * Math.sin(azRad)
    const Ly = -Math.cos(altRad) * Math.cos(azRad)
    const Lz =  Math.sin(altRad)

    // metersPerPixel at equator — conservative estimate; good enough for normal computation
    const metersPerPixel = 40075016.686 / (W * Math.pow(2, tile.z))
    const zScale = shadingExaggeration / metersPerPixel

    const AMBIENT = 0.30   // fraction of colour kept in full shadow

    // ── Pass 2: apply colour + optional hillshade ─────────────────────────────
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const p = py * W + px
        const i = p * 4

        // Hypsometric colour
        const elevation = elev[p]
        const t   = Math.max(0, Math.min(1, (elevation - minElev) / span))
        const idx = Math.min(LUT_SIZE - 1, Math.floor(t * (LUT_SIZE - 1))) * 4
        let r = lut[idx], g = lut[idx + 1], b = lut[idx + 2]
        const a = lut[idx + 3]

        if (doShading) {
          // Central differences (clamped at tile edges)
          const xl = Math.max(0, px - 1), xr = Math.min(W - 1, px + 1)
          const yu = Math.max(0, py - 1), yd = Math.min(H - 1, py + 1)
          const dzdx = (elev[py * W + xr] - elev[py * W + xl]) * zScale / (xr - xl)
          const dzdy = (elev[yd * W + px] - elev[yu * W + px]) * zScale / (yd - yu)

          // Surface normal (unnormalised): N = (-dzdx, -dzdy, 1)
          const nx = -dzdx, ny = -dzdy, nz = 1.0
          const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz)

          // Lambertian + ambient
          const lambert = Math.max(0, (nx * Lx + ny * Ly + nz * Lz) * invLen)
          const shade   = AMBIENT + (1 - AMBIENT) * lambert

          // Blend: hillshadeBlend=0 → flat colour, =1 → fully shaded
          const intensity = 1 - hillshadeBlend + hillshadeBlend * shade
          r = Math.round(r * intensity)
          g = Math.round(g * intensity)
          b = Math.round(b * intensity)
        }

        raw[i]     = r
        raw[i + 1] = g
        raw[i + 2] = b
        raw[i + 3] = a
      }
    }

    return imageData
  }
}
