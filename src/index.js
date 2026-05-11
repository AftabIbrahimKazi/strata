/**
 * Strata CSS — PostCSS Plugin — Optimised v6
 *
 * Warm builds bypass PostCSS entirely — no node creation, no GC pressure
 * Cold builds run full PostCSS pipeline (including autoprefixer etc.)
 * Warm builds return cached string directly — zero object allocation
 */

'use strict'

const path = require('path')
const fs   = require('fs')
let postcss

// ─── State ────────────────────────────────────────────────────────────
let dirty      = true
let cachedCSS  = null   // final output CSS string from last cold build

// ─── Config cache ─────────────────────────────────────────────────────
let cachedConfig      = null
let cachedConfigPath  = null
let cachedConfigMtime = 0

function loadConfig(cwd) {
  const configPath    = path.resolve(cwd, 'strata.config.js')
  const configPathCjs = path.resolve(cwd, 'strata.config.cjs')

  if (fs.existsSync(configPathCjs)) {
    try { return require(configPathCjs) } catch {}
  }

  if (fs.existsSync(configPath)) {
    try { return require(configPath) } catch {}
  }

  return {}
}

// ─── Base CSS ─────────────────────────────────────────────────────────
const BASE_CSS = require('./layers/base').trim()
let   BASE_AST = null

function getBaseAST() {
  if (!postcss) postcss = require('postcss')
  if (!BASE_AST) BASE_AST = postcss.parse(BASE_CSS)
  return BASE_AST
}

// ─── Input CSS cache ───────────────────────────────────────────────────
// strata.css rarely changes — cache it with mtime check
let cachedInputCSS   = null
let cachedInputPath  = null
let cachedInputMtime = 0

function readInputCSS(inputCSSPath) {
  let mtime = 0
  try { mtime = fs.statSync(inputCSSPath).mtimeMs } catch {}
  if (cachedInputCSS && cachedInputPath === inputCSSPath && cachedInputMtime === mtime) {
    return cachedInputCSS
  }
  cachedInputCSS   = fs.readFileSync(inputCSSPath, 'utf8')
  cachedInputPath  = inputCSSPath
  cachedInputMtime = mtime
  return cachedInputCSS
}

// ─── PostCSS Plugin ───────────────────────────────────────────────────
// Only runs on cold builds — warm builds bypass via strata.build()

const plugin = (opts = {}) => ({
  postcssPlugin: 'strata-css',

  async Once(root) {
    if (!postcss) postcss = require('postcss')

    const cwd    = opts.cwd || process.cwd()
    const config = loadConfig(cwd)

    const { scanFiles } = require('./scanner/scanner')
    const { generate }  = require('./generator/generator')

    const contentGlobs = config.content || [
      './src/**/*.{html,jsx,tsx,vue,astro,svelte,js,ts}'
    ]

    const classNames = scanFiles(contentGlobs)
    const { componentCSS, utilityCSS } = generate(classNames, config)

    // Replace @strata directives
    let baseInserted = false
    root.walkAtRules('strata', rule => {
      const d = rule.params.trim()
      if (d === 'base' && !baseInserted) {
        rule.replaceWith(getBaseAST().clone())
        baseInserted = true
      } else if (d === 'components') {
        // componentCSS now contains multiple @layer sub-layer blocks
        componentCSS ? rule.replaceWith(postcss.parse(componentCSS)) : rule.remove()
      } else if (d === 'utilities') {
        // utilityCSS now contains multiple @layer sub-layer blocks
        utilityCSS ? rule.replaceWith(postcss.parse(utilityCSS)) : rule.remove()
      } else {
        rule.remove()
      }
    })
  }
})

plugin.postcss = true
module.exports = plugin

// ─── Build API — used by CLI ──────────────────────────────────────────
// Warm builds bypass PostCSS entirely — zero allocation, zero GC pressure

module.exports.build = async (inputCSSPath, outputCSSPath, opts = {}) => {
  // ── Warm path: return cached CSS, no work at all ──────────────────
  if (!dirty && cachedCSS) {
    if (outputCSSPath) fs.writeFileSync(outputCSSPath, cachedCSS)
    return cachedCSS
  }

  // ── Cold path: string assembly — no PostCSS parse/stringify ───────
  // PostCSS parse → AST clone → replaceWith → stringify is a costly
  // round-trip that adds no transformation. We replace @strata directives
  // via regex on the raw string, which is O(n) on the input file only.
  const cwd    = opts.cwd || process.cwd()
  const config = loadConfig(cwd)

  const { scanFiles } = require('./scanner/scanner')
  const { generate }  = require('./generator/generator')

  const contentGlobs = config.content || [
    './src/**/*.{html,jsx,tsx,vue,astro,svelte,js,ts}'
  ]

  const classNames = scanFiles(contentGlobs)
  const { componentCSS, utilityCSS } = generate(classNames, config)

  // Read input CSS (cached by mtime — strata.css rarely changes)
  const inputCSS = readInputCSS(inputCSSPath)

  // Replace @strata directives with pre-built CSS strings.
  // Use function replacements (not string literals) so any `$` sequences
  // in the CSS (e.g. inside comments) are never treated as regex back-references.
  const css = inputCSS
    .replace(/^\s*@strata\s+base\s*;/m,       () => BASE_CSS)
    .replace(/^\s*@strata\s+components\s*;/m, () => componentCSS || '')
    .replace(/^\s*@strata\s+utilities\s*;/m,  () => utilityCSS   || '')

  cachedCSS = css
  dirty     = false

  if (outputCSSPath) {
    fs.mkdirSync(path.dirname(outputCSSPath), { recursive: true })
    fs.writeFileSync(outputCSSPath, css)
  }

  return css
}

// ─── Cache invalidation ───────────────────────────────────────────────
module.exports.invalidate = (changedFile) => {
  dirty     = true
  cachedCSS = null
  const { clearFileCache } = require('./scanner/scanner')
  clearFileCache(changedFile)
}

// ─── Direct PostCSS usage (for users using postcss.config.js) ────────
// Warm path still applies — cached CSS is injected as a raw parse
module.exports.postcss = true
