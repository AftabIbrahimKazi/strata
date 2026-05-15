'use strict'

/**
 * Strata Build-Speed Benchmark
 *
 * Measures real build performance across three workload scenarios.
 * Each scenario uses a fixture HTML file with a realistic class set.
 *
 * Reported metrics (industry standard):
 *   mean     — arithmetic mean of measured runs
 *   median   — 50th percentile (robust against skew)
 *   stddev   — standard deviation (spread)
 *   cv       — coefficient of variation = stddev / mean (stability %)
 *   p95/p99  — tail latency (important for CI/CD predictability)
 *   95% CI   — confidence interval on the mean
 *   heap     — peak V8 heap used during the run
 *   outliers — runs removed by IQR fence before stats (reported separately)
 *
 * Saves results/latest.json for historical tracking.
 * Run: node --expose-gc benchmark/run.js
 */

const os   = require('os')
const path = require('path')
const fs   = require('fs')

const ROOT     = path.join(__dirname, '..')
const FIXTURES = path.join(__dirname, 'fixtures')
const RESULTS  = path.join(__dirname, 'results')
const WARMUPS  = 10
const RUNS     = 100

// ─── Scenarios ────────────────────────────────────────────────────────────────
// Each scenario drives a fixture HTML file whose class= attributes supply the
// class set fed to the scanner + generator pipeline.

const SCENARIOS = [
  {
    name:    'small',
    label:   'Small   (~20 classes)',
    desc:    'Single isolated component',
    classes: [
      'container', 'row', 'col-12', 'col-md-6',
      'btn-primary', 'card', 'card-body', 'card-title',
      'text-center', 'mt-3', 'p-4', 'd-flex',
      'text-muted', 'rounded', 'shadow-sm',
      'form-control', 'form-label', 'mb-3',
      'alert-success', 'badge-primary',
    ],
  },
  {
    name:    'medium',
    label:   'Medium  (~80 classes)',
    desc:    'Typical marketing page',
    classes: [
      'container', 'container-fluid', 'row',
      'col-1','col-2','col-3','col-4','col-6','col-12',
      'col-md-4','col-md-8','col-lg-3','col-lg-9',
      'btn-primary','btn-secondary','btn-success','btn-danger',
      'btn-outline-primary','btn-sm','btn-lg','btn-close',
      'card','card-body','card-header','card-footer',
      'card-title','card-subtitle','card-text','card-img-top',
      'text-center','text-start','text-end','text-muted','text-primary',
      'text-success','text-danger','text-truncate',
      'mt-0','mt-1','mt-2','mt-3','mt-4','mt-5',
      'mb-0','mb-1','mb-2','mb-3','mb-4',
      'ms-auto','me-auto','p-2','p-3','p-4','px-3','py-2',
      'd-flex','d-block','d-none','d-md-block','d-lg-flex',
      'justify-content-between','justify-content-center',
      'align-items-center','align-items-start',
      'flex-row','flex-column','flex-wrap','gap-2','gap-3',
      'rounded','rounded-pill','shadow-sm','shadow',
      'form-control','form-label','form-group','form-check',
      'form-select','input-group','input-group-text',
      'alert','alert-success','alert-danger','alert-warning',
      'badge-primary','badge-secondary',
      'nav','nav-link','nav-tabs','nav-pills',
      'navbar','navbar-brand','navbar-nav',
      'table','table-striped','table-hover',
      'list-unstyled','list-inline','list-inline-item',
      'fw-bold','fw-normal','fw-semibold',
      'img-fluid','overflow-hidden','position-relative',
    ],
  },
  {
    name:    'large',
    label:   'Large   (~200 classes)',
    desc:    'Full application shell',
    classes: [
      // Grid
      'container','container-fluid','container-sm','container-md','container-lg',
      'row','row-cols-2','row-cols-3','row-cols-md-4',
      ...Array.from({ length: 12 }, (_, i) => `col-${i + 1}`),
      ...['sm','md','lg'].flatMap(bp =>
        Array.from({ length: 6 }, (_, i) => `col-${bp}-${i + 1}`)),
      'col','col-auto','col-md','col-lg',
      'offset-1','offset-2','offset-md-3',
      // Spacing
      ...['m','mt','mb','ms','me','mx','my','p','pt','pb','ps','pe','px','py']
        .flatMap(p => ['0','1','2','3','4','5'].map(n => `${p}-${n}`)),
      // Display
      'd-none','d-inline','d-inline-block','d-block','d-grid',
      'd-flex','d-inline-flex','d-table','d-table-row','d-table-cell',
      'd-md-none','d-md-flex','d-lg-block','d-xl-flex',
      // Flex
      'flex-row','flex-column','flex-wrap','flex-nowrap',
      'flex-row-reverse','flex-column-reverse',
      'justify-content-start','justify-content-end','justify-content-center',
      'justify-content-between','justify-content-around',
      'align-items-start','align-items-end','align-items-center',
      'align-items-baseline','align-items-stretch',
      'align-self-auto','align-self-start','align-self-center',
      'flex-fill','flex-grow-0','flex-grow-1','flex-shrink-0',
      'order-0','order-1','order-2','order-first','order-last',
      // Gap
      'gap-0','gap-1','gap-2','gap-3','gap-4','gap-5',
      'row-gap-2','col-gap-2',
      // Buttons
      'btn-primary','btn-secondary','btn-success','btn-danger',
      'btn-warning','btn-info','btn-light','btn-dark',
      'btn-outline-primary','btn-outline-secondary','btn-outline-success',
      'btn-outline-danger','btn-outline-warning','btn-outline-info',
      'btn-sm','btn-lg','btn-link','btn-close',
      'btn-group','btn-group-sm','btn-group-lg','btn-toolbar',
      // Cards
      'card','card-body','card-header','card-footer',
      'card-title','card-subtitle','card-text','card-link',
      'card-img-top','card-img-bottom','card-img','card-img-overlay',
      'card-group',
      // Alerts + Badges
      'alert','alert-primary','alert-secondary','alert-success',
      'alert-danger','alert-warning','alert-info',
      'alert-dismissible','alert-heading','alert-link',
      'badge','badge-primary','badge-secondary','badge-success',
      'badge-danger','badge-warning','badge-pill','rounded-pill',
      // Text
      'text-primary','text-secondary','text-success','text-danger',
      'text-warning','text-info','text-muted',
      'text-white','text-black','text-body-secondary',
      'text-start','text-center','text-end',
      'text-uppercase','text-lowercase','text-capitalize',
      'text-truncate','text-wrap','text-nowrap','text-break',
      'fw-light','fw-normal','fw-medium','fw-semibold','fw-bold',
      'fst-italic','fst-normal',
      'lh-1','lh-sm','lh-base','lh-lg',
      'text-decoration-none','text-decoration-underline',
      // Background
      'bg-primary','bg-secondary','bg-success','bg-danger',
      'bg-warning','bg-info','bg-light','bg-dark','bg-white',
      'bg-transparent','bg-body','bg-body-secondary','bg-black',
      // Borders
      'border','border-0','border-top','border-bottom','border-start','border-end',
      'border-1','border-2','border-3','border-4','border-5',
      'border-primary','border-secondary','border-success','border-muted',
      'rounded','rounded-0','rounded-1','rounded-2','rounded-3',
      'rounded-4','rounded-5','rounded-circle',
      'rounded-top','rounded-bottom','rounded-start','rounded-end',
      // Sizing
      'w-25','w-50','w-75','w-100','w-auto',
      'h-25','h-50','h-75','h-100','h-auto',
      'mw-100','mh-100','vw-100','vh-100','min-vh-100',
      // Shadows / Position / Overflow
      'shadow','shadow-sm','shadow-lg','shadow-none',
      'position-static','position-relative','position-absolute',
      'position-fixed','position-sticky',
      'top-0','top-50','bottom-0','start-0','end-0',
      'translate-middle','fixed-top','sticky-top',
      'overflow-auto','overflow-hidden','overflow-visible',
      'overflow-x-auto','overflow-y-hidden',
      // Opacity / Visibility / Z
      'opacity-0','opacity-25','opacity-50','opacity-75','opacity-100',
      'visible','invisible','visually-hidden',
      'z-0','z-1','z-2','z-3','z-auto','z-n1',
      // Lists
      'list-unstyled','list-inline','list-inline-item',
      // Forms
      'form-control','form-control-sm','form-control-lg',
      'form-control-plaintext','form-control-color',
      'form-label','form-group','form-text','form-floating',
      'form-check','form-check-input','form-check-label',
      'form-switch','form-range','form-select',
      'form-select-sm','form-select-lg',
      'input-group','input-group-text','input-group-sm','input-group-lg',
      'is-valid','is-invalid','was-validated',
      // Outlines
      'outline-none','outline-primary','outline-danger',
      'outline-1','outline-2','outline-3',
      // Nav / Navbar
      'nav','nav-item','nav-link','nav-tabs','nav-pills',
      'nav-fill','nav-justified','nav-underline',
      'navbar','navbar-brand','navbar-nav','navbar-toggler',
      'navbar-collapse','navbar-text','navbar-dark',
      'navbar-expand-md','navbar-expand-lg',
      // Tables
      'table','table-striped','table-hover','table-bordered',
      'table-borderless','table-sm','table-responsive',
      'table-primary','table-success','table-danger',
      // Components
      'modal','modal-backdrop','modal-dialog','modal-content',
      'modal-header','modal-title','modal-body','modal-footer',
      'modal-sm','modal-lg','modal-xl',
      'toast','toast-header','toast-body','toast-container',
      'accordion','accordion-item','accordion-header',
      'accordion-button','accordion-body','accordion-flush',
      'dropdown','dropdown-menu','dropdown-item','dropdown-toggle',
      'dropdown-header','dropdown-divider','dropdown-menu-end',
      'list-group','list-group-item','list-group-flush',
      'list-group-item-action','list-group-horizontal',
      'pagination','page-item','page-link',
      'breadcrumb','breadcrumb-item',
      'progress','progress-bar',
      'spinner-border','spinner-grow',
      'placeholder','placeholder-glow',
      // Misc utilities
      'clearfix','hstack','vstack',
      'ratio','ratio-16x9','ratio-4x3',
      'img-fluid','img-thumbnail',
      'transition','transition-fast','transition-none',
      'fade','show','active','collapse',
      'stretched-link','icon-link',
      'float-start','float-end','float-none',
      'user-select-none','pe-none','pe-auto',
      'gap-0','gap-1','gap-2','gap-3',
      'cursor-pointer','cursor-default','cursor-not-allowed',
    ],
  },
]

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function writeFixture(scenario) {
  fs.mkdirSync(FIXTURES, { recursive: true })
  const file = path.join(FIXTURES, `${scenario.name}.html`)
  // Chunk classes into multiple elements so the regex scanner finds them all
  const chunks = []
  const cls    = [...new Set(scenario.classes)]
  for (let i = 0; i < cls.length; i += 20) {
    chunks.push(`<div class="${cls.slice(i, i + 20).join(' ')}"></div>`)
  }
  fs.writeFileSync(file, `<!DOCTYPE html>\n<html><body>\n${chunks.join('\n')}\n</body></html>`)
  return file
}

function removeFixtures() {
  try { fs.rmSync(FIXTURES, { recursive: true, force: true }) } catch {}
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function mean(arr)   { return arr.reduce((a, b) => a + b, 0) / arr.length }
function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
function stddev(arr) {
  const u = mean(arr)
  return Math.sqrt(arr.reduce((s, v) => s + (v - u) ** 2, 0) / arr.length)
}
function percentile(arr, p) {
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(s.length * p)]
}

// IQR-fence outlier removal (1.5 × IQR — the standard Tukey method)
function removeOutliers(arr) {
  const s  = [...arr].sort((a, b) => a - b)
  const q1 = s[Math.floor(s.length * 0.25)]
  const q3 = s[Math.floor(s.length * 0.75)]
  const iq = q3 - q1
  const lo = q1 - 1.5 * iq
  const hi = q3 + 1.5 * iq
  const clean    = arr.filter(v => v >= lo && v <= hi)
  const excluded = arr.length - clean.length
  return { clean, excluded }
}

// 95% confidence interval on the mean (z = 1.96 for large n, t ≈ 2.0 for n ≥ 30)
function ci95(arr) {
  const se = stddev(arr) / Math.sqrt(arr.length)
  const z  = arr.length >= 30 ? 1.96 : 2.0
  const hw = z * se
  return { lo: mean(arr) - hw, hi: mean(arr) + hw, halfWidth: hw }
}

// ─── Format helpers ───────────────────────────────────────────────────────────

const fmt  = ms  => ms.toFixed(2) + 'ms'
const fmtB = b   => (b / 1024 / 1024).toFixed(1) + ' MB'
const fmtP = pct => pct.toFixed(1) + '%'

// ─── Build runner ─────────────────────────────────────────────────────────────

async function runScenario(scenario) {
  const { scanFiles }   = require('../src/scanner/scanner')
  const { generate }    = require('../src/generator/generator')
  const { clearFileCache } = require('../src/scanner/scanner')

  const fixtureFile = writeFixture(scenario)
  const globs       = [fixtureFile]
  const gc          = typeof global.gc === 'function' ? global.gc : null

  const warmupLabel = `${scenario.label} — warmup (${WARMUPS})`
  process.stdout.write(`  ${warmupLabel}`)
  for (let i = 0; i < WARMUPS; i++) {
    clearFileCache()
    scanFiles(globs)
    generate(scanFiles(globs))
    process.stdout.write('.')
  }

  process.stdout.write(`\n  ${scenario.label} — measuring (${RUNS})`)

  const times      = []
  let   peakHeap   = 0

  for (let i = 0; i < RUNS; i++) {
    if (gc) gc()
    clearFileCache()

    const t0 = process.hrtime.bigint()
    const classNames = scanFiles(globs)
    generate(classNames)
    const ms = Number(process.hrtime.bigint() - t0) / 1_000_000

    times.push(ms)

    const heapNow = process.memoryUsage().heapUsed
    if (heapNow > peakHeap) peakHeap = heapNow

    process.stdout.write('.')
  }

  process.stdout.write('\n')

  const { clean, excluded } = removeOutliers(times)
  const raw = times

  return {
    scenario:  scenario.name,
    label:     scenario.label,
    desc:      scenario.desc,
    classCount: [...new Set(scenario.classes)].length,
    runs:      RUNS,
    excluded,
    raw: {
      mean:   mean(raw),
      min:    Math.min(...raw),
      max:    Math.max(...raw),
    },
    stats: {
      mean:   mean(clean),
      median: median(clean),
      stddev: stddev(clean),
      cv:     stddev(clean) / mean(clean) * 100,
      p95:    percentile(clean, 0.95),
      p99:    percentile(clean, 0.99),
      ci95:   ci95(clean),
      min:    Math.min(...clean),
      max:    Math.max(...clean),
    },
    peakHeapMB: peakHeap / 1024 / 1024,
  }
}

// ─── Printer ──────────────────────────────────────────────────────────────────

function printResults(results, sysInfo) {
  const W = 80
  const bar = '═'.repeat(W)
  const sep = '─'.repeat(W)

  console.log('\n' + bar)
  console.log('  STRATA CSS — Build Speed Benchmark')
  console.log(bar)

  // System info
  console.log(`\n  System`)
  console.log(`  ${'Node'.padEnd(12)}${sysInfo.node}`)
  console.log(`  ${'OS'.padEnd(12)}${sysInfo.os}`)
  console.log(`  ${'CPU'.padEnd(12)}${sysInfo.cpu}`)
  console.log(`  ${'RAM'.padEnd(12)}${sysInfo.ram}`)
  console.log(`  ${'Runs'.padEnd(12)}${RUNS} measured + ${WARMUPS} warmup (outliers removed via IQR fence)`)
  console.log(`  ${'GC'.padEnd(12)}${typeof global.gc === 'function' ? 'forced between runs (--expose-gc)' : 'not forced — add --expose-gc for stability'}`)

  // Per-scenario tables
  for (const r of results) {
    console.log('\n' + sep)
    console.log(`  ${r.label}  ·  ${r.desc}  ·  ${r.classCount} unique classes`)
    console.log(sep)

    const row = (label, value, note = '') =>
      console.log(`  ${label.padEnd(16)}${value.padEnd(14)}${note}`)

    row('mean',   fmt(r.stats.mean),   `± ${fmt(r.stats.ci95.halfWidth)} (95% CI)`)
    row('median', fmt(r.stats.median))
    row('stddev', fmt(r.stats.stddev), `CV = ${fmtP(r.stats.cv)}  ${cvLabel(r.stats.cv)}`)
    row('p95',    fmt(r.stats.p95))
    row('p99',    fmt(r.stats.p99))
    row('min',    fmt(r.stats.min))
    row('max',    fmt(r.stats.max))
    row('heap',   fmtB(r.peakHeapMB * 1024 * 1024), 'peak V8 heap')
    if (r.excluded > 0) {
      row('outliers', `${r.excluded}`, `of ${r.runs} runs removed`)
    }
  }

  // Cross-scenario comparison
  if (results.length > 1) {
    console.log('\n' + sep)
    console.log('  Scenario comparison  (mean, outliers removed)')
    console.log(sep)
    const base = results[0].stats.mean
    for (const r of results) {
      const ratio = r.stats.mean / base
      const label = ratio === 1
        ? 'baseline'
        : `${ratio.toFixed(1)}× slower`
      console.log(`  ${r.label.padEnd(28)}${fmt(r.stats.mean).padEnd(12)}${label}`)
    }
  }

  console.log('\n' + bar + '\n')
}

function cvLabel(cv) {
  if (cv < 5)  return '(excellent stability)'
  if (cv < 10) return '(good stability)'
  if (cv < 20) return '(moderate — system noise present)'
  return '(high — consider pinning CPU or closing background apps)'
}

// ─── Save results ─────────────────────────────────────────────────────────────

function saveResults(results, sysInfo) {
  fs.mkdirSync(RESULTS, { recursive: true })

  const ts      = new Date().toISOString()
  const payload = { timestamp: ts, system: sysInfo, warmups: WARMUPS, runs: RUNS, results }

  // latest.json — always overwritten
  fs.writeFileSync(
    path.join(RESULTS, 'latest.json'),
    JSON.stringify(payload, null, 2)
  )

  // dated snapshot — never overwritten, useful for trend analysis
  const stamp = ts.replace(/[:.]/g, '-').slice(0, 19)
  fs.writeFileSync(
    path.join(RESULTS, `${stamp}.json`),
    JSON.stringify(payload, null, 2)
  )

  console.log(`  Results saved → benchmark/results/latest.json\n`)
}

// ─── System info ──────────────────────────────────────────────────────────────

function getSystemInfo() {
  const cpu = os.cpus()
  return {
    node: process.version,
    os:   `${os.type()} ${os.release()} (${os.arch()})`,
    cpu:  cpu.length ? `${cpu[0].model.trim()} × ${cpu.length}` : 'unknown',
    ram:  `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const sysInfo = getSystemInfo()
  const results = []

  console.log('\n  Strata CSS Benchmark — starting\n')

  for (const scenario of SCENARIOS) {
    const r = await runScenario(scenario)
    results.push(r)
    console.log()
  }

  removeFixtures()
  printResults(results, sysInfo)
  saveResults(results, sysInfo)
}

main().catch(err => {
  removeFixtures()
  console.error('\nBenchmark failed:', err.message)
  process.exit(1)
})
