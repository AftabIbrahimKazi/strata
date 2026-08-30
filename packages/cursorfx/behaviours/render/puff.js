/**
 * CursorFX render — puff
 * A soft radial-gradient blob that expands as it ages, drawn additively so
 * overlapping puffs accumulate into volume rather than stacking as visible
 * discs. Flat fills are what make a smoke effect read as a cloud of dots.
 *
 * A multi-stop colour maps across the puff's own radius here — stop 0 is the
 * hot core, the last stop is the edge it dissolves into — rather than along
 * the effect's age the way `dot` uses it. Each render behaviour chooses.
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

  var TAU     = 6.283185307
  var HALF_PI = 1.570796327

  function rgb(c) { return (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) }

  return {
    name: 'puff',
    axis: 'render',

    // The gradient is the same shape for every puff — only radius and alpha
    // change — so the three sampled colours are resolved once per frame, not
    // once per particle per frame.
    begin: function (ctx, o, scope, inst) {
      var s = inst.local.stops
      scope.core = rgb(inst.engine.colors.at(s, 0))
      scope.mid  = rgb(inst.engine.colors.at(s, 0.6))
      scope.edge = rgb(inst.engine.colors.at(s, 1))
      if (o.additive !== false) ctx.globalCompositeOperation = 'lighter'
    },

    spawn: function (p, o) {
      p.a = (o.opacity || 0.09) * 0.55
    },

    draw: function (ctx, p, age, dt, o, scope) {
      p.size += (o.grow || 0) * dt

      // sin ease rather than a linear ramp: a puff holds most of its opacity
      // through its life and then drops away, so the cloud has a body instead
      // of being a uniform wash.
      var alpha = p.a * Math.sin((1 - age) * HALF_PI)
      if (alpha <= 0.001 || p.size <= 0) return

      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
      g.addColorStop(0,   'rgba(' + scope.core + ',' + alpha + ')')
      g.addColorStop(0.6, 'rgba(' + scope.mid  + ',' + (alpha * 0.5) + ')')
      g.addColorStop(1,   'rgba(' + scope.edge + ',0)')

      ctx.globalAlpha = 1
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, TAU)
      ctx.fill()
    }
  }
}))
