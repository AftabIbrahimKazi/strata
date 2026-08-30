/**
 * CursorFX origin — ring
 * Born at a point, fired outward on evenly spaced headings. Even spacing
 * rather than random angles is what makes a click read as a burst instead of
 * a clump: random headings cluster, and the gaps are visible.
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
    if (P) P.behaviour('origin', def)
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  var TAU = 6.283185307

  return {
    name: 'ring',
    axis: 'origin',

    seed: function (p, c, o, scope, i, n) {
      var a = (i / n) * TAU + (Math.random() - 0.5) * (o.scatter || 0)
      var v = (o.velocity || 0) * (0.6 + Math.random() * 0.6)
      p.x  = c.x
      p.y  = c.y
      p.vx = Math.cos(a) * v
      p.vy = Math.sin(a) * v
      p.heading = a
    }
  }
}))
