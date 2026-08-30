/**
 * Strata CursorFX — Magnetic preset
 * DOM. Hover targets lean toward the pointer.
 *
 *   CursorFX.mount(CursorFX.presets.Magnetic, { strength: 0.35 })
 *
 * The JS writes two custom properties and nothing else — every transition,
 * easing and transform lives in magnetic.css. This is the "lean JS, CSS does
 * the heavy lifting" half of the package: no RAF work, no layout reads per
 * frame, and the effect degrades to nothing if the CSS is not loaded.
 *
 * Requires cursorfx.css and magnetic.css.
 *
 * Methods on the returned instance: setStrength(n)
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

  // State is expressed by flipping the value, never by removing the attribute:
  // the element must stay selectable on the way out or its return-to-rest
  // transition has no rule to hang on.
  function rest(el) {
    if (!el) return
    el.style.removeProperty('--st-cfx-mx')
    el.style.removeProperty('--st-cfx-my')
    el.setAttribute('data-st-cfx-magnetic', 'false')
  }

  function clear(el) {
    if (!el) return
    el.style.removeProperty('--st-cfx-mx')
    el.style.removeProperty('--st-cfx-my')
    el.style.removeProperty('--st-cfx-scale')
    el.removeAttribute('data-st-cfx-magnetic')
  }

  return {
    name: 'Magnetic',
    type: 'dom',
    key:  'magnetic',

    defaults: {
      strength: 0.3,    // 0 = inert, 1 = element centre pins to the pointer
      max:      24,     // px — displacement ceiling, whatever the strength
      scale:    1.04    // hover scale; read by CSS as --st-cfx-scale
    },

    onHoverEnter: function (el, inst) {
      inst.local.el = el
      el.setAttribute('data-st-cfx-magnetic', 'true')
      el.style.setProperty('--st-cfx-scale', inst.options.scale)
      // rect measured once per hover, not per move
      inst.local.rect = el.getBoundingClientRect()
    },

    onHoverLeave: function (el, inst) {
      rest(el)
      inst.local.el = null
      inst.local.rect = null
    },

    onMove: function (x, y, inst) {
      var el = inst.local.el
      var r  = inst.local.rect
      if (!el || !r) return

      var o  = inst.options
      var dx = (x - (r.left + r.width  / 2)) * o.strength
      var dy = (y - (r.top  + r.height / 2)) * o.strength

      if (dx >  o.max) dx =  o.max
      if (dx < -o.max) dx = -o.max
      if (dy >  o.max) dy =  o.max
      if (dy < -o.max) dy = -o.max

      el.style.setProperty('--st-cfx-mx', dx.toFixed(2) + 'px')
      el.style.setProperty('--st-cfx-my', dy.toFixed(2) + 'px')
    },

    dispose: function (inst) {
      // Sweep by attribute rather than clearing only the current target: once
      // the pointer has left an element, inst.local.el is null, so anything
      // touched earlier in the session would otherwise keep its "false" state
      // forever. destroy() promises no residue.
      if (doc) {
        var els = doc.querySelectorAll('[data-st-cfx-magnetic]')
        for (var i = 0; i < els.length; i++) clear(els[i])
      }
      inst.local = {}
    },

    methods: {
      setStrength: function (n, inst) { inst.options.strength = n }
    }
  }
}))
