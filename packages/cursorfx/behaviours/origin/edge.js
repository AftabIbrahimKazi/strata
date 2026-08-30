/**
 * CursorFX origin — edge
 * Born on the border of the hovered target, fired outward.
 *
 * The point is picked uniformly by perimeter rather than by choosing a side at
 * random: on a wide button, per-side picking puts as many particles on the 40px
 * ends as on the 400px top, and the ends visibly crowd.
 *
 * Falls back to the pointer when no rect is available, so a recipe using this
 * on hover still behaves if it is ever emitted outside a hover.
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
    name: 'edge',
    axis: 'origin',

    seed: function (p, c, o) {
      var r = c.rect
      var x, y, a

      if (!r) {
        x = c.x; y = c.y; a = Math.random() * 6.283185307
      } else {
        var per = (r.width + r.height) * 2
        var d   = Math.random() * per
        if (d < r.width)                     { x = r.left + d;  y = r.top;    a = -Math.PI / 2 }
        else if ((d -= r.width) < r.height)  { x = r.right;     y = r.top + d; a = 0 }
        else if ((d -= r.height) < r.width)  { x = r.right - d; y = r.bottom; a = Math.PI / 2 }
        else                                 { x = r.left;      y = r.top + (d - r.width); a = Math.PI }
      }

      var spread = o.spread || 0
      a += (Math.random() - 0.5) * spread
      var v = (o.drift || 0)

      p.x = x
      p.y = y
      p.vx = Math.cos(a) * v
      p.vy = Math.sin(a) * v
      p.heading = a
    }
  }
}))
