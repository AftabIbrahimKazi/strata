/**
 * Strata Modal
 * Version: 1.0.0
 *
 * Usage (standalone):
 *   <script src="modal.js"></script>
 *   StrataModal.open('#myModal')  /  StrataModal.close()
 *
 * Usage (with Strata):
 *   Included in strata.components.js — available as Strata.Modal.open() / Strata.Modal.close()
 *   Do not load this file separately when using Strata.
 *
 * Trigger:  <button data-st-toggle="modal" data-st-target="#myModal">Open</button>
 * Dismiss:  <button data-st-dismiss="modal">Close</button>
 * Static:   <div class="modal" data-st-backdrop="static" ...>
 *
 * Events fired on document:
 *   st:modal:open   — detail: { modal }
 *   st:modal:close  — detail: { modal }
 *
 * UMD — works as a browser global, CommonJS module, or AMD module.
 * When Strata is present on the page, registers as Strata.Modal.
 * Otherwise registers as StrataModal.
 */

;(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory)
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory()
  } else {
    if (root.Strata) {
      root.Strata.Modal = factory()
    } else {
      root.StrataModal = factory()
    }
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  var win = typeof window !== 'undefined' ? window : {}
  var doc = typeof document !== 'undefined' ? document : {}

  var currentModal = null
  var backdrop     = null

  function ensureBackdrop() {
    if (!backdrop) {
      backdrop = doc.createElement('div')
      backdrop.className = 'modal-backdrop'
      doc.body.appendChild(backdrop)
    }
    return backdrop
  }

  function openModal(modal) {
    if (currentModal === modal) return
    if (currentModal) closeModal()

    currentModal = modal
    modal.setAttribute('data-st-visible', 'true')
    modal.setAttribute('aria-hidden', 'false')
    modal.setAttribute('aria-modal', 'true')

    var bd = ensureBackdrop()
    void bd.offsetHeight
    bd.setAttribute('data-st-visible', 'true')

    var focusTarget = modal.querySelector('[autofocus]') ||
                      modal.querySelector('.modal-content')
    if (focusTarget) setTimeout(function () { focusTarget.focus() }, 50)

    doc.dispatchEvent(new CustomEvent('st:modal:open', { detail: { modal: modal } }))
  }

  function closeModal() {
    if (!currentModal) return

    var modal    = currentModal
    currentModal = null

    modal.setAttribute('data-st-visible', 'false')
    modal.setAttribute('aria-hidden', 'true')
    modal.setAttribute('aria-modal', 'false')

    if (backdrop) backdrop.setAttribute('data-st-visible', 'false')

    doc.dispatchEvent(new CustomEvent('st:modal:close', { detail: { modal: modal } }))
  }

  doc.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-st-toggle="modal"]')
    if (trigger) {
      var sel = trigger.getAttribute('data-st-target') || trigger.getAttribute('href')
      if (sel) {
        var target = doc.querySelector(sel)
        if (target) openModal(target)
      }
      return
    }

    if (e.target.closest('[data-st-dismiss="modal"]')) {
      closeModal()
      return
    }

    if (currentModal && e.target === currentModal) {
      var isStatic = currentModal.getAttribute('data-st-backdrop') === 'static'
      if (isStatic) {
        currentModal.setAttribute('data-st-shake', 'true')
        var m = currentModal
        setTimeout(function () { m.setAttribute('data-st-shake', 'false') }, 300)
      } else {
        closeModal()
      }
    }
  })

  if (typeof doc.readyState === 'string') {
    var initDefaults = function () {
      doc.querySelectorAll('.modal').forEach(function (el) {
        if (!el.hasAttribute('aria-hidden')) el.setAttribute('aria-hidden', 'true')
        if (!el.hasAttribute('aria-modal'))  el.setAttribute('aria-modal', 'false')
      })
    }
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', initDefaults)
    } else {
      initDefaults()
    }
  }

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && currentModal) {
      var isStatic = currentModal.getAttribute('data-st-backdrop') === 'static'
      if (!isStatic) closeModal()
    }
  })

  return {
    open: function (selector) {
      var el = typeof selector === 'string' ? doc.querySelector(selector) : selector
      if (el) openModal(el)
    },
    close: closeModal
  }
}))
