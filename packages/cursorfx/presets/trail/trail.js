/**
 * Strata CursorFX — Trail preset
 * Canvas. Fading particles along the pointer path.
 *
 *   <body data-st-cursorfx="trail" data-st-cfx-trail-color="#ff2d55">
 *
 * A recipe: pointer origin, ballistic motion, dot render. The loop, the
 * emission and the colour handling all live in particles.js — this file is the
 * choice of behaviours and the numbers that make it Trail rather than
 * something else.
 *
 * Requires: particles.js, behaviours/origin/pointer, behaviours/motion/ballistic,
 *           behaviours/render/dot
 *
 * Methods: setColor(css), setParticleCount(n)
 */

;(function (root, factory) {
  var P = (typeof module === 'object' && module.exports)
        ? require('../../particles.js')
        : ((root.Strata && root.Strata.CursorFX && root.Strata.CursorFX.particles) ||
           root.StrataCursorFXParticles)

  var preset = factory(P)
  if (typeof define === 'function' && define.amd) {
    define([], function () { return preset })
  } else if (typeof module === 'object' && module.exports) {
    module.exports = preset
  } else {
    var fx = (root.Strata && root.Strata.CursorFX) || root.StrataCursorFX
    if (fx) fx.presets[preset.name] = preset
    else (root.StrataCursorFXPresets = root.StrataCursorFXPresets || {})[preset.name] = preset
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (P) {
  'use strict'

  return P.recipe({
    name: 'Trail',
    key:  'trail',

    motion: 'ballistic',
    render: 'dot',

    // One fixed handful per pointer move, regardless of speed — a trail that
    // thinned out when you moved slowly would read as a fault.
    emit: { move: { origin: 'pointer', mode: 'fixed' } },

    defaults: {
      color:      '#ffffff',
      count:      3,      // particles emitted per pointer move
      size:       6,      // px, at birth
      life:       0.6,    // seconds
      lifeVary:   0.4,    // 60–100% of `life`
      spread:     0.6,    // random velocity, px/frame-ish
      gravity:    0,      // px/s²; positive falls
      drag:       0,
      shrink:     true,
      hoverBoost: 3       // count multiplier while over a hover target
    },

    methods: {
      setParticleCount: function (n, inst) {
        inst.options.count = Math.max(0, n | 0)
      }
    }
  })
}))
