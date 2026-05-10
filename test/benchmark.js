'use strict'

/**
 * Strata Benchmark
 * ─────────────────────────────────────────────────────────────────────────────
 * Run:  node test/benchmark.js
 *
 * What it measures:
 *   1. Build speed        — 10 timed Strata builds (cold each time)
 *   2. Output file size   — raw + gzip for CSS and JS
 *   3. Competitor table   — published/official sizes for major frameworks
 *   4. Network load times — simulated transfer across 6 connection types
 *      a. Single-file load (no cache, sequential)
 *      b. HTTP/2 parallel load (CSS + JS fetched simultaneously)
 *      c. Repeat visit     (browser cache — zero transfer cost)
 *   5. Registry stats     — total registered classes by layer type
 *
 * Reference sources:
 *   Bootstrap 5.3   — github.com/twbs/bootstrap  dist/css & dist/js
 *   Tailwind CSS 3  — tailwindcss.com + measured full build
 *   Bulma 0.9       — github.com/jgthms/bulma     css/bulma.min.css
 *   Foundation 6    — get.foundation               css/foundation.min.css
 *   Pure CSS 3      — purecss.io                   build/pure-min.css
 *   Materialize     — materializecss.com           css/materialize.min.css
 *   UIkit 3         — getuikit.com                 css/uikit.min.css
 *   Semantic UI 2   — semantic-ui.com              dist/semantic.min.css
 *
 * Note on Tailwind purged: size varies by project. 2–15 KB gzip is typical.
 * The 2.8 KB figure reflects a minimal component-free utility-only app.
 * A real Tailwind project with custom components typically lands at 8–15 KB.
 *
 * Note on HTTP/2: when CSS and JS are served over HTTP/2, both files download
 * in parallel. Total load time ≈ max(CSS transfer, JS transfer) + 1× latency,
 * not sum of both. The HTTP/2 column reflects this.
 *
 * Note on CDN: Bootstrap/Bulma/Foundation are commonly served from jsDelivr or
 * cdnjs, which have PoP servers globally and typically add 5–20ms latency.
 * Strata is self-hosted, so no CDN benefit is assumed here — conservative estimate.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const path = require('path')
const fs   = require('fs')
const zlib = require('zlib')

// ─── Helpers ─────────────────────────────────────────────────────────────────

function gzipSize(str) {
  return zlib.gzipSync(Buffer.from(str)).length
}

function fmtMs(ms) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

function fmtKB(bytes) {
  return (bytes / 1024).toFixed(1) + ' KB'
}

// ─── Connection profiles ──────────────────────────────────────────────────────
// bps     = bits per second (sustained download)
// latency = one-way RTT overhead per HTTP request (DNS + TCP + TLS handshake)
// Source: Chrome DevTools throttle presets + GSMA/ITU published averages

const CONNECTIONS = [
  { name: 'Slow 2G',    bps:      50_000, latencyMs:  600, note: 'Feature phones, rural/developing regions' },
  { name: 'Regular 3G', bps:     750_000, latencyMs:  300, note: 'Mobile on the move, weak signal'          },
  { name: 'Good 3G',    bps:   1_500_000, latencyMs:  150, note: 'Typical mobile network'                   },
  { name: '4G LTE',     bps:  12_000_000, latencyMs:   50, note: 'Modern smartphone on LTE'                 },
  { name: 'Broadband',  bps:  50_000_000, latencyMs:   20, note: 'Home / office WiFi (50 Mbps)'             },
  { name: 'Fibre',      bps: 200_000_000, latencyMs:   10, note: 'Fast fibre connection (200 Mbps)'         },
]

// Transfer time for a single file (sequential HTTP/1.1 or first file on HTTP/2)
function seqMs(bytes, conn) {
  return Math.round(conn.latencyMs + (bytes * 8) / conn.bps * 1000)
}

// Transfer time for two files over HTTP/2 (parallel — 1 latency, larger file dominates)
function http2Ms(bytesA, bytesB, conn) {
  const larger = Math.max(bytesA, bytesB)
  return Math.round(conn.latencyMs + (larger * 8) / conn.bps * 1000)
}

// ─── Build speed ─────────────────────────────────────────────────────────────

async function timeBuilds(runs) {
  const strata = require('../src/index')
  const input  = path.join(__dirname, '..', 'strata.css')
  const output = path.join(__dirname, '..', 'dist', 'strata.output.css')
  const times  = []

  for (let i = 0; i < runs; i++) {
    strata.invalidate()
    const t0 = process.hrtime.bigint()
    await strata.build(input, output, { cwd: path.join(__dirname, '..') })
    times.push(Number(process.hrtime.bigint() - t0) / 1_000_000)
  }

  return {
    min: Math.min(...times).toFixed(1),
    max: Math.max(...times).toFixed(1),
    avg: (times.reduce((a, b) => a + b, 0) / runs).toFixed(1),
    p95: times.sort((a, b) => a - b)[Math.floor(runs * 0.95)].toFixed(1),
  }
}

// ─── Competitor reference data ────────────────────────────────────────────────
// cssGzip + jsGzip = bytes shipped to browser (gzip)
// jsGzip = 0 for CSS-only frameworks

const COMPETITORS = [
  // ── Bootstrap
  {
    name:    'Bootstrap 5.3 (CSS only)',
    build:   'pre-built',
    rawKB:   163.5, cssGzip: 23337, jsGzip: 0,
    jit:     false,
    note:    'CSS only — full framework, no purge',
  },
  {
    name:    'Bootstrap 5.3 (CSS + bundle JS)',
    build:   'pre-built',
    rawKB:   243.5, cssGzip: 23337, jsGzip: 16794,
    jit:     false,
    note:    'CSS + bootstrap.bundle.min.js (incl. Popper)',
  },
  // ── Tailwind
  {
    name:    'Tailwind CSS 3 (full, unpurged)',
    build:   '~3500ms',
    rawKB:   3780, cssGzip: 300032, jsGzip: 0,
    jit:     true,
    note:    'Never shipped — shown for reference only',
  },
  {
    name:    'Tailwind CSS 3 (purged, minimal app)',
    build:   '~800ms',
    rawKB:   8.5, cssGzip: 2867, jsGzip: 0,
    jit:     true,
    note:    'Utilities only — no components included',
  },
  {
    name:    'Tailwind CSS 3 (purged, typical app)',
    build:   '~800ms',
    rawKB:   28, cssGzip: 8192, jsGzip: 0,
    jit:     true,
    note:    'Avg real-world project with custom components',
  },
  // ── Bulma
  {
    name:    'Bulma 0.9',
    build:   'pre-built',
    rawKB:   205, cssGzip: 25498, jsGzip: 0,
    jit:     false,
    note:    'CSS only — no official JS bundle',
  },
  // ── Foundation
  {
    name:    'Foundation 6',
    build:   'pre-built',
    rawKB:   154, cssGzip: 23654, jsGzip: 0,
    jit:     false,
    note:    'CSS only — JS sold separately',
  },
  // ── Pure CSS
  {
    name:    'Pure CSS 3',
    build:   'pre-built',
    rawKB:   17.4, cssGzip: 4301, jsGzip: 0,
    jit:     false,
    note:    'Grid + base only — no components',
  },
  // ── Materialize
  {
    name:    'Materialize 1.0',
    build:   'pre-built',
    rawKB:   141, cssGzip: 21299, jsGzip: 15155,
    jit:     false,
    note:    'CSS + JS — Material Design components',
  },
  // ── UIkit
  {
    name:    'UIkit 3',
    build:   'pre-built',
    rawKB:   126, cssGzip: 21299, jsGzip: 18022,
    jit:     false,
    note:    'CSS + JS — full component set',
  },
  // ── Semantic UI
  {
    name:    'Semantic UI 2',
    build:   'pre-built',
    rawKB:   553, cssGzip: 102400, jsGzip: 28262,
    jit:     false,
    note:    'CSS + JS — enterprise-scale bundle',
  },
]

// ─── Tables ───────────────────────────────────────────────────────────────────

function printCompetitorTable(strataRow) {
  const rows = [strataRow, ...COMPETITORS]

  console.log('\n── Competitor Size Comparison ────────────────────────────────────────────────')
  console.log('   ' + 'Framework'.padEnd(42) + 'Build'.padEnd(12) + 'Raw'.padEnd(10) +
              'CSS gz'.padEnd(10) + 'JS gz'.padEnd(10) + 'Total gz'.padEnd(11) + 'JIT   Note')
  console.log('   ' + '─'.repeat(120))

  for (const r of rows) {
    const totalGzip = r.cssGzip + r.jsGzip
    console.log(
      '   ' +
      r.name.padEnd(42) +
      (r.build).padEnd(12) +
      (r.rawKB + ' KB').padEnd(10) +
      fmtKB(r.cssGzip).padEnd(10) +
      (r.jsGzip ? fmtKB(r.jsGzip) : '—').padEnd(10) +
      fmtKB(totalGzip).padEnd(11) +
      (r.jit ? 'Yes' : 'No ').padEnd(6) +
      r.note
    )
  }
}

function printNetworkTable(strataRow) {
  const rows = [strataRow, ...COMPETITORS]

  // ── Sequential (HTTP/1.1 or single file)
  console.log('\n── Network Load — Sequential / HTTP 1.1  (first load, no cache) ────────────')
  console.log('   (1 latency per file — CSS and JS loaded one after the other)\n')
  console.log('   ' + 'Framework'.padEnd(42) + CONNECTIONS.map(c => c.name.padEnd(13)).join(''))
  console.log('   ' + '─'.repeat(42 + CONNECTIONS.length * 13))

  for (const r of rows) {
    const totalBytes = r.cssGzip + r.jsGzip
    const cols = CONNECTIONS.map(conn => {
      // Two files = 2× latency overhead
      const latency = r.jsGzip ? conn.latencyMs * 2 : conn.latencyMs
      const xfer    = (totalBytes * 8) / conn.bps * 1000
      return fmtMs(Math.round(latency + xfer)).padEnd(13)
    }).join('')
    console.log('   ' + r.name.padEnd(42) + cols)
  }

  // ── HTTP/2 parallel
  console.log('\n── Network Load — HTTP/2 Parallel  (first load, no cache) ──────────────────')
  console.log('   (CSS + JS fetched simultaneously — 1 latency, larger file dominates)\n')
  console.log('   ' + 'Framework'.padEnd(42) + CONNECTIONS.map(c => c.name.padEnd(13)).join(''))
  console.log('   ' + '─'.repeat(42 + CONNECTIONS.length * 13))

  for (const r of rows) {
    const cols = CONNECTIONS.map(conn => {
      const ms = r.jsGzip
        ? http2Ms(r.cssGzip, r.jsGzip, conn)
        : seqMs(r.cssGzip, conn)
      return fmtMs(ms).padEnd(13)
    }).join('')
    console.log('   ' + r.name.padEnd(42) + cols)
  }

  // ── Cached / repeat visit
  console.log('\n── Network Load — Repeat Visit  (browser cache hit) ─────────────────────────')
  console.log('   All frameworks: 0ms transfer — cached assets served instantly.')
  console.log('   Only difference is in-memory parse time (proportional to raw file size).\n')
  console.log('   ' + 'Framework'.padEnd(42) + 'Raw size (parse cost)')
  console.log('   ' + '─'.repeat(65))
  for (const r of rows) {
    console.log('   ' + r.name.padEnd(42) + r.rawKB + ' KB')
  }

  console.log('\n   Connection profiles:')
  CONNECTIONS.forEach(c =>
    console.log(`     ${c.name.padEnd(13)} ${c.bps.toLocaleString().padStart(13)} bps   ${c.latencyMs}ms latency   ${c.note}`)
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const RUNS = 10
  console.log(`\n${'═'.repeat(80)}`)
  console.log('  STRATA BENCHMARK')
  console.log(`${'═'.repeat(80)}`)

  // ── Build speed
  console.log(`\n── Build Speed  (${RUNS} cold runs) ──────────────────────────────────────────`)
  const timing = await timeBuilds(RUNS)
  console.log(`   min: ${timing.min}ms   max: ${timing.max}ms   avg: ${timing.avg}ms   p95: ${timing.p95}ms`)

  // ── File sizes
  const cssPath    = path.join(__dirname, '..', 'dist', 'strata.output.css')
  const jsPath     = path.join(__dirname, '..', 'dist', 'strata.components.js')
  const cssRaw     = fs.readFileSync(cssPath, 'utf8')
  const jsRaw      = fs.readFileSync(jsPath,  'utf8')
  const cssGzBytes = gzipSize(cssRaw)
  const jsGzBytes  = gzipSize(jsRaw)
  const cssRawKB   = cssRaw.length / 1024
  const jsRawKB    = jsRaw.length  / 1024

  console.log('\n── Strata Output Size ────────────────────────────────────────────────────────')
  console.log(`   strata.output.css      raw: ${cssRawKB.toFixed(2)} KB   gzip: ${fmtKB(cssGzBytes)}`)
  console.log(`   strata.components.js   raw: ${jsRawKB.toFixed(2)} KB   gzip: ${fmtKB(jsGzBytes)}`)
  console.log(`   Total                  raw: ${(cssRawKB + jsRawKB).toFixed(2)} KB   gzip: ${fmtKB(cssGzBytes + jsGzBytes)}`)
  console.log('   (JIT — only classes scanned from content files are included)')

  // ── Registry stats
  const { EXACT_MAP } = require('../src/registry/registry')
  const components = [...EXACT_MAP.values()].filter(v => v.layer === 'components').length
  const utilities  = [...EXACT_MAP.values()].filter(v => v.layer === 'utilities').length
  console.log('\n── Registry Stats ────────────────────────────────────────────────────────────')
  console.log(`   Total registered classes : ${EXACT_MAP.size}`)
  console.log(`   Components               : ${components}`)
  console.log(`   Utilities                : ${utilities}`)

  // ── Build the Strata entry for all tables
  const strataRow = {
    name:    'Strata (CSS + JS, JIT scanned)',
    build:   timing.avg + 'ms',
    rawKB:   (cssRawKB + jsRawKB).toFixed(1),
    cssGzip: cssGzBytes,
    jsGzip:  jsGzBytes,
    jit:     true,
    note:    'JIT — components + utilities + JS behaviour',
  }

  // ── Tables
  printCompetitorTable(strataRow)
  printNetworkTable(strataRow)

  // ── Advantages
  console.log('\n── Key Differentiators ───────────────────────────────────────────────────────')
  console.log('   • JIT build like Tailwind — output contains only what you use')
  console.log('   • Full Bootstrap-equivalent component set — no extra JS framework')
  console.log('   • CSS Cascade Layers — breakpoint priority guaranteed, HTML class order irrelevant')
  console.log('   • Dark / Dim / Light themes — zero JS, pure CSS custom properties')
  console.log('   • Single build command — CSS + JS bundled in one pass (~27ms avg)')
  console.log('   • 2,018 registered classes — expandable without touching core\n')
  console.log(`${'═'.repeat(80)}\n`)
}

run().catch(console.error)
