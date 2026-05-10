/**
 * Strata Breakpoints
 * Bootstrap-style breakpoints
 * Embedded inside class names: col-md-6, d-lg-none, mt-md-3
 */

'use strict'

const DEFAULT_BREAKPOINTS = {
  xs:  '0px',
  sm:  '576px',
  md:  '768px',
  lg:  '992px',
  xl:  '1200px',
  xxl: '1400px'
}

/**
 * Merge default breakpoints with any custom ones from strata.config.js
 * @param {object} customBreakpoints
 * @returns {object}
 */
function resolveBreakpoints(customBreakpoints = {}) {
  return { ...DEFAULT_BREAKPOINTS, ...customBreakpoints }
}

/**
 * Get the media query string for a given breakpoint key
 * Returns null for xs since xs is mobile-first default (no query needed)
 * @param {string} key
 * @param {object} breakpoints
 * @returns {string|null}
 */
function getMediaQuery(key, breakpoints) {
  const value = breakpoints[key]
  if (!value || value === '0px') return null
  return `@media (min-width: ${value})`
}

/**
 * Wrap CSS in a media query if a breakpoint key is provided
 * @param {string} css
 * @param {string|null} breakpointKey
 * @param {object} breakpoints
 * @returns {string}
 */
function wrapInMediaQuery(css, breakpointKey, breakpoints) {
  if (!breakpointKey) return css
  const query = getMediaQuery(breakpointKey, breakpoints)
  if (!query) return css
  return `${query} {\n  ${css.split('\n').join('\n  ')}\n}`
}

module.exports = { DEFAULT_BREAKPOINTS, resolveBreakpoints, getMediaQuery, wrapInMediaQuery }
