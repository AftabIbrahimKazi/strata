/**
 * CursorFX render — segment
 * A jagged filament pointing along the particle's heading, tapering and fading
 * toward its tail.
 *
 * The shape is generated once, when the particle is born, and then held still
 * while it fades. Regenerating the jag every frame — the obvious way to write
 * this — makes each streak vibrate, and a field of vibrating streaks reads as
 * static rather than as electricity. This is the single easiest way to ruin
 * the effect, and a test pins it.
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

  return {
    name: 'segment',
    axis: 'render',

    init: function (inst, scope) {
      scope.jag = scope.slots(null)
      scope.rgb = scope.slots('')
    },

    spawn: function (p, o, scope, stops) {
      var segs = o.segments || 4
      var jag  = scope.jag[p._i]
      if (!jag || jag.length < segs) jag = scope.jag[p._i] = new Array(segs)

      // sin(t·π) anchors both ends at zero, so the kink lands mid-streak
      // instead of hooking off the origin.
      for (var i = 1; i < segs; i++) {
        var t = i / segs
        jag[i] = (Math.random() - 0.5) * (o.jitter || 0) * Math.sin(t * Math.PI)
      }

      // A streak takes one colour for its whole length — it is a single spark,
      // not a gradient — so the stop is picked once, at birth.
      var c = stops ? this.pick(stops) : [255, 255, 255]
      scope.rgb[p._i] = 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'

      p.size = (o.length || 14) * (0.7 + Math.random() * 0.6)
    },

    // Held separately so the stop choice is overridable without touching spawn.
    pick: function (stops) {
      var t = Math.random()
      var i = Math.min(stops.length - 1, Math.floor(t * stops.length))
      return stops[i]
    },

    begin: function (ctx, o) {
      ctx.lineCap  = 'round'
      ctx.lineJoin = 'round'
      if (o.glow) ctx.shadowBlur = o.glow
    },

    draw: function (ctx, p, age, dt, o, scope) {
      var t     = 1 - age
      var alpha = t * t                       // fade fast, linger short
      var segs  = o.segments || 4
      var jag   = scope.jag[p._i]
      var rgb   = scope.rgb[p._i]
      if (!jag) return

      var ex = p.x + Math.cos(p.heading) * p.size
      var ey = p.y + Math.sin(p.heading) * p.size
      var nx = -(ey - p.y)
      var ny =  (ex - p.x)
      var nl = Math.sqrt(nx * nx + ny * ny) || 1
      nx /= nl; ny /= nl

      ctx.strokeStyle = rgb
      if (o.glow) ctx.shadowColor = rgb

      // Stroked segment by segment so the streak can taper: a single path can
      // only carry one lineWidth.
      var px = p.x, py = p.y
      for (var i = 1; i <= segs; i++) {
        var f   = i / segs
        var off = i < segs ? (jag[i] || 0) : 0
        var qx  = p.x + (ex - p.x) * f + nx * off
        var qy  = p.y + (ey - p.y) * f + ny * off

        ctx.globalAlpha = alpha * (1 - f * 0.35)
        ctx.lineWidth   = o.taper === false ? o.width : o.width * (1 - f * 0.7)
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(qx, qy)
        ctx.stroke()

        px = qx; py = qy
      }
    }
  }
}))
