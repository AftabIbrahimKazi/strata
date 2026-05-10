/**
 * Strata Skeleton JS Utility
 * Version: 1.0.0
 *
 * Smart detection and lifecycle management for skeleton loaders.
 * JS handles detection and toggling only.
 * CSS handles all visual rendering via @layer st-skeleton.
 *
 * Four attribute states:
 *   "true"  — element shimmers (CSS applies ::before overlay)
 *   "false" — element revealed (no shimmer)
 *   "null"  — JS managed parent (no overlay, children shimmer individually)
 *
 * Key fix: replaced elements (img, video, iframe) cannot have ::before
 * pseudo-elements in browsers. JS marks their WRAPPER div with "true"
 * instead so the wrapper's ::before overlay covers the replaced content.
 */

;(function (global) {
  'use strict'

  // ─── Element type sets ───────────────────────────────────────────────

  // Content elements that support ::before — become individual skeleton bars
  const CONTENT_TAGS = new Set([
    'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'SPAN', 'A', 'LABEL', 'STRONG', 'EM', 'SMALL',
    'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT',
    'LI', 'DT', 'DD', 'BLOCKQUOTE', 'FIGCAPTION'
    // NOTE: IMG, VIDEO, IFRAME are NOT here —
    // replaced elements cannot have ::before.
    // Their parent WRAPPER is marked instead.
  ])

  // Replaced elements — ::before not supported by browsers
  // JS marks their wrapper parent instead
  const REPLACED_TAGS = new Set([
    'IMG', 'VIDEO', 'IFRAME', 'PICTURE', 'CANVAS', 'SVG'
  ])

  // Structural elements — skipped, children scanned
  // UNLESS they contain only replaced elements, in which case
  // the structural element itself becomes the skeleton bar
  const STRUCTURAL_TAGS = new Set([
    'DIV', 'SECTION', 'ARTICLE', 'MAIN', 'ASIDE',
    'HEADER', 'FOOTER', 'NAV', 'UL', 'OL', 'DL',
    'FIGURE', 'FORM', 'FIELDSET'
  ])

  // Tags to ignore completely
  const IGNORE_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK',
    'HEAD', 'HTML', 'BODY', 'BR', 'HR', 'WBR'
  ])

  // ─── Registry ────────────────────────────────────────────────────────

  const registry = new Map()

  // ─── Smart Detection ─────────────────────────────────────────────────

  /**
   * Check if an element has direct text nodes (not just whitespace)
   */
  function hasDirectText(el) {
    return Array.from(el.childNodes).some(
      node => node.nodeType === Node.TEXT_NODE
           && node.textContent.trim().length > 0
    )
  }

  /**
   * Check if a structural element contains ONLY replaced elements.
   * If so, the structural element itself becomes the skeleton bar
   * because its ::before overlay covers the replaced content.
   *
   * Example: <div class="card-img-wrap"><img src="..."></div>
   * → card-img-wrap gets "true", its ::before covers the img
   */
  function hasOnlyReplacedChildren(el) {
    const meaningful = Array.from(el.children).filter(
      c => !IGNORE_TAGS.has(c.tagName)
    )
    return meaningful.length > 0
        && meaningful.every(c => REPLACED_TAGS.has(c.tagName))
  }

  /**
   * Walk the DOM from a parent and find all leaf nodes.
   *
   * Rules:
   * - Content tags (p, h3, button, a etc.) → mark as skeleton bar
   * - Structural wrapper containing ONLY replaced elements (img, video) →
   *   mark the WRAPPER as skeleton bar (its ::before covers the media)
   * - Structural wrapper with direct text → mark as skeleton bar
   * - Structural wrapper with mixed children → recurse
   * - Replaced elements (img, video) as direct children → skip
   *   (handled by their parent wrapper rule above)
   * - data-st-skeleton="false" → skip element and all descendants
   * - data-st-skeleton="null" → skip (another managed parent)
   */
  function detectLeaves(parent) {
    const leaves = []

    function walk(el) {
      // Skip opted-out elements entirely
      if (el.getAttribute('data-st-skeleton') === 'false') return

      // Skip other managed JS parents
      if (el !== parent && el.getAttribute('data-st-skeleton') === 'null') return

      // Skip ignored tags
      if (IGNORE_TAGS.has(el.tagName)) return

      const tag = el.tagName

      // Content element — supports ::before, mark as leaf
      if (CONTENT_TAGS.has(tag)) {
        leaves.push(el)
        return
      }

      // Replaced element as direct child of managed parent
      // Cannot mark it — no ::before support. Skip it.
      // Ideally developer wraps their images in a div.
      if (REPLACED_TAGS.has(tag)) {
        return
      }

      // Structural element — decide whether to mark or recurse
      if (STRUCTURAL_TAGS.has(tag)) {

        // CASE 1: Contains only replaced elements (img, video etc.)
        // Mark THIS structural element — its ::before covers the media
        if (hasOnlyReplacedChildren(el)) {
          leaves.push(el)
          return
        }

        // CASE 2: Has direct text — mark as leaf
        if (hasDirectText(el)) {
          leaves.push(el)
          return
        }

        // CASE 3: Mixed children — recurse into children
        Array.from(el.children).forEach(child => walk(child))
        return
      }

      // Unknown tag — recurse into children
      Array.from(el.children).forEach(child => walk(child))
    }

    // Walk children — not the parent itself
    Array.from(parent.children).forEach(child => walk(child))

    return leaves
  }

  // ─── Core ─────────────────────────────────────────────────────────────

  /**
   * Register a parent for JS management.
   * Sets parent to "null" — neutral container, no parent overlay.
   * Runs smart detection and marks leaf children with "true".
   */
  function manage(parent, options = {}) {
    if (!parent || registry.has(parent)) return

    const leaves = detectLeaves(parent)
    registry.set(parent, { leaves, options })

    // Set parent to "null" — removes parent ::before overlay
    // so only individual leaf shimmers show
    parent.setAttribute('data-st-skeleton', 'null')

    // Mark detected leaves as skeleton
    leaves.forEach(leaf => leaf.setAttribute('data-st-skeleton', 'true'))
  }

  /**
   * Show skeleton — parent to "null", leaves to "true"
   */
  function show(selector) {
    const targets = resolveTargets(selector)
    targets.forEach(parent => {
      const entry = registry.get(parent)
      if (!entry) return
      parent.setAttribute('data-st-skeleton', 'null')
      entry.leaves.forEach(leaf => leaf.setAttribute('data-st-skeleton', 'true'))
    })
  }

  /**
   * Reveal content — parent to "false", leaves to "false"
   * Attribute stays in DOM — only value changes.
   */
  function reveal(selector, options = {}) {
    if (typeof selector === 'object' && !isSelector(selector)) {
      options  = selector
      selector = null
    }

    const targets  = resolveTargets(selector)
    const stagger  = options.stagger  || 0
    const onReveal = options.onReveal || null

    targets.forEach((parent, index) => {
      const entry = registry.get(parent)
      if (!entry) return

      setTimeout(() => {
        parent.setAttribute('data-st-skeleton', 'false')
        entry.leaves.forEach(leaf => leaf.setAttribute('data-st-skeleton', 'false'))

        if (onReveal && index === targets.length - 1) {
          setTimeout(onReveal, 0)
        }
      }, stagger * index)
    })
  }

  /**
   * Toggle between skeleton and revealed
   */
  function toggle(selector) {
    const targets = resolveTargets(selector)
    targets.forEach(parent => {
      const val = parent.getAttribute('data-st-skeleton')
      val === 'false' ? show(parent) : reveal(parent)
    })
  }

  /**
   * Reveal one element by index within a selector group
   */
  function revealAt(selector, index) {
    const targets = resolveTargets(selector)
    const parent  = targets[index]
    if (parent) reveal(parent)
  }

  /**
   * Check if element is currently in skeleton state
   */
  function isSkeleton(el) {
    const val = el.getAttribute('data-st-skeleton')
    return val === 'true' || val === 'null'
  }

  // ─── Init ─────────────────────────────────────────────────────────────

  /**
   * Initialise the skeleton utility.
   *
   * No selector: auto-discovers all [data-st-skeleton="true"] top-level parents.
   * With selector: manages all matching elements.
   */
  function init(selector, options = {}) {
    let parents

    if (!selector) {
      // Auto-discover top-level skeleton parents
      // Filter out elements that are children of another skeleton parent
      parents = Array.from(
        document.querySelectorAll('[data-st-skeleton="true"]')
      ).filter(el => !el.parentElement.closest('[data-st-skeleton]'))

    } else {
      parents = resolveRaw(selector)

      // Set initial attribute if missing
      parents.forEach(parent => {
        if (!parent.hasAttribute('data-st-skeleton')) {
          parent.setAttribute('data-st-skeleton', 'true')
        }
      })
    }

    parents.forEach(parent => manage(parent, options))
    return api
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  function resolveTargets(selector) {
    if (!selector) return Array.from(registry.keys())
    if (selector instanceof Element) return registry.has(selector) ? [selector] : []
    if (selector instanceof NodeList || Array.isArray(selector)) {
      return Array.from(selector).filter(el => registry.has(el))
    }
    if (typeof selector === 'string') {
      return Array.from(document.querySelectorAll(selector))
        .filter(el => registry.has(el))
    }
    return []
  }

  function resolveRaw(selector) {
    if (!selector) return []
    if (selector instanceof Element) return [selector]
    if (selector instanceof NodeList || Array.isArray(selector)) return Array.from(selector)
    if (typeof selector === 'string') return Array.from(document.querySelectorAll(selector))
    return []
  }

  function isSelector(val) {
    return typeof val === 'string'
      || val instanceof Element
      || val instanceof NodeList
  }

  // ─── Public API ───────────────────────────────────────────────────────

  const api = {
    init,
    show,
    reveal,
    toggle,
    revealAt,
    isSkeleton,
    manage: (selector, options) => {
      resolveRaw(selector).forEach(el => manage(el, options))
      return api
    }
  }

  // ─── Export ───────────────────────────────────────────────────────────

  if (!global.Strata) global.Strata = {}
  global.Strata.skeleton = api

})(window)
