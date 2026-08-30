/**
 * Strata CursorFX — ClickBurst preset
 * Canvas. Fires a radial burst of particles from each click point.
 *
 *   CursorFX.mount(CursorFX.presets.ClickBurst, { color: '#ffd166', count: 24 })
 *
 * Methods on the returned instance: setColor(css), burst(x, y)
 */

;(function (root, factory) {
  var preset = factory()
  if (typeof define === 'function' && define.amd) {
    define([], function () { return preset })
  } else if (typeof module === 'object' && module.exports) {
    module.exports = preset
  } else {
    var fx = (root.Strata && root.Strata.CursorFX) || root.StrataCursorFX
    if (fx) fx.presets[preset.name] = preset
    else (root.StrataCursorFXPresets = root.StrataCursorFXPresets || {})[preset.name] = preset
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  function emit(x, y, inst) {
    var o = inst.options
    var stops = inst.local.stops
    for (var i = 0; i < o.count; i++) {
      var p = inst.pool.acquire(inst)
      if (!p) return                       // budget spent — a short burst beats none
      var a = (i / o.count) * 6.283185307 + Math.random() * 0.3
      var v = o.velocity * (0.5 + Math.random() * 0.5)
      p.x = x
      p.y = y
      p.vx = Math.cos(a) * v
      p.vy = Math.sin(a) * v
      p.maxLife = o.life * (0.7 + Math.random() * 0.3)
      p.size = o.size * (0.6 + Math.random() * 0.4)
      // Colour follows position around the ring, so a two-stop burst fans from
      // one colour to the other rather than flickering between them.
      var c = inst.engine.colors.at(stops, i / Math.max(1, o.count - 1))
      p.r = c[0]; p.g = c[1]; p.b = c[2]
    }
  }

  return {
    name: 'ClickBurst',
    type: 'canvas',
    key:  'click-burst',

    defaults: {
      color:    '#ffffff',
      count:    24,     // particles per burst
      velocity: 260,    // px/s at birth
      life:     0.7,    // seconds
      size:     5,      // px
      gravity:  420,    // px/s²
      drag:     2.2,    // velocity damping per second
      ring:     false   // also draw an expanding shock ring
    },

    onMount: function (inst) {
      inst.local.stops = inst.engine.colors.stops(inst.options.color, 'ClickBurst color')
      inst.local.rings = []
    },

    onClick: function (x, y, inst) {
      emit(x, y, inst)
      if (inst.options.ring) inst.local.rings.push({ x: x, y: y, t: 0 })
    },

    render: function (ctx, dt, inst) {
      if (!ctx) return
      var o = inst.options
      var damp = Math.exp(-o.drag * dt)

      inst.pool.forEachOwnedBy(inst, function (p) {
        p.life += dt
        if (p.life >= p.maxLife) { inst.pool.release(p); return }

        p.vx *= damp
        p.vy = p.vy * damp + o.gravity * dt
        p.x += p.vx * dt
        p.y += p.vy * dt

        var t = 1 - p.life / p.maxLife
        ctx.globalAlpha = t
        ctx.fillStyle = 'rgb(' + (p.r | 0) + ',' + (p.g | 0) + ',' + (p.b | 0) + ')'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 0.5 * t, 0, 6.283185307)
        ctx.fill()
      })

      var rings = inst.local.rings
      for (var i = rings.length - 1; i >= 0; i--) {
        var r = rings[i]
        r.t += dt
        var k = r.t / o.life
        if (k >= 1) { rings.splice(i, 1); continue }
        ctx.globalAlpha = 1 - k
        ctx.strokeStyle = 'rgb(' + inst.local.stops[0].join(',') + ')'
        ctx.lineWidth = 2 * (1 - k)
        ctx.beginPath()
        ctx.arc(r.x, r.y, k * o.velocity * o.life * 0.5, 0, 6.283185307)
        ctx.stroke()
      }

      ctx.globalAlpha = 1
    },

    dispose: function (inst) { inst.local = {} },

    methods: {
      setColor: function (css, inst) {
        inst.options.color = css
        inst.local.stops = inst.engine.colors.stops(css, 'ClickBurst color')
      },
      burst: function (x, y, inst) { emit(x, y, inst) }
    }
  }
}))
