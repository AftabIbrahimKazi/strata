/**
 * Skeleton Loader
 * Version: 1.0.0
 *
 * Usage (standalone):
 *   <script src="skeleton-loader.js"></script>
 *   SkeletonLoader.init('#my-card')
 *
 * Usage (with Strata):
 *   Included in strata.components.js — available as Strata.skeleton.init()
 *   Do not load this file separately when using Strata.
 *
 * UMD — works as a browser global, CommonJS module, or AMD module.
 * When Strata is present on the page, registers as Strata.skeleton.
 * Otherwise registers as SkeletonLoader.
 */

;(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory)
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory()
  } else {
    if (root.Strata) {
      root.Strata.skeleton = factory()
    } else {
      root.SkeletonLoader = factory()
    }
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  // ─── Element type sets ─────────────────────────────────────────────────

  const CONTENT_TAGS = new Set([
    'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'SPAN', 'A', 'LABEL', 'STRONG', 'EM', 'SMALL',
    'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT',
    'LI', 'DT', 'DD', 'BLOCKQUOTE', 'FIGCAPTION'
  ])

  const REPLACED_TAGS = new Set([
    'IMG', 'VIDEO', 'IFRAME', 'PICTURE', 'CANVAS', 'SVG'
  ])

  const STRUCTURAL_TAGS = new Set([
    'DIV', 'SECTION', 'ARTICLE', 'MAIN', 'ASIDE',
    'HEADER', 'FOOTER', 'NAV', 'UL', 'OL', 'DL',
    'FIGURE', 'FORM', 'FIELDSET'
  ])

  const IGNORE_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK',
    'HEAD', 'HTML', 'BODY', 'BR', 'HR', 'WBR'
  ])

  // ─── Registry ──────────────────────────────────────────────────────────

  const registry = new Map()

  // ─── Smart Detection ───────────────────────────────────────────────────

  function hasDirectText(el) {
    return Array.from(el.childNodes).some(
      node => node.nodeType === Node.TEXT_NODE
           && node.textContent.trim().length > 0
    )
  }

  function hasOnlyReplacedChildren(el) {
    const meaningful = Array.from(el.children).filter(
      c => !IGNORE_TAGS.has(c.tagName)
    )
    return meaningful.length > 0
        && meaningful.every(c => REPLACED_TAGS.has(c.tagName))
  }

  function detectLeaves(parent) {
    const leaves = []

    function walk(el) {
      if (el.getAttribute('data-st-skeleton') === 'false') return
      if (el !== parent && el.getAttribute('data-st-skeleton') === 'null') return
      if (IGNORE_TAGS.has(el.tagName)) return

      const tag = el.tagName

      if (CONTENT_TAGS.has(tag)) {
        leaves.push(el)
        return
      }

      if (REPLACED_TAGS.has(tag)) return

      if (STRUCTURAL_TAGS.has(tag)) {
        if (hasOnlyReplacedChildren(el)) {
          leaves.push(el)
          return
        }
        if (hasDirectText(el)) {
          leaves.push(el)
          return
        }
        Array.from(el.children).forEach(child => walk(child))
        return
      }

      Array.from(el.children).forEach(child => walk(child))
    }

    Array.from(parent.children).forEach(child => walk(child))
    return leaves
  }

  // ─── Core ──────────────────────────────────────────────────────────────

  function manage(parent, options = {}) {
    if (!parent || registry.has(parent)) return
    const leaves = detectLeaves(parent)
    registry.set(parent, { leaves, options })
    parent.setAttribute('data-st-skeleton', 'null')
    leaves.forEach(leaf => leaf.setAttribute('data-st-skeleton', 'true'))
  }

  function show(selector) {
    resolveTargets(selector).forEach(parent => {
      const entry = registry.get(parent)
      if (!entry) return
      parent.setAttribute('data-st-skeleton', 'null')
      entry.leaves.forEach(leaf => leaf.setAttribute('data-st-skeleton', 'true'))
    })
  }

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

  function toggle(selector) {
    resolveTargets(selector).forEach(parent => {
      const val = parent.getAttribute('data-st-skeleton')
      val === 'false' ? show(parent) : reveal(parent)
    })
  }

  function revealAt(selector, index) {
    const targets = resolveTargets(selector)
    const parent  = targets[index]
    if (parent) reveal(parent)
  }

  function isSkeleton(el) {
    const val = el.getAttribute('data-st-skeleton')
    return val === 'true' || val === 'null'
  }

  // ─── Init ──────────────────────────────────────────────────────────────

  function init(selector, options = {}) {
    let parents

    if (!selector) {
      parents = Array.from(
        document.querySelectorAll('[data-st-skeleton="true"]')
      ).filter(el => !el.parentElement.closest('[data-st-skeleton]'))
    } else {
      parents = resolveRaw(selector)
      parents.forEach(parent => {
        if (!parent.hasAttribute('data-st-skeleton')) {
          parent.setAttribute('data-st-skeleton', 'true')
        }
      })
    }

    parents.forEach(parent => manage(parent, options))
    return api
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

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

  // ─── Public API ────────────────────────────────────────────────────────

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

  return api
}))
