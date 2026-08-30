/**
 * Strata CursorFX — Smoke preset
 * Canvas. Soft volumetric smoke that curls off the pointer path.
 *
 *   <body data-st-cursorfx="smoke" data-st-cfx-smoke-color="#35d0a2">
 *
 * A recipe: pointer origin, curl motion, puff render. Why each of those was
 * chosen is documented in the behaviour files — briefly: a curl field rather
 * than ballistic travel is what makes neighbouring particles swirl coherently
 * instead of each wobbling on its own axis, and additive radial gradients are
 * what make overlaps accumulate into volume instead of stacking as discs.
 *
 * Requires: particles.js, behaviours/origin/pointer, behaviours/motion/curl,
 *           behaviours/render/puff
 *
 * Methods: setColor(css), puff(x, y, n)
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
    name: 'Smoke',
    key:  'smoke',

    motion: 'curl',
    render: 'puff',

    // One puff per `rate` px travelled, capped at `count`: emission tracks the
    // distance the hand actually moved, so a slow drag leaves a thin wisp and
    // a fast sweep leaves a plume.
    emit: { move: { origin: 'pointer', mode: 'distance' } },

    defaults: {
      color:      '#ffffff',
      count:      14,     // ceiling on puffs emitted per pointer move
      rate:       2,      // px of pointer travel per puff
      size:       7,      // px radius at birth
      sizeBoost:  10,     // extra birth radius at full pointer speed
      sizeVary:   0.5,    // 50–100% of the computed radius
      grow:       13,     // px/s the radius expands over the puff's life
      life:       1.1,    // seconds
      lifeVary:   0.4,
      opacity:    0.09,   // peak alpha of a single puff; they accumulate
      jitter:     16,     // px of spawn scatter around the pointer
      push:       36,     // px/s of birth velocity along the pointer heading
      damping:    0.9,    // per-frame velocity decay; lower hands over sooner
      curl:       42,     // px/s of curl-field travel
      curlScale:  0.006,  // field frequency; higher is tighter, busier swirl
      curlSpeed:  0.9,    // how fast the field itself evolves
      speedGate:  30,     // px/frame of pointer speed treated as "fast"
      minSpeed:   0.25,   // px/frame below which nothing is emitted
      additive:   true,   // 'lighter' compositing; false for opaque smoke
      hoverBoost: 1.6     // emission multiplier while over a hover target
    },

    methods: {
      puff: function (x, y, n, inst) {
        P.emit(inst, 'move', n || inst.options.count, x, y)
      }
    }
  })
}))
