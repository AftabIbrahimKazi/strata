'use strict'

/**
 * Strata Scanner Regression Test
 *
 * The scanner originally only understood two className shapes:
 *
 *   className="literal"        className={"literal"}
 *
 * Anything else inside the braces — clsx(), cn(), classnames(), ternaries,
 * template literals, arrays — was invisible, so a class used ONLY in one of
 * those forms silently produced no CSS: no error, no warning. It appeared to
 * work only when the same class also happened to exist as a plain literal
 * somewhere else in the tree.
 *
 * These tests lock in every className shape the scanner must understand, and
 * assert end-to-end that CSS is actually emitted — not merely that a token was
 * collected. Add a shape here before teaching the scanner a new one.
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

const { scanFiles, extractClassesFromFile, clearFileCache } = require('../src/scanner/scanner')
const strata = require('../src/index')

// ─── Fixture ───────────────────────────────────────────────────────────

const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strata-scanner-test-'))
const srcDir     = path.join(fixtureDir, 'src')
fs.mkdirSync(srcDir, { recursive: true })

// Every distinct class below appears in exactly ONE shape and nowhere else in
// the fixture — so if a shape is not understood, its class cannot be recovered
// from some other occurrence, and the assertion genuinely fails.
fs.writeFileSync(path.join(srcDir, 'Shapes.tsx'), `
import clsx from 'clsx'
import cn from 'classnames'

export const Shapes = ({ cond, active }) => (
  <>
    <div className="shape-plain" />
    <div className={"shape-braced-double"} />
    <div className={'shape-braced-single'} />
    <div className={clsx('shape-clsx-a', 'shape-clsx-b')} />
    <div className={clsx('shape-clsx-tern', cond ? 'shape-tern-yes' : 'shape-tern-no')} />
    <div className={cn('shape-cn', active && 'shape-cn-and', { 'shape-cn-obj': cond })} />
    <div className={[ 'shape-arr-a', 'shape-arr-b' ].join(' ')} />
    <div className={\`shape-tpl-static \${cond ? 'shape-tpl-yes' : 'shape-tpl-no'} shape-tpl-tail\`} />
    <div className={clsx('shape-nested-outer', clsx('shape-nested-inner'))} />
    <div className={cond ? "shape-dq-yes" : "shape-dq-no"} />
    <div className={styles.somethingWithNoStrings} />
    <span class="shape-html-attr" />
  </>
)
`)

// A class that exists ONLY inside a clsx() call, in a file of its own, and
// nowhere else in the entire fixture tree. This is the exact reported bug:
// w-[var(--space-24)] never compiled because it never appeared as a bare
// string literal anywhere in the project.
fs.writeFileSync(path.join(srcDir, 'OnlyInExpression.tsx'), `
import clsx from 'clsx'
export const Card = ({ on }) => (
  <div className={clsx('w-[var(--space-24)]', on ? 'bg-primary' : 'bg-body')} />
)
`)

// JS property assignment with spaces around '=' (element.className = '...').
// Real Strata components do this to build backdrops at runtime.
fs.writeFileSync(path.join(srcDir, 'runtime.js'), `
const backdrop = document.createElement('div')
backdrop.className = 'shape-assigned-prop'
`)

const srcGlob = srcDir.replace(/\\/g, '/') + '/**/*.{tsx,js}'

async function run() {
  console.log('\n── Scanner: className shapes ──────────────────────────────────')

  clearFileCache()
  const found = scanFiles([srcGlob])
  const has = (c) => found.has(c)

  // Shapes that already worked — these must never regress.
  ok('plain className="..."',            has('shape-plain'))
  ok('braced double-quoted literal',     has('shape-braced-double'))
  ok('braced single-quoted literal',     has('shape-braced-single'))
  ok('html class="..." attribute',       has('shape-html-attr'))

  // Shapes that silently produced nothing before this fix.
  ok('clsx() string arguments',          has('shape-clsx-a') && has('shape-clsx-b'))
  ok('clsx() with ternary argument',     has('shape-clsx-tern') && has('shape-tern-yes') && has('shape-tern-no'))
  ok('cn() with && and object keys',     has('shape-cn') && has('shape-cn-and') && has('shape-cn-obj'))
  ok('array literal + .join()',          has('shape-arr-a') && has('shape-arr-b'))
  ok('template literal static chunks',   has('shape-tpl-static') && has('shape-tpl-tail'))
  ok('strings inside ${...} interpolation', has('shape-tpl-yes') && has('shape-tpl-no'))
  ok('nested helper calls',              has('shape-nested-outer') && has('shape-nested-inner'))
  ok('bare ternary, double quotes',      has('shape-dq-yes') && has('shape-dq-no'))
  ok('element.className = \'...\' assignment', has('shape-assigned-prop'))

  // Must not throw or hang on an expression containing no strings at all.
  ok('expression with no string literals is harmless', found.size > 0)

  console.log('\n── Scanner: class used ONLY inside an expression ──────────────')

  ok('w-[var(--space-24)] collected from clsx()', has('w-[var(--space-24)]'))
  ok('bg-primary collected from ternary',         has('bg-primary'))
  ok('bg-body collected from ternary',            has('bg-body'))

  // End-to-end: the class must actually reach the generated CSS, not just the
  // scanner's token set. This is what consumers ultimately depend on.
  const cssEntry = path.join(fixtureDir, 'entry.css')
  fs.writeFileSync(cssEntry, '@strata base;\n@strata components;\n@strata utilities;\n')
  fs.writeFileSync(path.join(fixtureDir, 'strata.config.js'),
    `module.exports = { content: ['${srcGlob}'] }\n`)

  strata.invalidate()
  const css = await strata.build(cssEntry, null, { cwd: fixtureDir })

  ok('generated CSS contains the expression-only arbitrary class',
    css.includes('w-\\[var\\(--space-24\\)\\]'))
  ok('generated CSS contains .bg-primary from the ternary',
    css.includes('.bg-primary'))

  console.log('\n── Safelist ──────────────────────────────────────────────────')

  // safelist is the documented escape hatch for classes no scanner can find
  // (built at runtime from a variable). It was documented but never implemented
  // until v1.6.13 — following the docs produced a silent no-op.
  // 'shadow-lg' is used nowhere in the fixture; it can only arrive via safelist.
  fs.writeFileSync(path.join(fixtureDir, 'strata.config.js'),
    `module.exports = {
      content: ['${srcGlob}'],
      safelist: ['shadow-lg', 'rounded-pill text-center'],
    }\n`)

  strata.invalidate()
  const safeCSS = await strata.build(cssEntry, null, { cwd: fixtureDir })

  ok('safelisted class appears in CSS',            safeCSS.includes('.shadow-lg'))
  ok('space-separated safelist entry: first class', safeCSS.includes('.rounded-pill'))
  ok('space-separated safelist entry: second class', safeCSS.includes('.text-center'))
  ok('safelist does not drop scanned classes',     safeCSS.includes('.bg-primary'))

  // An edited strata.config.js must actually take effect. loadConfig() uses
  // require(), which memoises for the process lifetime — without an explicit
  // cache bust a long-running dev server keeps using the config it read at
  // startup, so new safelist entries or content globs silently do nothing.
  fs.writeFileSync(path.join(fixtureDir, 'strata.config.js'),
    `module.exports = {
      content: ['${srcGlob}'],
      safelist: ['shadow-lg', 'rounded-pill text-center', 'float-end'],
    }\n`)

  strata.invalidate()
  const reloadedCSS = await strata.build(cssEntry, null, { cwd: fixtureDir })

  ok('edited strata.config.js is re-read, not served from require cache',
    reloadedCSS.includes('.float-end'))
  ok('previously safelisted classes survive the config reload',
    reloadedCSS.includes('.shadow-lg'))

  console.log('\n── Scanner: robustness ───────────────────────────────────────')

  // Unbalanced brace must not hang, throw, or swallow the rest of the file.
  const oddPath = path.join(srcDir, 'Odd.tsx')
  fs.writeFileSync(oddPath, `
    <div className={clsx('odd-before'} />
    <div className="odd-after" />
  `)
  let threw = false
  let oddClasses = new Set()
  try { oddClasses = extractClassesFromFile(oddPath) || new Set() }
  catch { threw = true }
  ok('unbalanced brace does not throw', !threw)
  ok('content after an unbalanced brace is still scanned', oddClasses.has('odd-after'))

  // Escaped quotes inside a string must not desynchronise the tokenizer.
  const escPath = path.join(srcDir, 'Esc.tsx')
  fs.writeFileSync(escPath, `
    <div className={clsx('it\\'s', 'esc-recovered')} />
  `)
  const escClasses = extractClassesFromFile(escPath) || new Set()
  ok('escaped quote does not desynchronise scanning', escClasses.has('esc-recovered'))

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
