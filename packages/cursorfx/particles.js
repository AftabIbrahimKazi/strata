/**
 * Strata CursorFX — particle pipeline
 *
 * The shared machinery behind every canvas effect: emission, ageing,
 * integration and drawing. Four presets each carried their own copy of this
 * loop; it lives here once, and a preset becomes a recipe naming which
 * behaviours to run.
 *
 * This is NOT part of the engine, deliberately. Magnetic, HoverFlicker, Reveal
 * and CursorMorph are DOM effects that never emit a particle, and a page
 * running only those must not download or execute any of this. The engine
 * stays the thing that knows about pointers, layout and the pool; this file is
 * the thing that knows about particles.
 *
 * Three axes, each a separate file under behaviours/ that self-registers:
 *
 *   origin  where a particle is born, and with what initial velocity
 *   motion  how it moves each frame
 *   render  how it is drawn each frame
 *
 * A recipe picks one of each, plus the triggers it emits on:
 *
 *   Particles.recipe({
 *     name: 'Smoke', key: 'smoke',
 *     motion: 'curl', render: 'puff',
 *     emit: { move: { mode: 'distance' } },
 *     defaults: { ... }
 *   })
 *
 * It returns a plain preset object satisfying the engine's existing contract,
 * so the engine needed no changes to support any of this.
 *
 * None of this vocabulary is meant to reach someone who just wants smoke on
 * their page — they write `smoke: { color: '…' }` and never learn that a
 * motion axis exists. It is the door for building a new effect, not for using
 * one.
 */

;(function (root, factory) {
  var P = factory()
  if (typeof define === 'function' && define.amd) {
    define([], function () { return P })
  } else if (typeof module === 'object' && module.exports) {
    module.exports = P
  } else {
    var fx = (root.Strata && root.Strata.CursorFX) || root.StrataCursorFX
    if (fx) fx.particles = P
    root.StrataCursorFXParticles = P
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  var TAU = 6.283185307

  /* ─── Behaviour registry ──────────────────────────────────────────────────
   * Populated by the behaviour files themselves as they load, exactly the way
   * presets populate the engine's registry. There is deliberately no barrel
   * module importing the full set: a page that uses Smoke loads `curl` and
   * `puff` and never receives `segment`, `bolt` or `ballistic`. A barrel here
   * would quietly undo the whole point of splitting the package up.
   */

  var registry = { origin: {}, motion: {}, render: {} }

  function behaviour(axis, def) {
    if (!registry[axis]) throw new Error('CursorFX: unknown behaviour axis "' + axis + '"')
    if (!def || !def.name) return
    registry[axis][def.name] = def
  }

  /* A missing behaviour is named out loud. Silence here would look exactly
   * like a working effect that happens to draw nothing, which is the single
   * most expensive kind of bug this package can ship. */
  function need(axis, name, recipeName) {
    var def = registry[axis][name]
    if (!def) {
      warn('CursorFX: ' + recipeName + ' needs the "' + name + '" ' + axis +
           ' behaviour, which is not loaded. Add ' +
           'presets/behaviours/' + axis + '/' + name + '.js to the page.')
      return null
    }
    return def
  }

  function warn(msg) {
    if (typeof console !== 'undefined' && console.warn) console.warn(msg)
  }

  /* ─── Per-behaviour scratch space ─────────────────────────────────────────
   * Each behaviour gets its own scope object per mounted instance. Two reasons
   * it cannot simply write onto `inst.local` or onto the particle:
   *
   *   - the pool clears `data` on both acquire and release, which is what
   *     stops presets leaking state into each other;
   *   - once `curl` is shared by several recipes, two instances of it must not
   *     see each other's seeds.
   *
   * `scope.slots()` hands back an array indexed by pool slot, allocated once.
   * A behaviour storing per-particle state uses it and allocates nothing after
   * a slot's first use — the pattern Spark's jag store and Smoke's curl seeds
   * arrived at independently, now available to every behaviour by default.
   */

  function makeScope(inst) {
    var size = inst.pool.size
    return {
      size: size,
      slots: function (fill) {
        var a = new Array(size)
        for (var i = 0; i < size; i++) a[i] = fill === undefined ? 0 : fill
        return a
      }
    }
  }

  /* ─── Emission ────────────────────────────────────────────────────────────
   * Three modes cover every emitter across the four canvas presets. They are
   * genuinely different rules, not one rule with knobs:
   *
   *   fixed     n particles per pointer move, whatever the speed   (Trail)
   *   distance  one per `rate` px travelled, capped at `count`     (Smoke)
   *   chance    emit with probability speed/gate                   (Spark)
   *
   * A fourth mode would be a smell; if a new effect needs one, it probably
   * wants `chance` with a different gate.
   */

  function moveCount(mode, o, speed, boost) {
    var n
    if (mode === 'distance') {
      n = Math.min(o.count, Math.ceil(speed / (o.rate || 1)))
    } else if (mode === 'chance') {
      var chance = Math.min(speed / (o.speedGate || 1), 1) * boost
      return Math.random() > chance ? 0 : Math.round(o.count)
    } else {
      n = o.count
    }
    return Math.round(n * boost)
  }

  /* ─── Recipe ──────────────────────────────────────────────────────────────
   * Assembles a preset object from behaviour names. Everything the engine
   * calls is wired here once, so a recipe file carries no loop of its own.
   */

  function recipe(spec) {
    var emit = spec.emit || {}

    var preset = {
      name: spec.name,
      key:  spec.key,
      type: 'canvas',
      defaults: spec.defaults || {},

      onMount: function (inst) {
        var L = inst.local

        L.origin = {}
        L.scope  = {}

        // Resolve behaviours once, at mount, so a missing one warns on mount
        // rather than sixty times a second from inside the render loop.
        L.motion = need('motion', spec.motion, spec.name)
        L.render = need('render', spec.render, spec.name)

        for (var trig in emit) {
          if (!Object.prototype.hasOwnProperty.call(emit, trig)) continue
          var oname = emit[trig].origin || 'pointer'
          L.origin[trig] = need('origin', oname, spec.name)
          // Scoped per trigger, not per origin name: Spark runs `edge` on
          // hover and `ring` on click, and neither may see the other's state.
          L.scope['origin:' + trig] = makeScope(inst)
        }
        if (L.motion) L.scope.motion = makeScope(inst)
        if (L.render) L.scope.render = makeScope(inst)

        // Colour is resolved once here for every recipe, replacing the
        // identical onMount/setColor pair that had been copied into six
        // preset files.
        L.stops = inst.engine.colors.stops(inst.options.color, spec.name + ' color')

        L.boost = 1
        L.acc   = 0        // hover emission clock
        L.el    = null
        L.rect  = null
        L.t     = 0        // field time, for motions that evolve

        if (L.motion && L.motion.init) L.motion.init(inst, L.scope.motion)
        if (L.render && L.render.init) L.render.init(inst, L.scope.render)
        if (spec.onMount) spec.onMount(inst)
      },

      onMove: function (x, y, inst) {
        var cfg = emit.move
        if (!cfg) return
        var o  = inst.options
        var st = inst.engine.state
        var L  = inst.local

        var dx = x - st.px
        var dy = y - st.py
        // This frame's motion, unsmoothed. A rolling average lags by a few
        // frames and every effect built on it stops feeling like it is
        // responding to the hand.
        var speed = Math.sqrt(dx * dx + dy * dy)
        if (speed < (o.minSpeed || 0)) return

        var boost = L.boost * (st.down && o.dragBoost ? o.dragBoost : 1)
        var n = moveCount(cfg.mode, o, speed, boost)
        if (n <= 0) return

        var ctxo = { x: x, y: y, dx: dx, dy: dy, speed: speed,
                     norm: Math.min(1, speed / (o.speedGate || 1)) }
        emitN(inst, 'move', n, ctxo)
      },

      onClick: function (x, y, inst) {
        var cfg = emit.click
        if (cfg) {
          emitN(inst, 'click', inst.options[cfg.count || 'burst'] || 0,
                { x: x, y: y, dx: 0, dy: 0, speed: 0, norm: 1 })
        }
        if (spec.onClick) spec.onClick(x, y, inst)
      },

      onHoverEnter: function (el, inst) {
        inst.local.boost = inst.options.hoverBoost || 1
        if (!emit.hover) return
        inst.local.el   = el
        // Measured once per hover: a getBoundingClientRect per frame is a
        // layout thrash, and the engine's contract forbids it.
        inst.local.rect = el.getBoundingClientRect()
        inst.local.acc  = 0
      },

      onHoverLeave: function (el, inst) {
        inst.local.boost = 1
        inst.local.el    = null
        inst.local.rect  = null
      },

      render: function (ctx, dt, inst) {
        if (!ctx) return
        var o = inst.options
        var L = inst.local
        if (!L.motion || !L.render) return

        L.t += dt * (o.curlSpeed || 1)

        // Hover emission runs off the frame clock rather than a timer, so it
        // stops dead when the engine pauses for a hidden tab.
        var hcfg = emit.hover
        if (hcfg && L.el && o.hoverRate > 0) {
          L.acc += dt * 1000
          while (L.acc >= o.hoverRate) {
            L.acc -= o.hoverRate
            emitN(inst, 'hover', 1, { x: inst.engine.state.x, y: inst.engine.state.y,
                                      dx: 0, dy: 0, speed: 0, norm: 1, rect: L.rect },
                  o.hoverOrigin)
          }
        }

        var motion = L.motion
        var render = L.render
        var ms = L.scope.motion
        var rs = L.scope.render

        // Canvas state is saved and restored around the recipe's own draws.
        // The canvas is shared by every mounted canvas preset, so a render
        // behaviour leaving `lighter` or a shadow set would silently change
        // how the next preset in mount order draws.
        var prevOp    = ctx.globalCompositeOperation
        var prevAlpha = ctx.globalAlpha

        if (render.begin) render.begin(ctx, o, rs, inst)

        inst.pool.forEachOwnedBy(inst, function (p) {
          p.life += dt
          if (p.life >= p.maxLife) { inst.pool.release(p); return }

          motion.step(p, dt, o, ms, L)

          // Age is the one number every behaviour agrees on: 0 at birth, 1 at
          // death. Colour, alpha and size all derive from it, which is what
          // lets a gradient lie along an effect rather than scatter across it.
          var age = p.life / p.maxLife
          render.draw(ctx, p, age, dt, o, rs, inst)
        })

        if (render.end) render.end(ctx, o, rs, inst)
        // `onRender`, not `render`: `render` on a spec is the behaviour name.
        // Reusing it for the hook meant calling a string as a function.
        if (spec.onRender) spec.onRender(ctx, dt, inst)

        ctx.globalAlpha = prevAlpha
        ctx.globalCompositeOperation = prevOp
        ctx.shadowBlur = 0
      },

      dispose: function (inst) {
        if (spec.dispose) spec.dispose(inst)
        inst.local = {}
      },

      methods: {}
    }

    // Every recipe gets setColor for free. This is the duplication that was
    // spread across six preset files, each with its own copy and its own
    // chance of forgetting to re-resolve the stops.
    preset.methods.setColor = function (css, inst) {
      inst.options.color = css
      inst.local.stops = inst.engine.colors.stops(css, spec.name + ' color')
    }

    for (var m in (spec.methods || {})) {
      if (Object.prototype.hasOwnProperty.call(spec.methods, m)) {
        preset.methods[m] = spec.methods[m]
      }
    }

    return preset
  }

  /* Emit n particles through one trigger's origin behaviour. The origin owns
   * position and initial velocity; the pipeline owns life, size and colour, so
   * every effect ages and fades the same way. */
  function emitN(inst, trigger, n, ctxo, originName) {
    var o = inst.options
    var L = inst.local
    // An option may swap the origin at runtime (Spark's `hoverOrigin`). An
    // unloaded name falls back to the recipe's own rather than emitting
    // nothing, so a bad value degrades instead of silently going dark.
    var origin = (originName && registry.origin[originName]) || L.origin[trigger]
    if (!origin) return

    var scope = L.scope['origin:' + trigger]

    for (var i = 0; i < n; i++) {
      var p = inst.pool.acquire(inst)
      if (!p) return                        // global budget spent — drop silently

      // Life and size variance are one-sided fractions of the configured
      // value, never above it: `lifeVary: 0.4` means 60–100% of `life`. Each
      // recipe carries the figure its hand-written version used, so the
      // refactor is visually identical rather than merely similar.
      var lv = o.lifeVary === undefined ? 0.4 : o.lifeVary
      var sv = o.sizeVary === undefined ? 0   : o.sizeVary

      p.life    = 0
      p.maxLife = o.life * (1 - lv + Math.random() * lv)
      p.size    = (o.size + ctxo.norm * (o.sizeBoost || 0)) *
                  (1 - sv + Math.random() * sv)
      p.a       = 1
      // Where this particle sat in its emission, 0..1. A render behaviour uses
      // it to lay a gradient across the shape of a burst rather than along
      // time — the difference between a burst that fans between two colours
      // and one that flickers between them.
      p.seedT   = n > 1 ? i / (n - 1) : 0
      // `heading` is the one field an origin writes for a render to read
      // (a streak needs to know which way it points). Set here so every
      // pooled object has the field from its first use rather than growing
      // a new shape mid-run.
      p.heading = 0

      origin.seed(p, ctxo, o, scope, i, n)

      if (L.motion && L.motion.spawn) L.motion.spawn(p, o, L.scope.motion)
      if (L.render && L.render.spawn) L.render.spawn(p, o, L.scope.render, L.stops)
    }
  }

  return {
    TAU: TAU,
    behaviour: behaviour,
    recipe: recipe,
    registry: registry,

    /** Emit through a recipe's own trigger — for methods like burst()/puff(). */
    emit: function (inst, trigger, n, x, y) {
      emitN(inst, trigger, n, { x: x, y: y, dx: 0, dy: 0, speed: 0, norm: 1,
                                rect: inst.local.rect })
    },

    /** Colour at a point in 0..1 along the recipe's stops. */
    colorAt: function (inst, t) {
      return inst.engine.colors.at(inst.local.stops, t)
    }
  }
}))
