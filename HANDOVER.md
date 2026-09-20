# Session Handover

Updated: 2026-09-05 (end of session) · Branch: main

## Current state

**strata-css 1.9.0 release cycle is fully closed** — PR #279 merged 2026-09-02, `main`/`beta`/`test`/`dev` all in sync as of that merge.

**The docs-site redesign hero at `/redesign`** (noindex, not linked from nav) is one continuous scroll sequence: orbit the "Finger of God" rock formation → dive underground → descend through **six** procedural strata to a molten core. Layer→concept mapping: upper crust=utilities, lower crust=components, upper mantle=arbitrary values, lower mantle=tokens, outer core=the cascade, inner core=the JIT engine. Lighting is **static** (see Decisions — the rock is a baked asset), with survey-instrument overlay UI: depth rail, LAT/LON+depth telemetry, scroll hint, real GLB load progress.

**⚠️ All of this is still uncommitted, sitting directly on `main`.** Per the standing "no feature branches, commit to `dev`" rule this needs to go to `dev` first. Nothing has been committed across either session.

## Last session

- **Reversed the compositor-core verdict** (see Decisions) — the single most important finding; it un-blocks a package that was wrongly written off.
- Rebuilt post-processing on `@triforge/compositor-core` (`CompositorOutput` + Bloom/ChromaticAberration/FilmGrain/Vignette); deleted the hand-written GLSL grade pass. User's directive: use triforge, not raw three/GLSL.
- Rebuilt the strata materials as `@triforge/shader-core` node graphs (Musgrave erosion, Voronoi fracture, Bump relief, Blackbody→Emission for molten layers, AnimatedNoise for flow). **Bedding banding is not working — see Known issues.**
- Rewrote the dust as a 3D curl field, porting the rationale from `@strata-packages/cursorfx`'s `motion/curl`; cursor motion injects a decaying, distance-falloff world-space gust. Mounted cursorfx's `smoke` preset on `/redesign` for the DOM-layer gassy drag.
- Added overlay instrumentation (`HeroUI.tsx`), damped scroll-driven camera, pointer parallax, idle drift, rAF gating via IntersectionObserver, device tiering, and a focus-revealed skip link over the 970vh track.
- Bugs found only by rendering and looking: camera path ended *inside* the core sphere (backface-culled → grey void); two independent scroll readers desynced and froze the HUD at 0; `keyframes[2]` indexed on a 2-keyframe track (crash); `FilmGrain` greyscale desaturating the whole frame.

## Decisions & why

- **~~`@triforge/compositor-core`'s DOF+Bloom pipeline is not used~~ — REVERSED 2026-09-04. That verdict was a misdiagnosis.** The "washes the whole frame into flat haze regardless of pass parameters" symptom reproduces *identically* with three's own stock `EffectComposer`, so it was never a compositor-core bug. Real cause: `UnrealBloomPass.threshold` is compared against **pre-tonemapped linear HDR luminance**, not a 0–1 display value. A daylit sky's linear radiance is far above 1.0, so compositor-core's defaults (`threshold: 0.8, strength: 1.5`) put essentially the whole sky over the line. The scene now renders through `CompositorOutput` (Bloom + ChromaticAberration + FilmGrain + Vignette) with bloom disabled above ground and a scene-referred threshold below. Two real upstream gaps found and worth fixing in triforge: (1) `BasePass.parameters` is documented as GSAP-animatable but the three backend bakes the values into the built pass at `compile()` and never stores the built object back, so post-compile mutation silently does nothing; (2) `FilmGrain({ greyscale: true })` maps to three's `FilmPass` `grayscale`, which desaturates the **entire frame**, not the noise.
- **`PathFollow.getPosition(u, out)`'s `out` parameter is declared but not honored** — always returns a fresh `Vector3`. Use the return value directly (`camera.position.copy(pathFollow.getPosition(t))`), never rely on mutate-in-place.
- **shader-core's compiled `PrincipledBSDF` materials don't auto-flip normals for `BackSide` geometry** the way stock three.js materials do — the underground layer cylinders needed their normal attributes flipped by hand, or lighting silently reads as zero regardless of light intensity.
- **Skills are anti-pattern checklists, not generative tutorials** — every rule is indexed by observable symptom first (`debug-protocol`-style), because taste failures are almost always "avoid this specific mistake," not "follow this positive recipe." User's explicit framing.
- **Glass header is scoped to `/redesign` only** (`usePathname() === "/redesign"`), not applied site-wide — it only makes sense with the 3D scene behind it; everywhere else keeps opaque `bg-body`. cursorfx `smoke` is scoped the same way, via `MarketingCursorFx`.
- **Hero lighting is STATIC and must stay that way.** The rock is a baked/scanned photogrammetry asset — its shading is fixed at one sun angle inside its own texture, so no light-driven day/night switch can ever move its shadows. The old theme-driven day/dusk/night system was removed and `sky.ts` now holds a single `BAKED_MATCH_PRESET` tuned to match the baked lighting. Sell mood through sky/fog/exposure around it, never by lighting the rock differently. Do not reintroduce a theme-driven sky here.
- **`data-st-visible` isn't trusted for the persistent hero overlays.** It drives the per-layer copy panels correctly, but on the hero copy and scroll hint the computed style repeatedly disagreed with the attribute (measured: `"false"` sitting at `opacity: 1`), leaving copy stacked. Those two are conditionally rendered instead. Worth a proper root-cause pass someday.

## Known issues

- **⛔ Strata bedding bands do not render — the top open bug.** The layers read as fractured rock, not bedded strata, which is most of what was asked for. An isolation render (band colour alone into baseColor, no erosion/bump/mixes) comes back **flat**, both via `WaveTexture(BANDS)` fed a correct `vec3(0, worldY, 0)` *and* via an explicit `fract(y * scale)` built from `ShaderMath`. The same `Geometry.Position` drives the Musgrave and Voronoi in the same graph and those vary correctly, so the suspect is `SeparateXYZ` or `ColorRamp`-with-a-connected-`fac` inside shader-core, not the position input. Documented inline in `layers.ts`. Resume here.
- **`MusgraveTexture` is unbounded** (returns values in the tens at detail 6). Everything treating it as a 0–1 modulator must clamp first — feeding it raw as `WaveTexture.distortion` shifted the band coordinate by whole periods and scrambled bedding into a leather texture.
- `strata-css-docs-site/styles/strata.components.js` is still a tracked build artifact that goes dirty on every dev-server run (carried forward, never actioned — see Next steps).
- Carried forward, unverified: `--st-light`/`--st-dark` contrast in dark theme (~1.9:1); `reg()` silently overwrites on duplicate registration; `chart.js` leaks globals; hover-gate variants unverified on real touch hardware.

## Next steps

1. **Settle the shader-core banding bug** (Known issues). Cheapest path is a tiny standalone page testing `SeparateXYZ` and `ColorRamp`-with-connected-fac directly, away from this scene — it's the user's own library, so the fix likely pays off beyond the hero.
2. **Replace the invented landing-page copy with the real content.** `LandingSections.tsx` was written with placeholder prose and should be **deleted**; the real sections already exist and are live at `/` — `components/marketing/{Hero,Introduction,PackagesGrid,WhatsNew,Roadmap,Ecosystem,LiveStats,Faq}.tsx`, with live data from `getLatestVersionInfo`, `getLatestFeatures`, `FAQS`. Layout/UI is free; the words come from those.
3. **Seamless whole-page immersion** — every section should carry a 3D element and read as one continuous descent. The canvas is already `position-fixed` page-wide, so the blocker is that sections sit on opaque backgrounds; the plan is translucent panels over a scene that keeps evolving past the core. Note this removes the rAF gating added this session (the scene must stay visible) — offset with a reduced pixel ratio below the hero.
4. **Commit everything to `dev`** (not `main`) — two sessions of uncommitted work: the 7 skills, the Hero3D tree, `/redesign`, and the docs-site dependency diffs.
5. Decide on `strata-css-docs-site/styles/strata.components.js` in `.gitignore` (recurring noise, several sessions running).

## Standing decisions — do not re-litigate

- No `letter-spacing` utility, no `lh-[…]` arbitrary form — both cascade into sibling/descendant alignment.
- Variants are classes, not data attributes — dead zones in Shopify/Liquid contexts ruled the alternative out.
- Additive only — a scanner/registry change may add matches, never reinterpret or remove one.
- Compression never decides correctness — the minifier cascade is fixed order, not smallest-wins.
- Not cutting `glob`/`chokidar`/`postcss`, not splitting the package Tailwind-style for a "0 deps" badge, not chasing the `cssnano` Socket alerts further — all investigated and declined (see `memory-bank`). Don't re-propose.
- Never `taskkill`-by-name to close a verification browser — always target the specific launched instance's PID or its own CDP `Browser.close`. Killing by process name risks the user's real Chrome windows (happened once this project; see `3d-scene-verification`).

## Verification

For Strata build/CSS work: `.claude/skills/verify/SKILL.md` (screenshot vs. screencast, `hover:` media-query pseudo-state, content-glob coverage). For any 3D/WebGL work: `.claude/skills/3d-scene-verification/SKILL.md` — render and look, every time; a scene can have correct-looking values and a broken frame. For docs-site changes generally: start the real dev server, curl the actual route/payload — `tsc --noEmit` passing is necessary but not sufficient.
