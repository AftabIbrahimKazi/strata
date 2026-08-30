/**
 * Strata CursorFX — Electric preset
 * Canvas. Draws jagged arcs from the pointer to nearby hover targets.
 *
 *   CursorFX.mount(CursorFX.presets.Electric, { color: '#7df9ff', radius: 220 })
 *
 * Uses no particles — it is pure stroke work, so it costs nothing against the
 * global particle budget and composes freely with Trail or ClickBurst.
 *
 * Methods on the returned instance: setColor(css), refreshTargets()
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

  var doc = typeof document !== 'undefined' ? document : null

  // Rects are cached and refreshed on a timer rather than per frame —
  // getBoundingClientRect on every target every frame is a layout thrash.
  // Electric is the one preset that finds its own targets rather than being
  // handed one by the engine's hit-test — it arcs to everything nearby, not
  // just what the pointer is over. It must therefore honour data-st-cfx-target
  // itself, or a target scoped to another preset would still attract arcs.
  function scopedToUs(el, key) {
    var list = el.getAttribute('data-st-cfx-target')
    if (!list) return true
    return (' ' + list + ' ').indexOf(' ' + key + ' ') !== -1
  }

  function collect(inst) {
    if (!doc) return
    var els = doc.querySelectorAll(inst.options.selector)
    var out = []
    for (var i = 0; i < els.length; i++) {
      if (!scopedToUs(els[i], inst.preset ? inst.preset.key : 'electric')) continue
      var r = els[i].getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      out.push({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    }
    inst.local.targets = out
    inst.local.age = 0
  }

  function drawBolt(ctx, x1, y1, x2, y2, jitter, segments) {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    for (var i = 1; i < segments; i++) {
      var t = i / segments
      var nx = -(y2 - y1)
      var ny = (x2 - x1)
      var len = Math.sqrt(nx * nx + ny * ny) || 1
      var off = (Math.random() - 0.5) * jitter * Math.sin(t * Math.PI)
      ctx.lineTo(
        x1 + (x2 - x1) * t + (nx / len) * off,
        y1 + (y2 - y1) * t + (ny / len) * off
      )
    }
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  return {
    name: 'Electric',
    type: 'canvas',
    key:  'electric',

    defaults: {
      color:      '#7df9ff',
      selector:   '[data-st-cfx-target]',
      radius:     220,    // px — arcs only reach targets inside this
      maxArcs:    3,      // hard cap on simultaneous bolts
      jitter:     18,     // px of lateral displacement at mid-bolt
      segments:   8,      // more = finer, jaggier bolt
      width:      1.5,    // px stroke
      glow:       10,     // px shadow blur; 0 disables (cheaper)
      refreshMs:  500     // how often target rects are re-measured
    },

    onMount: function (inst) {
      inst.local.stops = inst.engine.colors.stops(inst.options.color, 'Electric color')
      inst.local.targets = []
      inst.local.age = 1e9      // force a collect on the first frame
    },

    render: function (ctx, dt, inst) {
      if (!ctx) return
      var o  = inst.options
      var st = inst.engine.state
      if (!st.seen) return

      inst.local.age += dt * 1000
      if (inst.local.age >= o.refreshMs) collect(inst)

      var targets = inst.local.targets
      var drawn = 0
      var r2 = o.radius * o.radius

      var stops = inst.local.stops
      var solid = 'rgb(' + stops[0].join(',') + ')'

      ctx.lineWidth = o.width
      ctx.lineCap   = 'round'
      if (o.glow) {
        ctx.shadowBlur  = o.glow
        ctx.shadowColor = solid          // shadowColor takes no gradient
      }

      for (var i = 0; i < targets.length && drawn < o.maxArcs; i++) {
        var dx = targets[i].x - st.x
        var dy = targets[i].y - st.y
        var d2 = dx * dx + dy * dy
        if (d2 > r2) continue

        ctx.globalAlpha = 1 - Math.sqrt(d2) / o.radius

        // A bolt runs between two known points, so multiple stops become a
        // genuine gradient along its length: pointer colour at one end,
        // target colour at the other.
        if (stops.length > 1) {
          var g = ctx.createLinearGradient(st.x, st.y, targets[i].x, targets[i].y)
          var pos = stops.positions      // set when the value was a CSS gradient
          for (var sIdx = 0; sIdx < stops.length; sIdx++) {
            g.addColorStop(pos ? pos[sIdx] : sIdx / (stops.length - 1),
                           'rgb(' + stops[sIdx].join(',') + ')')
          }
          ctx.strokeStyle = g
        } else {
          ctx.strokeStyle = solid
        }

        drawBolt(ctx, st.x, st.y, targets[i].x, targets[i].y, o.jitter, o.segments)
        drawn++
      }

      ctx.globalAlpha = 1
      ctx.shadowBlur  = 0
    },

    dispose: function (inst) { inst.local = {} },

    methods: {
      setColor: function (css, inst) {
        inst.options.color = css
        inst.local.stops = inst.engine.colors.stops(css, 'Electric color')
      },
      refreshTargets: function (inst)      { collect(inst) }
    }
  }
}))
