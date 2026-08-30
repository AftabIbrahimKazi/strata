# Changelog — @strata-packages/cursorfx

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
