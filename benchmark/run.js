'use strict'

/**
 * Strata Build-Speed Benchmark
 * ─────────────────────────────────────────────────────────────────────────────
 * Run:  npm run benchmark
 *       node --expose-gc benchmark/run.js
 *
 * Measures cold build time over N runs and prints a comparison table against
 * published Tailwind CSS 3 benchmark figures from the Strata README.
 *
 * Each run calls strata.invalidate() first so the cache is fully cold.
 * Warm-up runs are performed first so V8's JIT has compiled the hot paths
 * before measurements begin. GC is forced between runs when --expose-gc is set.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const path = require('path')

const ROOT    = path.join(__dirname, '..')
const RUNS    = 50
const WARMUPS = 5

// ─── Stats helpers ────────────────────────────────────────────────────────────

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function p95(arr) {
  const sorted = [...arr].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length * 0.95)]
}

function fmt(ms) {
  return ms.toFixed(2) + 'ms'
}

// ─── Build runner ─────────────────────────────────────────────────────────────

async function runBuilds() {
  const strata = require('../src/index')
  const input  = path.join(ROOT, 'strata.css')
  const output = path.join(ROOT, 'dist', 'strata.output.css')
  const gc     = typeof global.gc === 'function' ? global.gc : null
  const times  = []

  // Warm up V8's JIT before measuring — discarded runs
  process.stdout.write(`\nWarming up (${WARMUPS} runs)`)
  for (let i = 0; i < WARMUPS; i++) {
    strata.invalidate()
    await strata.build(input, output, { cwd: ROOT })
    process.stdout.write('.')
  }

  process.stdout.write(`\nMeasuring  (${RUNS} runs)`)
  for (let i = 0; i < RUNS; i++) {
    if (gc) gc()           // flush heap so GC pauses don't land inside a timed run
    strata.invalidate()
    const t0 = process.hrtime.bigint()
    await strata.build(input, output, { cwd: ROOT })
    const ms = Number(process.hrtime.bigint() - t0) / 1_000_000
    times.push(ms)
    process.stdout.write('.')
  }

  process.stdout.write('\n')
  if (!gc) process.stdout.write('  (tip: run with node --expose-gc for more stable results)\n')
  return times
}

// ─── Table printer ────────────────────────────────────────────────────────────

function printTable(strataAvg, strataMedian, strataP95) {
  // Tailwind reference figures from the Strata README (official benchmark)
  const rows = [
    {
      name:   'Strata (this run)',
      avg:    strataAvg,
      median: strataMedian,
      p95:    strataP95,
      note:   'JIT — cold build, cache invalidated each run',
    },
    {
      name:   'Strata (README baseline)',
      avg:    1.89,
      median: 0.15,
      p95:    0.23,
      note:   'Baseline from initial release benchmark',
    },
    {
      name:   'Tailwind CSS 3',
      avg:    7.21,
      median: 4.55,
      p95:    6.12,
      note:   'Official Tailwind watch-mode figures (reference only)',
    },
  ]

  const W = { name: 34, avg: 12, median: 12, p95: 12 }

  const header =
    '  ' +
    'Framework'.padEnd(W.name) +
    'Avg'.padEnd(W.avg) +
    'Median'.padEnd(W.median) +
    'p95'.padEnd(W.p95) +
    'Notes'

  console.log('\n' + '═'.repeat(80))
  console.log('  STRATA BENCHMARK — Build Speed')
  console.log('═'.repeat(80))
  console.log(header)
  console.log('  ' + '─'.repeat(78))

  for (const r of rows) {
    console.log(
      '  ' +
      r.name.padEnd(W.name) +
      fmt(r.avg).padEnd(W.avg) +
      fmt(r.median).padEnd(W.median) +
      fmt(r.p95).padEnd(W.p95) +
      r.note
    )
  }

  const speedupAvg    = (7.21    / strataAvg).toFixed(1)
  const speedupMedian = (4.55    / strataMedian).toFixed(1)
  const speedupP95    = (6.12    / strataP95).toFixed(1)

  console.log('\n  vs Tailwind CSS 3:')
  console.log(`    avg    ${speedupAvg}× faster`)
  console.log(`    median ${speedupMedian}× faster`)
  console.log(`    p95    ${speedupP95}× faster`)
  console.log('\n' + '═'.repeat(80) + '\n')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const times = await runBuilds()

  const strataAvg    = avg(times)
  const strataMedian = median(times)
  const strataP95    = p95(times)

  console.log(`\n  min: ${fmt(Math.min(...times))}   max: ${fmt(Math.max(...times))}`)
  printTable(strataAvg, strataMedian, strataP95)
}

main().catch(err => {
  console.error('\nBenchmark failed:', err.message)
  process.exit(1)
})
