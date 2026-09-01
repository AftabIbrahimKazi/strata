# @strata-packages/cursorfx — Developer Reference

## What it is

Cursor effects. One shared engine plus ten independent presets, each in its own
file. A project loads the core and the single preset it uses — the package is
structured this way because nobody ships ten cursor effects at once.

## File map

```
cursorfx.js          The engine. Pool, RAF loop, canvas, pointer, hover hit-test.
cursorfx.css         Global CSS: engine-owned rules + shared API attributes.
particles.js         The particle pipeline. Emission, ageing, integration, draw.

behaviours/origin/   where a particle is born     pointer, ring, edge
behaviours/motion/   how it moves each frame      ballistic, curl
behaviours/render/   how it is drawn each frame   dot, puff, segment

presets/<name>/<name>.js     one folder per preset
presets/<name>/<name>.css    only if that preset needs CSS

  trail/          canvas - particles along the pointer path      (no CSS)
  click-burst/    canvas - radial burst on click                 (no CSS)
  electric/       canvas - arcs to nearby targets, no particles  (no CSS)
  magnetic/       DOM    - targets lean toward the pointer
  hover-flicker/  DOM    - neon flicker on hover
  cursor-morph/   DOM    - dot that morphs to the hovered box
  reveal/         DOM    - pointer opens a hole in the top of two stacked layers
  spark/          canvas - electric streaks off movement, clicks and target edges  (no CSS)
  smoke/          canvas - curl-noise smoke plume off the pointer path   (no CSS)
  line-wave/      DOM    - ripple travels along a line the pointer crosses
```

Nothing here is generated and there is no build step — `cursorfx.js` is the
engine source, loaded directly.

CursorFX installs separately from `strata-css`, like `flipbook` and `picker`,
and is deliberately **not** in the CLI's `COMPONENTS` list. Being there would
concatenate it into `strata.components.js` and warn every `strata-css` consumer
about a package they never asked for. Consumers load `cursorfx.js` themselves,
then the presets they mount. A test asserts the CLI never picks it up.

**What belongs in core.css:** anything the engine itself owns (the canvas), and
anything keyed to a shared API attribute that a second preset would otherwise
duplicate (`data-cursorfx-hide-cursor`). The test: would another preset using
that attribute repeat the rule? If yes, it is global. `data-cursorfx-hover`
deliberately carries no visual rule — presets that animate a target declare
their own, so pages running only canvas presets pay nothing.

## Declarative init

`autoInit()` runs on `DOMContentLoaded` and is the primary way the package is
used — every other `@strata-packages/*` auto-inits from markup, and a JS-first
API inside a declarative framework was the wrong default.

```html
<body data-st-cursorfx="trail magnetic"
      data-st-cfx-trail-color="#ff2d55"
      data-st-cfx-magnetic-strength="0.45"
      data-st-cfx-max-particles="400">
```

- `data-st-cursorfx` holds a space-separated list of **preset keys** (the folder
  names). It is a separate attribute from `data-st-cfx`, which is the identity
  marker on elements the engine creates.
- `data-st-cfx-<key>-<option>` configures one preset. The parser splits on the
  **longest matching preset key**, not the first dash — otherwise
  `cursor-morph-hide-native` would parse as preset `cursor` .
- `data-st-cfx-<option>` with no preset prefix sets an engine option, matched
  against the explicit `ENGINE_OPTS` list rather than guessed.
- Values are coerced by `coerce()`; option names un-kebabed by `camel()`.
- A key naming an unloaded preset warns; unrecognised attributes are ignored
  rather than guessed at.

`API.get(key)` exists because a declarative page never receives the value
`mount()` returns.

## Colour handling lives in the engine

`colorStops()`, `colorAt()` and `resolveVar()` are on the engine and exposed as
`inst.engine.colors`. They were duplicated as a private `parseColor` in Trail and
ClickBurst, which meant an unusable value rendered white in two places with no
warning, and Electric assigned the raw string straight to `strokeStyle` where an
invalid value is silently ignored per spec.

- `stops(value, where)` → array of `[r,g,b]`, with a `.positions` array attached
  when the value was a gradient carrying explicit percentages. Resolves `var()`
  **before** inspecting, so a whole gradient can live in a token; recognises
  `linear-`/`radial-`/`conic-gradient` and extracts their stops, discarding the
  geometry. Splits only at paren depth 0, so commas inside `rgb(…)` and
  `var(--x, #fff)` never split the value. Warns — naming `where` — for anything
  it cannot parse, including a token that resolves to nothing, then falls back
  to white.
- Colour literals go through a regex fast path for hex and `rgb()`, then a
  hidden probe element (`[data-st-cfx="probe"]`) that hands the value to the
  browser — covering named colours, `hsl()`, `oklch()`, `color-mix()` without a
  148-entry table. An invalid value leaves `style.color` empty, which doubles as
  the validity check. `destroy()` removes the probe.
- `at(stops, t)` → interpolated `[r,g,b]` at `t` in 0..1, honouring
  `stops.positions` when present and falling back to even spacing.
- `resolve(value)` → follows `var(--token)` through the computed style of
  `<html>`, including token-to-token chains and `var(--x, fallback)`, with a
  depth guard against cycles.

A preset must not parse colour itself. Multi-stop handling is the preset's
choice: Trail maps to particle age so the gradient lies along the trail (an
earlier version randomised per particle, which is a scatter, not a gradient),
ClickBurst maps to ring position,
Electric builds a real `CanvasGradient` because it strokes between two known
points. `shadowColor` takes no gradient, so Electric's glow uses the first stop.

`coerce()` in the declarative layer resolves `var()` before coercing, so any
option — not just colour — can come from a token.

## Preset contract

A preset is a plain object. Every hook is optional.

```js
{
  name: 'Trail',                  // key under CursorFX.presets
  type: 'canvas' | 'dom',         // 'canvas' makes the engine create the canvas
  defaults: { ... },              // merged with the caller's options at mount

  onMount(inst) {}
  onMove(x, y, inst) {}
  onClick(x, y, inst) {}
  onHoverEnter(el, inst) {}
  onHoverLeave(el, inst) {}
  render(ctx, dt, inst) {}        // ctx is null when no canvas preset is mounted
  dispose(inst) {}

  methods: {                      // copied onto the instance, inst appended as
    setColor(css, inst) {}        // the last argument — caller writes setColor(css)
  }
}
```

`inst` carries `options`, `pool`, `engine`, `canvas`, `local` (preset scratch
space) and `unmount()`.

`render` is called for **every** mounted preset, canvas or not — `CursorMorph`
uses it to interpolate without touching the canvas.

## Rules the engine enforces

- **The particle cap is global.** `pool.acquire()` returns `null` when the
  budget is spent. Presets must handle that by dropping the emission — never by
  allocating a fallback object. This is the whole point of the pool.
- **Presets never hit-test.** The engine runs one `elementFromPoint` per frame
  and calls `onHoverEnter`/`onHoverLeave` on everyone. Calling
  `getBoundingClientRect` per frame in a preset is a layout thrash; measure once
  on hover enter (see `magnetic.js`) or on a timer (see `electric.js`).
- **Presets never add listeners.** The engine owns all pointer and visibility
  events. A preset that attaches its own leaks on `destroy()`.
- **`dispose` must fully undo `onMount`.** `destroy()` is expected to return the
  page to its pre-init state; the jsdom test asserts this.

## Layers and CSS

Do **not** use `@layer cursorfx`. Strata's cascade is `st-base` →
`st-components-{bp}` → `st-utilities-{bp}` → `st-skeleton`, and a bare layer
declared from a package sits outside that order — every unlayered rule on the
page would beat it.

CursorFX ships its CSS in the package, like `chart`, `picker` and `flipbook` —
it is **not** in `src/registry/registry.js`. Only Strata's own component
vocabulary (`modal`, `offcanvas`, `placeholder`, `form-select`) lives there;
putting an add-on package's rules in the registry would ship them to every
strata-css consumer whether or not they installed the package.

Consumers load `core.css` plus the stylesheet of each preset they mount.
There is deliberately no bundled `cursorfx.css`: the JS bundle exists only
because Strata's CLI resolves exactly one file per package, and nothing makes
the same demand of CSS. A bundle sitting beside the split files would only
invite loading every rule twice.

Every attribute carries a meaningful value and every selector matches on that
value. State is expressed by **flipping the value**, never by removing the
attribute — an element removed from the selector has no rule left to run its
exit transition on, which is what forced the old `:not()` hack in magnetic.css.
Only `dispose()` removes an attribute, and it sweeps the document by attribute
rather than clearing the current target, because the pointer may have left
earlier elements already.

| Attribute | On | Values | Written by |
|---|---|---|---|
| `data-st-cfx` | the canvas / the morph element | `"canvas"`, `"morph"` | the engine, CursorMorph |
| `data-st-cfx-target` | any element, **by the author** | preset keys, space-separated; empty = all | nobody — authored |
| `data-st-cfx-magnetic` | a hover target | `"true"` / `"false"` | Magnetic |
| `data-st-cfx-flicker` | a hover target | `"true"` / `"false"` | HoverFlicker |
| `data-st-cfx-cursor` | `<html>` | `"hidden"` | CursorMorph, when `hideNative` |
| `data-st-cfx-reveal` | a reveal container | `"true"` / `"false"` | Reveal |
| `data-st-cfx-reveal-invert` | a reveal container | `"true"` / `"false"` | Reveal |
| `data-st-cfx-reveal-anchor` | a reveal container, **by the author** | `"pointer"` or anything else (pins the hole to `--st-cfx-reveal-x/y`) | Reveal |

Custom properties are all `--st-cfx-*`; the one keyframe is `st-cfx-flicker`.
Preset keys for `data-st-cfx-target` are the folder names: `trail`,
`click-burst`, `electric`, `magnetic`, `hover-flicker`, `cursor-morph`. Each
preset declares its own as `key`.

Colours resolve to `currentColor` by default, so the package needs no colour
tokens and no `prefers-color-scheme` block — it adapts to the host's theme
without participating in it.

## Reveal's token layering

Reveal is the first preset whose options are meant to be set from CSS as well as
from markup, so it writes a custom property **only when the option differs from
the default** (`token()` in reveal.js). Leaving a property unset is what lets a
stylesheet's `--st-cfx-reveal-*` value apply; writing it unconditionally would
make inline style beat every theme rule. Any future preset with themeable
options should copy that.

It is also the first preset with a **structural requirement**: a container with
two stacked children, the last of which is masked. Because the CSS restructures
that container (`display: grid`), it matches `[data-st-cfx-target~="reveal"]`
only — never a bare `[data-st-cfx-target]`, which would turn every Trail target
on the page into a grid.

`--st-cfx-reveal-r`, `-x` and `-y` are registered with `@property` so they can
be transitioned; mask position cannot be animated directly because it lives
inside the gradient. Pointer coordinates are written on the container and eased
there, so the masked child inherits an already-smoothed value.

## Spark's jag store

Spark keeps each streak's lateral offsets in `inst.local.jag`, an array indexed
by the particle's **pool slot** (`p._i`) and sized to the pool at mount. Two
reasons it cannot live on the particle: the pool clears `data` on both acquire
and release (which is what stops presets leaking state into each other), and
allocating an array per spawn would reintroduce the garbage the pool exists to
avoid. Indexed by slot, a streak allocates nothing after that slot's first use.

The shape is generated in `spawn()` and never touched again. Regenerating it in
`render()` is the single easiest way to ruin this preset — the streaks vibrate
and the effect reads as static. A test pins it.

## The behaviour pipeline

Canvas presets are recipes assembled by `particles.js` from three axes. The
engine needed **no changes** for this: `recipe()` returns a plain preset object
satisfying the existing contract, so `mount()` and the pool never learned that
behaviours exist.

`particles.js` is deliberately **not** part of the engine. Magnetic,
HoverFlicker, Reveal and CursorMorph emit nothing, and a page running only those
must never download particle machinery. A test asserts the DOM presets contain
no reference to it.

Rules that hold this together, each pinned by a test:

- **No barrel module.** `behaviours/index.js` must never exist. It is the single
  easiest way to undo the split, and the most tempting when writing a
  convenience entry point.
- **No behaviour imports another.** A behaviour may reach the pipeline and
  nothing else, or one file silently drags a second into every page.
- **`particles.js` names no behaviour.** If the pipeline knows their names the
  registry is decorative.
- **Every behaviour gets a per-instance scope.** Two recipes using `curl` must
  not see each other's seeds, and Spark's three triggers each get their own
  origin scratch space — scoped by trigger, not by origin name, because Spark
  runs `edge` on hover and `ring` on click.
- **A missing behaviour warns by name at mount**, listing the file to add, and
  the recipe degrades instead of throwing sixty times a second.

Two traps worth knowing:

- **`render` on a recipe spec is the behaviour name, not a hook.** The extra
  draw pass is `onRender` (ClickBurst's shock ring uses it). Reusing `render`
  meant calling a string as a function.
- **Life and size variance are one-sided fractions** (`lifeVary: 0.4` → 60–100%
  of `life`). Each recipe carries the figure its hand-written version used, so
  the refactor is visually identical rather than merely similar.

**What it cost.** Measured, gzipped: a Trail-only page went 1.4 kB → 7.5 kB, and
all four canvas presets 5.7 kB → 12.3 kB. Comments stripped, 11.2 kB of code
became 21.2 kB. The duplication removed was ~700 bytes; generality cost more
than it saved. This is a composability win and a size loss, and the README says
so. Do not describe it as making the package lighter.

## Smoke's shared-canvas contract

Smoke is the first preset to touch `globalCompositeOperation`. It saves the
previous value, sets `lighter`, and restores it after its own draws — the canvas
belongs to the engine and every mounted canvas preset draws into it in mount
order, so leaving the mode changed makes a co-mounted `Trail` or `Spark` render
additively for reasons that are invisible in either of their files. Any future
preset changing canvas state must save and restore it the same way, exactly as
Trail and Spark already do for `globalAlpha`.

Its per-particle field constants (`seed`, `curlStrength`) live in two arrays
indexed by pool slot, for the reason described under Spark's jag store — the
pool clears `data` on both acquire and release. Two parallel arrays rather than
one array of objects, so a slot's first use is its only allocation.

Smoke is also the package's first genuinely expensive preset: one
`createRadialGradient` per live particle per frame, and it wants most of the
global budget on its own. That cost is inherent to the look — flat fills read as
discs, not as smoke — but it is the reason the README tells consumers to raise
`maxParticles` and warns that pairing it with another canvas preset starves one
of them.

## LineWave is the CSS-first precedent

It has **no `render` hook at all**. The reference implementation it replaces
(an SVG divider in a Next.js app) rewrote a path `d` attribute every frame via
GSAP; none of that is necessary. One period of a sine is a `mask`, so:

- `cycles` is a `mask-size`
- `travel` is an animated `mask-position`
- the rise-and-fall envelope is `scaleY()`, and `scaleY(0)` **is** the wave's
  resting state — so the finished state and the start state are identical and
  nothing has to be reset
- **the visible line at rest is not the wave.** A mask scales with the box it
  is painted into, so a collapsed wave renders nothing at all. The resting line
  is a separate unmasked `::after` rule, and the two crossfade on one timeline:
  the baseline fades out as the wave rises and back in as it settles, so only
  ever one line is visible. `--st-cfx-wave-rest-opacity: 0` gives a divider
  that is genuinely invisible until touched
- colour is a `background`, which is why every gradient type works for free

The rule this sets for future presets: **if the browser can animate it, do not
animate it from JavaScript.** CursorMorph is the counter-example still
outstanding — it writes five custom properties per frame to do what a CSS
transition does natively.

Shapes are the payoff of that design. `sine`, `zigzag`, `square`, `bars` and
`helix` are path generators of a few lines each, tiled by `mask-repeat`. They
live in the preset file rather than in separate files on purpose — each is
small enough that a per-file wrapper would cost more than the code, which is
the mistake measured three times over in this repo (CursorFX behaviours,
chart, flipbook).

The mask is resolved **per element**, not per instance, because
`data-st-cfx-wave-shape` lets one page mix shapes. `setShape()` skips any
element carrying that attribute — a global setter must not stamp over a
per-element choice.

JS does three things only: build the element once, flip
`data-st-cfx-wave` on hover, and write a custom property where an option
overrides its default. Restarting a running animation needs the attribute to
leave `"true"` and a forced reflow (`void el.offsetWidth`) before it returns,
or re-entering mid-wave does nothing.

## Adding a behaviour

1. Create `behaviours/<axis>/<name>.js`, copying the UMD wrapper from an
   existing one — it self-registers with the pipeline in both Node and the
   browser, and declares `axis` so a test can check it.
2. Add it to `exports` in `package.json` (`files` already ships `behaviours`).
3. Add it to `BEHAVIOURS` in `test/cursorfx.js`.
4. Never import another behaviour from it, and never add an index module.

An origin writes `x`, `y`, `vx`, `vy` and may write `heading`; a motion owns
position per frame; a render owns drawing and must leave canvas state as it
found it. Per-particle state goes in `scope.slots()`, never on the particle —
the pool clears `data` on acquire and release.

## Adding a preset

1. Create `presets/<name>/<name>.js`, copying the UMD wrapper from an existing
   preset — it self-registers onto the engine when loaded as a global.
2. Add it to `exports` in `package.json` (`files` already ships `presets`).
3. Add its name to `PRESET_FILES` in `test/cursorfx.js`.
4. If it needs CSS, put it in `presets/<name>/<name>.css` — never in
   `core.css` unless a second preset would duplicate the rule, and never in
   `src/registry/registry.js`.
5. `node build.js`, then `npm test` from the repo root.

## Conventions this package follows

ES5 syntax (`var`, no arrows) for UMD-global safety, matching every other
`@strata-packages/*`. Flat file layout, `<name>.js` + `<name>.css` at the
package root, because that is what the CLI resolver expects.
