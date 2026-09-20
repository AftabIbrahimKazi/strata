import * as THREE from "three";
import {
  NoiseTexture,
  AnimatedNoiseTexture,
  MusgraveTexture,
  VoronoiTexture,
  ColorRamp,
  MixRGB,
  Bump,
  Blackbody,
  Emission,
  AddShader,
  PrincipledBSDF,
  MaterialOutput,
  Geometry,
  SeparateXYZ,
  ShaderMath,
} from "@triforge/shader-core";

/**
 * Layer-to-concept mapping (the open item the hero intent doc left
 * unresolved) — each earth stratum maps to one real piece of Strata's own
 * architecture, crust to core, matching what a reader actually finds when
 * they open the repo:
 *
 *   Upper crust  → Utility classes   (what you write — the visible surface)
 *   Lower crust  → Component classes (assembled from utilities, one layer in)
 *   Upper mantle → Arbitrary values  (the escape hatch, same pipeline)
 *   Lower mantle → Design tokens     (the shared substrate everything draws from)
 *   Outer core   → The cascade       (molten, moving — where conflicts resolve)
 *   Inner core   → The JIT engine    (scanner + registry — what makes it all real)
 *
 * The split crust and split core both mirror the real Earth (upper/lower crust,
 * liquid outer core, solid inner core), and both earn their place rather than
 * being decoration: utilities vs. components and the cascade vs. the JIT engine
 * are genuinely different things, and collapsing either pair was hiding that.
 * It also gives the descent a real material arc — banded sediment, denser rock,
 * convecting liquid, then dense crystalline banding again at the centre.
 *
 * Each layer is a real ShaderMaterial on a cylinder wall the camera passes
 * through, so every added layer is a shader compile and a draw call. Six is a
 * deliberate ceiling; past this, check it against 3d-scene-hive's device-floor
 * rule before adding more.
 */
export interface LayerDef {
  label: string;
  line: string;
  colorA: string;
  colorB: string;
  /** Palette for the sedimentary banding, shallowest tone first. */
  bandStops: string[];
  /** 0 = cold dry sediment, 1 = fully molten. Drives glow and flow. */
  heat: number;
  /** Emission colour temperature in Kelvin, via Blackbody. */
  temperatureK: number;
  /**
   * Bedding frequency. NOT a general "detail" knob — WaveTexture computes
   * `fract((y * scale) / 2π)`, so the number of visible beds across a layer is
   * `(layerHeight * scale) / 2π`. These layers are ~3 units tall, so a value in
   * the twenties gives a dozen-plus beds; single digits give less than one and
   * the wall reads as a flat gradient with no strata at all.
   */
  beddingScale: number;
  /** Frequency of the erosion/fracture detail. Deliberately independent of
   * beddingScale — the ridges must stay broader than the beds they cut. */
  detailScale: number;
  /** World-space Y range this layer occupies, top to bottom (both negative). */
  yTop: number;
  yBottom: number;
}

export const LAYERS: LayerDef[] = [
  {
    label: "Upper crust — Utility classes",
    line: "The surface you write: w-100, flex, p-3 — one class, one property, JIT-scanned from your files.",
    colorA: "#c9986a",
    colorB: "#8a5a34",
    bandStops: ["#2b1a0e", "#b98a5c", "#4a2e1a", "#e0b98a", "#6b4529"],
    heat: 0,
    temperatureK: 900,
    beddingScale: 24,
    detailScale: 3.2,
    yTop: -1,
    yBottom: -4,
  },
  {
    label: "Lower crust — Component classes",
    line: "Built from the same utilities, one layer down — btn, card, modal — assembled, not hand-styled.",
    colorA: "#8a6b52",
    colorB: "#463024",
    bandStops: ["#181009", "#8a6b52", "#2c1d13", "#a8825f", "#3d2a1c"],
    heat: 0.05,
    temperatureK: 1100,
    beddingScale: 27,
    detailScale: 3.5,
    yTop: -4,
    yBottom: -7,
  },
  {
    label: "Upper mantle — Arbitrary values",
    line: "The escape hatch, still on rails: w-[320px], bg-[#f0f4f8] — any value you need, same JIT pipeline.",
    colorA: "#b1512f",
    colorB: "#6e2f1c",
    bandStops: ["#1d0a04", "#b1512f", "#3d180c", "#d4703f", "#5c2411"],
    heat: 0.3,
    temperatureK: 1500,
    beddingScale: 30,
    detailScale: 3.8,
    yTop: -7,
    yBottom: -10,
  },
  {
    label: "Lower mantle — Design tokens",
    line: "The shared substrate: CSS custom properties every color, radius, and shadow above actually draws from.",
    colorA: "#6a3a63",
    colorB: "#3a1f3b",
    bandStops: ["#140a17", "#6a3a63", "#221123", "#9a5a8f", "#301a33"],
    heat: 0.6,
    temperatureK: 2100,
    beddingScale: 34,
    detailScale: 4.4,
    yTop: -10,
    yBottom: -13,
  },
  {
    label: "Outer core — The cascade",
    line: "Molten and moving: @layer order decides every conflict, so nothing needs !important to win.",
    colorA: "#ff7a1a",
    colorB: "#c03d06",
    bandStops: ["#2e0c02", "#8f2f06", "#d75a0c", "#ff8c24", "#541804"],
    // Liquid, so its bedding is nearly gone — what's left is convection, not
    // stratification.
    heat: 0.85,
    temperatureK: 2600,
    beddingScale: 16,
    detailScale: 4.8,
    yTop: -13,
    yBottom: -16,
  },
  {
    label: "Inner core — The JIT engine",
    line: "The scanner and registry — what turns class names in your markup into exactly the CSS you used, nothing more.",
    colorA: "#ffd27a",
    colorB: "#ff9a1a",
    bandStops: ["#5a1e02", "#b8480a", "#ff8c24", "#ffd27a", "#fff4d0"],
    // Solid again under pressure, and the hottest thing in the scene — dense
    // banding returns, now as crystalline structure rather than sediment.
    heat: 1,
    temperatureK: 3200,
    beddingScale: 46,
    detailScale: 6.0,
    yTop: -16,
    yBottom: -19,
  },
];

export const DESCENT_END_Y = LAYERS[LAYERS.length - 1].yBottom;

/**
 * One stratum material, built as a shader-core node graph — no hand-written
 * GLSL anywhere in this file.
 *
 * The graph, and why each node is there rather than a cheaper stand-in:
 *
 *   Geometry.Position ─┬─ SeparateXYZ.Y ─ fract(y * scale) ─ bedding
 *                      │     This term is only meaningful on a surface where
 *                      │     world Y actually varies. It was once thought
 *                      │     broken — see the note on beddingCoord below for
 *                      │     what was really going on, because the failure
 *                      │     mode is worth recognising again.
 *                      │
 *                      ├─ Musgrave(RIDGED_MULTIFRACTAL) ─ erosion
 *                      │     Ridged multifractal is the erosion/fracture
 *                      │     profile. Clamped before use: it is unbounded and
 *                      │     everything downstream treats it as 0–1.
 *                      │
 *                      └─ Voronoi(DISTANCE_TO_EDGE) ─ crack mask
 *                            Cell borders read as fracture lines; it also
 *                            masks where heat is allowed to glow through, so
 *                            molten light comes out of the cracks rather than
 *                            washing the whole wall.
 *
 * Colour comes from a ColorRamp across the bedding fac, multiplied down by the
 * erosion fac. Bump converts the combined height into a perturbed normal —
 * that is what makes the wall read as rock under the headlamp rather than as
 * a painted cylinder, and it's the single biggest contributor to "these look
 * like layers" versus "these look like coloured tubes".
 *
 * Hot layers add Blackbody → Emission on top via AddShader, masked by the
 * cracks and (at full heat) animated so the magma actually moves.
 */
export function buildLayerMaterial(layer: LayerDef): THREE.ShaderMaterial {
  const geometry = new Geometry();
  const position = geometry.output("Position");

  // Vertical coordinate, isolated — see the graph note above.
  const axis = new SeparateXYZ({ vector: position });

  // Erosion / fracture. Ridged multifractal concentrates detail into sharp
  // ridges and gullies, which is what weathered rock actually does.
  const erosion = new MusgraveTexture({
    vector: position,
    type: "RIDGED_MULTIFRACTAL",
    scale: layer.detailScale,
    detail: 6,
    dimension: 0.9,
    lacunarity: 2.1,
  });

  // Musgrave is UNBOUNDED — a ridged multifractal at this detail returns
  // values in the tens, not 0–1. Everything downstream treats it as a 0–1
  // modulator, and feeding the raw value in shifted the band coordinate by
  // several whole periods, which scrambled the bedding into a cellular
  // leather texture. Clamp once, here, and use only the clamped value.
  const erosionN = new ShaderMath({ mode: "CLAMP", a: erosion.output("Fac"), b: 0, c: 1 });

  // Sedimentary bedding, computed explicitly rather than via WaveTexture.
  //
  // A long-standing "the bands don't render" bug lived here, and the diagnosis
  // was wrong in an instructive way. The bedding term is purely a function of
  // world Y, so it is FLAT BY DEFINITION on any horizontal surface. The layer
  // cylinders were capped and their material was left at three's FrontSide
  // default, which culled the walls from the inside — so every underground
  // pixel the camera saw was a horizontal cap, and the bands genuinely could
  // not appear. The 3D Musgrave and Voronoi in this same graph vary in x/z and
  // so kept looking correct, which pointed the investigation at shader-core's
  // SeparateXYZ and ColorRamp. Both are fine; the emitted GLSL was correct all
  // along. Fixed in HeroScene by making the tubes open-ended and BackSide.
  //
  // Corollary worth keeping: an isolation render only proves something about
  // the surface it actually landed on. Confirm you are looking at a wall
  // before concluding a Y-driven term is dead.
  //
  // The explicit form is kept over WaveTexture(BANDS) because every step of it
  // is inspectable — `fract(y * scale)` IS a saw band profile. WaveTexture was
  // previously written off here on evidence that turns out to have been
  // measured on a cap, so that verdict is void rather than confirmed; it may
  // well work, and has simply not been re-tested.
  //
  // The erosion term is added BEFORE the fraction so beds buckle and fault
  // along the fractal instead of running ruler-straight. It has to stay well
  // under a full period (1.0) or the beds dissolve into noise.
  const beddingCoord = new ShaderMath({
    mode: "ADD",
    a: new ShaderMath({
      mode: "MULTIPLY",
      a: axis.output("Y"),
      b: layer.beddingScale / (Math.PI * 2),
    }).output("Value"),
    b: new ShaderMath({ mode: "MULTIPLY", a: erosionN.output("Value"), b: 0.35 }).output("Value"),
  });
  const bedding = new ShaderMath({
    mode: "FRACTION",
    a: beddingCoord.output("Value"),
  });

  const cracks = new VoronoiTexture({
    vector: position,
    feature: "DISTANCE_TO_EDGE",
    scale: layer.detailScale * 2.2,
  });

  // Fine grain on top of everything, so the surface still has tooth when the
  // camera is close enough for the larger features to fill the frame.
  const grain = new NoiseTexture({
    vector: position,
    scale: layer.detailScale * 14,
    detail: 3,
    roughness: 0.6,
  });

  const bandColor = new ColorRamp({
    fac: bedding.output("Value"),
    stops: layer.bandStops,
  });

  // Multiply the bands down by erosion so gullies read as shadowed recesses.
  // Kept low deliberately: ridged multifractal is high-contrast and cellular,
  // and at anything like full strength it out-shouts the bedding completely —
  // the wall stops reading as strata and starts reading as leather. Erosion is
  // meant to weather the beds, not replace them.
  // Darken the beds where erosion is strong. Driving `fac` from the clamped
  // fractal against a fixed dark tone keeps this bounded; multiplying by
  // Musgrave's raw Color let an unbounded value set the pixel.
  const weathered = new MixRGB({
    mode: "MULTIPLY",
    fac: erosionN.output("Value"),
    colorA: bandColor.output("Color"),
    colorB: "#8a7a6a",
  });

  // Height for the bump: bedding relief dominant, with a little surface grain.
  // Bedding is weighted highest deliberately — the relief is what sells these
  // as beds, so anything that competes with it here undoes the whole effect.
  const height = new ShaderMath({
    mode: "ADD",
    a: bedding.output("Value"),
    b: new ShaderMath({ mode: "MULTIPLY", a: grain.output("Fac"), b: 0.12 }).output("Value"),
  });

  const bump = new Bump({
    height: height.output("Value"),
    strength: 0.85,
    distance: 0.12,
  });

  // Rougher in the gullies, slightly polished on the bed faces.
  const roughness = new ShaderMath({
    mode: "SUBTRACT",
    a: 1.0,
    b: new ShaderMath({ mode: "MULTIPLY", a: bedding.output("Value"), b: 0.25 }).output("Value"),
  });

  const surface = new PrincipledBSDF({
    baseColor: weathered.output("Color"),
    roughness: roughness.output("Value"),
    metallic: 0,
    normal: bump.output("Normal"),
  });

  if (layer.heat <= 0) {
    return new MaterialOutput({ surface: surface.output("BSDF") }).compile();
  }

  // ── Molten layers ────────────────────────────────────────────────────────
  // Heat lives in the fractures. Inverting DISTANCE_TO_EDGE puts the glow on
  // the cell borders; at full heat an animated noise churns it so the magma
  // reads as moving rather than as a static orange texture.
  // A high power is what keeps the glow in the fractures. DISTANCE_TO_EDGE
  // falls off gradually, so a gentle curve leaves most of the wall glowing —
  // which reads as a lit orange tube, not as heat escaping through cracks.
  const crackHeat = new ShaderMath({
    mode: "POWER",
    a: new ShaderMath({ mode: "SUBTRACT", a: 1.0, b: cracks.output("Distance") }).output("Value"),
    b: 7.0,
  });

  let heatMask = crackHeat.output("Value");
  if (layer.heat >= 1) {
    const flow = new AnimatedNoiseTexture({
      vector: position,
      scale: layer.beddingScale * 0.9,
      detail: 4,
      roughness: 0.55,
      distortion: 1.2,
      speed: 0.35,
    });
    heatMask = new ShaderMath({
      mode: "MULTIPLY",
      a: crackHeat.output("Value"),
      b: new ShaderMath({ mode: "ADD", a: flow.output("Fac"), b: 0.35 }).output("Value"),
    }).output("Value");
  }

  const glowColor = new Blackbody({ temperature: layer.temperatureK });
  const emission = new Emission({
    color: glowColor.output("Color"),
    // Emission feeds a linear HDR buffer that a bloom pass then reads, so the
    // usable range here is far smaller than it looks — at 4.5 the mid layers
    // cleared the bloom threshold across their whole surface and blew the
    // frame to white (see 3d-postprocessing-taste on scene-referred values).
    strength: new ShaderMath({
      mode: "MULTIPLY",
      a: heatMask,
      b: layer.heat * 0.45,
    }).output("Value"),
  });

  const combined = new AddShader({
    shader1: surface.output("BSDF"),
    shader2: emission.output("BSDF"),
  });

  return new MaterialOutput({ surface: combined.output("BSDF") }).compile();
}

/**
 * The glowing core the descent ends at. Emission-only and animated, so it
 * churns instead of sitting there as a flat orange ball — and being pure
 * emission, it clears a high bloom threshold predictably where a lit surface
 * never would (see 3d-postprocessing-taste).
 */
export function buildCoreMaterial(): THREE.ShaderMaterial {
  const geometry = new Geometry();
  const position = geometry.output("Position");

  const flow = new AnimatedNoiseTexture({
    vector: position,
    scale: 1.8,
    detail: 5,
    roughness: 0.6,
    distortion: 1.6,
    speed: 0.5,
  });

  // Cooler crust riding on hotter interior: mapping the flow onto a Kelvin
  // range instead of a fixed colour is what gives the surface its darker
  // veining, the way real molten rock skins over as it cools.
  const temperature = new ShaderMath({
    mode: "ADD",
    a: 1400,
    b: new ShaderMath({ mode: "MULTIPLY", a: flow.output("Fac"), b: 2200 }).output("Value"),
  });

  const glow = new Blackbody({ temperature: temperature.output("Value") });
  const emission = new Emission({
    color: glow.output("Color"),
    // Bloom multiplies whatever this is, so it only needs to clear the
    // threshold, not be bright on its own.
    strength: 0.9,
  });

  return new MaterialOutput({ surface: emission.output("BSDF") }).compile();
}

/**
 * shader-core injects a `time` uniform into any material built with an
 * AnimatedNoiseTexture, but nothing drives it — the caller has to. Collect
 * whichever materials actually got one rather than assuming which did.
 */
export function collectTimeUniforms(materials: THREE.ShaderMaterial[]) {
  return materials.filter((m) => m.uniforms && "time" in m.uniforms);
}
