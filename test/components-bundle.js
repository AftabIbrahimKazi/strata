'use strict'

/**
 * Strata Component Bundling Regression Test
 *
 * bin/strata.js used to source component JS exclusively from this monorepo's
 * packages/ directory. That directory is not in package.json's `files`
 * allowlist, so it never ships — meaning every consumer installing from npm
 * silently received a strata.components.js containing nothing but the init
 * stub: no Modal, no Offcanvas, no Skeleton, no Chart. The monorepo build
 * looked perfect the whole time, because packages/ exists here.
 *
 * These tests drive the real CLI against a simulated consumer layout, where
 * the components live in node_modules/@strata-packages/* and packages/ is
 * absent — the situation every npm user is actually in.
 */

const fs   = require('fs')
const os   = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

let passed = 0
let failed = 0

function ok(label, condition) {
  if (condition) { console.log(`  ✓  ${label}`); passed++ }
  else           { console.error(`  ✗  ${label}`); failed++ }
}

const CLI  = path.join(__dirname, '..', 'bin', 'strata.js')
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'strata-bundle-test-'))

function makeProject(dir, components) {
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'src', 'App.html'), '<div class="p-3">x</div>')
  fs.writeFileSync(path.join(dir, 'strata.css'),
    '@strata base;\n@strata components;\n@strata utilities;\n')
  fs.writeFileSync(path.join(dir, 'strata.config.js'),
    "module.exports={content:['./src/**/*.html'],input:'./strata.css',output:'./dist/out.css'}\n")
  // Stand in for installed @strata-packages/* — a marker global per component.
  for (const name of components) {
    const pkgDir = path.join(dir, 'node_modules', '@strata-packages', name)
    fs.mkdirSync(pkgDir, { recursive: true })
    fs.writeFileSync(path.join(pkgDir, `${name}.js`),
      `/* ${name} */ globalThis.__MARKER_${name.replace(/-/g, '_')} = true\n`)
  }
}

function runBuild(dir, cli = CLI) {
  // A copied install has no node_modules of its own; let it resolve chokidar,
  // glob and postcss from this repo, which is what a real install would get
  // from the consumer's tree.
  const env = Object.assign({}, process.env, {
    NODE_PATH: path.join(__dirname, '..', 'node_modules'),
  })
  // Warnings go to stderr, the build summary to stdout — capture both.
  const r = spawnSync(process.execPath, [cli, '--build', '--verbose'],
    { cwd: dir, encoding: 'utf8', env })
  if (r.error) throw r.error
  return (r.stdout || '') + (r.stderr || '')
}

// Copies strata-css into <dir>/node_modules/strata-css exactly as npm would:
// only the paths in package.json's `files` allowlist. Crucially there is no
// sibling packages/ directory, so the monorepo fallback cannot mask a missing
// component — this is the layout every npm consumer actually has.
function installStrataInto(dir) {
  const pkgRoot = path.join(__dirname, '..')
  const dest    = path.join(dir, 'node_modules', 'strata-css')
  const files   = require(path.join(pkgRoot, 'package.json')).files
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of files.concat(['package.json'])) {
    const from = path.join(pkgRoot, entry)
    if (!fs.existsSync(from)) continue
    fs.cpSync(from, path.join(dest, entry), { recursive: true })
  }
  return path.join(dest, 'bin', 'strata.js')
}

function run() {
  console.log('\n── Component bundling (simulated npm consumer) ────────────────')

  // ─── All four components installed ──────────────────────────────────
  const full = path.join(root, 'full')
  const all  = ['modal', 'offcanvas', 'skeleton-loader', 'chart']
  makeProject(full, all)
  const fullOut = runBuild(full)
  const fullJS  = fs.readFileSync(path.join(full, 'dist', 'strata.components.js'), 'utf8')

  for (const name of all) {
    ok(`${name} is bundled from node_modules/@strata-packages`,
      fullJS.includes(`__MARKER_${name.replace(/-/g, '_')}`))
  }
  ok('bundle is substantially larger than the bare init stub', fullJS.length > 400)
  ok('no missing-component warning when all are installed', !fullOut.includes('not bundled'))
  ok('verbose output lists the bundled components', fullOut.includes('components bundled:'))

  // ─── None installed — must warn, not fail silently ──────────────────
  // Run against an npm-style install (no packages/ sibling), so the monorepo
  // fallback cannot hide the missing components. This is the exact situation
  // that shipped an empty bundle in silence.
  const bare = path.join(root, 'bare')
  makeProject(bare, [])
  const bareCLI = installStrataInto(bare)
  const bareOut = runBuild(bare, bareCLI)
  const bareJS  = fs.readFileSync(path.join(bare, 'dist', 'strata.components.js'), 'utf8')

  ok('build still succeeds with no components installed', bareOut.includes('Built'))
  ok('warns that components were not bundled',            bareOut.includes('not bundled'))
  ok('warning names every missing component',
    all.every(n => new RegExp(`not bundled:[^\\n]*\\b${n}\\b`).test(bareOut)))
  ok('warning tells the user how to fix it',              bareOut.includes('npm i @strata-packages/'))
  ok('warning clarifies CSS is unaffected',               bareOut.includes('CSS for these components is always emitted'))
  ok('no component markers leak into the bare bundle',
    all.every(n => !bareJS.includes(`__MARKER_${n.replace(/-/g, '_')}`)))

  // ─── Partial install — bundle what exists, warn for the rest ────────
  const partial = path.join(root, 'partial')
  makeProject(partial, ['modal'])
  const partialOut = runBuild(partial)
  const partialJS  = fs.readFileSync(path.join(partial, 'dist', 'strata.components.js'), 'utf8')

  ok('installed component is bundled',       partialJS.includes('__MARKER_modal'))
  ok('uninstalled component is not bundled', !partialJS.includes('__MARKER_chart'))
  ok('warning covers only the missing ones',
    partialOut.includes('chart') && !/not bundled:[^\n]*\bmodal\b/.test(partialOut))

  fs.rmSync(root, { recursive: true, force: true })

  console.log(`\n── Result ────────────────────────────────────────────────────`)
  console.log(`   Passed: ${passed}`)
  console.log(`   Failed: ${failed}`)
  console.log(`   Total:  ${passed + failed}`)
  if (failed === 0) console.log('\n   All tests passed.\n')
  else              console.error(`\n   ${failed} test(s) failed.\n`)
  process.exit(failed > 0 ? 1 : 0)
}

try { run() }
catch (err) {
  fs.rmSync(root, { recursive: true, force: true })
  console.error(err)
  process.exit(1)
}
