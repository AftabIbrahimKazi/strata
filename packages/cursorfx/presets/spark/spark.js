/**
 * Strata CursorFX — Spark preset
 * Canvas. Short electric streaks thrown off the pointer, off clicks, and off
 * the edges of hover targets.
 *
 *   <body data-st-cursorfx="spark" data-st-cfx-spark-color="#82c8ff #ffd682">
 *
 * A recipe, and the one that shows why triggers are not the axis to organise
 * behaviours around: Spark emits on three of them, through a different origin
 * each time — the pointer while moving, a ring on click, the target's border
 * on hover — while sharing one motion and one render.
 *
 * Requires: particles.js, behaviours/origin/{pointer,ring,edge},
 *           behaviours/motion/ballistic, behaviours/render/segment
 *
 * Methods: setColor(css), burst(x, y)
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
    name: 'Spark',
    key:  'spark',

    motion: 'ballistic',
    render: 'segment',

    emit: {
      // Probabilistic on speed: a slow drift stays quiet, a fast sweep fires.
      move:  { origin: 'pointer', mode: 'chance' },
      click: { origin: 'ring', count: 'burst' },
      hover: { origin: 'edge' }
    },

    defaults: {
      color:     '#82c8ff',
      count:     1,      // streaks per qualifying pointer move
      burst:     14,     // streaks per click
      length:    14,     // px, before per-particle variation
      segments:  4,      // jag detail; 2 is a straight line
      jitter:    7,      // px of lateral displacement at mid-streak
      width:     1.4,    // px stroke at the head
      taper:     true,   // thin the stroke toward the tail
      life:      0.32,   // seconds
      lifeVary:  0.35,
      drift:     26,     // px/s of travel after birth
      push:      26,     // px/s along the pointer heading
      trail:     true,   // fire opposite the direction of travel
      spread:    2.4,    // radians of angular scatter around the heading
      scatter:   0.5,    // radians of jitter on click headings
      velocity:  26,     // px/s at birth, on click
      speedGate: 34,     // px/frame of pointer speed for a certain emission
      dragBoost: 2,      // emission multiplier while the pointer is down
      glow:      6,      // px shadow blur; 0 is noticeably cheaper
      hoverRate: 90,     // ms between streaks off a hovered target's edge
      hoverOrigin: 'edge'  // 'edge' | 'pointer'
    },

    methods: {
      burst: function (x, y, inst) {
        P.emit(inst, 'click', inst.options.burst, x, y)
      }
    }
  })
}))
