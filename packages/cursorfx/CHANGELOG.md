# Changelog — @strata-packages/cursorfx

## [0.1.1] — 2026-08-31

### Fixed

- **Prototype-polluting assignment in `behaviour()`** (CodeQL). `registry[axis]` on a plain object returns `Object.prototype` for `__proto__` rather than `undefined`, so the truthiness guard passed and the assignment landed on every object in the page. The axis is now checked against a fixed list, the three registries have null prototypes, and a behaviour named `__proto__` is refused with a warning. `behaviour()` is public API, so its arguments are library input.

## [0.1.0] — 2026-08-31

### Added
- **`Spark` preset** — jagged electric streaks thrown off pointer movement, clicks, and the borders of hover targets. Streak shape is generated once at birth and held while it fades; lateral offsets use a `sin(t·π)` envelope so the kink sits mid-streak with both ends anchored. Emission is gated on pointer speed, with `dragBoost` while the pointer is held. Per-segment width taper, optional glow, and `hoverOrigin: 'edge' | 'pointer'`.
- First preset to read `state.down`, which the engine had always tracked but nothing used.
- **`Smoke` preset** — soft volumetric smoke curling off the pointer path. Particles are steered by a cheap pseudo curl field rather than ballistic velocity, so neighbours swirl coherently instead of each wobbling on its own axis; the birth kick is damped away within a few frames to hand them over. Each puff is a radial gradient drawn with `lighter` compositing, so overlaps accumulate into volume, and a multi-stop `color` maps across the puff's own radius. Emission count, birth radius and opacity all track the current frame's pointer speed with no smoothing.
- First preset to change `globalCompositeOperation`. It saves and restores the previous value around its own draws — the canvas is shared, so leaving `lighter` on would silently change how a co-mounted `Trail` or `Spark` renders.
- **Behaviour pipeline (`particles.js`)** — canvas presets are now recipes assembled from three axes, each behaviour its own file: `origin` (`pointer`, `ring`, `edge`), `motion` (`ballistic`, `curl`), `render` (`dot`, `puff`, `segment`). `Trail`, `ClickBurst`, `Spark` and `Smoke` keep their names, options, defaults and methods — nothing a consumer writes changes except the script tags a canvas preset needs.
- **Compose effects nothing ships** via `CursorFX.particles.recipe({ motion, render, emit })` — `curl` + `segment` is Smoke's motion driving Spark's shape, and so on. Three emission modes (`fixed`, `distance`, `chance`) and three triggers (`move`, `click`, `hover`), with a different origin allowed per trigger.
- Each behaviour gets a per-instance scope, so two recipes using `curl` cannot see each other's per-particle state. Scoped by trigger rather than origin name, because `Spark` runs `edge` on hover and `ring` on click.
- A recipe naming an unloaded behaviour warns with the exact file to add and degrades, instead of rendering nothing.

### Changed

- **Canvas presets now need `particles.js` and their behaviour files on the page**, in that order, before the preset. The README documents which behaviours each preset names. DOM presets (`Magnetic`, `HoverFlicker`, `CursorMorph`, `Reveal`) are unaffected and load nothing new.
- `Spark`'s jag store and `Smoke`'s curl seeds moved from `inst.local` into their behaviour's scope (`inst.local.scope.render.jag`, `inst.local.scope.motion.seed`). Internal, but it will surprise anything that reached in.

### Known trade-off

- The pipeline is **more** code than the four presets it replaced, not less. Measured gzipped: a Trail-only page 1.4 kB → 7.5 kB, all four canvas presets 5.7 kB → 12.3 kB; comments stripped, 11.2 kB → 21.2 kB. The duplication removed was around 700 bytes. This release buys composition and cheap new effects, and costs download size on pages that mount a single stock preset.

## [0.0.0] — 2026-08-30

### Added
- Initial release — modular cursor effects: one shared engine, seven opt-in presets
- **Declarative by default** — presets and every option are configured in markup, with no script of your own:
  `<body data-st-cursorfx="trail magnetic" data-st-cfx-trail-color="#ff2d55" data-st-cfx-max-particles="400">`.
  Values coerce as an author would expect (`"true"`/`"false"` and bare attributes become booleans, numeric strings become numbers), and any option may reference a CSS custom property. A preset named in markup whose script is not loaded warns rather than failing silently.
- **Imperative API** for runtime control — `init()`, `mount()`, `unmount()`, `use()`, `destroy()`, plus `get(key)` so a declarative page can still reach an instance
- **Engine** (`cursorfx.js`): pointer tracking via passive `pointermove`, a single RAF loop started lazily on the first real pointer event, one shared canvas created only when a canvas preset mounts, a fixed-size particle pool, and one hover hit-test per frame shared by every mounted preset
- **Global particle cap** — `maxParticles` is a budget for all mounted presets combined. Allocation happens once at `init()`; a preset that cannot get a particle drops the emission rather than allocating
- **Presets** — `Trail`, `ClickBurst`, `Electric` (canvas); `Magnetic`, `HoverFlicker`, `CursorMorph`, `Reveal` (DOM/CSS)
- **Target scoping** — `data-st-cfx-target="magnetic hover-flicker"` names which presets may react to an element; an empty value opts into all of them
- **Colours accept what CSS accepts** — hex, `rgb()`, `hsl()`, named colours, a `linear-`/`radial-`/`conic-gradient`, a space-separated stop list, or `var(--token)` resolving to any of those, including a whole gradient held in a token. Gradient stop positions are honoured. Each preset maps multiple stops to its own geometry: Trail along particle age, ClickBurst around the burst ring, Electric as a real `CanvasGradient` along each bolt
- **Reveal** — the pointer opens a soft masked hole in the top of two stacked layers, for images, buttons, text and cards. Every knob (`radius`, `feather`, `opacity`, `fade`, `follow`, `invert`) is a CSS custom property, and an instance writes one inline only when it overrides the default, so a stylesheet can retune the effect per theme
- One folder per preset, holding its JS and — only if it needs one — its CSS. Trail, ClickBurst and Electric need no stylesheet at all; they draw into the engine's canvas
- Pause on `visibilitychange`, resume on return
- `prefers-reduced-motion: reduce` stops the RAF loop and neutralises the CSS-driven effects; responds live to changes in the media query
- Device tier detection (`tier: 'auto'`) exposed via `tier()` — a signal only; the engine never disables anything on its own
- SSR-safe: `init()` no-ops without `window`/`document`
- `destroy()` removes every listener, element, attribute and custom property the package added
- UMD build — browser global, CommonJS, AMD. Registers as `Strata.CursorFX` when Strata is present, otherwise as `StrataCursorFX`
- Nothing is generated and there is no build step: `cursorfx.js` is the engine source and doubles as the single file Strata's CLI resolves per package, so even that path ships the engine alone rather than every preset

### Known limitations
- Multi-touch and touch-specific gestures are not handled (`pointermove` covers pen and single touch)
- Effects are viewport-wide; scoping one to a section is not supported
- `init()` is SSR-safe but untested against real Next.js/Nuxt hydration timing
- Magnetic and Reveal measure their target once per hover, so scrolling while hovering drifts the effect
- `CursorMorph` interpolates in JS rather than delegating to a CSS transition — the only preset still doing per-frame style writes
