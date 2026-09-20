---
name: 3d-asset-integration
description: Load and normalize a 3D asset (GLB/glTF) so its scale, texture quality, and device tier are correct. Trigger when loading a GLTF/GLB model, normalizing/scaling an imported mesh, choosing texture filtering, or picking a device-tier LOD.
---

# 3D Asset Integration

An imported 3D asset almost never arrives in units, scale, or resolution that match your scene. Every downstream bug in camera/lighting/post-processing tuning that "doesn't make sense" is worth re-checking here first — a wrong assumption about the asset's real size breaks every other skill's numbers.

**Framework note:** triforge has no GLB/asset-loading package — this is plain `three` (`GLTFLoader`, `THREE.Box3`). Don't look for a `@triforge/asset-core`.

## Part 1 — What not to do (symptom → rule)

| Symptom | Rule you broke |
|---|---|
| Camera math (radius, height, lookAt) that "should" work puts the camera inside geometry or looking at empty space | You hardcoded camera values against an *assumed* scale instead of the asset's real, computed bounding box. Always run `new THREE.Box3().setFromObject(model)` and derive camera numbers from its actual `size`/`center`, never a guessed round number. |
| A subject looks squat/short relative to its width, or absurdly tall/thin | Normalized scale by the wrong axis. `Math.max(size.x, size.y, size.z)` picks whichever dimension is largest — for a wide, low object (a mound, a spread-out ruin) that's a horizontal axis, not height, so "normalize to 2.4 units" makes the object 2.4 units *wide*, not tall. Decide which axis actually matters for framing before normalizing, and say so in a comment — it's not obvious from the code alone. |
| Ground texture looks blurry/low-res specifically when viewed at a shallow/grazing angle, even though the source texture is high resolution | Missing anisotropic filtering. Minification blur at oblique angles is exactly the case `texture.anisotropy` exists for — set it to `renderer.capabilities.getMaxAnisotropy()` on every relevant map (`map`, `normalMap`, `roughnessMap`, `aoMap`) after load. |
| Stretching part of a mesh to fake more ground/space distorts the subject too | The subject and ground are one continuous mesh (common for scans) — see `3d-camera-framing`'s identical entry. Uniform-scale only; solve "more apparent space" with camera and DOF, not mesh distortion. |
| Mobile loads the same multi-MB asset as desktop and stalls | No device-tier LOD split. If the asset ships in multiple detail levels, pick by a real breakpoint check (`matchMedia('(max-width: 767px)')` — Strata's own mobile/desktop boundary in this project) *before* calling `loader.load()`, not after. |
| First render after page load takes much longer than expected, and a quick screenshot check falsely reports "nothing rendered" | Large GLBs (multi-MB) plus a first environment bake (see `3d-lighting-realism`) genuinely take 10–20s cold in a dev environment. This is a verification-timing trap, not a code bug — see `3d-scene-verification`. |

**Exception:** if the asset is a small, simple, purpose-built primitive (not a scan/import), hand-picked scale/position values are fine — the bounding-box discipline matters most for imported/scanned assets whose real dimensions you don't already know.

## Part 2 — Secret sauce

- **Normalization pattern that generalizes:**
  ```js
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = TARGET_SIZE / Math.max(size.x, size.y, size.z); // pick the axis that matters
  model.scale.setScalar(scale); // uniform — see Part 1
  model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale); // center X/Z, rest base on y=0
  ```
- **Device-tier split threshold:** 767px matches this project's own Strata mobile/desktop boundary — reuse it rather than inventing a new breakpoint, so 3D asset tiering and CSS layout tiering agree.
- **Texture filtering budget:** anisotropy has a real but usually small GPU cost — safe to always max it out (`getMaxAnisotropy()`) for ground/floor-like textures viewed at an angle; less necessary for textures always viewed near head-on.
- **`renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`** — capping at 2 avoids rendering 3×/4× pixel density on high-DPI phones for no visible gain, at real GPU cost. This is a performance default, not just a lighting/camera one.

## Verify

Per `3d-scene-verification`: after loading, actually dump the computed `size`/`center` (a temporary console log or debug hook, removed before finishing) rather than assuming — the "obvious" axis to normalize by is wrong more often than not for irregular scanned assets.
