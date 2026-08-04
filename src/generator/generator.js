/**
 * Strata Generator — v4 — Sub-layer routing
 *
 * Each CSS rule is routed to its correct breakpoint sub-layer.
 * Layer declaration order in base.js ensures correct cascade priority:
 *
 *   st-components-xs  < st-components-sm  < st-components-md  < ...
 *   st-utilities-xs   < st-utilities-sm   < st-utilities-md   < ...
 *
 * This means HTML class order NEVER affects CSS behaviour.
 * col-lg-4 always beats col-sm-8 at large screens regardless of
 * which class appears first in the HTML attribute.
 *
 * Routing logic:
 *   No media query      → xs sub-layer  (mobile first default)
 *   min-width: 576px    → sm sub-layer
 *   min-width: 768px    → md sub-layer
 *   min-width: 992px    → lg sub-layer
 *   min-width: 1200px   → xl sub-layer
 *   min-width: 1400px   → xxl sub-layer
 *
 * Media query is kept inside the layer — it still controls when
 * the style activates. The layer controls cascade priority between
 * breakpoints.
 */

'use strict'

const { lookup } = require('../registry/registry')

// ─── Breakpoint routing ───────────────────────────────────────────────

const BP_SUFFIX_MAP = [
  { px: 1400, suffix: 'xxl' },
  { px: 1200, suffix: 'xl'  },
  { px:  992, suffix: 'lg'  },
  { px:  768, suffix: 'md'  },
  { px:  576, suffix: 'sm'  },
]

/**
 * Determine which sub-layer suffix a CSS rule belongs to.
 * Reads the min-width value from the @media query if present.
 * Returns 'xs' for rules with no media query.
 */
function getSubLayerSuffix(css) {
  const match = css.match(/@media\s*\(min-width:\s*(\d+(?:\.\d+)?)px\)/)
  if (!match) return 'xs'
  const px = parseFloat(match[1])
  for (const { px: threshold, suffix } of BP_SUFFIX_MAP) {
    if (px >= threshold) return suffix
  }
  return 'sm'
}

// ─── Generator ───────────────────────────────────────────────────────

function generate(classNames, config = {}) {
  // Buckets: layer → suffix → [css strings]
  const buckets = {
    components: { xs:[], sm:[], md:[], lg:[], xl:[], xxl:[] },
    utilities:  { xs:[], sm:[], md:[], lg:[], xl:[], xxl:[] },
  }

  // Safelist — classes no scanner can ever discover because they are built at
  // runtime from variables (`btn-${variant}`), injected by a CMS, or arrive in
  // markup Strata never sees. Applied here, at the single choke point both the
  // PostCSS plugin and the CLI build path funnel through, so it cannot be
  // wired up in one and silently missed in the other.
  // Entries may contain multiple space-separated class names.
  const safelist = Array.isArray(config.safelist) ? config.safelist : []
  let effective = classNames
  if (safelist.length) {
    effective = new Set(classNames)
    for (const entry of safelist) {
      if (typeof entry !== 'string') continue
      for (const part of entry.split(/\s+/)) {
        const t = part.trim()
        if (t) effective.add(t)
      }
    }
  }

  for (const cls of effective) {
    const result = lookup(cls)
    if (!result) continue

    const suffix = getSubLayerSuffix(result.css)
    const group  = result.layer === 'components' ? 'components' : 'utilities'
    buckets[group][suffix].push(result.css)
  }

  const SUFFIXES = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl']

  const componentParts = []
  const utilityParts   = []

  for (const suffix of SUFFIXES) {
    if (buckets.components[suffix].length > 0) {
      const layerName = `st-components-${suffix}`
      const body = buckets.components[suffix].map(r => indent(r)).join('\n\n')
      componentParts.push(`@layer ${layerName} {\n${body}\n}`)
    }
    if (buckets.utilities[suffix].length > 0) {
      const layerName = `st-utilities-${suffix}`
      const body = buckets.utilities[suffix].map(r => indent(r)).join('\n\n')
      utilityParts.push(`@layer ${layerName} {\n${body}\n}`)
    }
  }

  const componentCSS = componentParts.join('\n\n')
  const utilityCSS   = utilityParts.join('\n\n')

  return { componentCSS, utilityCSS }
}

function indent(css) {
  return css.split('\n').map(line => '  ' + line).join('\n')
}

// Keep generateAST for compatibility
function generateAST(classNames, config = {}, from = undefined) {
  const postcss = require('postcss')
  const { componentCSS, utilityCSS } = generate(classNames, config)

  return {
    componentAST: componentCSS ? postcss.parse(componentCSS, { from }) : null,
    utilityAST:   utilityCSS   ? postcss.parse(utilityCSS,   { from }) : null,
  }
}

module.exports = { generate, generateAST }
