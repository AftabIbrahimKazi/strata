/**
 * Strata CursorFX
 * Version: 0.0.0
 *
 * The shared engine. Owns everything that must exist exactly once per page:
 * pointer tracking, the RAF loop, the canvas, the particle pool, hover
 * hit-testing, and the reduced-motion / visibility kill switches.
 *
 * Presets are plain objects. They are NOT bundled here — import only the ones
 * you use:
 *
 *   <script src="cursorfx/cursorfx.js"></script>
 *   <script src="cursorfx/presets/trail/trail.js"></script>
 *   <script>
 *     Strata.CursorFX.init()
 *     Strata.CursorFX.mount(Strata.CursorFX.presets.Trail, { color: '#ff2d55' })
 *   </script>
 *
 * UMD — works as a browser global, CommonJS module, or AMD module.
 * When Strata is present on the page, registers as Strata.CursorFX.
 * Otherwise registers as StrataCursorFX.
 */

;(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory)
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory()
  } else {
    if (root.Strata) {
      root.Strata.CursorFX = factory()
    } else {
      root.StrataCursorFX = factory()
    }
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  var win = typeof window   !== 'undefined' ? window   : null
  var doc = typeof document !== 'undefined' ? document : null

  /* ─── Particle pool ──────────────────────────────────────────────────────
   * Fixed-size, allocated once. The cap is GLOBAL across every mounted
   * preset combined — mounting three presets does not triple the budget, it
   * splits it. Dead particles are recycled, never garbage collected.
   */

  function Pool(size) {
    this.size  = size
    this.items = new Array(size)
    this.free  = new Array(size)
    this.freeN = size
    for (var i = 0; i < size; i++) {
      this.items[i] = {
        active: false, owner: null,
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 1, size: 0,
        r: 0, g: 0, b: 0, a: 1,
        data: null
      }
      this.free[i] = i
    }
  }

  Pool.prototype.acquire = function (owner) {
    if (this.freeN === 0) return null
    var p = this.items[this.free[--this.freeN]]
    p.active = true
    p.owner  = owner
    p.life   = 0
    p.data   = null
    return p
  }

  Pool.prototype.release = function (p) {
    if (!p.active) return
    p.active = false
    p.owner  = null
    p.data   = null
    // index lookup avoided: particles carry their slot
    this.free[this.freeN++] = p._i
  }

  Pool.prototype.releaseAllOwnedBy = function (owner) {
    for (var i = 0; i < this.size; i++) {
      var p = this.items[i]
      if (p.active && p.owner === owner) this.release(p)
    }
  }

  Pool.prototype.forEachOwnedBy = function (owner, fn) {
    for (var i = 0; i < this.size; i++) {
      var p = this.items[i]
      if (p.active && p.owner === owner) fn(p)
    }
  }

  /* ─── Colour utilities ───────────────────────────────────────────────────
   * Shared because three presets need identical parsing, and because a value
   * the presets cannot use must fail loudly in one place rather than silently
   * rendering white in three.
   *
   * Values may be CSS custom properties, so colours can come from your design
   * tokens instead of being hardcoded:
   *
   *   data-st-cfx-trail-color="var(--brand-500)"
   *   data-st-cfx-trail-color="var(--st-primary) var(--st-info)"   two stops
   *
   * Resolution reads the computed value off <html>, the same approach
   * @strata-packages/chart uses to pick up --st-primary and friends.
   */

  // Token names only. Anchored, one character class, no alternation next to a
  // quantifier — linear whatever the input.
  var TOKEN_NAME_RE = /^--[\w-]+$/

  /* Parsed by hand rather than with one compound regex. The obvious pattern,
   * /^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/, backtracks polynomially on
   * input like "var(---," followed by many spaces: `--[\w-]+` and the `\s*`
   * and `,\s*` around it can divide the same characters many ways. Colour
   * values reach here straight from author markup, so that is reachable.
   * Slicing at the first comma has no ambiguity to backtrack over. */
  function resolveVar(v, depth) {
    if (typeof v !== 'string') return v
    v = v.trim()
    if (!win || (depth || 0) > 8) return v      // depth guard: --a: var(--b); --b: var(--a)
    if (v.slice(0, 4) !== 'var(' || v.charAt(v.length - 1) !== ')') return v

    var inner = v.slice(4, -1)
    var comma = inner.indexOf(',')
    var name  = (comma === -1 ? inner : inner.slice(0, comma)).trim()
    if (!TOKEN_NAME_RE.test(name)) return v

    var fallback = comma === -1 ? null : inner.slice(comma + 1).trim()
    var got = win.getComputedStyle(doc.documentElement).getPropertyValue(name).trim()
    if (got) return resolveVar(got, (depth || 0) + 1)
    return fallback ? resolveVar(fallback, (depth || 0) + 1) : ''
  }

  // Splits at paren depth 0 only, so commas inside rgb(...) and var(--x, #fff)
  // never split the value. `seps` selects which characters separate.
  function splitTop(str, seps) {
    var out = [], depth = 0, cur = '', i, c
    for (i = 0; i < str.length; i++) {
      c = str.charAt(i)
      if (c === '(') depth++
      else if (c === ')') depth--
      if (depth === 0 && seps.indexOf(c) !== -1) {
        if (cur.trim()) out.push(cur.trim())
        cur = ''
        continue
      }
      cur += c
    }
    if (cur.trim()) out.push(cur.trim())
    return out
  }

  var GRADIENT_RE = /^(?:repeating-)?(?:linear|radial|conic)-gradient\(([\s\S]*)\)$/i

  // A leading direction / angle / shape argument carries no colour.
  var GRADIENT_DIR_RE =
    /^(?:to\s|from\s|at\s|in\s|circle|ellipse|closest|farthest|[-\d.]+(?:deg|rad|turn|grad|%)?$)/i

  /**
   * Pull the colour stops out of a CSS gradient. The gradient's geometry is
   * ignored — each preset already decides how stops map onto what it draws —
   * but explicit stop positions are kept, so `#000 0%, #f00 80%, #fff` places
   * its colours where you wrote them.
   */
  function parseGradient(str) {
    var m = GRADIENT_RE.exec(str.trim())
    if (!m) return null

    var args = splitTop(m[1], ',')
    if (args.length && GRADIENT_DIR_RE.test(args[0])) args.shift()

    var rgbs = [], pos = [], any = false
    for (var i = 0; i < args.length; i++) {
      var parts = splitTop(args[i], ' ')
      var rgb   = parseColor(resolveVar(parts[0]))
      if (!rgb) continue
      rgbs.push(rgb)
      // Only percentage positions are honoured; a length would need the
      // drawn size, which the stops themselves know nothing about.
      var pm = parts[1] && /^([-\d.]+)%$/.exec(parts[1])
      if (pm) { pos.push(Math.max(0, Math.min(1, parseFloat(pm[1]) / 100))); any = true }
      else pos.push(null)
    }
    if (!rgbs.length) return null

    // Fill unplaced stops evenly between the ones that were placed, the way
    // CSS does.
    if (any) {
      if (pos[0] === null) pos[0] = 0
      if (pos[pos.length - 1] === null) pos[pos.length - 1] = 1
      for (var a = 0; a < pos.length; a++) {
        if (pos[a] !== null) continue
        var prev = a - 1
        var next = a
        while (next < pos.length && pos[next] === null) next++
        var span = (pos[next] - pos[prev]) / (next - prev)
        for (var k = prev + 1; k < next; k++) pos[k] = pos[prev] + span * (k - prev)
      }
      rgbs.positions = pos
    }
    return rgbs
  }

  /* The regexes below cover the common cases without touching the DOM. Anything
   * else — named colours, hsl(), oklch(), color-mix() — is handed to the
   * browser through a hidden probe, which is both more correct and less code
   * than carrying a 148-entry colour table. An invalid value leaves
   * style.color empty, which doubles as the validity check.
   */
  var probe = null

  function probeColor(v) {
    if (!doc || !win || !v) return null
    if (!probe) {
      probe = doc.createElement('span')
      probe.setAttribute('data-st-cfx', 'probe')
      probe.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden'
      ;(doc.body || doc.documentElement).appendChild(probe)
    }
    probe.style.color = ''
    probe.style.color = v
    if (!probe.style.color) return null      // the browser rejected it
    var m = /^rgba?\((\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(win.getComputedStyle(probe).color)
    return m ? [+m[1], +m[2], +m[3]] : null
  }

  function dropProbe() {
    if (probe && probe.parentNode) probe.parentNode.removeChild(probe)
    probe = null
  }

  function parseColor(css) {
    var m
    if ((m = /^#([0-9a-f]{3})$/i.exec(css))) {
      return [parseInt(m[1][0] + m[1][0], 16),
              parseInt(m[1][1] + m[1][1], 16),
              parseInt(m[1][2] + m[1][2], 16)]
    }
    if ((m = /^#([0-9a-f]{6})$/i.exec(css))) {
      return [parseInt(m[1].slice(0, 2), 16),
              parseInt(m[1].slice(2, 4), 16),
              parseInt(m[1].slice(4, 6), 16)]
    }
    if ((m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(css))) {
      return [+m[1], +m[2], +m[3]]
    }
    return probeColor(css)
  }

  /**
   * Resolve a colour option into one or more [r,g,b] stops. One stop is a solid
   * colour; two or more are interpolated by the preset — a gradient through the
   * trail rather than a gradient painted on it.
   */
  function colorStops(value, where) {
    var input = String(value == null ? '' : value).trim()

    // Resolve before inspecting: the whole gradient may live in a token,
    // `--brand-fade: linear-gradient(90deg, #ff2d55, #7df9ff)`.
    var resolved = resolveVar(input)

    var grad = parseGradient(resolved)
    if (grad) return grad

    var raw   = splitTop(resolved, ' ,')
    var stops = []
    var bad   = []

    // `var(--missing)` with no fallback resolves to nothing. Before this, that
    // produced an empty list, no warning, and a silently white effect.
    if (input && !raw.length) bad.push(input)

    for (var i = 0; i < raw.length; i++) {
      var one = resolveVar(raw[i])
      var asGradient = parseGradient(one)
      if (asGradient) { stops = stops.concat(asGradient); continue }
      var rgb = parseColor(one)
      if (rgb) stops.push(rgb)
      else bad.push(raw[i])
    }

    // Silently rendering white is how this used to fail. Say what happened.
    if (bad.length && win && win.console) {
      win.console.warn(
        '[CursorFX] ' + (where || 'colour') + ': cannot use ' + bad.join(', ') +
        '. Expected #rgb, #rrggbb, rgb()/rgba(), a CSS gradient such as ' +
        'linear-gradient(90deg, #ff2d55, #7df9ff), a space-separated stop list, ' +
        'or var(--token) resolving to any of those.'
      )
    }

    return stops.length ? stops : [[255, 255, 255]]
  }

  // Interpolate a position (0..1) across the stop list.
  function colorAt(stops, t) {
    if (stops.length === 1) return stops[0]
    if (t <= 0) return stops[0]
    if (t >= 1) return stops[stops.length - 1]

    var i, f, a, b
    var pos = stops.positions

    if (pos) {
      // Explicit positions from a gradient: find the pair t falls between.
      i = 0
      while (i < pos.length - 2 && t > pos[i + 1]) i++
      var width = pos[i + 1] - pos[i]
      f = width > 0 ? (t - pos[i]) / width : 0
      f = f < 0 ? 0 : f > 1 ? 1 : f
    } else {
      var span = (stops.length - 1) * t
      i = Math.floor(span)
      f = span - i
    }
    a = stops[i]; b = stops[i + 1]
    return [a[0] + (b[0] - a[0]) * f,
            a[1] + (b[1] - a[1]) * f,
            a[2] + (b[2] - a[2]) * f]
  }

  /* ─── Device tier ────────────────────────────────────────────────────────
   * Off by default. A signal, never an action — the core will not disable
   * anything on its own based on tier. Read it and decide for yourself.
   */

  function detectTier() {
    if (!win) return 'high'
    var cores = win.navigator && win.navigator.hardwareConcurrency  || 0
    var mem   = win.navigator && win.navigator.deviceMemory         || 0
    var coarse = win.matchMedia && win.matchMedia('(pointer: coarse)').matches

    if (coarse && cores <= 4) return 'low'
    if (cores  && cores <= 2) return 'low'
    if (mem    && mem   <= 2) return 'low'
    if (cores >= 8 && (!mem || mem >= 8)) return 'high'
    return 'mid'
  }

  /* ─── Engine ─────────────────────────────────────────────────────────── */

  var config = {
    maxParticles:  300,     // global cap, shared by all presets
    zIndex:        2147483000,
    tier:          'off',   // 'off' | 'auto' | 'manual'
    respectReducedMotion: true,
    hoverSelector: '[data-st-cfx-target]',
    hoverAttr:     'data-st-cfx-target',
    root:          null     // element to scope to; null = viewport
  }

  var state = {
    inited:   false,
    running:  false,
    rafId:    0,
    lastTime: 0,
    x: 0, y: 0, px: 0, py: 0,
    seen:     false,        // has the pointer produced a real event yet
    down:     false,
    tier:     'high',
    reduced:  false,
    hovered:  null
  }

  var pool      = null
  var canvas    = null
  var ctx2d     = null
  var dpr       = 1
  var mounted   = []        // active instances
  var canvasUse = 0         // how many mounted presets need the canvas

  /* — Canvas is created lazily and only if a canvas-type preset mounts.
   *   A page running only DOM presets never allocates one. */

  function ensureCanvas() {
    if (canvas) return
    canvas = doc.createElement('canvas')
    canvas.setAttribute('data-st-cfx', 'canvas')
    // Appearance lives in cursorfx.css so it can be overridden without !important;
    // only the configurable part is written from here.
    canvas.style.setProperty('--st-cfx-z', config.zIndex)
    doc.body.appendChild(canvas)
    // Can legitimately be null: a headless/jsdom environment with no canvas
    // implementation, or a browser that has hit its live-context ceiling.
    // Canvas presets then render nothing instead of throwing on every frame.
    ctx2d = canvas.getContext && canvas.getContext('2d')
    if (!ctx2d) { ctx2d = null; return }
    resize()
    win.addEventListener('resize', resize, { passive: true })
  }

  function destroyCanvas() {
    if (!canvas) return
    win.removeEventListener('resize', resize)
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
    canvas = null
    ctx2d  = null
  }

  function resize() {
    if (!canvas || !ctx2d) return
    dpr = Math.min(win.devicePixelRatio || 1, 2)
    canvas.width  = Math.floor(win.innerWidth  * dpr)
    canvas.height = Math.floor(win.innerHeight * dpr)
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  /* — Pointer ------------------------------------------------------------ */

  function onPointerMove(e) {
    state.px = state.x
    state.py = state.y
    state.x  = e.clientX
    state.y  = e.clientY

    if (!state.seen) {
      state.seen = true
      start()                       // lazy RAF start on first real movement
    }

    for (var i = 0; i < mounted.length; i++) {
      var inst = mounted[i]
      if (inst.preset.onMove) inst.preset.onMove(state.x, state.y, inst)
    }
  }

  function onPointerDown(e) {
    state.down = true
    for (var i = 0; i < mounted.length; i++) {
      var inst = mounted[i]
      if (inst.preset.onClick) inst.preset.onClick(e.clientX, e.clientY, inst)
    }
  }

  function onPointerUp() { state.down = false }

  function onVisibility() {
    if (doc.hidden) stop()
    else if (state.seen) start()
  }

  /* — Hover hit-testing --------------------------------------------------
   * One elementFromPoint per frame for the whole page, shared by every
   * mounted preset. Presets never hit-test themselves.
   */

  /* An author scopes a target to particular presets by listing their keys:
   *   <button data-st-cfx-target="magnetic">        only Magnetic reacts
   *   <span   data-st-cfx-target="magnetic trail">  both react
   *   <a      data-st-cfx-target>                   every mounted preset
   * An empty value means "all", so unscoped markup keeps working. */
  function allows(el, preset) {
    var list = el.getAttribute(config.hoverAttr)
    if (!list) return true
    return (' ' + list + ' ').indexOf(' ' + preset.key + ' ') !== -1
  }

  function hitTest() {
    if (!state.seen) return
    var el   = doc.elementFromPoint(state.x, state.y)
    var next = el ? el.closest(config.hoverSelector) : null
    if (next === state.hovered) return
    state.hovered = next

    // One hit-test, then a per-instance diff: two presets scoped to different
    // targets each see only their own enter/leave pair.
    for (var i = 0; i < mounted.length; i++) {
      var inst = mounted[i]
      var want = (next && allows(next, inst.preset)) ? next : null
      if (want === inst.hovered) continue

      if (inst.hovered && inst.preset.onHoverLeave) {
        inst.preset.onHoverLeave(inst.hovered, inst)
      }
      inst.hovered = want
      if (want && inst.preset.onHoverEnter) inst.preset.onHoverEnter(want, inst)
    }
  }

  /* — Loop --------------------------------------------------------------- */

  function frame(now) {
    state.rafId = win.requestAnimationFrame(frame)

    var dt = state.lastTime ? Math.min((now - state.lastTime) / 1000, 0.05) : 0.016
    state.lastTime = now

    hitTest()

    if (ctx2d) ctx2d.clearRect(0, 0, win.innerWidth, win.innerHeight)

    for (var i = 0; i < mounted.length; i++) {
      var inst = mounted[i]
      if (inst.preset.render) inst.preset.render(ctx2d, dt, inst)
    }
  }

  function start() {
    if (state.running || !state.inited) return
    if (state.reduced && config.respectReducedMotion) return
    state.running  = true
    state.lastTime = 0
    state.rafId    = win.requestAnimationFrame(frame)
  }

  function stop() {
    if (!state.running) return
    state.running = false
    win.cancelAnimationFrame(state.rafId)
    state.rafId = 0
  }

  /* — Public API --------------------------------------------------------- */

  var API = {

    version: '0.0.0',

    /** Preset registry. Preset files attach themselves here on load. */
    presets: {},

    /** Read-only engine state, for presets and for debugging. */
    state: state,

    init: function (opts) {
      if (!win || !doc) return API          // SSR: no-op, stays safe to call
      if (state.inited) return API

      for (var k in (opts || {})) {
        if (Object.prototype.hasOwnProperty.call(opts, k)) config[k] = opts[k]
      }

      // slot indices, so release() is O(1) without a lookup
      pool = new Pool(config.maxParticles)
      for (var i = 0; i < pool.size; i++) pool.items[i]._i = i

      var mm = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)')
      state.reduced = !!(mm && mm.matches)
      if (mm && mm.addEventListener) {
        mm.addEventListener('change', function (e) {
          state.reduced = e.matches
          if (state.reduced && config.respectReducedMotion) stop()
          else if (state.seen) start()
        })
      }

      state.tier = config.tier === 'auto' ? detectTier() : 'high'

      doc.addEventListener('pointermove', onPointerMove, { passive: true })
      doc.addEventListener('pointerdown', onPointerDown, { passive: true })
      doc.addEventListener('pointerup',   onPointerUp,   { passive: true })
      doc.addEventListener('visibilitychange', onVisibility)

      state.inited = true
      return API
    },

    /**
     * Mount a preset. Returns an instance carrying the preset's own methods,
     * plus unmount(). Mounting the same preset twice gives two independent
     * instances sharing one particle budget.
     */
    mount: function (preset, options) {
      if (!state.inited) API.init()
      if (!state.inited || !preset) return null

      var merged = {}
      var d = preset.defaults || {}
      var k
      for (k in d) if (Object.prototype.hasOwnProperty.call(d, k)) merged[k] = d[k]
      for (k in (options || {})) {
        if (Object.prototype.hasOwnProperty.call(options, k)) merged[k] = options[k]
      }

      var inst = {
        preset:  preset,
        options: merged,
        pool:    pool,
        engine:  API,
        canvas:  null,
        hovered: null,                     // this preset's current hover target
        local:   {},                       // preset scratch space
        unmount: function () { API.unmount(inst) }
      }

      if (preset.type === 'canvas') {
        ensureCanvas()
        canvasUse++
        inst.canvas = canvas
      }

      mounted.push(inst)
      if (preset.onMount) preset.onMount(inst)

      // Preset-unique methods are copied onto the instance, bound to it.
      var m = preset.methods || {}
      for (k in m) {
        if (Object.prototype.hasOwnProperty.call(m, k)) {
          inst[k] = (function (fn) {
            return function () {
              var args = Array.prototype.slice.call(arguments)
              args.push(inst)
              return fn.apply(null, args)
            }
          })(m[k])
        }
      }

      if (state.seen) start()
      return inst
    },

    unmount: function (inst) {
      var i = mounted.indexOf(inst)
      if (i === -1) return
      mounted.splice(i, 1)
      if (inst.preset.dispose) inst.preset.dispose(inst)
      pool.releaseAllOwnedBy(inst)
      if (inst.preset.type === 'canvas' && --canvasUse === 0) destroyCanvas()
      if (mounted.length === 0) stop()
    },

    /** Tear everything down and return the page to its pre-init state. */
    destroy: function () {
      if (!state.inited) return
      while (mounted.length) API.unmount(mounted[mounted.length - 1])
      stop()
      destroyCanvas()
      doc.removeEventListener('pointermove', onPointerMove)
      doc.removeEventListener('pointerdown', onPointerDown)
      doc.removeEventListener('pointerup',   onPointerUp)
      doc.removeEventListener('visibilitychange', onVisibility)
      dropProbe()
      state.inited = false
      state.seen   = false
      state.hovered = null
      pool = null
    },

    /** Register a preset without a global — for ESM/bundler consumers. */
    use: function (preset) {
      if (preset && preset.name) API.presets[preset.name] = preset
      return API
    },

    tier: function () { return state.tier },

    /** Shared colour handling — see colorStops() above. */
    colors: {
      stops:   colorStops,
      at:      colorAt,
      resolve: resolveVar
    },

    /**
     * The mounted instance for a preset key, or null. Declarative pages get no
     * return value from mount(), so this is how they reach an instance later —
     * `CursorFX.get('trail').setColor('#0f0')`. Mirrors Swiper putting its
     * instance on the element.
     */
    get: function (key) {
      for (var i = 0; i < mounted.length; i++) {
        if (mounted[i].preset.key === key) return mounted[i]
      }
      return null
    },

    /** Free particle slots remaining in the global budget. */
    budget: function () { return pool ? pool.freeN : 0 }
  }

  /* ─── Declarative init ───────────────────────────────────────────────────
   * Everything above is available imperatively, but no page should have to use
   * it. Name the presets you want on any element and set options as attributes;
   * the engine mounts them on DOMContentLoaded with no script of your own:
   *
   *   <body data-st-cursorfx="trail magnetic"
   *         data-st-cfx-trail-color="#ff2d55"
   *         data-st-cfx-trail-count="5"
   *         data-st-cfx-magnetic-strength="0.4"
   *         data-st-cfx-max-particles="400">
   *
   * Values are coerced the way an author would expect: "true"/"false" and a
   * bare attribute become booleans, anything numeric becomes a number, the rest
   * stays a string. Option names are the camelCase ones from the docs written
   * in kebab-case — hoverBoost is hover-boost, maxArcs is max-arcs.
   */

  function coerce(v) {
    // A token reference is resolved before coercion, so numbers and booleans
    // can come from CSS variables as readily as colours can.
    if (typeof v === 'string' && v.indexOf('var(') === 0) v = resolveVar(v)
    if (v === '' || v === 'true') return true
    if (v === 'false') return false
    if (v !== null && v !== '' && !isNaN(v)) return Number(v)
    return v
  }

  function camel(s) {
    return s.replace(/-([a-z])/g, function (m, c) { return c.toUpperCase() })
  }

  // Engine options, which carry no preset prefix.
  var ENGINE_OPTS = ['max-particles', 'z-index', 'tier', 'hover-selector',
                     'respect-reduced-motion']

  function presetByKey(key) {
    for (var name in API.presets) {
      if (API.presets[name].key === key) return API.presets[name]
    }
    return null
  }

  function autoInit() {
    if (!doc) return
    var host = doc.querySelector('[data-st-cursorfx]')
    if (!host) return

    var wanted = (host.getAttribute('data-st-cursorfx') || '').trim()
    var keys   = wanted ? wanted.split(/\s+/) : []
    if (!keys.length) return

    // Longest key first, so "cursor-morph" is matched before any shorter key
    // that happens to prefix it.
    var known = keys.slice().sort(function (a, b) { return b.length - a.length })

    var engineOpts = {}
    var presetOpts = {}
    var i

    for (i = 0; i < host.attributes.length; i++) {
      var attr = host.attributes[i]
      if (attr.name.indexOf('data-st-cfx-') !== 0) continue
      var rest = attr.name.slice('data-st-cfx-'.length)

      var matched = null
      for (var k = 0; k < known.length; k++) {
        if (rest.indexOf(known[k] + '-') === 0) { matched = known[k]; break }
      }

      if (matched) {
        var opt = rest.slice(matched.length + 1)
        ;(presetOpts[matched] = presetOpts[matched] || {})[camel(opt)] = coerce(attr.value)
      } else if (ENGINE_OPTS.indexOf(rest) !== -1) {
        engineOpts[camel(rest)] = coerce(attr.value)
      }
      // Anything else is left alone rather than guessed at.
    }

    API.init(engineOpts)

    var missing = []
    for (i = 0; i < keys.length; i++) {
      var preset = presetByKey(keys[i])
      if (!preset) { missing.push(keys[i]); continue }
      API.mount(preset, presetOpts[keys[i]] || {})
    }

    // A preset named in markup whose script was never loaded would otherwise
    // do nothing at all, with no clue why.
    if (missing.length && win.console) {
      win.console.warn(
        '[CursorFX] data-st-cursorfx names ' + missing.length + ' preset(s) that are ' +
        'not loaded: ' + missing.join(', ') + '. Add their script tag(s), e.g. ' +
        '<script src=".../presets/' + missing[0] + '/' + missing[0] + '.js"><\/script>'
      )
    }
  }

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoInit)
    else autoInit()
  }

  return API
}))
