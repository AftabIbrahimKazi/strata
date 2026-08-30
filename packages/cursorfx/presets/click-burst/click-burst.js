/**
 * Strata CursorFX — ClickBurst preset
 * Canvas. Radial particle burst on click, with an optional shock ring.
 *
 *   <body data-st-cursorfx="click-burst" data-st-cfx-click-burst-ring="true">
 *
 * A recipe: ring origin, ballistic motion, dot render. The shock ring is the
 * one thing no behaviour covers — it is not a particle — so it stays here as
 * the recipe's own render pass, which runs after the pipeline's.
 *
 * Requires: particles.js, behaviours/origin/ring, behaviours/motion/ballistic,
 *           behaviours/render/dot
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

  var TAU = 6.283185307

  return P.recipe({
    name: 'ClickBurst',
    key:  'click-burst',

    motion: 'ballistic',
    render: 'dot',

    emit: { click: { origin: 'ring', count: 'count' } },

    defaults: {
      color:    '#ffffff',
      count:    24,     // particles per burst
      velocity: 260,    // px/s at birth
      scatter:  0.3,    // radians of jitter on each evenly spaced heading
      life:     0.7,    // seconds
      lifeVary: 0.3,
      size:     5,      // px
      sizeVary: 0.4,    // 60–100% of `size`
      gravity:  420,    // px/s²
      drag:     2.2,    // velocity damping per second
      shrink:   true,
      colorBy:  'birth', // fan the stops around the ring, not along time
      ring:     false    // also draw an expanding shock ring
    },

    onMount: function (inst) { inst.local.rings = [] },

    onClick: function (x, y, inst) {
      if (inst.options.ring) inst.local.rings.push({ x: x, y: y, t: 0 })
    },

    // Runs after the particle pipeline, inside its saved/restored canvas state.
    onRender: function (ctx, dt, inst) {
      var o = inst.options
      var rings = inst.local.rings
      if (!rings || !rings.length) return

      ctx.globalCompositeOperation = 'source-over'
      for (var i = rings.length - 1; i >= 0; i--) {
        var r = rings[i]
        r.t += dt
        var k = r.t / o.life
        if (k >= 1) { rings.splice(i, 1); continue }
        ctx.globalAlpha = 1 - k
        ctx.strokeStyle = 'rgb(' + inst.local.stops[0].join(',') + ')'
        ctx.lineWidth = 2 * (1 - k)
        ctx.beginPath()
        ctx.arc(r.x, r.y, k * o.velocity * o.life * 0.5, 0, TAU)
        ctx.stroke()
      }
    },

    methods: {
      burst: function (x, y, inst) {
        P.emit(inst, 'click', inst.options.count, x, y)
        if (inst.options.ring) inst.local.rings.push({ x: x, y: y, t: 0 })
      }
    }
  })
}))
