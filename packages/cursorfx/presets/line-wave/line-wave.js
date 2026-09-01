/**
 * Strata CursorFX — LineWave preset
 * DOM. A ripple travels along a line when the pointer crosses it, then settles
 * flat.
 *
 *   <div data-st-cfx-target="line-wave"></div>
 *
 * A single element may override the shape without its own instance:
 *   <div data-st-cfx-target="line-wave" data-st-cfx-wave-shape="helix"></div>
 *
 *   <body data-st-cursorfx="line-wave"
 *         data-st-cfx-line-wave-color="#6ee7c8"
 *         data-st-cfx-line-wave-cycles="6">
 *
 * Everything that moves is a CSS animation — see line-wave.css. This file
 * builds the element once, flips one attribute per hover, and writes a custom
 * property only where an option differs from its default. It does no work per
 * frame at all, which is why it has no render hook.
 *
 * The line's shape is a swappable mask: sine, zigzag, square, bars (a series
 * of separate strokes) or helix (two crossing strands with rungs). Changing it
 * changes no animation code — travel, envelope and cycles all act on the mask.
 *
 * Methods: setColor(css), setShape(name), setAmplitude(px), wave(el)
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

  /* ─── Shapes ──────────────────────────────────────────────────────────────
   * A shape is one period of geometry, tiled by mask-repeat. Everything else —
   * travel, the rise-and-fall envelope, cycle count, colour — operates on the
   * mask rather than on the geometry, so a new shape is a path generator and
   * nothing more. None of the animation code knows which shape is running.
   *
   * These live here rather than in separate files on purpose. Each is a handful
   * of lines, and splitting them would repeat the mistake measured three times
   * over in this repo: the per-file wrapper costs more than the code it lets
   * you drop.
   *
   * All are drawn into a 100x40 box with preserveAspectRatio="none", so one
   * shape stretches to any amplitude and thickness.
   */

  var W = 100, H = 40, MID = H / 2

  function pt(x, y) { return x.toFixed(2) + ' ' + y.toFixed(2) }

  // Smooth travelling wave — the default, and what the reference implementation
  // this preset replaces produced.
  function sine(amp, steps) {
    var d = 'M0 ' + MID
    for (var i = 1; i <= steps; i++) {
      var t = i / steps
      d += ' L' + pt(t * W, MID - Math.sin(t * Math.PI * 2) * amp)
    }
    return [d]
  }

  // Straight-sided wave. Reads sharper and more mechanical than the sine at the
  // same amplitude, so it wants a smaller one.
  function zigzag(amp) {
    return ['M0 ' + MID +
            ' L' + pt(W * 0.25, MID - amp) +
            ' L' + pt(W * 0.75, MID + amp) +
            ' L' + pt(W, MID)]
  }

  // Square wave. Vertical risers make the stroke join visible, so the corners
  // are where thickness shows most.
  function square(amp) {
    return ['M0 ' + MID +
            ' L' + pt(0, MID - amp) + ' L' + pt(W * 0.5, MID - amp) +
            ' L' + pt(W * 0.5, MID + amp) + ' L' + pt(W, MID + amp) +
            ' L' + pt(W, MID)]
  }

  // A series of separate strokes rather than one continuous line: bars rising
  // from the midline to the curve, like a waveform readout. Each period holds
  // its own bars, so tiling still works and `cycles` still means what it says.
  function bars(amp, count) {
    var out = []
    for (var i = 0; i < count; i++) {
      var t = (i + 0.5) / count
      var x = t * W
      var y = MID - Math.sin(t * Math.PI * 2) * amp
      out.push('M' + pt(x, MID) + ' L' + pt(x, y))
    }
    return out
  }

  // Two strands a half-period apart, crossing twice per period, with rungs
  // between them — a double helix seen side-on. The rungs are what sell it:
  // two bare crossing sines read as a lens pattern, not as a helix.
  function helix(amp, steps, rungs) {
    var a = 'M0 ' + MID, b = 'M0 ' + MID
    for (var i = 1; i <= steps; i++) {
      var t = i / steps
      var s = Math.sin(t * Math.PI * 2) * amp
      a += ' L' + pt(t * W, MID - s)
      b += ' L' + pt(t * W, MID + s)
    }
    var out = [a, b]
    for (var r = 0; r < rungs; r++) {
      // Offset off the crossings, where the strands are furthest apart and a
      // rung actually has length to draw.
      var rt = (r + 0.5) / rungs
      var rs = Math.sin(rt * Math.PI * 2) * amp
      out.push('M' + pt(rt * W, MID - rs) + ' L' + pt(rt * W, MID + rs))
    }
    return out
  }

  var SHAPES = {
    sine:   function (o) { return sine(o.amp, 20) },
    zigzag: function (o) { return zigzag(o.amp) },
    square: function (o) { return square(o.amp) },
    bars:   function (o) { return bars(o.amp, o.density) },
    helix:  function (o) { return helix(o.amp, 20, Math.max(2, Math.round(o.density / 2))) }
  }

  /* Builds the mask for a shape. An unknown name falls back to sine and says
   * so — a silently blank mask looks exactly like a working line that happens
   * to be invisible, which is the worst failure this preset can have. */
  function maskURI(shape, thickness, density, vertical) {
    var make = SHAPES[shape]
    if (!make) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('CursorFX: LineWave shape "' + shape + '" is not one of ' +
                     Object.keys(SHAPES).join(', ') + ' — falling back to sine.')
      }
      make = SHAPES.sine
    }
    var amp = H / 2 - thickness
    var paths = make({ amp: amp, density: density })
    // A vertical divider needs the same wave running down the tile instead of
    // across it. Rotating the authored geometry is all that takes: the shape
    // generators stay one-axis, and rotate(90) maps (x, y) to (H - y, x), so
    // the long axis becomes Y and the amplitude spans the width.
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
      (vertical ? H + ' ' + W : W + ' ' + H) + '" preserveAspectRatio="none">' +
      (vertical ? '<g transform="translate(' + H + ',0) rotate(90)">' : '')
    for (var i = 0; i < paths.length; i++) {
      // vector-effect is what keeps the stroke usable. The 100x40 box is
      // stretched into a tile that is hundreds of pixels wide and ~10 tall, and
      // preserveAspectRatio="none" scales the stroke with it — so without this
      // the steep parts of the wave render as thick vertical bars while the
      // flat parts thin out to nothing. non-scaling-stroke pins the stroke to
      // `thickness` in the rendered tile, whatever the aspect ratio.
      svg += '<path d="' + paths[i] + '" fill="none" stroke="#000" ' +
             'stroke-width="' + thickness + '" stroke-linecap="round" ' +
             'vector-effect="non-scaling-stroke"/>'
    }
    svg += (vertical ? '</g>' : '') + '</svg>'
    // encodeURIComponent, not base64: it stays readable in devtools and avoids
    // pulling in a base64 polyfill path for a string this small.
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'
  }

  // Written as an inline custom property only when it differs from the default,
  // so a stylesheet's --st-cfx-wave-* value still applies everywhere the author
  // did not override it. Copied from Reveal, which established this rule.
  function token(el, prop, value, dflt) {
    if (value === undefined || value === null || value === dflt) return
    el.style.setProperty('--st-cfx-wave-' + prop, value)
  }

  function lines(inst) {
    return inst.engine.root ||
      (typeof document !== 'undefined' ? document : null)
  }

  function build(el, inst) {
    if (el.querySelector('[data-st-cfx-wave]')) return
    var o = inst.options
    var doc = el.ownerDocument

    var wrap = doc.createElement('span')
    wrap.setAttribute('data-st-cfx-wave', 'false')

    var axis = o.orientation
    if (axis === 'auto') {
      var r = el.getBoundingClientRect()
      axis = r.height > r.width ? 'vertical' : 'horizontal'
    }
    wrap.setAttribute('data-st-cfx-wave-axis', axis)

    token(wrap, 'color',        inst.local.color,   'currentColor')
    token(wrap, 'amplitude',    px(o.amplitude),    '5px')
    token(wrap, 'thickness',    px(o.thickness),    '1.5px')
    token(wrap, 'cycles',       o.cycles,           1.75)
    token(wrap, 'travel',       o.travel,           1.4)
    token(wrap, 'duration',     o.duration + 's',   '1.1s')
    token(wrap, 'rest-opacity', o.restOpacity,      0.1)
    token(wrap, 'peak-opacity', o.peakOpacity,      0.6)
    token(wrap, 'glow',         px(o.glow),         '2.5px')
    if (inst.local.glowColor) token(wrap, 'glow-color', inst.local.glowColor, null)

    // An element may override the shape, so the mask is resolved per element.
    // The instance-level mask is reused whenever nothing is overridden, which
    // is the common case — one generator call for the whole page.
    var shape   = el.getAttribute('data-st-cfx-wave-shape')
    var density = el.getAttribute('data-st-cfx-wave-density')
    var vertical = axis === 'vertical'
    var mask
    if (shape || density) {
      mask = maskURI(shape || o.shape, o.thickness, +density || o.density, vertical)
    } else if (vertical) {
      // Cached the same way the horizontal one is — a page of vertical
      // dividers generates one mask, not one per element.
      mask = inst.local.maskV ||
        (inst.local.maskV = maskURI(o.shape, o.thickness, o.density, true))
    } else {
      mask = inst.local.mask
    }
    wrap.style.setProperty('--st-cfx-wave-mask', mask)

    wrap.appendChild(doc.createElement('i'))
    el.appendChild(wrap)
  }

  function px(v) {
    if (v === undefined || v === null) return v
    return typeof v === 'number' ? v + 'px' : String(v)
  }

  /* Restarting a CSS animation needs the attribute to leave "true" and the
   * browser to notice before it goes back — reading offsetWidth forces that
   * reflow. Without it, re-entering the line mid-wave does nothing at all. */
  function run(wrap, originPct) {
    if (!wrap) return
    wrap.setAttribute('data-st-cfx-wave', 'false')
    if (originPct !== null) {
      wrap.style.setProperty('--st-cfx-wave-origin', originPct.toFixed(1) + '%')
    }
    void wrap.offsetWidth
    wrap.setAttribute('data-st-cfx-wave', 'true')
  }

  return {
    name: 'LineWave',
    type: 'dom',
    key:  'line-wave',

    defaults: {
      shape:        'sine',    // 'sine' | 'zigzag' | 'square' | 'bars' | 'helix'
      density:      8,         // strokes per period for 'bars'; rung count for 'helix'
      color:        'currentColor',
      glowColor:    '',        // '' follows `color`; set to decouple the glow
      amplitude:    5,         // px of crest height
      thickness:    1.5,       // px stroke
      cycles:       1.75,      // crests visible along the line at once
      travel:       1.4,       // how far the phase slides over the run
      duration:     1.1,       // seconds
      restOpacity:  0.1,
      peakOpacity:  0.6,
      glow:         2.5,       // px drop-shadow at the crest; 0 is cheaper
      orientation:  'auto',    // 'auto' | 'horizontal' | 'vertical'
      origin:       'pointer', // 'pointer' | 'start' | 'center'
      retrigger:    true       // re-entering restarts a wave already running
    },

    onMount: function (inst) {
      var o = inst.options

      // Colour goes through the engine so it accepts anything CSS accepts —
      // including a gradient, since the line is painted as a background rather
      // than stroked. A gradient is passed through verbatim; a plain colour is
      // validated by the engine's parser first so an unusable value warns
      // instead of silently painting nothing.
      inst.local.color     = resolvePaint(inst, o.color)
      inst.local.glowColor = o.glowColor
        ? resolvePaint(inst, o.glowColor, true)
        : ''
      inst.local.mask = maskURI(o.shape, o.thickness, o.density)

      var doc = lines(inst)
      if (!doc) return
      var els = doc.querySelectorAll('[data-st-cfx-target~="line-wave"]')
      for (var i = 0; i < els.length; i++) build(els[i], inst)
    },

    onHoverEnter: function (el, inst) {
      var wrap = el.querySelector('[data-st-cfx-wave]')
      if (!wrap) { build(el, inst); wrap = el.querySelector('[data-st-cfx-wave]') }
      if (!wrap) return
      if (!inst.options.retrigger && wrap.getAttribute('data-st-cfx-wave') === 'true') return

      run(wrap, originFor(el, inst))
    },

    // Nothing to undo on leave: the animation ends by itself, and a height of
    // `thickness` means the resting state and the finished state are identical.
    onHoverLeave: function (el, inst) {},

    dispose: function (inst) {
      var doc = lines(inst)
      if (doc) {
        // Swept by attribute rather than by remembering what was touched: the
        // pointer may have left earlier elements long ago.
        var wraps = doc.querySelectorAll('[data-st-cfx-wave]')
        for (var i = 0; i < wraps.length; i++) {
          if (wraps[i].parentNode) wraps[i].parentNode.removeChild(wraps[i])
        }
      }
      inst.local = {}
    },

    methods: {
      setColor: function (css, inst) {
        inst.options.color = css
        inst.local.color = resolvePaint(inst, css)
        eachWrap(inst, function (w) {
          w.style.setProperty('--st-cfx-wave-color', inst.local.color)
        })
      },
      setShape: function (name, inst) {
        inst.options.shape = name
        inst.local.mask  = maskURI(name, inst.options.thickness, inst.options.density)
        inst.local.maskV = maskURI(name, inst.options.thickness, inst.options.density, true)
        eachWrap(inst, function (w) {
          // Elements carrying their own shape keep it — a global setter must
          // not silently override a per-element choice.
          var host = w.parentNode
          if (host && host.getAttribute &&
              (host.getAttribute('data-st-cfx-wave-shape') ||
               host.getAttribute('data-st-cfx-wave-density'))) return
          w.style.setProperty('--st-cfx-wave-mask', inst.local.mask)
        })
      },
      setAmplitude: function (v, inst) {
        inst.options.amplitude = v
        eachWrap(inst, function (w) {
          w.style.setProperty('--st-cfx-wave-amplitude', px(v))
        })
      },
      // For triggers the engine does not own — a scroll observer, a focus
      // handler, anything the page wants. The engine deliberately has no
      // IntersectionObserver, so this is how a page drives one.
      wave: function (el, inst) {
        var target = typeof el === 'string'
          ? (lines(inst) || document).querySelector(el) : el
        if (!target) return
        // Builds first if the line is missing, so wave() works on an element
        // added after mount — and so a rebuild (a shape change, say) only has
        // to drop the old node.
        var wrap = target.querySelector('[data-st-cfx-wave]')
        if (!wrap) { build(target, inst); wrap = target.querySelector('[data-st-cfx-wave]') }
        if (wrap) run(wrap, originFor(target, inst))
      }
    }
  }

  /* ── helpers ──────────────────────────────────────────────────────────── */

  function eachWrap(inst, fn) {
    var doc = lines(inst)
    if (!doc) return
    var wraps = doc.querySelectorAll('[data-st-cfx-wave]')
    for (var i = 0; i < wraps.length; i++) fn(wraps[i])
  }

  /* A gradient is handed to CSS untouched — `background` accepts every gradient
   * form, so linear/radial/conic all work with no code here. A flat colour goes
   * through the engine's parser so an unusable value warns rather than painting
   * nothing. `flat` forces that path, because drop-shadow takes no gradient. */
  function resolvePaint(inst, value, flat) {
    var v = String(value || '').trim()
    if (!v) return 'currentColor'

    // currentColor is not a value to resolve — it is a keyword the browser
    // re-evaluates on every paint. Running it through the colour parser turns
    // it into a fixed rgb(), which then gets written inline as
    // --st-cfx-wave-color and beats the stylesheet, so the line keeps its
    // mount-time colour and stops following the theme toggle. Left alone, it
    // equals the default, nothing is written inline, and a theme's
    // --st-cfx-wave-color stays live.
    if (v.toLowerCase() === 'currentcolor') return 'currentColor'
    if (!flat && /gradient\(/i.test(inst.engine.colors.resolve(v) || v)) {
      return inst.engine.colors.resolve(v) || v
    }
    var stops = inst.engine.colors.stops(v, 'LineWave color')
    var c = stops && stops[0]
    if (!c) return 'currentColor'
    return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'
  }

  /* origin: 'pointer' seeds the wave at the point the cursor crossed the line.
   * The source component this replaces always started its wave at t=0 no matter
   * where you entered — it used the pointer only to pick which label glowed.
   * Starting the ripple where the finger actually crossed is the thing a cursor
   * package can add that a standalone component could not. */
  function originFor(el, inst) {
    if (inst.options.origin === 'start') return 0
    if (inst.options.origin === 'center') return 50
    var st = inst.engine.state
    if (!st || !st.seen) return 0
    var r = el.getBoundingClientRect()
    var vertical = (el.querySelector('[data-st-cfx-wave-axis="vertical"]') !== null)
    var pct = vertical
      ? ((st.y - r.top) / (r.height || 1)) * 100
      : ((st.x - r.left) / (r.width || 1)) * 100
    return Math.max(0, Math.min(100, pct))
  }
}))
