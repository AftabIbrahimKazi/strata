/*!
 * Strata Modal Component
 *
 * Usage:
 *   Trigger:  <button data-st-toggle="modal" data-st-target="#myModal">Open</button>
 *   Dismiss:  <button data-st-dismiss="modal">Close</button>
 *   Static:   <div class="modal" data-st-backdrop="static" ...>
 *   API:      Strata.Modal.open('#myModal')  /  Strata.Modal.close()
 *
 * Events fired on document:
 *   st:modal:open   — detail: { modal }
 *   st:modal:close  — detail: { modal }
 */
;(function (win, doc) {
  'use strict'

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

  function lockScroll() {
    var sbw = win.innerWidth - doc.documentElement.clientWidth
    doc.body.style.setProperty('--st-scrollbar-width', sbw + 'px')
    doc.body.classList.add('modal-open')
  }

  function unlockScroll() {
    doc.body.classList.remove('modal-open')
    doc.body.style.removeProperty('--st-scrollbar-width')
  }

  function openModal(modal) {
    if (currentModal === modal) return
    if (currentModal) closeModal()

    currentModal = modal
    modal.setAttribute('data-st-visible', 'true')
    modal.removeAttribute('aria-hidden')
    modal.setAttribute('aria-modal', 'true')

    var bd = ensureBackdrop()
    void bd.offsetHeight  // force reflow so transition plays
    bd.setAttribute('data-st-visible', 'true')

    lockScroll()

    var focusTarget = modal.querySelector('[autofocus]') ||
                      modal.querySelector('.modal-content')
    if (focusTarget) setTimeout(function() { focusTarget.focus() }, 50)

    doc.dispatchEvent(new CustomEvent('st:modal:open', { detail: { modal: modal } }))
  }

  function closeModal() {
    if (!currentModal) return

    var modal    = currentModal
    currentModal = null

    modal.setAttribute('data-st-visible', 'false')
    modal.setAttribute('aria-hidden', 'true')
    modal.removeAttribute('aria-modal')

    if (backdrop) backdrop.setAttribute('data-st-visible', 'false')

    unlockScroll()

    doc.dispatchEvent(new CustomEvent('st:modal:close', { detail: { modal: modal } }))
  }

  doc.addEventListener('click', function(e) {
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
        currentModal.classList.add('modal-static')
        var m = currentModal
        setTimeout(function() { m.classList.remove('modal-static') }, 300)
      } else {
        closeModal()
      }
    }
  })

  doc.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && currentModal) {
      var isStatic = currentModal.getAttribute('data-st-backdrop') === 'static'
      if (!isStatic) closeModal()
    }
  })

  win.Strata = win.Strata || {}
  win.Strata.Modal = {
    open:  function(selector) {
      var el = typeof selector === 'string' ? doc.querySelector(selector) : selector
      if (el) openModal(el)
    },
    close: closeModal
  }

}(window, document))
