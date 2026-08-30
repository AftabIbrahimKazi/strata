# @strata-packages/cursorfx — Developer Reference

## What it is

Cursor effects. One shared engine plus six independent presets, each in its own
file. A project loads the core and the single preset it uses — the package is
structured this way because nobody ships six cursor effects at once.

## File map

```
cursorfx.js          The engine. Pool, RAF loop, canvas, pointer, hover hit-test.
cursorfx.css         Global CSS: engine-owned rules + shared API attributes.

presets/<name>/<name>.js     one folder per preset
presets/<name>/<name>.css    only if that preset needs CSS

  trail/          canvas - particles along the pointer path      (no CSS)
  click-burst/    canvas - radial burst on click                 (no CSS)
  electric/       canvas - arcs to nearby targets, no particles  (no CSS)
  magnetic/       DOM    - targets lean toward the pointer
  hover-flicker/  DOM    - neon flicker on hover
  cursor-morph/   DOM    - dot that morphs to the hovered box
  reveal/         DOM    - pointer opens a hole in the top of two stacked layers
```

Nothing here is generated and there is no build step. `cursorfx.js` is the
engine source, and it is also the file Strata's CLI resolves
(`@strata-packages/<name>/<name>.js`) — one file serving both roles, which is
why no bundle is needed. Presets are never bundled into it: a Strata consumer
gets the engine in `strata.components.js` and loads the preset they mount.

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
