'use strict'

/**
 * Strata Dependency-Tracking Regression Test
 *
 * Verifies the PostCSS plugin's Once() hook registers every scanned
 * content file as a `{ type: 'dependency' }` PostCSS message, so bundlers
 * (webpack/Turbopack/esbuild) invalidate their cache when a .tsx/.jsx/etc.
 * file changes — even though the CSS entry file's own bytes are untouched.
 *
 * Also simulates the actual incremental-rebuild symptom: a new utility
 * class added to a source file (not the CSS entry) must appear in the
 * next build's output once the plugin/dev-server is told to invalidate.
 */

const fs   = require('fs')
const os   = require('os')
const path = require('path')

let passed = 0
let failed = 0

function ok(label, condition) {
  if (condition) {
    console.log(`  ✓  ${label}`)
    passed++
  } else {
    console.error(`  ✗  ${label}`)
    failed++
  }
}

const postcss = require('postcss')
const strata  = require('../src/index')

// ─── Fixture setup ─────────────────────────────────────────────────────

const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strata-dep-test-'))
const srcDir      = path.join(fixtureDir, 'src')
const componentPath = path.join(srcDir, 'Component.tsx')
const cssEntryPath  = path.join(fixtureDir, 'entry.css')

fs.mkdirSync(srcDir, { recursive: true })
fs.writeFileSync(componentPath, `export default function Component() {
  return <div className="text-primary p-3">hello</div>
}
`)
fs.writeFileSync(cssEntryPath, `@strata base;
@strata components;
@strata utilities;
`)

// glob.sync() in scanner.js resolves patterns against the real process cwd,
// not the plugin's `cwd` option — so content globs must be absolute here.
const srcGlob = srcDir.replace(/\\/g, '/') + '/**/*.tsx'
fs.writeFileSync(path.join(fixtureDir, 'strata.config.js'), `module.exports = {
  content: ['${srcGlob}'],
}
`)

async function run() {
  console.log('\n── Dependency Tracking ────────────────────────────────────────')

  // ─── 1. First build — assert dependency messages are registered ──────
  const input1 = fs.readFileSync(cssEntryPath, 'utf8')
  const result1 = await postcss([strata({ cwd: fixtureDir })]).process(input1, { from: cssEntryPath })

  const depMessages1 = result1.messages.filter(m => m.type === 'dependency')
  const depFiles1 = depMessages1.map(m => m.file)

  ok('Once() hook registers at least one dependency message', depMessages1.length > 0)
  ok('Component.tsx is registered as a dependency',
    depFiles1.includes(path.resolve(componentPath)))
  ok('strata.config.js is registered as a dependency',
    depFiles1.includes(path.resolve(fixtureDir, 'strata.config.js')))
  ok('Every dependency message has a resolved absolute file path',
    depMessages1.every(m => path.isAbsolute(m.file)))
  ok('Every dependency message has parent set to the CSS entry file',
    depMessages1.every(m => m.parent === cssEntryPath))
  ok('Initial output contains .text-primary (from Component.tsx)',
    result1.css.includes('.text-primary'))
  ok('Initial output does not yet contain .bg-danger (not used yet)',
    !result1.css.includes('.bg-danger'))

  // ─── 2. Simulate incremental rebuild: only the .tsx file changes ─────
  // The CSS entry file is untouched — a bundler relying solely on the CSS
  // file's own mtime would (incorrectly) skip reprocessing. The dependency
  // messages from step 1 are what tell it to invalidate anyway. Here we
  // directly re-invoke the plugin (as a dev server would after being told
  // to invalidate) and assert the new class is picked up.
  fs.writeFileSync(componentPath, `export default function Component() {
  return <div className="text-primary p-3 bg-danger">hello</div>
}
`)
  strata.invalidate(componentPath)

  const input2 = fs.readFileSync(cssEntryPath, 'utf8')
  const result2 = await postcss([strata({ cwd: fixtureDir })]).process(input2, { from: cssEntryPath })

  ok('After Component.tsx changes, rebuilt output contains .bg-danger',
    result2.css.includes('.bg-danger'))
  ok('Rebuilt output still contains .text-primary',
    result2.css.includes('.text-primary'))

  const depMessages2 = result2.messages.filter(m => m.type === 'dependency')
  ok('Rebuild still registers Component.tsx as a dependency',
    depMessages2.some(m => m.file === path.resolve(componentPath)))

  // ─── 3. module.exports.build() — cache must be keyed by input path ───
  const outDir = path.join(fixtureDir, 'dist')
  const otherEntryPath = path.join(fixtureDir, 'other-entry.css')
  fs.writeFileSync(otherEntryPath, `/* no @strata directives */\n.custom { color: red; }\n`)

  const buildOut1 = await strata.build(cssEntryPath, path.join(outDir, 'a.css'), { cwd: fixtureDir })
  const buildOut2 = await strata.build(otherEntryPath, path.join(outDir, 'b.css'), { cwd: fixtureDir })

  ok('build() with a different inputCSSPath does not return the previous input\'s cached output',
    buildOut1 !== buildOut2)
  ok('build() correctly passes through an input file with no @strata directives',
    buildOut2.includes('.custom { color: red; }') && !buildOut2.includes('.text-primary'))

  // ─── Cleanup ───────────────────────────────────────────────────────
  fs.rmSync(fixtureDir, { recursive: true, force: true })

  console.log(`\n── Result ────────────────────────────────────────────────────`)
  console.log(`   Passed: ${passed}`)
  console.log(`   Failed: ${failed}`)
  console.log(`   Total:  ${passed + failed}`)
  if (failed === 0) console.log('\n   All tests passed.\n')
  else              console.error(`\n   ${failed} test(s) failed.\n`)

  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  fs.rmSync(fixtureDir, { recursive: true, force: true })
  console.error(err)
  process.exit(1)
})
