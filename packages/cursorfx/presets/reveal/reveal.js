/**
 * Strata CursorFX — Reveal preset
 * DOM. The pointer opens a soft hole in the top layer, showing what is beneath.
 *
 *   <div data-st-cfx-target="reveal">
 *     <img src="after.jpg"  alt="">          <!-- revealed -->
 *     <img src="before.jpg" alt="">          <!-- last child is the top layer -->
 *   </div>
 *
 * Works for anything stackable, not just images — two button states, two type
 * treatments, two card faces. The container stacks its children in one grid
 * cell, so both layers size to the largest and no absolute positioning is
 * needed. The last element child is the one that gets masked.
 *
 * The JS writes the pointer position and nothing else; the mask, its softness
 * and its transitions are all CSS. Options set on an instance are written as
 * custom properties only when they differ from the defaults, so a theme can set
 * --st-cfx-reveal-* in a stylesheet and have it apply everywhere it was not
 * explicitly overridden.
 *
 * Requires cursorfx.js and reveal.css.
 *
 * Methods on the returned instance: setRadius(px), setOpacity(n), setInvert(bool)
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

  // Written only when the author changed the option. Leaving the property unset
  // lets a stylesheet's value win, which is what makes per-theme tuning work.
  function token(el, name, value, dflt, unit) {
    if (value === dflt) el.style.removeProperty(name)
    else el.style.setProperty(name, value + (unit || ''))
  }

  function applyTokens(el, inst) {
    var o = inst.options, d = inst.preset.defaults
    token(el, '--st-cfx-reveal-radius',  o.radius,  d.radius,  'px')
    token(el, '--st-cfx-reveal-feather', o.feather, d.feather, 'px')
    token(el, '--st-cfx-reveal-opacity', o.opacity, d.opacity)
    token(el, '--st-cfx-reveal-fade',    o.fade,    d.fade,    'ms')
    token(el, '--st-cfx-reveal-follow',  o.follow,  d.follow,  'ms')
    el.setAttribute('data-st-cfx-reveal-invert', o.invert ? 'true' : 'false')
  }

  function clear(el) {
    if (!el) return
    el.removeAttribute('data-st-cfx-reveal')
    el.removeAttribute('data-st-cfx-reveal-invert')
    var s = el.style
    s.removeProperty('--st-cfx-reveal-x')
    s.removeProperty('--st-cfx-reveal-y')
    s.removeProperty('--st-cfx-reveal-radius')
    s.removeProperty('--st-cfx-reveal-feather')
    s.removeProperty('--st-cfx-reveal-opacity')
    s.removeProperty('--st-cfx-reveal-fade')
    s.removeProperty('--st-cfx-reveal-follow')
  }

  return {
    name: 'Reveal',
    type: 'dom',
    key:  'reveal',

    defaults: {
      radius:  110,    // px — size of the fully revealed area
      feather: 60,     // px — soft edge beyond the radius; 0 is a hard circle
      opacity: 0,      // 0 fully reveals what is beneath; 1 hides it entirely
      fade:    220,    // ms — how fast the hole opens and closes
      follow:  90,     // ms — how closely the hole tracks the pointer; 0 is instant
      invert:  false,  // show the top layer only inside the circle instead
      anchor:  'pointer' // 'pointer' follows the cursor; anything else pins the
                         // hole where CSS puts it, via --st-cfx-reveal-x/y.
                         // Per element: data-st-cfx-reveal-anchor="fixed"
    },

    onHoverEnter: function (el, inst) {
      inst.local.el = el
      // An element may pin the hole instead of letting it follow the pointer —
      // useful where the reveal is a fixed detail of the design (a peeled
      // corner on a card) rather than a torch the reader carries around.
      // Anywhere but "pointer" means: leave x/y to CSS.
      inst.local.pinned =
        (el.getAttribute('data-st-cfx-reveal-anchor') || inst.options.anchor) !== 'pointer'
      // Measured once per hover, never per frame.
      inst.local.rect = el.getBoundingClientRect()
      applyTokens(el, inst)
      el.setAttribute('data-st-cfx-reveal', 'true')
    },

    onHoverLeave: function (el, inst) {
      // Flip rather than remove: the hole has to stay selectable to animate shut.
      el.setAttribute('data-st-cfx-reveal', 'false')
      inst.local.el = null
      inst.local.rect = null
      inst.local.pinned = false
    },

    onMove: function (x, y, inst) {
      var el = inst.local.el
      var r  = inst.local.rect
      if (!el || !r || inst.local.pinned) return
      // Element-local coordinates: the mask is positioned inside the element.
      el.style.setProperty('--st-cfx-reveal-x', (x - r.left).toFixed(1) + 'px')
      el.style.setProperty('--st-cfx-reveal-y', (y - r.top).toFixed(1) + 'px')
    },

    dispose: function (inst) {
      // Sweep by attribute: once the pointer has left, inst.local.el is null,
      // so anything touched earlier would keep its state otherwise.
      if (doc) {
        var els = doc.querySelectorAll('[data-st-cfx-reveal]')
        for (var i = 0; i < els.length; i++) clear(els[i])
      }
      inst.local = {}
    },

    methods: {
      setRadius: function (px, inst) {
        inst.options.radius = px
        if (inst.local.el) applyTokens(inst.local.el, inst)
      },
      setOpacity: function (n, inst) {
        inst.options.opacity = n
        if (inst.local.el) applyTokens(inst.local.el, inst)
      },
      setInvert: function (on, inst) {
        inst.options.invert = !!on
        if (inst.local.el) applyTokens(inst.local.el, inst)
      }
    }
  }
}))
