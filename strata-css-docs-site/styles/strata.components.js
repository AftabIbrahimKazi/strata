/*! Strata Components — built 2026-09-20 */
;(function(g){g.Strata=g.Strata||{}})(typeof globalThis!=='undefined'?globalThis:this);
;(function () {
 if (typeof document !== 'undefined') {
 document.documentElement.setAttribute('data-strata', '')
 }
})()
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
 var backdrop = null
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
 offcanvas.setAttribute('aria-modal', 'true')
 ensureBackdrop()
 var focusTarget = offcanvas.querySelector('[autofocus]') ||
 offcanvas.querySelector('.offcanvas-body')
 if (focusTarget) setTimeout(function () { focusTarget.focus() }, 50)
 doc.dispatchEvent(new CustomEvent('st:offcanvas:open', { detail: { offcanvas: offcanvas } }))
 }
 function closeOffcanvas() {
 if (!currentOffcanvas) return
 var offcanvas = currentOffcanvas
 currentOffcanvas = null
 offcanvas.setAttribute('aria-hidden', 'true')
 offcanvas.setAttribute('aria-modal', 'false')
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
 function init() {
 var drawers = doc.querySelectorAll('.offcanvas')
 for (var i = 0; i < drawers.length; i++) {
 if (!drawers[i].hasAttribute('aria-hidden')) drawers[i].setAttribute('aria-hidden', 'true')
 if (!drawers[i].hasAttribute('aria-modal')) drawers[i].setAttribute('aria-modal', 'false')
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