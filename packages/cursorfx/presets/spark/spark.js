/**
 * Strata CursorFX — Spark preset
 * Canvas. Short electric streaks thrown off the pointer, off clicks, and off
 * the edges of hover targets.
 *
 *   CursorFX.mount(CursorFX.presets.Spark, { color: '#82c8ff #ffd682' })
 *
 * A streak is a jagged filament, not a dot: its shape is generated once when
 * the particle is born and then held still while it fades. Re-randomising the
 * jag every frame — the obvious implementation — makes each spark vibrate, and
 * a field of vibrating sparks reads as noise rather than electricity.
 *
 * Requires cursorfx.css only for the canvas; the preset itself needs no CSS.
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

  var TAU = 6.283185307

  /* Jag shapes are kept in an array indexed by the particle's pool slot, so a
   * streak allocates nothing after the first time that slot is used. Storing
   * them on the particle itself would not work: the pool clears `data` on both
   * acquire and release, which is exactly what stops presets leaking state
   * into each other. */
  function jagFor(inst, p, segments) {
    var slot = inst.local.jag[p._i]
    if (!slot || slot.length < segments) {
      slot = inst.local.jag[p._i] = new Array(segments)
    }
    return slot
  }

  function spawn(inst, x, y, angle, spreadRad) {
    var o = inst.options
    var p = inst.pool.acquire(inst)
    if (!p) return null                    // global budget spent — drop it

    var a = angle + (Math.random() - 0.5) * spreadRad
    p.x  = x
    p.y  = y
    p.vx = Math.cos(a) * o.drift
    p.vy = Math.sin(a) * o.drift
    p.life    = 0
    p.maxLife = o.life * (0.65 + Math.random() * 0.35)
    p.size    = o.length * (0.7 + Math.random() * 0.6)   // streak length
    p.a       = a                                        // heading

    // Lateral offsets, generated once. sin(t·π) anchors both ends at zero so
    // the kink sits mid-streak instead of hooking off the origin.
    var segs = o.segments
    var jag  = jagFor(inst, p, segs)
    for (var i = 1; i < segs; i++) {
      var t = i / segs
      jag[i] = (Math.random() - 0.5) * o.jitter * Math.sin(t * Math.PI)
    }

    var c = inst.engine.colors.at(inst.local.stops, Math.random())
    p.r = c[0]; p.g = c[1]; p.b = c[2]
    return p
  }

  // A point on the border of a rect, picked uniformly by perimeter so long
  // edges are not under-represented the way picking a side at random does.
  function edgePoint(r) {
    var per = (r.width + r.height) * 2
    var d   = Math.random() * per
    if (d < r.width)            return { x: r.left + d, y: r.top, a: -Math.PI / 2 }
    d -= r.width
    if (d < r.height)           return { x: r.right, y: r.top + d, a: 0 }
    d -= r.height
    if (d < r.width)            return { x: r.right - d, y: r.bottom, a: Math.PI / 2 }
    d -= r.width
    return { x: r.left, y: r.top + d, a: Math.PI }
  }

  return {
    name: 'Spark',
    type: 'canvas',
    key:  'spark',

    defaults: {
      color:     '#82c8ff',
      count:     1,      // streaks per qualifying pointer move
      burst:     14,     // streaks per click
      length:    14,     // px, before per-particle variation
      segments:  4,      // jag detail; 2 is a straight line
      jitter:    7,      // px of lateral displacement at mid-streak
      width:     1.4,    // px stroke at the head
      taper:     true,   // thin the stroke toward the tail
      life:      0.32,   // seconds
      drift:     26,     // px/s of travel after birth
      spread:    2.4,    // radians of angular scatter around the heading
      speedGate: 34,     // px/frame of pointer speed for a certain emission
      dragBoost: 2,      // emission multiplier while the pointer is down
      glow:      6,      // px shadow blur; 0 is noticeably cheaper
      hoverRate: 90,     // ms between streaks off a hovered target's edge
      hoverOrigin: 'edge'  // 'edge' | 'pointer'
    },

    onMount: function (inst) {
      inst.local.stops = inst.engine.colors.stops(inst.options.color, 'Spark color')
      inst.local.jag   = new Array(inst.pool.size)   // one slot per pool slot
      inst.local.el    = null
      inst.local.rect  = null
      inst.local.acc   = 0
    },

    onMove: function (x, y, inst) {
      var o  = inst.options
      var st = inst.engine.state

      // Heading follows actual pointer motion, so streaks trail behind the
      // cursor rather than firing in arbitrary directions.
      var dx = x - st.px
      var dy = y - st.py
      var speed = Math.sqrt(dx * dx + dy * dy)
      if (speed < 0.5) return

      // Faster movement emits more reliably; slow drift emits rarely.
      var chance = Math.min(speed / o.speedGate, 1)
      if (st.down) chance *= o.dragBoost
      if (Math.random() > chance) return

      var heading = Math.atan2(-dy, -dx)      // opposite the direction of travel
      var n = Math.round(o.count * (st.down ? o.dragBoost : 1))
      for (var i = 0; i < n; i++) spawn(inst, x, y, heading, o.spread)
    },

    onClick: function (x, y, inst) {
      var o = inst.options
      for (var i = 0; i < o.burst; i++) {
        spawn(inst, x, y, (i / o.burst) * TAU, 0.5)
      }
    },

    onHoverEnter: function (el, inst) {
      inst.local.el   = el
      inst.local.rect = el.getBoundingClientRect()   // measured once per hover
      inst.local.acc  = 0
    },

    onHoverLeave: function (inst_el, inst) {
      inst.local.el = null
      inst.local.rect = null
    },

    render: function (ctx, dt, inst) {
      if (!ctx) return
      var o = inst.options

      // Hover emission is driven off the frame clock rather than a timer, so
      // it stops dead when the engine pauses for a hidden tab.
      if (inst.local.el && inst.local.rect && o.hoverRate > 0) {
        inst.local.acc += dt * 1000
        while (inst.local.acc >= o.hoverRate) {
          inst.local.acc -= o.hoverRate
          if (o.hoverOrigin === 'pointer') {
            spawn(inst, inst.engine.state.x, inst.engine.state.y, Math.random() * TAU, TAU)
          } else {
            var e = edgePoint(inst.local.rect)
            spawn(inst, e.x, e.y, e.a, 1.2)      // fires outward from the edge
          }
        }
      }

      if (o.glow) {
        ctx.shadowBlur = o.glow
      }
      ctx.lineCap  = 'round'
      ctx.lineJoin = 'round'

      var segs = o.segments

      inst.pool.forEachOwnedBy(inst, function (p) {
        p.life += dt
        if (p.life >= p.maxLife) { inst.pool.release(p); return }

        p.x += p.vx * dt
        p.y += p.vy * dt

        var t     = 1 - p.life / p.maxLife          // 1 at birth, 0 at death
        var alpha = t * t                           // fade out fast, linger short
        var jag   = inst.local.jag[p._i]

        var ex = p.x + Math.cos(p.a) * p.size
        var ey = p.y + Math.sin(p.a) * p.size
        var nx = -(ey - p.y)
        var ny =  (ex - p.x)
        var nl = Math.sqrt(nx * nx + ny * ny) || 1
        nx /= nl; ny /= nl

        var rgb = 'rgb(' + (p.r | 0) + ',' + (p.g | 0) + ',' + (p.b | 0) + ')'
        ctx.strokeStyle = rgb
        if (o.glow) ctx.shadowColor = rgb

        // Stroked segment by segment so the streak can taper: a single path
        // can only carry one lineWidth.
        var px = p.x, py = p.y
        for (var i = 1; i <= segs; i++) {
          var f   = i / segs
          var off = i < segs ? (jag[i] || 0) : 0
          var qx  = p.x + (ex - p.x) * f + nx * off
          var qy  = p.y + (ey - p.y) * f + ny * off

          ctx.globalAlpha = alpha * (1 - f * 0.35)      // dimmer toward the tail
          ctx.lineWidth   = o.taper ? o.width * (1 - f * 0.7) : o.width
          ctx.beginPath()
          ctx.moveTo(px, py)
          ctx.lineTo(qx, qy)
          ctx.stroke()

          px = qx; py = qy
        }
      })

      ctx.globalAlpha = 1
      ctx.shadowBlur  = 0
    },

    dispose: function (inst) { inst.local = {} },

    methods: {
      setColor: function (css, inst) {
        inst.options.color = css
        inst.local.stops = inst.engine.colors.stops(css, 'Spark color')
      },
      burst: function (x, y, inst) {
        for (var i = 0; i < inst.options.burst; i++) {
          spawn(inst, x, y, (i / inst.options.burst) * TAU, 0.5)
        }
      }
    }
  }
}))
