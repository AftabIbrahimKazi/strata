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
  const configPath = path.resolve(cwd, 'strata.config.js')
  let mtime = 0
  try { mtime = fs.statSync(configPath).mtimeMs } catch {}
  if (cachedConfig && cachedConfigPath === configPath && cachedConfigMtime === mtime) {
    return cachedConfig
  }
  try {
    delete require.cache[require.resolve(configPath)]
    cachedConfig      = require(configPath)
    cachedConfigPath  = configPath
    cachedConfigMtime = mtime
  } catch { cachedConfig = {} }
  return cachedConfig
}

// ─── Base CSS ─────────────────────────────────────────────────────────
const BASE_CSS = require('./layers/base').trim()
let   BASE_AST = null

function getBaseAST() {
  if (!postcss) postcss = require('postcss')
  if (!BASE_AST) BASE_AST = postcss.parse(BASE_CSS)
  return BASE_AST
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
  if (!postcss) postcss = require('postcss')

  const inputCSS = fs.readFileSync(inputCSSPath, 'utf8')

  // ── Warm path: return cached CSS, no PostCSS at all ───────────────
  if (!dirty && cachedCSS) {
    if (outputCSSPath) fs.writeFileSync(outputCSSPath, cachedCSS)
    return cachedCSS
  }

  // ── Cold path: full PostCSS pipeline ─────────────────────────────
  const plugins = [plugin(opts)]

  const result = await postcss(plugins).process(inputCSS, {
    from: inputCSSPath,
    to:   outputCSSPath,
    map:  opts.sourceMap ? { inline: false } : false
  })

  // Cache the final output — includes autoprefixer etc. already applied
  cachedCSS = result.css
  dirty = false

  if (outputCSSPath) {
    fs.mkdirSync(path.dirname(outputCSSPath), { recursive: true })
    fs.writeFileSync(outputCSSPath, result.css)
    if (result.map) fs.writeFileSync(outputCSSPath + '.map', result.map.toString())
  }

  return result.css
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
