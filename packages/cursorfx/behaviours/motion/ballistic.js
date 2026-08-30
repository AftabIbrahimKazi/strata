/**
 * CursorFX motion — ballistic
 * Straight-line travel with optional gravity and drag. The plain case: what a
 * thrown particle does.
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
    if (P) P.behaviour('motion', def)
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  return {
    name: 'ballistic',
    axis: 'motion',

    step: function (p, dt, o) {
      if (o.drag) {
        // Exponential rather than a per-frame multiply, so the result does not
        // change with frame rate — a 144Hz display damped six times as hard as
        // a 24fps one under the naive form.
        var d = Math.exp(-o.drag * dt)
        p.vx *= d
        p.vy *= d
      }
      if (o.gravity) p.vy += o.gravity * dt

      p.x += p.vx * dt
      p.y += p.vy * dt
    }
  }
}))
