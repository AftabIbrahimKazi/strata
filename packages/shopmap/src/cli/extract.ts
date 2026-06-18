import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'
import { regionSources } from './regions.js'

/** Layer files bundled with the package for each region code */
const BUNDLED_LAYERS: Record<string, string[]> = {
  IN: ['layers/IN/boundaries.geojson', 'layers/IN/labels.geojson'],
}

function copyLayerFiles(region: string, outDir: string): void {
  const files = BUNDLED_LAYERS[region]
  if (!files || files.length === 0) return

  // __dirname in the compiled CLI is dist/cli/ — layers/ is two levels up
  const pkgRoot = path.resolve(__dirname, '..', '..')
  let copied = 0

  for (const relPath of files) {
    const src  = path.join(pkgRoot, relPath)
    const dest = path.join(outDir, relPath)

    if (!fs.existsSync(src)) {
      console.warn(`  ⚠ Layer file not found at ${src} — skipping`)
      continue
    }

    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(src, dest)
    console.log(`✓ Copied layer file → ${path.relative(process.cwd(), dest)}`)
    copied++
  }

  if (copied > 0) {
    console.log(`\nLayer override files are ready. Add to your ShopMap config:`)
    console.log(`  region: '${region}',`)
    console.log(`  layers: { auto: true },`)
    console.log()
  }
}

export interface ExtractOptions {
  lat: number
  lng: number
  region: string
  radius: number
  landmarks: boolean
  out: string
}

function deg2tile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom)
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return { x, y }
}

function bboxFromCenter(lat: number, lng: number, radiusMeters: number): {
  north: number; south: number; east: number; west: number
} {
  const R = 6371000
  const dLat = (radiusMeters / R) * (180 / Math.PI)
  const dLng = (radiusMeters / (R * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI)
  return {
    north: lat + dLat,
    south: lat - dLat,
    east:  lng + dLng,
    west:  lng - dLng,
  }
}

function fetch(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function fetchText(url: string): Promise<string> {
  return fetch(url).then((b) => b.toString('utf8'))
}

const OSM_AMENITY_TO_CATEGORY: Record<string, string> = {
  bus_stop:        'transit',
  tram_stop:       'transit',
  subway_entrance: 'transit',
  ferry_terminal:  'transit',
  parking:         'parking',
  parking_space:   'parking',
  hospital:        'hospital',
  clinic:          'hospital',
  doctors:         'hospital',
  restaurant:      'restaurant',
  fast_food:       'restaurant',
  food_court:      'restaurant',
  cafe:            'cafe',
  coffee_shop:     'cafe',
  bank:            'bank',
  atm:             'bank',
  pharmacy:        'pharmacy',
  chemist:         'pharmacy',
}

export async function runExtract(opts: ExtractOptions): Promise<void> {
  const tileSource = regionSources[opts.region] ?? regionSources['default']
  const outDir = path.resolve(opts.out)

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  console.log(`\nRegion: ${opts.region}  |  Source: ${tileSource}`)
  console.log(`Center: ${opts.lat}, ${opts.lng}  |  Radius: ${opts.radius}m\n`)

  // --- Tile extraction ---
  const bbox = bboxFromCenter(opts.lat, opts.lng, opts.radius)
  const minZoom = 10
  const maxZoom = 18
  let totalTiles = 0

  for (let z = minZoom; z <= maxZoom; z++) {
    const tl = deg2tile(bbox.north, bbox.west, z)
    const br = deg2tile(bbox.south, bbox.east, z)
    const cols = Math.abs(br.x - tl.x) + 1
    const rows = Math.abs(br.y - tl.y) + 1
    totalTiles += cols * rows
  }

  console.log(`Tiles to fetch: ~${totalTiles} (zoom ${minZoom}–${maxZoom})`)
  console.log('Note: Writing map.pmtiles placeholder — full PMTiles assembly requires the @protomaps/mbtiles tool.')
  console.log('See README for the recommended workflow using pmtiles CLI for production use.\n')

  const mapPmtilesPath = path.join(outDir, 'map.pmtiles')
  fs.writeFileSync(mapPmtilesPath, Buffer.alloc(0))
  console.log(`✓ Created ${mapPmtilesPath} (placeholder — replace with actual .pmtiles file)`)

  // --- Landmark extraction ---
  if (opts.landmarks) {
    console.log('\nFetching landmarks from Overpass API…')

    const query = `[out:json][timeout:25];
(
  node["amenity"](around:${opts.radius},${opts.lat},${opts.lng});
  node["public_transport"="stop_position"](around:${opts.radius},${opts.lat},${opts.lng});
  node["amenity"="parking"](around:${opts.radius},${opts.lat},${opts.lng});
);
out body;`

    let rawJson = ''
    try {
      rawJson = await fetchText(
        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
      )
    } catch (err) {
      console.error('✗ Overpass API request failed:', err)
      process.exit(1)
    }

    interface OverpassElement {
      id: number
      lat: number
      lon: number
      tags?: Record<string, string>
    }
    interface OverpassResponse { elements: OverpassElement[] }

    const data = JSON.parse(rawJson) as OverpassResponse
    const landmarks = data.elements
      .filter((el) => el.lat && el.lon && el.tags?.amenity)
      .map((el) => ({
        id:       String(el.id),
        name:     el.tags?.name ?? el.tags?.amenity ?? 'Unknown',
        category: OSM_AMENITY_TO_CATEGORY[el.tags?.amenity ?? ''] ?? el.tags?.amenity ?? 'other',
        lat:      el.lat,
        lng:      el.lon,
      }))

    const landmarksPath = path.join(outDir, 'landmarks.json')
    fs.writeFileSync(landmarksPath, JSON.stringify(landmarks, null, 2))
    console.log(`✓ Wrote ${landmarks.length} landmarks to ${landmarksPath}`)
  }

  // --- Layer files ---
  if (BUNDLED_LAYERS[opts.region]) {
    console.log('\nCopying layer override files…')
    copyLayerFiles(opts.region, outDir)
  }

  // --- Manifest ---
  const hasLayers = (BUNDLED_LAYERS[opts.region]?.length ?? 0) > 0
  const manifest = {
    generated: new Date().toISOString(),
    region: opts.region,
    center: { lat: opts.lat, lng: opts.lng },
    radius: opts.radius,
    tileSource,
    layers: hasLayers ? BUNDLED_LAYERS[opts.region] : [],
    dataLicense: 'ODbL - https://opendatacommons.org/licenses/odbl/',
    attribution: '© OpenStreetMap contributors',
    note: 'Border representation reflects the tile source for the specified region. The developer is responsible for selecting the appropriate region.',
  }

  const manifestPath = path.join(outDir, 'shopmap.manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`✓ Wrote manifest to ${manifestPath}`)

  console.log('\nDone. Add the following to your ShopMap config:')
  console.log(`  tiles: '${path.relative(process.cwd(), mapPmtilesPath).replace(/\\/g, '/')}'`)
  if (opts.landmarks) {
    const landmarksPath = path.join(outDir, 'landmarks.json')
    console.log(`  landmarks: { src: '${path.relative(process.cwd(), landmarksPath).replace(/\\/g, '/')}' }`)
  }
  console.log()
}
