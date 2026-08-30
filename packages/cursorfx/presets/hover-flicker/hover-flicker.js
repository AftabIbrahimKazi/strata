/**
 * Strata CursorFX — HoverFlicker preset
 * DOM. Hovered targets flicker like failing neon.
 *
 *   CursorFX.mount(CursorFX.presets.HoverFlicker, { color: '#ff2d55' })
 *
 * The lightest preset in the package: JS toggles one attribute, the whole
 * animation is a CSS keyframe. No RAF participation at all.
 *
 * Requires cursorfx.css and hover-flicker.css.
 *
 * Methods on the returned instance: setColor(css), setSpeed(ms)
 */

;(function (root, factory) {
  var preset = factory()
  if (typeof define === 'function' && define.amd) {
    define([], function () { return preset })
  } else if (typeof module === 'object' && module.exports) {
    module.exports = preset
  } else {
    var fx = (root.Strata && root.Strata.CursorFX) || root.StrataCursorFX
    if (fx) fx.presets[preset.name] = preset
    else (root.StrataCursorFXPresets = root.StrataCursorFXPresets || {})[preset.name] = preset
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  var doc = typeof document !== 'undefined' ? document : null

  // Flip to "false" on leave so the attribute keeps describing state; only a
  // full dispose removes it.
  function rest(el) {
    if (el) el.setAttribute('data-st-cfx-flicker', 'false')
  }

  function clear(el) {
    if (!el) return
    el.removeAttribute('data-st-cfx-flicker')
    el.style.removeProperty('--st-cfx-flicker-color')
    el.style.removeProperty('--st-cfx-flicker-duration')
  }

  return {
    name: 'HoverFlicker',
    type: 'dom',
    key:  'hover-flicker',

    defaults: {
      color:    '#ff2d55',   // glow colour
      duration: 900          // ms per flicker cycle
    },

    onHoverEnter: function (el, inst) {
      inst.local.el = el
      el.style.setProperty('--st-cfx-flicker-color', inst.options.color)
      el.style.setProperty('--st-cfx-flicker-duration', inst.options.duration + 'ms')
      el.setAttribute('data-st-cfx-flicker', 'true')
    },

    onHoverLeave: function (el, inst) {
      rest(el)
      inst.local.el = null
    },

    dispose: function (inst) {
      // See magnetic.js: sweep by attribute so elements left behind earlier in
      // the session are cleaned too, not just the one under the pointer.
      if (doc) {
        var els = doc.querySelectorAll('[data-st-cfx-flicker]')
        for (var i = 0; i < els.length; i++) clear(els[i])
      }
      inst.local = {}
    },

    methods: {
      setColor: function (css, inst) { inst.options.color = css },
      setSpeed: function (ms,  inst) { inst.options.duration = ms }
    }
  }
}))
