import * as THREE from "three";
import {
  CompositorOutput,
  Bloom,
  ChromaticAberration,
  FilmGrain,
  Vignette,
} from "@triforge/compositor-core";

/**
 * Post-processing, built on @triforge/compositor-core.
 *
 * ── On the HANDOVER note saying this package "washes the frame into flat haze
 * regardless of pass parameters" ────────────────────────────────────────────
 * That verdict was a misdiagnosis. The same washout reproduces with three's
 * own stock EffectComposer, because the real cause is a units problem that is
 * independent of which library draws the pass:
 *
 *   UnrealBloomPass's `threshold` is compared against PRE-TONEMAPPED LINEAR
 *   HDR luminance, not a 0–1 display value.
 *
 * A daylit sky's linear radiance runs well above 1.0, so any "sensible
 * looking" threshold below ~1 makes essentially the whole sky exceed it and
 * bloom — which is precisely the flat haze that was reported. compositor-core
 * defaults to `threshold: 0.8, strength: 1.5`, so an untuned Bloom on this
 * scene was always going to do that. The library is fine; the parameters
 * weren't. Above ground this scene now disables bloom outright rather than
 * merely turning it down.
 *
 * ── Live parameters ─────────────────────────────────────────────────────────
 * BasePass documents its `parameters` object as "GSAP-animatable", but on the
 * three backend that isn't true after compile(): `_buildThree()` reads the
 * numbers once and bakes them into the constructed pass
 * (`new UnrealBloomPass(size, parameters.strength, ...)`), and the built object
 * is never stored back on the node. Mutating `bloomNode.parameters.strength`
 * afterwards therefore does nothing. Since this scene needs bloom and grain to
 * move with scroll depth, we bind the built three passes once after compile()
 * and drive those directly — see bindBuiltPasses().
 */

/** The subset of UnrealBloomPass this scene drives per frame. */
interface BuiltBloom {
  strength: number;
  radius: number;
  threshold: number;
  enabled: boolean;
}

interface BuiltUniformPass {
  enabled: boolean;
  uniforms: Record<string, { value: number }>;
}

export interface BloomState {
  strength: number;
  radius: number;
  threshold: number;
}

export class ScenePost {
  private readonly comp: CompositorOutput;
  private readonly bloomNode: Bloom;
  private builtBloom: BuiltBloom | null = null;
  private builtGrain: BuiltUniformPass | null = null;

  private constructor(comp: CompositorOutput, bloomNode: Bloom) {
    this.comp = comp;
    this.bloomNode = bloomNode;
  }

  static async create(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ): Promise<ScenePost> {
    const comp = new CompositorOutput({ renderer, scene, camera });

    // Threshold starts high on purpose: the opening shot is a bright, baked
    // texture desert and there is nothing up there that should glow.
    const bloom = new Bloom({ strength: 0, radius: 0.7, threshold: 2.5 });

    // Radially modulated, so the centre of frame stays clean and only the
    // corners fringe — the way a real lens fails, rather than a global shift.
    const aberration = new ChromaticAberration({ offset: 0.0016, radialModulation: 0.9 });

    // greyscale MUST stay false. compositor-core documents it as "Greyscale
    // grain", but it maps to three's FilmPass `grayscale` flag, which
    // desaturates the ENTIRE FRAME rather than just the noise — it turned the
    // whole desert black-and-white.
    const grain = new FilmGrain({ intensity: 0.06, greyscale: false });

    // compositor-core's Vignette shader is `smoothstep(0.8, offset * 0.799, …)`,
    // so edge0 and edge1 collapse onto each other at the default offset of 1.0
    // and the falloff becomes a hard edge. Dropping offset well below 1 is what
    // opens that gap back up into an actual gradient.
    const vignette = new Vignette({ darkness: 0.45, offset: 0.55 });

    comp.add(bloom).add(aberration).add(grain).add(vignette);
    await comp.compile();

    const post = new ScenePost(comp, bloom);
    post.bindBuiltPasses();
    return post;
  }

  /**
   * Recover references to the passes CompositorOutput actually built, so their
   * uniforms can be driven per frame. Matching on constructor name rather than
   * on chain position means adding or reordering passes later can't silently
   * repoint these at the wrong object.
   */
  private bindBuiltPasses() {
    const internal = this.comp as unknown as {
      _composer?: { passes?: Array<{ constructor?: { name?: string } }> };
    };
    for (const pass of internal._composer?.passes ?? []) {
      const name = pass?.constructor?.name;
      if (name === "UnrealBloomPass") this.builtBloom = pass as unknown as BuiltBloom;
      if (name === "FilmPass") this.builtGrain = pass as unknown as BuiltUniformPass;
    }
  }

  setBloom({ strength, radius, threshold }: BloomState) {
    if (!this.builtBloom) return;
    this.builtBloom.strength = strength;
    this.builtBloom.radius = radius;
    this.builtBloom.threshold = threshold;
  }

  setBloomEnabled(enabled: boolean) {
    // `enabled` on a BasePass node is only read at compile time, but
    // EffectComposer re-checks it on the built pass every frame — so this has
    // to go to the built object too.
    this.bloomNode.enabled = enabled;
    if (this.builtBloom) this.builtBloom.enabled = enabled;
  }

  /** Grain reads as low-light sensor noise underground and as nothing up top. */
  setGrain(amount: number) {
    const uniform = this.builtGrain?.uniforms?.intensity;
    if (uniform) uniform.value = amount;
  }

  setSize(width: number, height: number) {
    this.comp.setSize(width, height);
  }

  render() {
    this.comp.render();
  }

  dispose() {
    this.comp.dispose();
  }
}
