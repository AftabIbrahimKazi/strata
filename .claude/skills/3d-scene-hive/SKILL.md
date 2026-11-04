---
name: 3d-scene-hive
description: Orchestrate the 3D scene skill set (lighting, camera, post-processing, asset, web-integration, verification) and arbitrate when their rules conflict. Trigger at the start of any nontrivial 3D scene task — building, redesigning, or significantly changing a three.js scene — before diving into any single sub-skill.
---

# 3D Scene Hive

The other five 3D skills (`3d-lighting-realism`, `3d-camera-framing`, `3d-postprocessing-taste`, `3d-asset-integration`, `3d-web-integration`) each optimize one aspect blind to the others. Left alone, their rules collide — a wider camera shot (framing) can force a visible mesh edge (asset), a stronger DOF (post-processing) can fight a lighting fix's exposure budget. This skill doesn't add new rules; it decides which sub-skill's rule wins when they disagree, and it's the entry point that pulls the others in.

`3d-scene-verification` isn't optional or arbitrated — every decision this skill makes gets checked by rendering and looking, not by reasoning.

## Two goals, always, not one

A 3D scene that looks perfect but is slow, or that only works on one device tier, has failed at the same rate as one that looks broken. Every decision below is checked against **both**:
1. Does it look right (the five sub-skills' rules)?
2. Does it load and run acceptably on the intended device range — including the low end, not just the machine doing the building?

Neither goal is a tiebreaker for the other by default — see arbitration below. A gorgeous scene nobody's phone can load is not a partial success.

## Part 1 — Intent capture (do this first, every time)

Before applying any sub-skill's rule, pin down:

1. **Register**: photoreal/immersive, or stylized/decorative? (Changes whether "lighting must match the environment" is a hard rule or a preference.)
2. **Role**: hero/above-the-fold (must be fast, must be right first paint) or secondary/background (more latitude on load time)?
3. **Device floor**: what's the *lowest* device/connection this must work on acceptably? Default to assuming this is lower than whatever machine is doing the building — a scene that only runs well on a dev workstation has an unstated, usually wrong, device floor.
4. **What's fixed vs. negotiable**: is there an asset that can't change (a specific scan, a specific brand shape)? A performance ceiling that can't move (an existing LCP/TBT budget)? Fixed constraints outrank taste preferences.
5. **If a mood/theme system is planned (day/night, light/dark) and any hero asset is baked/scanned**: check `3d-lighting-realism`'s baked-asset row *before* building the theme system, not after — a baked asset with no real-time lights on it cannot have its shadow direction changed by any theme state, full stop. Decide now whether the mood sells through atmosphere (sky/fog/exposure) around a fixed-lit asset, or whether the asset needs to change.

If the user hasn't stated these, ask — don't assume a register/floor and build for hours before finding out it was wrong.

## Part 2 — Known conflict map

| Conflict | Default resolution | Ask the user when |
|---|---|---|
| Camera wants a wider/farther shot (`3d-camera-framing`, to establish scale) vs. asset's finite mesh edge would become visible (`3d-asset-integration`) | If register is *immersive*, cap the camera — immersion loses more from a visible edge than from a tighter frame. If register is explicitly a *survey/overview* shot, the edge may be acceptable or the asset needs extending instead. | Register wasn't stated, or the asset genuinely can't support either framing without visible seams. |
| Stronger post-processing (bloom/DOF) for mood (`3d-postprocessing-taste`) vs. device-floor render cost | Cut/simplify the pass for the low end (fewer passes, lower resolution render target, or disable on a detected low-tier device) before cutting visual ambition elsewhere — post FX is usually the cheapest thing to scale down without changing the scene's identity. | The pass *is* the scene's identity (e.g., the whole point is a bloom-heavy glow) — then the device floor itself may need renegotiating with the user. |
| Realistic lighting (`3d-lighting-realism`, environment map + damped transitions) vs. low-end GPU/mobile cost | Keep the environment map (cheap once baked) but throttle/skip re-baking on transitions for the lowest device tier — a static environment map is far cheaper than continuous PMREM re-bakes, and the visual loss (no live transition) is usually acceptable on hardware that couldn't afford it anyway. | Uncertain whether the target low-end devices can bake a PMREM environment at all — verify, don't guess (ties to `3d-scene-verification`). |
| Large/detailed asset for visual quality (`3d-asset-integration`) vs. load time on the device floor | Ship a lower-LOD variant behind a real breakpoint/capability check (see `3d-asset-integration`'s device-tier split) rather than shipping one asset and hoping. | No lower-LOD asset exists yet — flag this as a real gap, don't silently ship the heavy one to everyone. |
| Planned day/night (or dusk) mood system (`3d-lighting-realism`'s theme rows) vs. a baked/scanned asset with no real-time lights on it (`3d-lighting-realism`'s baked-asset row) | The baked asset stays visually static regardless of theme — mood is sold entirely through sky/fog/exposure/vignette animating *around* it. Don't add a directional light "so it reacts too" — that reintroduces the mismatched-shadow bug the baked-asset rule exists to prevent. | The asset's shadow direction genuinely must change (e.g., it's the sole subject of the shot with nothing else establishing mood) — then the fix is a different/re-bakeable asset, not a scene light, and that's a scope conversation with the user. |

When a conflict isn't in this table yet: state both sides plainly (what looks better vs. what performs better), apply the default posture (device floor wins ties unless intent explicitly said otherwise — see below), and note it here afterward so the table grows from real cases.

## Part 3 — Escalation

- If intent capture (Part 1) clearly settles a conflict, resolve it silently and move on — don't ask the user something the stated intent already answered.
- If it doesn't, and the conflict map doesn't cover it: **default to the device floor winning** when the two goals genuinely trade off, since a scene that doesn't load loses 100% of its value, while a scene that looks 10% less polished loses 10% of its value. State this default plainly when applying it rather than applying it silently — the user may have a reason to prefer polish (e.g., the low end was already out of scope).
- If even the default is ambiguous (both sides matter equally and neither intent nor the device-floor default clearly wins) — **stop and ask the user.** This skill arbitrates; it doesn't have the final word.

## Part 4 — Self-updating: write down what you just learned

These skills are checklists built from real mistakes, not a fixed spec — they're incomplete by design and stay that way unless sessions feed findings back in. **When a real mistake surfaces during actual work** (something looked wrong and you found the cause, a rule in one of the six skills turned out to be missing/wrong/incomplete, or a conflict happened that Part 2's table didn't cover) — update the relevant skill file *in that same session*, before moving on:

1. **Identify which skill owns it.** A lighting/exposure/baked-asset mistake → `3d-lighting-realism`. Camera/framing → `3d-camera-framing`. Post FX → `3d-postprocessing-taste`. Asset loading/scale/LOD → `3d-asset-integration`. Page mounting/SSR/scroll wiring → `3d-web-integration`. A verification-method gap (a bug that screenshots alone missed, or a check that should've been run) → `3d-scene-verification`. A conflict between two skills' rules → this file's Part 2 table.
2. **Write it as symptom → rule**, matching the existing table format in that skill — never as a narrative of what happened in this session. Future sessions need the checkable rule, not the story of how it was discovered.
3. **Don't just log it — let it change behavior going forward.** If the finding invalidates or narrows an existing rule, edit that rule in place rather than appending a contradictory one beside it.
4. **Do this unprompted.** Don't wait to be told "update the skill" — a mistake found and fixed but not written back is a mistake the next session will make again from scratch. This is part of finishing the task, not a follow-up.
5. **Write it project-agnostic, always — no exceptions.** These skill files are shared across every project that ever triggers them, not just the one open right now. Before writing the rule, strip every project-specific noun: no asset filenames, no component/prop names, no this-repo's object nicknames ("the rock," "the hero," a specific model's name), no framework names unless the mistake is genuinely specific to that framework. Say "a baked/scanned asset," "a directional light," "the scene's environment map" — not "the Finger of God model" or "HeroScene.tsx." A bug that's *only* explainable in terms of one project's files (a typo'd filename, one component's prop name) doesn't belong in the skill at all — put that in project memory/HANDOVER instead. Test before writing: would this sentence make sense to someone who has never seen this project? If not, generalize it further or leave it out.

## How to use this alongside the other five

1. Run intent capture once, at the start of the task, not per-decision.
2. Pull in whichever sub-skill(s) the current step touches — this skill doesn't restate their content.
3. When two sub-skills' rules would conflict on the same decision, arbitrate here before applying either.
4. Verify via `3d-scene-verification` regardless of how confident the arbitration felt — intent and defaults are still guesses until rendered and checked.
