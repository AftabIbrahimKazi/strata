/**
 * CursorFX motion — curl
 * Travel steered by a curl field. The birth velocity is damped out within a
 * few frames, handing the particle over to the field.
 *
 * Why a field and not two sine waves: giving x and y their own independent
 * wave makes each particle orbit its own centre, which reads as a cloud of
 * blobs wobbling in place. Deriving a single rotation from one scalar field
 * means neighbouring particles inherit nearly the same heading and curl around
 * each other — which is what turbulence actually looks like.
 *
 * Not real Perlin curl noise. Two trig calls per particle per frame is the
 * budget available, and at these scales the difference does not read.
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
    name: 'curl',
    axis: 'motion',

    // Per-particle constants indexed by pool slot: the pool clears `data` on
    // acquire and release, and allocating per spawn would put back exactly the
    // garbage the pool exists to avoid.
    init: function (inst, scope) {
      scope.seed     = scope.slots(0)
      scope.strength = scope.slots(1)
    },

    spawn: function (p, o, scope) {
      scope.seed[p._i]     = Math.random() * 1000
      scope.strength[p._i] = (o.curl || 0) * (0.6 + Math.random() * 0.8)
    },

    step: function (p, dt, o, scope, L) {
      var damp = Math.pow(o.damping === undefined ? 0.9 : o.damping, dt * 60)
      p.vx *= damp
      p.vy *= damp

      var s     = scope.seed[p._i]
      var scale = o.curlScale || 0.006
      var n     = Math.sin((p.x + s) * scale + L.t) +
                  Math.cos((p.y + s) * scale * 1.3 - L.t * 0.7)
      var a     = n * Math.PI
      var cs    = scope.strength[p._i]

      p.x += (p.vx + Math.cos(a) * cs) * dt
      p.y += (p.vy + Math.sin(a) * cs) * dt
    }
  }
}))
