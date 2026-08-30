/**
 * CursorFX render — dot
 * A flat filled circle, shrinking and fading with age.
 *
 * Colour is sampled per frame from the recipe's stops at the particle's own
 * age, so a multi-stop value lays out along the effect: the newest particles
 * sit at stop 0 and shade toward the last stop as they fall behind. Fixing a
 * colour at birth instead gives a scatter of mixed colours, not a gradient.
 */
;(function (root, factory) {
  var def = factory()
  if (typeof module === 'object' && module.exports) {
    module.exports = def
    // Node: register with the pipeline directly. The browser branch below
    // relies on load order instead, which is why particles.js must be on the
    // page before any behaviour file.
    try { require('../../particles.js').behaviour(def.axis, def) } catch (e) {}
  } else {
    var P = (root.Strata && root.Strata.CursorFX && root.Strata.CursorFX.particles) ||
            root.StrataCursorFXParticles
    if (P) P.behaviour('render', def)
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  var TAU = 6.283185307

  return {
    name: 'dot',
    axis: 'render',

    draw: function (ctx, p, age, dt, o, scope, inst) {
      var t = 1 - age
      var r = (o.shrink === false ? p.size : p.size * t) * 0.5
      if (r <= 0) return

      // Two ways to read a multi-stop colour, and they look completely
      // different: 'age' lays the gradient along time, so a trail shades from
      // head to tail; 'birth' lays it across the emission, so a burst fans
      // between its stops instead of flickering between them.
      var c = inst.engine.colors.at(inst.local.stops,
                o.colorBy === 'birth' ? p.seedT : age)

      ctx.globalAlpha = t
      ctx.fillStyle   = 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, TAU)
      ctx.fill()
    }
  }
}))
