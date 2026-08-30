/**
 * Strata CursorFX — CursorMorph preset
 * DOM. Replaces the pointer with a dot that morphs into the outline of
 * whatever hover target it is over.
 *
 *   CursorFX.mount(CursorFX.presets.CursorMorph, { size: 14, hideNative: true })
 *
 * One absolutely-positioned element, moved by writing custom properties.
 * It participates in the RAF loop only to interpolate — no layout is read
 * per frame; the target rect is measured once per hover.
 *
 * Requires cursorfx.css (which supplies the cursor-hiding rule) and cursor-morph.css.
 *
 * Methods on the returned instance: setColor(css), setSize(px)
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

  return {
    name: 'CursorMorph',
    type: 'dom',
    key:  'cursor-morph',

    defaults: {
      size:       14,      // px — resting diameter
      color:      '',        // '' inherits currentColor — legible on any background
      radius:     999,     // px — resting corner radius (999 = circle)
      ease:       0.18,    // 0..1 lerp factor per frame; lower = laggier
      padding:    6,       // px of breathing room around a morphed target
      hideNative: true,    // hide the OS cursor while mounted
      zIndex:     2147483001
    },

    onMount: function (inst) {
      if (!doc) return
      var o  = inst.options
      var el = doc.createElement('div')
      el.setAttribute('data-st-cfx', 'morph')
      el.style.zIndex = o.zIndex
      if (o.color) el.style.setProperty('--st-cfx-morph-color', o.color)
      doc.body.appendChild(el)

      if (o.hideNative) doc.documentElement.setAttribute('data-st-cfx-cursor', 'hidden')

      inst.local.el = el
      // current (interpolated) box, and the box being interpolated toward
      inst.local.cur    = { x: 0, y: 0, w: o.size, h: o.size, r: o.radius }
      inst.local.target = { x: 0, y: 0, w: o.size, h: o.size, r: o.radius }
      inst.local.locked = false
    },

    onHoverEnter: function (el, inst) {
      var o = inst.options
      var r = el.getBoundingClientRect()
      var cs = doc.defaultView.getComputedStyle(el)
      inst.local.locked = true
      inst.local.target = {
        x: r.left - o.padding,
        y: r.top  - o.padding,
        w: r.width  + o.padding * 2,
        h: r.height + o.padding * 2,
        r: parseFloat(cs.borderTopLeftRadius) || 0
      }
    },

    onHoverLeave: function (el, inst) {
      inst.local.locked = false
    },

    render: function (ctx, dt, inst) {
      var L = inst.local
      if (!L.el) return
      var o  = inst.options
      var st = inst.engine.state

      if (!L.locked) {
        L.target.x = st.x - o.size / 2
        L.target.y = st.y - o.size / 2
        L.target.w = o.size
        L.target.h = o.size
        L.target.r = o.radius
      }

      // frame-rate independent lerp — the same visual ease at 60 and 144 Hz
      var k = 1 - Math.pow(1 - o.ease, dt * 60)
      L.cur.x += (L.target.x - L.cur.x) * k
      L.cur.y += (L.target.y - L.cur.y) * k
      L.cur.w += (L.target.w - L.cur.w) * k
      L.cur.h += (L.target.h - L.cur.h) * k
      L.cur.r += (L.target.r - L.cur.r) * k

      var s = L.el.style
      s.setProperty('--st-cfx-morph-x', L.cur.x.toFixed(2) + 'px')
      s.setProperty('--st-cfx-morph-y', L.cur.y.toFixed(2) + 'px')
      s.setProperty('--st-cfx-morph-w', L.cur.w.toFixed(2) + 'px')
      s.setProperty('--st-cfx-morph-h', L.cur.h.toFixed(2) + 'px')
      s.setProperty('--st-cfx-morph-r', L.cur.r.toFixed(2) + 'px')
    },

    dispose: function (inst) {
      if (inst.local.el && inst.local.el.parentNode) {
        inst.local.el.parentNode.removeChild(inst.local.el)
      }
      if (doc && inst.options.hideNative) {
        doc.documentElement.removeAttribute('data-st-cfx-cursor')
      }
      inst.local = {}
    },

    methods: {
      setColor: function (css, inst) {
        inst.options.color = css
        if (inst.local.el) inst.local.el.style.setProperty('--st-cfx-morph-color', css)
      },
      setSize: function (px, inst) { inst.options.size = px }
    }
  }
}))
