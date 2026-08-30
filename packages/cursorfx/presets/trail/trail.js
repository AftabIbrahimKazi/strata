/**
 * Strata CursorFX — Trail preset
 * Canvas. Emits fading particles along the pointer path.
 *
 *   CursorFX.mount(CursorFX.presets.Trail, { color: '#ff2d55', count: 3 })
 *
 * Methods on the returned instance: setColor(css), setParticleCount(n)
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

  return {
    name: 'Trail',
    type: 'canvas',
    key:  'trail',

    defaults: {
      color:      '#ffffff',
      count:      3,      // particles emitted per pointer move
      size:       6,      // px, at birth
      life:       0.6,    // seconds
      spread:     0.6,    // random velocity, px/frame-ish
      gravity:    0,      // px/s²; positive falls
      shrink:     true,
      hoverBoost: 3       // count multiplier while over a hover target
    },

    onMount: function (inst) {
      inst.local.stops = inst.engine.colors.stops(inst.options.color, 'Trail color')
      inst.local.boost = 1
    },

    onMove: function (x, y, inst) {
      var o = inst.options
      var n = Math.round(o.count * inst.local.boost)
      for (var i = 0; i < n; i++) {
        var p = inst.pool.acquire(inst)
        if (!p) return                     // global budget spent — drop silently
        p.x = x
        p.y = y
        p.vx = (Math.random() - 0.5) * o.spread * 60
        p.vy = (Math.random() - 0.5) * o.spread * 60
        p.maxLife = o.life * (0.6 + Math.random() * 0.4)
        p.size = o.size
      }
    },

    onHoverEnter: function (el, inst) { inst.local.boost = inst.options.hoverBoost },
    onHoverLeave: function (el, inst) { inst.local.boost = 1 },

    render: function (ctx, dt, inst) {
      if (!ctx) return
      var o = inst.options
      inst.pool.forEachOwnedBy(inst, function (p) {
        p.life += dt
        if (p.life >= p.maxLife) { inst.pool.release(p); return }

        p.vy += o.gravity * dt
        p.x  += p.vx * dt
        p.y  += p.vy * dt

        var age = p.life / p.maxLife      // 0 at the pointer, 1 at the tail end
        var t   = 1 - age
        var r   = o.shrink ? p.size * t : p.size

        // Colour is a function of age, so the stops lay out along the trail:
        // the newest particles sit at stop 0 under the pointer and shade
        // toward the last stop as they fall behind and fade. Sampling per
        // frame rather than fixing a colour at birth is what makes it a
        // gradient down the trail instead of a scatter of mixed colours.
        var c = inst.engine.colors.at(inst.local.stops, age)

        ctx.globalAlpha = t
        ctx.fillStyle   = 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'
        ctx.beginPath()
        ctx.arc(p.x, p.y, r * 0.5, 0, 6.283185307)
        ctx.fill()
      })
      ctx.globalAlpha = 1
    },

    dispose: function (inst) { inst.local = {} },

    methods: {
      setColor: function (css, inst) {
        inst.options.color = css
        inst.local.stops = inst.engine.colors.stops(css, 'Trail color')
      },
      setParticleCount: function (n, inst) {
        inst.options.count = Math.max(0, n | 0)
      }
    }
  }
}))
