---
name: 3d-lighting-realism
description: Make a three.js/WebGL scene's lighting look real and match its sky/environment — IBL vs directional lights, baked-texture assets, exposure. Trigger when lighting a 3D scene, adding a sky/HDRI, loading a scanned/photogrammetry model, or when a rendered scene "looks fake" / "doesn't match" / "lighting is off".
---

# 3D Lighting Realism

Bad 3D lighting almost never looks "a bit off" — it looks like two separate things glued together (a sky and a rock that don't agree on where the sun is), or it looks flat/plastic. Both are caused by a short, checkable list of mistakes, not a lack of artistic talent. Fix the mistake, not the vibe.

**Framework note:** none of triforge's packages own lighting/tonemapping/environment maps — that's plain `three` (`PMREMGenerator`, `scene.environment`, `scene.environmentIntensity`, `renderer.toneMapping`). Don't go looking for a `@triforge/lighting-core` — it doesn't exist.

## Part 1 — What not to do (symptom → rule)

| Symptom | Rule you broke |
|---|---|
| Rock/scanned asset looks flat, waxy, or fights its own shadows | You added a directional "sun" light on top of a **baked/photogrammetry texture**. The texture already contains real-world lighting; a new light creates a second, mismatched shadow direction. **Either** use `KHR_materials_unlit` (or a `MeshBasicMaterial`) for scanned assets so no scene light touches them, **or** drop direct light intensity hard and lean on a soft, low-intensity environment map instead. |
| Scene looks like "a sky behind a model" instead of one place | No environment map — only a directional light + hemisphere light. Lights alone can approximate a sun; they can't approximate ambient bounce/reflection tint from the actual sky. Bake the sky into `scene.environment` via `PMREMGenerator`, even at low intensity. |
| Everything blows out to white, or the whole scene looks unnaturally milky | Added an environment map at its default strength on top of lights that were already tuned without one. `scene.environment` and direct lights are *additive* — adding one without re-tuning the other is the single most common cause of blown-out 3D scenes. Always drop direct light intensity when adding environment lighting, not after. |
| A theme/mood switch (day→night, light→dark UI theme) makes the *sky* change but the *rock* doesn't | You update sky shader uniforms but never re-touch the lights or `scene.environmentIntensity`. Every light source in the scene (directional, hemisphere, environment) needs to be driven from the same theme state, not just the visible sky. |
| A day/night (or dusk) design was planned around a baked/scanned asset, and the asset can't sell any of the moods | The asset's shading (aoMap/albedo) is baked at a *single* fixed sun angle, and — per the row above — you correctly kept scene lights off or near-zero to avoid a second mismatched shadow. The result: nothing in the scene is actually lighting that asset, so no light-driven theme change (day/dusk/night, elevation, color) can ever move its shadows. This isn't a tuning bug, it's a hard ceiling — **decide this before building the theme system, not after**: (a) fake the mood on top of the baked texture instead of through lighting — tint via a low-opacity color-multiply/overlay pass, animate fog/sky/exposure/vignette only, and treat the baked asset as a fixed lighting anchor; or (b) get an unbaked/PBR-only version of the asset (or bake AO but not full lighting) if its shadow direction genuinely must change; or (c) scope day/night to whichever elements in the scene *do* have real-time lights on them, and let any baked asset stay time-of-day-agnostic. Cheapest and most common answer is (a) — most viewers won't notice one static baked element under a moving sky if the surrounding atmosphere sells the transition. |
| A theme transition SNAPS instead of easing | Rebuilding the whole light rig on every theme tick, or not damping numeric values at all. Damp every numeric light property (`THREE.MathUtils.damp`) and `Color.lerp` toward a target state — don't set-and-forget. |
| Baking an environment map every frame tanks the frame rate | `PMREMGenerator.fromScene()` is a real render (6 faces) — free to call once, expensive to call 60×/sec. Throttle it (e.g. only while actively transitioning, capped to a few times a second) and skip it once values have settled. |
| Environment map baking captures the model itself, reflecting the rock back onto the rock | Baked from the *main* scene instead of a dedicated sky-only scene. Keep a second, invisible `Sky` + `Scene` used only for the PMREM bake; never `fromScene(mainScene)`. |

**Exception:** if the goal is deliberately unrealistic/stylized (flat toon shading, a single hard rim light for a logo reveal), none of the "match the environment" rules apply — say so explicitly in the intent, because "flat" is usually the *symptom* of a bug, not a choice.

## Part 2 — Secret sauce (tuned starting points)

- **Baked/scanned assets (photogrammetry, 3D scans):** prefer `KHR_materials_unlit`. If the source material must stay PBR, budget total light so direct-light intensity is roughly 40–60% of what you'd use on a synthetic (non-baked) asset, and keep `scene.environmentIntensity` in the **0.15–0.5** range — never the three.js default of 1.0 on a baked asset.
- **Procedural analytic sky (three.js `Sky.js`, Preetham model):** `sky.scale.setScalar(1000)` is plenty for a hero-scale scene — don't copy the textbook `450000`, it forces the camera's `far` plane absurdly high and wrecks depth precision on nearby geometry. Set camera `far` to roughly 1.5× the sky scale.
- **Day/dusk/night presets that actually read as distinct:**
  - Day: elevation ~35–45°, turbidity 4–8, rayleigh 1.5–2.5, exposure ~0.5 with `ACESFilmicToneMapping`.
  - Dusk/dawn: elevation **2–5°** (not lower — much lower stops looking like sunset and starts looking like night), turbidity 8–12, rayleigh 3–3.5, warm sun color (`0xff8a4c`-ish).
  - Night: elevation **below −8°**, turbidity 1–2, rayleigh <0.5, direct light intensity near-zero (0.1–0.2), environment intensity ~0.15 — the Preetham model has no stars, so "night" is sold by darkness + a cool, dim ambient tint, not by the sky shader.
- **Tonemapping baseline:** `renderer.toneMapping = THREE.ACESFilmicToneMapping`, `renderer.outputColorSpace = THREE.SRGBColorSpace`. Without both set together, environment-map colors and light colors won't agree on brightness scale.
- **Damped transitions:** a time-constant around `lambda = 0.5` in `THREE.MathUtils.damp(current, target, lambda, dt)` gives a ~2s unhurried transition — fast enough to feel responsive, slow enough not to look like a cut.

## Verify

A lighting change is not "done" until seen, not reasoned about — see `3d-scene-verification`. Specifically: screenshot each theme/mood state after full settle (PMREM bakes and asset loads can take 10–20s cold — don't judge a blank/wrong-looking frame before then), and confirm the *rock's* shadow/highlight direction visually agrees with the *sky's* sun position, not just that both rendered without errors.
