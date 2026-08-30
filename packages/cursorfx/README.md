# @strata-packages/cursorfx

Modular cursor effects. One shared engine, nine opt-in presets.

Works standalone or with [Strata CSS](https://strata-css-docs-site.vercel.app).

## Why it's structured this way

A project uses **one** cursor effect, not six. So the engine and the presets
ship as separate files — you load the core plus the single preset you want, and
nothing else reaches the browser. Same idea as Swiper's modules.

Nothing is bundled and there is no build step: `cursorfx.js` is the engine, and
each preset is its own file, so a page ships the engine plus only what it
mounts. Canvas presets additionally need the particle pipeline and the
behaviours they name — see [What a canvas preset needs](#what-a-canvas-preset-needs).
Behaviours are separate files for the same reason presets are, and there is
deliberately no barrel module collecting them.

## Install

```bash
npm i @strata-packages/cursorfx
```

## Use — no JavaScript

Name the presets you want and set their options as attributes. That is the whole
integration:

```html
<script src="node_modules/@strata-packages/cursorfx/cursorfx.js"></script>

<!-- Canvas presets are built from behaviours; load the pipeline and the ones
     Trail names, in this order. See "What a canvas preset needs" below. -->
<script src="node_modules/@strata-packages/cursorfx/particles.js"></script>
<script src="node_modules/@strata-packages/cursorfx/behaviours/origin/pointer.js"></script>
<script src="node_modules/@strata-packages/cursorfx/behaviours/motion/ballistic.js"></script>
<script src="node_modules/@strata-packages/cursorfx/behaviours/render/dot.js"></script>

<script src="node_modules/@strata-packages/cursorfx/presets/trail/trail.js"></script>

<body data-st-cursorfx="trail"
      data-st-cfx-trail-color="#ff2d55"
      data-st-cfx-trail-count="5">
```

**DOM presets need none of that.** `Magnetic`, `HoverFlicker`, `CursorMorph` and
`Reveal` emit no particles, so they are the engine plus their one file:

```html
<script src="node_modules/@strata-packages/cursorfx/cursorfx.js"></script>
<script src="node_modules/@strata-packages/cursorfx/presets/magnetic/magnetic.js"></script>
```

Options are the ones documented below, written in kebab-case — `hoverBoost`
becomes `hover-boost`, `maxArcs` becomes `max-arcs`. Values are coerced the way
you would expect: `"true"`/`"false"` (or a bare attribute) become booleans,
anything numeric becomes a number, everything else stays a string. Anything you
leave out keeps its default.

Mount several at once, each configured independently:

```html
<body data-st-cursorfx="trail magnetic"
      data-st-cfx-trail-color="#ff2d55"
      data-st-cfx-magnetic-strength="0.45"
      data-st-cfx-max-particles="400">
```

Engine options (`max-particles`, `z-index`, `tier`, `hover-selector`,
`respect-reduced-motion`) take no preset prefix.

Need a handle afterwards? `CursorFX.get('trail').setColor('#0f0')`.

A preset named in markup whose script is not on the page warns in the console
rather than failing silently.

## Use — with JavaScript

Everything above is available imperatively when you want runtime control:

```js
import CursorFX from '@strata-packages/cursorfx'

// Canvas presets: the behaviours register themselves on import.
import '@strata-packages/cursorfx/behaviours/origin/pointer'
import '@strata-packages/cursorfx/behaviours/motion/ballistic'
import '@strata-packages/cursorfx/behaviours/render/dot'
import Trail from '@strata-packages/cursorfx/presets/trail'

CursorFX.init()
const trail = CursorFX.mount(Trail, { color: '#ff2d55' })
```

Preset files register themselves on `CursorFX.presets` when loaded as globals.
Under a bundler, import the preset and pass it to `mount()` directly (or
`CursorFX.use(Trail)` to put it on `presets` by name).

## With Strata

CursorFX installs and loads separately from `strata-css`, the same as `flipbook`
and `picker` — Strata's CLI does not bundle it. Load the engine, then the presets
you mount:

```html
<link rel="stylesheet" href="dist/strata.output.css">
<script src="dist/strata.components.js"></script>

<script src="node_modules/@strata-packages/cursorfx/cursorfx.js"></script>
<script src="node_modules/@strata-packages/cursorfx/presets/trail/trail.js"></script>
```

When Strata is on the page the engine registers as `Strata.CursorFX`; on its own
it registers as `StrataCursorFX`. Declarative init works either way.

## Colours

Any preset colour accepts what CSS accepts — including a gradient, and including
one that lives in a custom property:

```html
data-st-cfx-trail-color="#ff2d55"
data-st-cfx-trail-color="rebeccapurple"
data-st-cfx-trail-color="hsl(340 90% 60%)"
data-st-cfx-trail-color="linear-gradient(90deg, #ff2d55, #7df9ff)"
data-st-cfx-trail-color="var(--brand-fade)"
data-st-cfx-trail-color="#ff2d55 #7df9ff"
```

```css
:root { --brand-fade: linear-gradient(90deg, #ff2d55 0%, #7df9ff 80%, #fff); }
```

Gradients are parsed for their **stops**; the geometry (angle, `to right`,
`circle at …`) is ignored, because each preset already decides how stops map
onto what it draws. `linear-`, `radial-` and `conic-gradient` all work, as do
`repeating-` variants. Percentage stop positions are honoured, so
`#000 0%, #f00 80%, #fff` places its colours where you wrote them; lengths are
not, since they would need a drawn size the stops know nothing about.

Colour values themselves can be anything CSS understands — hex, `rgb()`,
`hsl()`, named colours, `color-mix()` — resolved through the browser rather
than a built-in table. `var(--token)` is resolved from `<html>`'s computed
style, may chain to other tokens, and may carry a fallback.

**How stops are used differs per preset**, since painting a literal gradient is
rarely what you want:

| Preset | With two or more stops |
|---|---|
| Trail | colour is a function of particle **age** — stop 0 sits at the pointer and shades toward the last stop down the tail, so the gradient lies *along* the trail |
| ClickBurst | colour follows position **around the ring**, so the burst fans from one colour to the other |
| Electric | a real `CanvasGradient` **along each bolt** — first stop at the pointer, last at the target |

A value no preset can use warns in the console, naming the value and the
accepted forms, rather than silently rendering white.

`Magnetic` has no colour. `HoverFlicker` and `CursorMorph` are CSS-driven and
take a single colour — both default to `currentColor`.

Every other option can reference a token too:
`data-st-cfx-trail-count="var(--fx-density)"` is resolved before it is coerced.

## What a canvas preset needs

The five canvas presets are **recipes**: an origin, a motion and a render, each
its own file, sharing one pipeline. Load `particles.js` plus the behaviours your
preset names, then the preset. Order matters — the pipeline first, behaviours
next, the recipe last.

| Preset | origin | motion | render |
|---|---|---|---|
| `Trail` | `pointer` | `ballistic` | `dot` |
| `ClickBurst` | `ring` | `ballistic` | `dot` |
| `Spark` | `pointer`, `ring`, `edge` | `ballistic` | `segment` |
| `Smoke` | `pointer` | `curl` | `puff` |
| `Electric` | — | — | — (draws arcs, emits no particles) |

A recipe naming a behaviour that is not loaded warns in the console with the
exact file to add, rather than rendering nothing.

`Magnetic`, `HoverFlicker`, `CursorMorph` and `Reveal` are DOM effects and load
none of this.

## Composing your own

Combine the same behaviours differently and you get effects nothing ships — no
new file, no new preset:

```js
const turbulent = CursorFX.particles.recipe({
  name: 'Turbulent', key: 'turbulent',
  motion: 'curl',        // Smoke's motion…
  render: 'segment',     // …driving Spark's shape
  emit: { move: { origin: 'pointer', mode: 'fixed' } },
  defaults: { color: '#7df9ff', count: 4, life: 0.8, size: 7 }
})
CursorFX.mount(turbulent)
```

`mode` is how a move emits: `fixed` (n per move), `distance` (one per `rate` px
travelled, capped at `count`) or `chance` (probability `speed / speedGate`).
Triggers are `move`, `click` and `hover`, and one recipe may use all three with
a different origin each — that is what `Spark` does.

`examples/cursorfx.html` §10 has every combination behind three dropdowns.

**What this costs.** The pipeline plus its behaviours is *more* code than the
four hand-written presets it replaced — a Trail-only page went from about 1.4 kB
to 7.5 kB gzipped. It buys composition and makes new effects cheap to add; it
does not make the package smaller. If you only ever mount one stock preset, that
is a real price for a feature you will not use.

## Presets

| Preset | Kind | What it does |
|---|---|---|
| `Trail` | canvas | Fading particles along the pointer path |
| `ClickBurst` | canvas | Radial particle burst on click, optional shock ring |
| `Electric` | canvas | Jagged arcs from the pointer to nearby hover targets |
| `Magnetic` | DOM | Hover targets lean toward the pointer |
| `HoverFlicker` | DOM | Hovered targets flicker like failing neon |
| `CursorMorph` | DOM | A dot that morphs into the outline of what it's over |
| `Reveal` | DOM | The pointer opens a soft hole in the top layer, showing what is beneath |
| `Spark` | canvas | Short electric streaks thrown off the pointer, clicks, and hover-target edges |
| `Smoke` | canvas | Soft volumetric smoke that curls off the pointer path |

### Options

**Trail** — `color`, `count` (per move), `size`, `life` (s), `spread`,
`gravity`, `shrink`, `hoverBoost`
Methods: `setColor(css)`, `setParticleCount(n)`

**ClickBurst** — `color`, `count`, `velocity`, `life`, `size`, `gravity`,
`drag`, `ring`
Methods: `setColor(css)`, `burst(x, y)`

**Electric** — `color`, `selector`, `radius`, `maxArcs`, `jitter`, `segments`,
`width`, `glow`, `refreshMs`
Methods: `setColor(css)`, `refreshTargets()`
Uses no particles, so it composes freely with `Trail` or `ClickBurst`.

**Magnetic** — `strength` (0–1), `max` (px ceiling), `scale`
Methods: `setStrength(n)`

**HoverFlicker** — `color`, `duration` (ms)
Methods: `setColor(css)`, `setSpeed(ms)`

**CursorMorph** — `size`, `color`, `radius`, `ease`, `padding`, `hideNative`,
`zIndex`
Methods: `setColor(css)`, `setSize(px)`

### Spark

Jagged electric streaks, thrown off three things at once: pointer movement,
clicks, and the borders of hover targets.

```html
<body data-st-cursorfx="spark"
      data-st-cfx-spark-color="#82c8ff #ffd682"
      data-st-cfx-spark-glow="8">
```

Options: `color`, `count` (per qualifying move), `burst` (per click), `length`,
`segments` (jag detail; `2` is a straight line), `jitter` (lateral displacement
at mid-streak), `width`, `taper`, `life`, `drift`, `spread`, `speedGate`,
`dragBoost`, `glow`, `hoverRate` (ms between edge streaks; `0` disables),
`hoverOrigin` (`edge` | `pointer`)
Methods: `setColor(css)`, `burst(x, y)`

Three details that make it read as electricity rather than noise:

- **A streak's jag is generated once, at birth, and then held still while it
  fades.** Re-randomising the shape each frame — the obvious implementation —
  makes every spark vibrate, and a field of vibrating sparks looks like static.
- **The kink sits mid-streak.** Lateral offsets are scaled by `sin(t·π)`, which
  anchors both ends at zero. Jittering around the origin instead produces a
  hook off the start point.
- **Emission is gated on pointer speed.** A slow drift stays quiet; a fast
  sweep fires. `dragBoost` raises the rate while the pointer is held down.

Streaks taper along their length, which needs one stroke per segment — a single
path can only carry one `lineWidth`. Set `taper: false` to halve the draw calls.

### Smoke

Soft volumetric smoke that curls off the pointer — wave the cursor through it
like a hand through a plume.

```html
<body data-st-cursorfx="smoke"
      data-st-cfx-smoke-color="#beeee0 #35d0a2"
      data-st-cfx-smoke-life="1.4">
```

Options: `color`, `count` (ceiling per move), `rate` (px of travel per puff),
`size`, `sizeBoost` (extra birth radius at full speed), `sizeVary`, `grow`
(px/s), `life` (s), `opacity` (peak alpha of a single puff — they accumulate),
`jitter`, `push` (birth velocity along the heading), `damping`, `curl`,
`curlScale` (field frequency), `curlSpeed`, `speedGate`, `minSpeed`,
`additive`, `hoverBoost`
Methods: `setColor(css)`, `puff(x, y, n)`

Three details decide whether it reads as smoke or as a cloud of dots:

- **Particles are steered by a curl field, not by ballistic velocity.** Two
  independent sine waves per axis make each particle orbit its own centre, which
  looks bloby. One scalar field driving a rotation makes neighbours curl
  coherently around each other, which is what turbulence looks like. The birth
  kick is damped away within a few frames to hand the particle over to the field.
- **Each puff is a radial gradient drawn additively**, so overlaps accumulate
  into volume instead of stacking as visible discs. A multi-stop `color` maps
  across the puff's own radius: stop 0 is the hot core, the last stop is the
  edge it dissolves into.
- **Emission, birth radius and opacity all track this frame's pointer speed,
  unsmoothed.** A rolling average lags by a few frames and the plume stops
  feeling like it is responding to the hand.

This is the most expensive preset in the package — one radial gradient per puff
per frame — and it wants a large share of the particle budget. Raise
`data-st-cfx-max-particles` (default 300, shared by every mounted preset) and
expect a page running Smoke alongside another canvas preset to starve one of
them. `additive: false` and a shorter `life` are the two cheapest dials.

### Reveal

Two stacked layers; the pointer opens a soft hole in the top one. Works for
anything stackable — two images, two button states, two type treatments, two
card faces.

```html
<div data-st-cfx-target="reveal">
  <img src="after.jpg"  alt="">      <!-- revealed underneath -->
  <img src="before.jpg" alt="">      <!-- last child is the masked top layer -->
</div>
```

The container stacks its children in a single grid cell, so both layers size to
the largest and nothing needs absolute positioning or a fixed height.

Options: `radius` (px), `feather` (px, soft edge — `0` for a hard circle),
`opacity` (`0` fully reveals, `1` hides nothing), `fade` (ms, open/close),
`follow` (ms, how closely the hole tracks the pointer), `invert` (show the top
layer *only* inside the circle)
Methods: `setRadius(px)`, `setOpacity(n)`, `setInvert(bool)`

**Tuning it per theme.** Every option is a CSS custom property with a default,
so a stylesheet can retune the effect without touching markup:

```css
:root                  { --st-cfx-reveal-radius: 90px; }
.hero                  { --st-cfx-reveal-feather: 140px; }
[data-st-theme="dark"] { --st-cfx-reveal-opacity: 0.15; }
```

An instance only writes a property inline when it **overrides** the default, so
stylesheet values apply everywhere they were not explicitly set. Per-instance
markup still wins where you use it:

```html
<div data-st-cfx-target="reveal" style="--st-cfx-reveal-radius: 200px">
```

Three things to know:

- Reveal must be named explicitly — `data-st-cfx-target="reveal"`. A bare
  `data-st-cfx-target` (meaning "every preset") deliberately does not match, so
  marking an element for Trail never silently turns it into a grid.
- If the second layer duplicates text, put `aria-hidden="true"` on it or screen
  readers will read it twice.
- The container's rect is measured once per hover, so scrolling *while* hovering
  drifts the hole. Same trade-off as Magnetic.

## Engine API

```js
CursorFX.init({
  maxParticles: 300,      // GLOBAL cap, shared by every mounted preset
  zIndex: 2147483000,
  tier: 'off',            // 'off' | 'auto' | 'manual'
  respectReducedMotion: true,
  hoverSelector: '[data-cursorfx-hover]'
})

const inst = CursorFX.mount(Preset, options)  // returns an instance
inst.unmount()
CursorFX.destroy()        // full teardown, page returns to its original state

CursorFX.tier()           // 'low' | 'mid' | 'high'
CursorFX.budget()         // free particle slots remaining
```

### The particle cap is global

`maxParticles` is the budget for **all presets combined**. Mounting Trail and
ClickBurst together does not double it — they compete for the same pool. A
preset that cannot get a particle drops the emission silently rather than
allocating. Memory use is therefore flat and known at `init()`.

### Device tier

Off by default, and it never acts on its own. Set `tier: 'auto'` and the engine
does best-effort static detection (`hardwareConcurrency`, `deviceMemory`, coarse
pointer), then exposes the answer through `CursorFX.tier()`. What you do with it
is yours:

```js
CursorFX.init({ tier: 'auto' })
if (CursorFX.tier() !== 'low') CursorFX.mount(Trail)
```

### What the engine handles for you

- **One RAF loop**, started lazily on the first real pointer event. A page
  nobody has moved the mouse over never animates.
- **Paused when the tab is hidden**, resumed on return.
- **`prefers-reduced-motion: reduce`** stops the loop entirely, and the CSS
  neutralises the two effects it drives on its own.
- **One canvas**, created only when a canvas preset mounts and removed when the
  last one unmounts.
- **SSR-safe**: `init()` no-ops without `window`/`document` rather than throwing.

## Known limitations

- **Touch**: `pointermove` covers pen and single touch via the Pointer Events
  spec, but multi-touch and touch-specific gestures are not handled.
- **Scoping**: effects are viewport-wide. Confining one to a section is not
  supported yet.
- **Hydration**: `init()` is SSR-safe, but has not been tested against real
  Next.js/Nuxt hydration timing. Call it from an effect/`onMounted`.
- **`CursorMorph` + `hideNative`** hides the OS cursor page-wide. On a page
  where the morph element fails to render, the user is left with no cursor at
  all — set `hideNative: false` if that risk matters to you.

## License

MIT © Aftab Ibrahim Kazi
