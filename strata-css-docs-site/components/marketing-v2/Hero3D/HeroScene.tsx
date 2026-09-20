"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KeyframeTrack, easeInOutSine } from "@triforge/keyframe";
import { CatmullRomCurve, PathFollow } from "@triforge/curve-core";
import { DayNightSky } from "./sky";
import { DustField } from "./dust";
import { ScenePost } from "./postfx";
import { LAYERS, buildLayerMaterial, buildCoreMaterial, collectTimeUniforms } from "./layers";
import { ORBIT_END, DIVE_END } from "./progress";

const GLB_LIGHT = "/3d-assets/finger_of_god_namibia_light.glb";
const GLB_DETAILED = "/3d-assets/finger_of_god_namibia_detailed.glb";

const SURFACE_EXPOSURE = 0.5;
const UNDERGROUND_EXPOSURE = 1.3;
const LAYER_RADIUS = 6;

interface HeroSceneProps {
  /** The tall scroll track this scene's camera position is driven by. */
  trackRef: React.RefObject<HTMLDivElement | null>;
  /** 0..1 while the rock model downloads. */
  onLoadProgress?: (fraction: number) => void;
  /** Fired once the model is in the scene and the first frame is drawable. */
  onReady?: () => void;
  /**
   * Scroll progress through the hero track, 0..1. This component is the single
   * source of truth for it: it already reads the track every frame to drive
   * the camera, and having the overlay compute the same number from its own
   * scroll listener meant two readers that could — and did — disagree, leaving
   * the HUD and copy stuck at 0 while the scene descended.
   */
  onProgress?: (progress: number) => void;
}

/**
 * The full hero sequence, driven by one continuous scroll progress [0,1]
 * split into three phases (see progress.ts for the exact fractions):
 *
 *   Phase A (orbit, 0..ORBIT_END)   — camera orbits the rock formation.
 *   Phase B (dive, ORBIT_END..DIVE_END) — camera swoops from the orbit's
 *     exact end position down through the ground, on an authored curve so
 *     there's no jump at the handoff.
 *   Phase C (descent, DIVE_END..1) — camera continues straight down the
 *     same curve through four procedural strata layers to a glowing core.
 *
 * Scroll drives a *target*; the camera damps toward it. That one indirection
 * is most of why the motion reads as weighted rather than as a value being
 * scrubbed — the scene keeps moving for a beat after the wheel stops.
 */
export default function HeroScene({
  trackRef,
  onLoadProgress,
  onReady,
  onProgress,
}: HeroSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  // Callbacks live in a ref so changing them never re-runs the (expensive)
  // scene-construction effect.
  const callbacksRef = useRef({ onLoadProgress, onReady, onProgress });
  useEffect(() => {
    callbacksRef.current = { onLoadProgress, onReady, onProgress };
  });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let frameId = 0;
    let disposed = false;

    const scene = new THREE.Scene();

    // far=1500 comfortably contains the sky dome (scale 1000 -> corners
    // ~866 units out) without wrecking depth precision on the rock, which
    // sits within a few units of the origin.
    // near=0.02 (not the usual 0.1) because the camera sits close enough
    // to the bumpy ground that a bump nearer than 0.1 was clipping through
    // the near plane — the "terrain cropping" artifact.
    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.02,
      1500
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // Device tier decides post-processing and particle budget. Per
    // 3d-scene-hive, the device floor wins ties: a phone gets the same scene,
    // just without the passes it can't afford. hardwareConcurrency is a crude
    // proxy but it's the only one available without a benchmark frame.
    const isNarrow = window.matchMedia("(max-width: 767px)").matches;
    const lowTier = isNarrow || (navigator.hardwareConcurrency ?? 8) <= 4;
    const canHover = window.matchMedia("(hover: hover)").matches;

    const daySky = new DayNightSky(scene, renderer);
    const clock = new THREE.Clock();

    // compositor-core compiles asynchronously, so the first frames render
    // through the plain renderer and the chain swaps in when it's ready —
    // which is invisible in practice and beats blocking the first paint.
    let post: ScenePost | null = null;
    if (!lowTier) {
      ScenePost.create(renderer, scene, camera)
        .then((created) => {
          if (disposed) {
            created.dispose();
            return;
          }
          post = created;
        })
        .catch((err) => {
          console.error("[Hero3D] post-processing failed to compile; rendering plain", err);
        });
    }

    // Human eye-level, not ground-level — low enough to still look up at
    // the pillar, but high enough that the camera clears the bumpy terrain
    // instead of grazing along it (which was clipping into the mesh and
    // cropping the ground against the sky at the old, near-ground height).
    // Values are tuned to this GLB's actual normalized proportions: the
    // pillar's apex lands at y≈0.76 after normalizing by its widest
    // dimension (the mound), not a nice round number, so these were set by
    // eye against the real geometry. Radius is still capped well inside
    // the mesh's finite footprint so its edge is never visible.
    const camState = { radius: 1.0, height: 0.22, angle: 0, lookY: 0.5 };
    const radiusTrack = new KeyframeTrack(camState, "radius", [
      { time: 0, value: 1.08 },
      { time: 0.55, value: 0.86, easing: easeInOutSine },
      { time: 1, value: 0.78, easing: easeInOutSine },
    ]);
    const heightTrack = new KeyframeTrack(camState, "height", [
      { time: 0, value: 0.24 },
      { time: 1, value: 0.16, easing: easeInOutSine },
    ]);
    const angleTrack = new KeyframeTrack(camState, "angle", [
      { time: 0, value: 0 },
      { time: 1, value: Math.PI * 1.35 },
    ]);
    // The framing evolves as it orbits — starting high on the pillar and
    // easing down toward its base sells "approaching" rather than "rotating
    // around a fixed point", which is what a locked look target always reads as.
    const lookTrack = new KeyframeTrack(camState, "lookY", [
      { time: 0, value: 0.52 },
      { time: 1, value: 0.38, easing: easeInOutSine },
    ]);

    // Orbit's exact end position — the dive curve starts exactly here so
    // there's no jump at the Phase A → B handoff. Read the LAST keyframe by
    // length rather than by a hardcoded index: the tracks don't all have the
    // same number of keyframes, and indexing one of them at [2] because a
    // neighbour happens to have three is how this broke once already.
    const endValue = (track: KeyframeTrack) =>
      track.keyframes[track.keyframes.length - 1].value;
    const orbitEndAngle = endValue(angleTrack);
    const orbitEndRadius = endValue(radiusTrack);
    const orbitEndX = Math.sin(orbitEndAngle) * orbitEndRadius;
    const orbitEndZ = Math.cos(orbitEndAngle) * orbitEndRadius;
    const orbitEndY = endValue(heightTrack);

    // Four procedural strata layers (see layers.ts for the concept mapping)
    // as concentric cylinder walls the camera passes through on its way
    // down, plus a glowing core at the bottom. All geometry is simple
    // cylinders/a sphere — cheap regardless of device, per 3d-scene-hive's
    // device-floor-over-polish default.
    // Open-ended, and the material is explicitly BackSide. Both halves of
    // that matter, and getting one wrong is what hid the strata banding for
    // two sessions:
    //
    //   * A tube's walls are back-facing when you are inside it, so at
    //     three's default FrontSide they are culled and never drawn. The
    //     shaft rendered as an empty void, which is what the caps were
    //     originally added to paper over.
    //   * A cap is a horizontal disc, so world Y is CONSTANT across it.
    //     The bedding term is fract(y * scale), so on a cap it collapses to
    //     a single flat value — while the 3D Musgrave/Voronoi keep varying
    //     in x/z and still look correct. With the walls culled, every
    //     underground pixel was cap, so the wall read as fractured rock with
    //     no bedding whatsoever.
    //
    // The layers are contiguous (each yTop meets the previous yBottom), so
    // open-ended they form one continuous bore hole; the core sphere plugs
    // the bottom of it and the surface opening is the entry.
    const animatedMaterials: THREE.ShaderMaterial[] = [];
    for (const layer of LAYERS) {
      const height = layer.yTop - layer.yBottom;
      // Radial segments up from 32: the bump-driven strata relief is sampled
      // per-fragment but the silhouette is still geometry, and at this camera
      // distance a 32-sided tube reads as a faceted polygon against the wall
      // detail rather than as a bore hole.
      const geometry = new THREE.CylinderGeometry(LAYER_RADIUS, LAYER_RADIUS, height, 64, 1, true);
      // Standard three.js materials auto-flip normals for BackSide
      // rendering; shader-core's compiled PrincipledBSDF material doesn't,
      // so the authored (outward-pointing) normals faced away from both
      // the camera and the headlamp on the inside — the lighting dot
      // product was negative, reading as "unlit" regardless of intensity.
      // Flipping them to point inward, toward the axis, fixes that.
      const normalAttr = geometry.attributes.normal;
      for (let i = 0; i < normalAttr.count; i++) {
        normalAttr.setXYZ(i, -normalAttr.getX(i), -normalAttr.getY(i), -normalAttr.getZ(i));
      }
      normalAttr.needsUpdate = true;
      const material = buildLayerMaterial(layer);
      // The camera descends INSIDE these tubes (path radius 1.4 vs. wall
      // radius 6), so the visible surface is the inward face. shader-core's
      // compile() leaves .side at three's FrontSide default; without this the
      // walls are culled entirely.
      material.side = THREE.BackSide;
      animatedMaterials.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = (layer.yTop + layer.yBottom) / 2;
      scene.add(mesh);
    }

    // A glowing band at every stratum boundary. MeshBasicMaterial ignores
    // lighting entirely and renders at full value, which makes it ideal
    // bloom bait — these are what turn "passing a Y coordinate" into a
    // visible gate the descent moves through.
    const boundaryRings: THREE.Mesh[] = [];
    for (const layer of LAYERS) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(LAYER_RADIUS * 0.995, 0.05, 8, 64),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(layer.colorA),
          transparent: true,
          opacity: 0.9,
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = layer.yTop;
      scene.add(ring);
      boundaryRings.push(ring);
    }

    const coreLayer = LAYERS[LAYERS.length - 1];
    const CORE_RADIUS = 2.2;
    const CORE_CENTER_Y = coreLayer.yBottom + 0.5;
    const coreMaterial = buildCoreMaterial();
    animatedMaterials.push(coreMaterial);
    const core = new THREE.Mesh(new THREE.SphereGeometry(CORE_RADIUS, 48, 48), coreMaterial);
    core.position.set(0, CORE_CENTER_Y, 0);
    scene.add(core);

    // One floor, at the very bottom of the shaft, and only one.
    //
    // The per-layer cylinders are open-ended on purpose (see the note above):
    // a cap at every layer boundary put a constant-Y disc between the camera
    // and every wall, which is what hid the bedding. But open-ended leaves the
    // bore hole open at the bottom, and the sky renders straight through it as
    // the washed-out grey disc that capping was originally added to hide.
    // A single disc below the core closes that off. It sits ~7 units under the
    // camera's lowest point with the glowing core in front of it, so it reads
    // as the dark bottom of the shaft and never competes with a banded wall.
    const shaftFloor = new THREE.Mesh(
      new THREE.CircleGeometry(LAYER_RADIUS, 64),
      new THREE.MeshBasicMaterial({ color: 0x160a05 })
    );
    shaftFloor.rotation.x = -Math.PI / 2;
    shaftFloor.position.y = LAYERS[LAYERS.length - 1].yBottom;
    scene.add(shaftFloor);

    // Only the materials that actually ended up with a `time` uniform.
    const timedMaterials = collectTimeUniforms(animatedMaterials);

    // The core throws its own light, so the walls nearest it warm up as the
    // camera arrives instead of the core reading as a sticker on a dark wall.
    const coreLight = new THREE.PointLight(0xff9a3c, 0, 18, 1.4);
    coreLight.position.copy(core.position);
    scene.add(coreLight);

    // A light that travels with the camera underground — the surface's
    // day/night sky has no business lighting a tunnel, and without this
    // the layers would render essentially black regardless of theme.
    // decay=1 (not three's physically-correct default of 2) — this is a
    // stylized narrative beat, not a photoreal render, and default decay
    // fell off too fast over the ~5-unit camera-to-wall distance to keep
    // the layer material legible.
    const headlamp = new THREE.PointLight(0xfff0da, 0, 25, 1);
    scene.add(headlamp);

    // The dive + descent path: orbit's end position, swooping toward the
    // vertical axis and crossing the surface, then a slow spiral down
    // through each layer boundary to the core. Off-axis on purpose — a
    // purely vertical on-axis descent points the camera straight down the
    // tube's open middle, seeing past the walls into empty space instead
    // of at them; a spiral keeps a wall genuinely close and in frame the
    // whole way down, the same "camera near a wall" logic as the sky dome.
    const SPIRAL_RADIUS = 1.4;
    const spiralPoint = (angle: number, y: number) =>
      new THREE.Vector3(SPIRAL_RADIUS * Math.cos(angle), y, SPIRAL_RADIUS * Math.sin(angle));
    const spiralStartAngle = orbitEndAngle;
    // Built from LAYERS rather than one hand-written point per stratum, so
    // adding a layer can't leave the camera path stopping short of it.
    const diveCurve = new CatmullRomCurve([
      new THREE.Vector3(orbitEndX, orbitEndY, orbitEndZ),
      new THREE.Vector3(orbitEndX * 0.3, 0, orbitEndZ * 0.3),
      ...LAYERS.map((layer, i) => spiralPoint(spiralStartAngle + i, layer.yTop)),
      // Stop ABOVE the core, not at the bottom of the shaft. Ending at
      // coreLayer.yBottom put the camera inside the core sphere (radius 2.2,
      // centred 0.5 above that bottom), where a front-faced emissive sphere is
      // backface-culled — the payoff shot rendered as an empty grey void.
      spiralPoint(spiralStartAngle + LAYERS.length, CORE_CENTER_Y + CORE_RADIUS + 1.4),
    ]);
    const pathFollow = new PathFollow(diveCurve);

    // Airborne dust around the formation, plus slower motes underground that
    // stream upward past the descending camera. Both counts drop on the low
    // tier, where fill rate for additive sprites is the scarce resource.
    const surfaceDust = new DustField(scene, {
      count: lowTier ? 260 : 640,
      radius: 3.4,
      height: 1.8,
      centerY: 0.5,
      color: 0xf0dcb0,
      size: 0.035,
      opacity: 0.16,
      drift: new THREE.Vector3(0.015, 0.004, 0),
      // Broad, lazy eddies: at this camera scale a higher frequency reads as
      // per-particle jitter rather than as moving air.
      curlScale: 0.9,
      curlStrength: 0.06,
      gustInfluence: 2.4,
    });
    const undergroundMotes = new DustField(scene, {
      count: lowTier ? 180 : 420,
      radius: LAYER_RADIUS * 0.8,
      height: 6,
      centerY: -6,
      color: 0xffb87a,
      size: 0.07,
      opacity: 0,
      drift: new THREE.Vector3(0, 0.35, 0),
      curlScale: 0.35,
      curlStrength: 0.14,
      // Barely reactive underground — the cursor is pushing surface air, and
      // a responsive tunnel would read as the walls being made of smoke.
      gustInfluence: 0.35,
    });
    undergroundMotes.setVisible(false);

    let pointerLastX: number | null = null;
    let pointerLastY: number | null = null;
    const pointerTarget = new THREE.Vector2(0, 0);
    const pointer = new THREE.Vector2(0, 0);
    const gustDir = new THREE.Vector3();
    const gustOrigin = new THREE.Vector3();
    const gustForward = new THREE.Vector3();
    const gustRight = new THREE.Vector3();
    const gustUp = new THREE.Vector3();
    const gustWorldUp = new THREE.Vector3(0, 1, 0);

    const handlePointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      pointerTarget.set(nx, ny);

      if (pointerLastX !== null && pointerLastY !== null) {
        const dx = nx - pointerLastX;
        const dy = ny - pointerLastY;
        const speed = Math.hypot(dx, dy);
        // Ignore sub-pixel jitter; a gust should cost an actual movement.
        if (speed > 0.0008) {
          // Put the gust where the cursor is pointing in the world: take the
          // cursor ray and walk a fixed distance along it. Unprojecting to a
          // raw NDC depth instead would land the origin somewhere out near the
          // far plane, where its falloff would never reach any particle.
          gustOrigin.set(nx, -ny, 0.5).unproject(camera);
          gustOrigin.sub(camera.position).normalize().multiplyScalar(1.3).add(camera.position);

          // Shove along the camera's own right/up, so the air moves the way the
          // hand did regardless of where the orbit currently is.
          camera.getWorldDirection(gustForward);
          gustRight.crossVectors(gustForward, gustWorldUp).normalize();
          gustUp.crossVectors(gustRight, gustForward).normalize();
          gustDir
            .copy(gustRight)
            .multiplyScalar(dx)
            .addScaledVector(gustUp, -dy)
            .normalize()
            .multiplyScalar(Math.min(speed * 45, 3.2));

          surfaceDust.addGust(gustDir, gustOrigin);
          undergroundMotes.addGust(gustDir, gustOrigin);
        }
      }
      pointerLastX = nx;
      pointerLastY = ny;
    };
    if (canHover) window.addEventListener("pointermove", handlePointerMove, { passive: true });

    // Below ~768px use the light LOD — same breakpoint Strata's own
    // responsive utilities treat as the mobile/desktop boundary.
    const loader = new GLTFLoader();

    loader.load(
      isNarrow ? GLB_LIGHT : GLB_DETAILED,
      (gltf) => {
        if (disposed) return;

        // The pillar and its surrounding mound are one continuous mesh, so
        // stretching X/Z to fake "infinite ground" also stretches the
        // pillar's own footprint — with the camera now close to the base,
        // that widened footprint swallows the camera inside solid geometry.
        // Uniform scale keeps the pillar's real proportions; the close, low
        // framing is what sells "standing in a landscape" instead.
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 2.4 / maxDim;
        gltf.scene.scale.setScalar(scale);
        gltf.scene.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

        // Ground viewed at a low grazing angle is exactly the case
        // anisotropic filtering exists for — without it, minification
        // blur on the terrain textures reads as "low quality" even though
        // the source texture is high-resolution.
        const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
        gltf.scene.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return;
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const material of materials) {
            if (!(material instanceof THREE.MeshStandardMaterial)) continue;
            for (const tex of [material.map, material.normalMap, material.roughnessMap, material.aoMap]) {
              if (tex) tex.anisotropy = maxAnisotropy;
            }
          }
        });

        scene.add(gltf.scene);
        callbacksRef.current.onLoadProgress?.(1);
        callbacksRef.current.onReady?.();
      },
      (event) => {
        if (disposed || !event.lengthComputable) return;
        callbacksRef.current.onLoadProgress?.(Math.min(0.99, event.loaded / event.total));
      },
      (err) => {
        console.error("[Hero3D] failed to load rock formation model", err);
        // Don't strand the visitor behind a loading overlay on a failed
        // fetch — the procedural layers still render without the rock.
        callbacksRef.current.onReady?.();
      }
    );

    let scrollProgress = 0;
    // The value the camera actually reads — damped toward scrollProgress.
    let easedProgress = 0;
    const updateScrollProgress = () => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      scrollProgress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
    };

    // Quantised before it reaches React: the overlay only needs enough
    // resolution to move a tick gauge and a depth readout, and pushing every
    // float would re-render the HUD on every frame of every scroll.
    let reportedProgress = -1;
    const reportProgress = () => {
      const quantised = Math.round(scrollProgress * 500) / 500;
      if (quantised !== reportedProgress) {
        reportedProgress = quantised;
        callbacksRef.current.onProgress?.(quantised);
      }
    };

    const handleScroll = () => {
      updateScrollProgress();
      reportProgress();
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    updateScrollProgress();
    reportProgress();
    easedProgress = scrollProgress;

    const handleResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      post?.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Rendering a 60fps WebGL scene while the visitor reads the sections far
    // below it is pure waste — the canvas is fixed, so it never leaves the
    // viewport on its own and nothing else would ever stop it. Gate on the
    // scroll track instead, which does scroll away.
    let inView = true;
    const observer = new IntersectionObserver(
      (entries) => {
        inView = entries.some((e) => e.isIntersecting);
      },
      { rootMargin: "10% 0px" }
    );
    if (trackRef.current) observer.observe(trackRef.current);

    const lookTarget = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const worldUp = new THREE.Vector3(0, 1, 0);
    let elapsed = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      // Clamp dt: returning to a backgrounded tab produces one enormous
      // delta that would otherwise teleport every damped value.
      const dt = Math.min(clock.getDelta(), 0.1);
      if (!inView || document.hidden) return;
      elapsed += dt;

      // Re-read here as well as on the scroll event. A missed or coalesced
      // scroll event previously left the overlay frozen at 0 while the camera
      // kept descending; reading in the frame loop makes that impossible, and
      // it's the same rect read the camera needs anyway.
      updateScrollProgress();
      reportProgress();

      // Damped scroll — the single change that makes the motion feel weighted
      // rather than scrubbed. lambda 8 is responsive enough that it never
      // feels laggy, slow enough to carry momentum past a stopped wheel.
      easedProgress = THREE.MathUtils.damp(easedProgress, scrollProgress, 8, dt);
      const p = easedProgress;

      pointer.x = THREE.MathUtils.damp(pointer.x, pointerTarget.x, 3, dt);
      pointer.y = THREE.MathUtils.damp(pointer.y, pointerTarget.y, 3, dt);

      if (p <= ORBIT_END) {
        // Phase A — orbit. Tracks are authored over local [0,1], so remap
        // the (0..ORBIT_END) slice of the global progress onto that range.
        const localT = ORBIT_END > 0 ? p / ORBIT_END : 0;
        radiusTrack.evaluate(localT);
        heightTrack.evaluate(localT);
        angleTrack.evaluate(localT);
        lookTrack.evaluate(localT);

        // Idle drift — nothing in a real shot is ever perfectly still, and a
        // frozen frame at scroll rest is the tell that this is a rig rather
        // than a place. Amplitudes are deliberately below conscious notice.
        const breathe = Math.sin(elapsed * 0.4) * 0.006;
        const sway = Math.sin(elapsed * 0.27) * 0.008;

        camera.position.set(
          Math.sin(camState.angle) * camState.radius,
          camState.height + breathe,
          Math.cos(camState.angle) * camState.radius
        );
        lookTarget.set(sway, camState.lookY, 0);
      } else {
        // Phases B+C — position from the authored spiral curve, but a
        // manual lookAt rather than the curve's own rotation-minimizing
        // frame: that frame points along the path's tangent, which is
        // mostly vertical here and looks straight through the tube's
        // open middle. Looking toward a point on-axis, one layer-height
        // below, keeps a wall genuinely in frame the whole descent.
        const pathT = (p - ORBIT_END) / (1 - ORBIT_END);
        pathFollow.parameters.offset = Math.min(1, Math.max(0, pathT));
        // getPosition's `out` param is declared but not actually honored by
        // this version of the library — it always returns a fresh Vector3
        // regardless. Use the return value directly rather than relying on
        // mutate-in-place.
        camera.position.copy(pathFollow.getPosition(pathFollow.parameters.offset));
        // Looking a fixed distance below keeps a wall in frame for the whole
        // descent, but it would aim straight past the core on arrival. Ease the
        // target onto the core itself over the final stretch so the descent
        // resolves on the thing it was heading for.
        const arrival = THREE.MathUtils.smoothstep(p, 0.86, 1);
        lookTarget.set(
          0,
          THREE.MathUtils.lerp(camera.position.y - 2, CORE_CENTER_Y, arrival),
          0
        );
      }

      // Pointer parallax, applied identically in both phases: nudge the look
      // target, then slide the camera along its own right/up axes. Moving the
      // target alone reads as the camera glancing around; moving the position
      // too is what produces actual parallax against the foreground.
      const parallaxScale = p <= ORBIT_END ? 1 : 0.35;
      lookTarget.x += pointer.x * 0.06 * parallaxScale;
      lookTarget.y += -pointer.y * 0.03 * parallaxScale;

      forward.subVectors(lookTarget, camera.position).normalize();
      right.crossVectors(forward, worldUp).normalize();
      camera.position.addScaledVector(right, pointer.x * 0.03 * parallaxScale);
      camera.position.y += -pointer.y * 0.02 * parallaxScale;

      camera.lookAt(lookTarget);

      // How far into the underground the descent is, 0 at the surface and 1
      // once fully below. Drives exposure, headlamp, motes and bloom together
      // so they can never disagree about which world we're in.
      const undergroundT = Math.min(
        1,
        Math.max(0, (p - ORBIT_END) / (DIVE_END - ORBIT_END))
      );

      // The dive briefly dims before settling to the underground's own,
      // brighter, headlamp-appropriate exposure — that dip is what sells
      // "going under" as one continuous move rather than a cut.
      const dip = 1 - 0.45 * Math.sin(undergroundT * Math.PI);
      const targetExposure =
        THREE.MathUtils.lerp(SURFACE_EXPOSURE, UNDERGROUND_EXPOSURE, undergroundT) * dip;
      renderer.toneMappingExposure = THREE.MathUtils.damp(
        renderer.toneMappingExposure,
        targetExposure,
        6,
        dt
      );

      // Headlamp fades in across the dive so the layer walls are never
      // suddenly lit or suddenly dark — surface daylight has no reach
      // underground, but a hard on/off would look like a bug, not a light.
      headlamp.intensity = undergroundT * 60;
      headlamp.position.copy(camera.position);

      // The magma materials churn on their own `time` uniform — shader-core
      // injects it but never drives it.
      for (const material of timedMaterials) {
        material.uniforms.time.value = elapsed;
      }

      // Core: a slow pulse, and its own light rising as the camera closes in
      // over the final stretch. proximity is 0 until the last ~25% of the
      // descent, so the payoff arrives with the arrival. The core's own
      // brightness is baked into its emission shader, so the arrival is
      // carried by its light and by bloom rather than by an intensity scalar.
      const proximity = THREE.MathUtils.smoothstep(p, 0.78, 1);
      const pulse = 0.85 + Math.sin(elapsed * 1.6) * 0.15;
      coreLight.intensity = proximity * 26 * pulse;

      surfaceDust.setVisible(p < DIVE_END);
      surfaceDust.setOpacity(0.16 * (1 - undergroundT));
      surfaceDust.update(dt);

      undergroundMotes.setVisible(undergroundT > 0.05);
      undergroundMotes.setOpacity(0.5 * undergroundT);
      undergroundMotes.setCenter(camera.position.y);
      undergroundMotes.update(dt);

      for (const ring of boundaryRings) {
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.65 * undergroundT;
      }

      if (post) {
        // Bloom is near-off up top: the surface is a bright baked-texture
        // desert and blooming it just fogs the rock the whole shot is about.
        // Underground it does the opposite job — it's the only thing making
        // the rings and core read as light sources rather than bright paint.
        post.setBloomEnabled(undergroundT > 0.02);
        post.setBloom({
          strength: THREE.MathUtils.lerp(0, 0.85, undergroundT),
          radius: 0.7,
          threshold: 1.15,
        });
        post.setGrain(THREE.MathUtils.lerp(0.05, 0.16, undergroundT));
        post.render();
      } else {
        renderer.render(scene, camera);
      }
    };
    frameId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (canHover) window.removeEventListener("pointermove", handlePointerMove);
      surfaceDust.dispose();
      undergroundMotes.dispose();
      post?.dispose();
      daySky.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const material = obj.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material.dispose();
        }
      });
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [trackRef]);

  return <div ref={mountRef} className="position-absolute inset-0" />;
}
