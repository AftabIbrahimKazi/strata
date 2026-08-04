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
let dirty            = true
let cachedCSS         = null   // final output CSS string from last cold build
let cachedBuildInput  = null   // resolved inputCSSPath the cache above was built from

// ─── Config cache ─────────────────────────────────────────────────────
let cachedConfig      = null
let cachedConfigPath  = null
let cachedConfigMtime = null

function resolveConfigPath(cwd) {
  const configPathCjs = path.resolve(cwd, 'strata.config.cjs')
  if (fs.existsSync(configPathCjs)) return configPathCjs
  const configPath = path.resolve(cwd, 'strata.config.js')
  if (fs.existsSync(configPath)) return configPath
  return null
}

function loadConfig(cwd) {
  const resolved = resolveConfigPath(cwd)
  if (!resolved) return {}

  // mtime resolution is coarse, so pair it with size — two edits in the same
  // millisecond that change the file's length are still detected. invalidate()
  // clears this cache outright, which is the authoritative signal.
  let stamp = '0'
  try {
    const st = fs.statSync(resolved)
    stamp = `${st.mtimeMs}:${st.size}`
  } catch {}

  if (cachedConfig && cachedConfigPath === resolved && cachedConfigMtime === stamp) {
    return cachedConfig
  }

  try {
    // Bust Node's module cache before re-reading. require() memoises for the
    // lifetime of the process, so without this an edited strata.config.js
    // (new content globs, new safelist entries) silently never takes effect
    // in a dev server or watch session — the very staleness class of bug the
    // dependency-tracking fix in 1.5.13 set out to eliminate.
    delete require.cache[require.resolve(resolved)]
    const config = require(resolved)
    cachedConfig      = config
    cachedConfigPath  = resolved
    cachedConfigMtime = stamp
    return config
  } catch {
    return {}
  }
}

// ─── Base CSS ─────────────────────────────────────────────────────────
const BASE_CSS = require('./layers/base').trim()
let   BASE_AST = null

function getBaseAST(from) {
  if (!postcss) postcss = require('postcss')
  if (!BASE_AST) BASE_AST = postcss.parse(BASE_CSS, { from })
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

  async Once(root, { result }) {
    if (!postcss) postcss = require('postcss')

    const from   = result.opts.from
    const cwd    = opts.cwd || process.cwd()
    const config = loadConfig(cwd)

    const { scanFiles, getWatchFiles, getScanWarnings } = require('./scanner/scanner')
    const { generate }  = require('./generator/generator')

    const contentGlobs = config.content || [
      './src/**/*.{html,jsx,tsx,vue,astro,svelte,js,ts}'
    ]

    const classNames = scanFiles(contentGlobs, cwd)
    const { componentCSS, utilityCSS } = generate(classNames, config)

    // Surface a scan that produced nothing as a real PostCSS warning. Most
    // consumers build through a bundler rather than the CLI, and an empty or
    // near-empty stylesheet used to arrive with no diagnostic at all.
    for (const w of getScanWarnings()) {
      result.warn(`[strata] ${w}`, { plugin: 'strata-css' })
    }

    // Tell the caller's bundler (webpack/Turbopack/esbuild/etc.) that this
    // output depends on every scanned content file, not just the CSS file
    // being processed — otherwise an unchanged CSS file + unchanged config
    // reads as "nothing changed" and a stale cached build gets served even
    // when a .tsx file added/changed a utility class.
    const watchFiles = getWatchFiles(contentGlobs, cwd)
    for (let i = 0; i < watchFiles.length; i++) {
      result.messages.push({
        type: 'dependency',
        plugin: 'strata-css',
        file: path.resolve(cwd, watchFiles[i]),
        parent: from,
      })
    }
    const resolvedConfigPath = resolveConfigPath(cwd)
    if (resolvedConfigPath) {
      result.messages.push({
        type: 'dependency',
        plugin: 'strata-css',
        file: resolvedConfigPath,
        parent: from,
      })
    }

    // Replace @strata directives
    let baseInserted = false
    root.walkAtRules('strata', rule => {
      const d = rule.params.trim()
      if (d === 'base' && !baseInserted) {
        rule.replaceWith(getBaseAST(from).clone())
        baseInserted = true
      } else if (d === 'components') {
        componentCSS ? rule.replaceWith(postcss.parse(componentCSS, { from })) : rule.remove()
      } else if (d === 'utilities') {
        utilityCSS ? rule.replaceWith(postcss.parse(utilityCSS, { from })) : rule.remove()
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
  const resolvedInput = path.resolve(inputCSSPath)

  // ── Warm path: return cached CSS, no work at all ──────────────────
  // Only valid if the cache was built from this same input file — the
  // module-level cache is shared across calls, so a different inputCSSPath
  // must never be served the previous input's stale compiled output.
  if (!dirty && cachedCSS && cachedBuildInput === resolvedInput) {
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

  const classNames = scanFiles(contentGlobs, cwd)
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

  cachedCSS        = css
  cachedBuildInput = resolvedInput
  dirty            = false

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
  // Drop the memoised config too. mtime alone is not a sound invalidation
  // signal — its resolution is coarse enough that a config edited twice in
  // quick succession can report an unchanged timestamp — and invalidate()
  // explicitly means "something on disk changed, trust nothing".
  cachedConfig      = null
  cachedConfigPath  = null
  cachedConfigMtime = null
  const { clearFileCache }   = require('./scanner/scanner')
  const { clearResultCache } = require('./registry/registry')
  clearFileCache(changedFile)
  clearResultCache()
}

// ─── Direct PostCSS usage (for users using postcss.config.js) ────────
// Warm path still applies — cached CSS is injected as a raw parse
module.exports.postcss = true
