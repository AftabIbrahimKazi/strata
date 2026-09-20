---
name: 3d-postprocessing-taste
description: Apply post-processing (DOF, bloom, vignette, etc.) so it flatters a 3D scene instead of degrading it. Trigger when adding a compositor/EffectComposer pass, tuning bokeh/blur/bloom/vignette, or when a scene "looks blurry"/"looks low quality" after adding effects.
---

# 3D Post-Processing Taste

Post-processing's whole job is to touch pixels the renderer already got right. The most common failure is a pass strong enough to also touch the pixels it was supposed to leave alone — usually the one thing the shot is actually about.

**Framework note:** `@triforge/compositor-core` is the actual pass library in this project (`CompositorOutput`, `DepthOfField`, `Bloom`, `Vignette`, and more) — wraps three's `EffectComposer`/`BokehPass` etc. under Blender-matched parameter names. Its `DepthOfField` options are `focusDistance`, `bokehScale` (aperture size), `maxBlur` (pixel radius) — know these three before tuning anything.

## Part 1 — What not to do (symptom → rule)

| Symptom | Rule you broke |
|---|---|
| The subject itself looks soft/blurry, not just the background | DOF strength (`bokehScale`/`maxBlur`) too high for the actual depth range in the scene, or `focusDistance` doesn't match where the camera actually sits relative to the subject. A subject in the "in-focus" zone should read genuinely sharp — if it doesn't, the blur radius is too wide for your near/far depth spread, not just "strong." |
| A user complains textures look "low quality" right after DOF/bloom was added, but the textures didn't change | Diagnose post-processing before diagnosing the asset. It's much cheaper to check `bokehScale`/`maxBlur` than to re-export or re-filter a texture that was never the problem. |
| The **whole frame** washes into flat milky haze, and it stays washed "no matter what the pass parameters are" | Almost always bloom, and almost always a **units** mistake rather than a broken pass: a bloom pass's `threshold` is compared against **pre-tonemapped LINEAR HDR luminance**, not a 0–1 display value. A sunlit sky/emissive surface has linear radiance far above 1.0, so any "sensible-looking" threshold under ~1 puts most of the frame over the line and blooms it. Thresholds are scene-referred: on an HDR outdoor scene the useful range starts around 1.0 and can run to 5+; in a dark interior 0.2–0.6 is right. If a shot has nothing that should glow, disable the pass rather than turning its strength down — a disabled pass is free and unambiguous. |
| A grain/film pass turned the entire render black-and-white | A "greyscale grain" style option usually maps to a flag that desaturates the **whole image**, not just the noise it adds (three's `FilmPass` `grayscale` does exactly this). Leave it off and get monochrome noise by other means if you actually want it. |
| A post value animated per frame has no visible effect, though the code plainly sets it | Wrapper/node-graph post libraries commonly read their scalar inputs **once**, when the pass chain is compiled, and bake them into the constructed pass object — the node's `parameters` and the live pass are then two different pieces of state, no matter what the library's docs claim about animatability. Confirm by reading the pass's build/compile source. Either bind to the built pass object directly, or pick a fixed value tuned to the middle of the range; recompiling per frame is not an option. |
| A bloom/vignette/grain pass is present "because it's cinematic" but nothing in the shot needed it | Every pass has a cost (GPU + visual noise) and a job. If you can't say what specific problem a pass solves for *this* shot, it's decoration, not direction — cut it. Taste here is disproportionately about restraint, not stacking effects. |
| Adding an environment map made bloom/exposure blow out where it didn't before | Post-processing and lighting share the same exposure budget — see `3d-lighting-realism`. Re-tune bloom threshold/strength any time direct light, environment intensity, or tonemapping exposure changes; they're not independent. |

**Exception:** intentional soft/dreamy/tilt-shift styles genuinely want the "too much blur" look — the rule is "don't blur the subject **by accident**," not "never blur the subject."

## Part 2 — Secret sauce

- **DOF that reads as cinematic, not broken:** start conservative — `bokehScale: 1.5–2.5`, `maxBlur: 3–5` — and only push higher once you've confirmed the in-focus zone is still sharp. The textbook-demo values (`bokehScale: 4+`, `maxBlur: 8+`) are tuned for scenes with much larger depth ranges than a close hero shot typically has.
- **Match `focusDistance` to the actual camera-to-subject distance**, not a round number. If the camera orbits between radius 0.8–1.0, focus around 0.9–1.0 (biased toward the far end, since a slightly-far focus reads better than a slightly-near one when the subject dominates the frame).
- **Bloom** earns its place on genuine light sources (a sun disc, an emissive surface, a glowing UI element) — applying it to the whole scene's highlights indiscriminately usually just softens contrast.
- **Bloom threshold is scene-referred, so drive it per shot, not once.** A sequence that travels from daylight into a dark interior needs the pass genuinely off up top (nothing there should glow, and the sky will bloom if you let it) and a low threshold below, where an emissive prop is the only thing above it. One global compromise value gives you a hazy exterior *and* a dull interior.
- **Unlit/`Basic`-material geometry is the cheapest reliable bloom bait** — it ignores lighting and renders at full authored value, so it clears a high threshold predictably, which lit surfaces never quite do.
- **Vignette** is cheap and rarely wrong at low strength (subtle framing aid); it's DOF and bloom that carry real risk of destroying detail.
- **Cost discipline:** every added pass is another full-screen render. On a hero/above-the-fold scene, budget passes like you'd budget JS bundle size — DOF (real cost, real payoff for a close subject) and a cheap vignette are usually enough; skip bloom/SSAO/motion blur unless the shot specifically needs one.

## Verify

Per `3d-scene-verification`: screenshot with the pass on vs. off and compare the *subject*, not just the overall mood — if the subject looks meaningfully softer with the pass on, the pass is too strong regardless of how nice the background blur looks.
