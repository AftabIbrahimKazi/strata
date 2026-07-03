/**
 * Strata Offcanvas
 * Version: 1.0.0
 *
 * Markup — developer sets both attributes in HTML:
 *   data-st-side  : "left"|"right"|"top"|"bottom"  — direction, JS never changes this
 *   aria-hidden   : "true"|"false"                  — initial state, JS only updates the value
 *
 *   <div class="offcanvas" data-st-side="right" aria-hidden="true">   <!-- starts closed -->
 *   <div class="offcanvas" data-st-side="right" aria-hidden="false">  <!-- starts open   -->
 *
 * Trigger:  <button data-st-toggle="offcanvas" data-st-target="#myDrawer">Open</button>
 * Dismiss:  <button data-st-dismiss="offcanvas">Close</button>
 * Static:   add data-st-backdrop="static" to the .offcanvas element
 *
 * Events fired on document:
 *   st:offcanvas:open   — detail: { offcanvas }
 *   st:offcanvas:close  — detail: { offcanvas }
 *
 * UMD — works as a browser global, CommonJS module, or AMD module.
 * When Strata is present on the page, registers as Strata.Offcanvas.
 * Otherwise registers as StrataOffcanvas.
 */

;(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory)
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory()
  } else {
    if (root.Strata) {
      root.Strata.Offcanvas = factory()
    } else {
      root.StrataOffcanvas = factory()
    }
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  var doc = typeof document !== 'undefined' ? document : {}

  var currentOffcanvas = null
  var backdrop         = null

  function ensureBackdrop() {
    if (!backdrop) {
      backdrop = doc.createElement('div')
      backdrop.className = 'offcanvas-backdrop'
      doc.body.appendChild(backdrop)
    }
    return backdrop
  }

  function openOffcanvas(offcanvas) {
    if (currentOffcanvas === offcanvas) return
    if (currentOffcanvas) closeOffcanvas()

    currentOffcanvas = offcanvas
    offcanvas.setAttribute('aria-hidden', 'false')
    offcanvas.setAttribute('aria-modal',  'true')

    ensureBackdrop()

    var focusTarget = offcanvas.querySelector('[autofocus]') ||
                      offcanvas.querySelector('.offcanvas-body')
    if (focusTarget) setTimeout(function () { focusTarget.focus() }, 50)

    doc.dispatchEvent(new CustomEvent('st:offcanvas:open', { detail: { offcanvas: offcanvas } }))
  }

  function closeOffcanvas() {
    if (!currentOffcanvas) return

    var offcanvas    = currentOffcanvas
    currentOffcanvas = null

    offcanvas.setAttribute('aria-hidden', 'true')
    offcanvas.setAttribute('aria-modal',  'false')

    doc.dispatchEvent(new CustomEvent('st:offcanvas:close', { detail: { offcanvas: offcanvas } }))
  }

  doc.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-st-toggle="offcanvas"]')
    if (trigger) {
      var sel = trigger.getAttribute('data-st-target') || trigger.getAttribute('href')
      if (sel) {
        var target = doc.querySelector(sel)
        if (target) openOffcanvas(target)
      }
      return
    }

    if (e.target.closest('[data-st-dismiss="offcanvas"]')) {
      closeOffcanvas()
      return
    }

    if (currentOffcanvas && e.target === backdrop) {
      var isStatic = currentOffcanvas.getAttribute('data-st-backdrop') === 'static'
      if (!isStatic) closeOffcanvas()
    }
  })

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && currentOffcanvas) {
      var isStatic = currentOffcanvas.getAttribute('data-st-backdrop') === 'static'
      if (!isStatic) closeOffcanvas()
    }
  })

  // On load — set safe defaults only if attributes are missing, then read hardcoded state
  function init() {
    var drawers = doc.querySelectorAll('.offcanvas')
    for (var i = 0; i < drawers.length; i++) {
      if (!drawers[i].hasAttribute('aria-hidden')) drawers[i].setAttribute('aria-hidden', 'true')
      if (!drawers[i].hasAttribute('aria-modal'))  drawers[i].setAttribute('aria-modal',  'false')
    }

    var openOnLoad = doc.querySelector('.offcanvas[aria-hidden="false"]')
    if (openOnLoad) {
      currentOffcanvas = openOnLoad
      ensureBackdrop()
    }
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  return {
    open: function (selector) {
      var el = typeof selector === 'string' ? doc.querySelector(selector) : selector
      if (el) openOffcanvas(el)
    },
    close: closeOffcanvas
  }
}))
