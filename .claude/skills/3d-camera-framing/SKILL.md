---
name: 3d-camera-framing
description: Position and move a 3D camera so a scene reads as intended — human/ant/god-scale judgment, clipping, and never revealing a finite asset's edge. Trigger when placing, animating, or scroll-driving a three.js camera, or when a shot "feels wrong", crops oddly, or breaks immersion.
---

# 3D Camera Framing

A camera position is a claim about scale and viewpoint. Most "this doesn't feel right" complaints about a 3D shot are really "the camera is lying about how big/close/high the viewer is" or "the camera can technically see something it shouldn't." Both are checkable, not vibes.

## Part 1 — What not to do (symptom → rule)

| Symptom | Rule you broke |
|---|---|
| Nearby geometry flickers, disappears, or shows jagged "cropped" cuts as the camera gets close | Camera `near` plane is farther than the closest geometry the camera will actually approach. The three.js default (`0.1`) assumes room-scale distances — a camera meant to sit within a few tenths of a unit from a bumpy surface needs `near` an order of magnitude smaller (e.g. `0.02`). |
| Zooming/orbiting out reveals a hard-edged cutoff where the ground "ends" against the sky | The ground is a finite mesh, not an infinite plane, and the camera's max distance/FOV combination let its edge into frame. Cap the orbit's max radius so the widest possible view still stays inside the mesh's real footprint — don't rely on fog or blur alone to hide a hard edge that's dead center in frame. |
| The shot feels like looking at a **model of** the thing, not standing near it | Camera is too far back and/or too high — a wide, elevated view reads as "looking at a diorama," not "being there." For an immersive/hero shot, get close and low relative to the subject's own scale, not relative to a generic "safe" distance. |
| The shot feels like an insect or a drone, not a person | Overcorrecting the above: camera height near true ground level (~"ant") or high above looking down (~"god"/drone) both break the illusion of a human viewer just as much as being too far back does. Calibrate height to the subject's own proportions — roughly where a person's eyeline would fall relative to the subject's height, not an absolute number that happens to work for a different asset. |
| Stretching/distorting the ground mesh to "fake" more space made the subject itself look wrong | If the subject and the ground are **one continuous mesh** (common in scanned/photogrammetry assets), non-uniform scaling to stretch the ground also stretches the subject's own footprint — and can put the camera *inside* the now-widened geometry. Never non-uniform-scale a combined mesh to solve a framing problem; solve it with camera distance/FOV/DOF instead. |
| A "wide establishing shot" and "always stay inside the finite mesh" both seem required and can't both be true | This is a real conflict between goals, not a bug — see `3d-scene-hive` for how to arbitrate camera-vs-asset conflicts by intent (does this scene need to prove scale, or sell immersion?). |

**Exception:** deliberately god's-eye/map-view shots (a level overview, a data-viz globe) are a legitimate distinct genre — the "human eye-level" rule only applies when the *goal* is immersion, not survey.

## Part 2 — Secret sauce

- **FOV:** 45–55° reads as a natural, slightly cinematic lens for hero/immersive shots. Below ~35° starts looking telephoto/flat; above ~65° starts looking like a fisheye/action-cam and distorts edges of frame.
- **Eye-level calibration:** get the subject's real proportions first (bounding-box height after normalization), *then* pick camera height as a fraction of it — roughly 15–30% of subject height for a dramatic "looking up" hero shot, 50%+ starts reading as eye-to-eye/aerial rather than "small viewer, tall subject."
- **`lookAt` target isn't the base:** aiming at `y=0` (the subject's feet) from a low camera makes the top of a tall subject fall out of frame awkwardly. Aim at roughly 50–60% up the subject's height instead — keeps the dramatic upward angle without cutting off the top.
- **Driving a camera by scroll:** sample position via an authored track (`@triforge/keyframe`'s `KeyframeTrack.evaluate(progress)` or `@triforge/curve-core` for a path with more than 2 waypoints) rather than hand-rolled linear interpolation — gets consistent easing for free and keeps every phase of a longer sequence on the same system.
- **Never trust one screenshot at one scroll position.** Camera math that looks right at `progress=0` regularly breaks at `progress=1` (radius/height/lookAt all move together) — check both ends of every animated range, not just the resting state.

## Verify

Check via `3d-scene-verification`: screenshot at the animated range's minimum AND maximum (not just rest), and specifically look for (a) any hard mesh edge against open sky/background, (b) any near-plane clipping artifact on close geometry, (c) whether the framing reads as the intended human/wide/aerial register once actually rendered — camera math is notoriously hard to judge from numbers alone.
