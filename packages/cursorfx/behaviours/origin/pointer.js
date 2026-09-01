/**
 * CursorFX origin — pointer
 * Born at the pointer, scattered by `jitter`, pushed along the direction of
 * travel. The default origin; a recipe naming none gets this.
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

  return {
    name: 'pointer',
    axis: 'origin',

    seed: function (p, c, o) {
      p.x = c.x + (Math.random() - 0.5) * (o.jitter || 0)
      p.y = c.y + (Math.random() - 0.5) * (o.jitter || 0)

      // `spread` means one of two things depending on whether the effect is
      // directional, because the two families genuinely want different units:
      //   with `push`  — radians of angular scatter around the heading
      //   without      — px/frame of random cartesian velocity
      if (o.push && c.speed > 0) {
        // Heading follows actual pointer motion, normalised so `push` is a
        // speed in px/s rather than something that scales with how fast the
        // pointer happened to be moving. `trail` fires it backwards, so the
        // particles fall behind the cursor instead of leading it.
        var dx = o.trail ? -c.dx : c.dx
        var dy = o.trail ? -c.dy : c.dy
        var a  = Math.atan2(dy, dx) + (Math.random() - 0.5) * (o.spread || 0)
        var v  = o.push * (0.5 + Math.random() * 0.4)
        p.vx = Math.cos(a) * v
        p.vy = Math.sin(a) * v
        p.heading = a
      } else {
        var s = (o.spread || 0) * 60
        p.vx = (Math.random() - 0.5) * s
        p.vy = (Math.random() - 0.5) * s
      }
    }
  }
}))
