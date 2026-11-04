import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";

interface SkyState {
  elevation: number;
  azimuth: number;
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSkyColor: THREE.Color;
  hemiGroundColor: THREE.Color;
  hemiIntensity: number;
  exposure: number;
  environmentIntensity: number;
  /** Distance haze color — airborne dust, not a generic atmospheric blue. */
  fogColor: THREE.Color;
}

// A single fixed preset, not a switchable theme. The hero's rock formation
// is a baked/scanned asset (see 3d-lighting-realism's baked-asset row) — its
// shading is lit at one fixed sun angle baked into its texture, so any
// light-driven day/night switch here would only ever move the sky/lights
// while the rock itself stayed frozen, breaking the match between the two.
// This preset is tuned to sit close to the angle/warmth the baked texture
// itself already reads as (a mid-morning-to-midday desert sun), specifically
// so the HDR environment and directional sun track the baked lighting
// instead of fighting it. Do not reintroduce a day/dusk/night switch here —
// see 3d-lighting-realism and 3d-scene-hive's baked-asset rows.
const BAKED_MATCH_PRESET: SkyState = {
  elevation: 42,
  azimuth: 145,
  turbidity: 7,
  rayleigh: 1.9,
  mieCoefficient: 0.007,
  mieDirectionalG: 0.8,
  sunColor: new THREE.Color(0xfff0c8),
  sunIntensity: 1.9,
  hemiSkyColor: new THREE.Color(0xc9dcea),
  hemiGroundColor: new THREE.Color(0x4a3218),
  hemiIntensity: 0.85,
  exposure: 0.5,
  environmentIntensity: 0.5,
  fogColor: new THREE.Color(0xe8d4a0),
};

/**
 * Owns the sky dome and the sun/hemisphere lights. Static by design — see
 * BAKED_MATCH_PRESET's comment. No theme switching, no transitions: the
 * environment is baked once at startup and never re-baked.
 */
export class DayNightSky {
  readonly sky: Sky;
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;

  private readonly state: SkyState;
  private readonly sunDirection = new THREE.Vector3();

  // A second, undisplayed Sky + scene used only for baking the environment
  // map — keeps the rock model and lights out of its own reflections, and
  // means the (real) cost of an environment bake is "render a sky shader
  // into 6 faces," not "render the whole scene into 6 faces." This is what
  // actually ties the rock's ambient lighting to the sky's real color —
  // the directional sun alone was lighting the model from an angle
  // unrelated to how its baked photogrammetry texture was originally lit,
  // which read as "the HDR doesn't match the scene."
  private readonly envSky: Sky;
  private readonly envScene: THREE.Scene;
  private readonly pmrem: THREE.PMREMGenerator;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly renderer: THREE.WebGLRenderer
  ) {
    this.sky = new Sky();
    this.sky.scale.setScalar(1000);
    scene.add(this.sky);

    this.envSky = new Sky();
    this.envSky.scale.setScalar(1000);
    this.envScene = new THREE.Scene();
    this.envScene.add(this.envSky);
    this.pmrem = new THREE.PMREMGenerator(renderer);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    scene.add(this.sun);

    // Sand-tinted haze standing in for desert heat haze/dust at distance —
    // low density on purpose, it should read at the sky's ~1000-unit scale
    // without fogging out the close-up subject a few units from camera.
    scene.fog = new THREE.FogExp2(0xffffff, 0.004);

    this.state = cloneState(BAKED_MATCH_PRESET);
    this.applyImmediate();
    this.bakeEnvironment();
  }

  /** No-op each frame — kept so HeroScene's animate loop doesn't need a
   * conditional; the lighting is intentionally static. */
  update(_dt: number) {
    void _dt;
  }

  dispose() {
    this.sky.geometry.dispose();
    (this.sky.material as THREE.Material).dispose();
    this.envSky.geometry.dispose();
    (this.envSky.material as THREE.Material).dispose();
    this.pmrem.dispose();
    if (this.scene.environment) {
      this.scene.environment.dispose();
      this.scene.environment = null;
    }
    this.scene.fog = null;
  }

  private applyImmediate() {
    const s = this.state;
    for (const material of [this.sky.material, this.envSky.material] as THREE.ShaderMaterial[]) {
      const uniforms = material.uniforms;
      uniforms.turbidity.value = s.turbidity;
      uniforms.rayleigh.value = s.rayleigh;
      uniforms.mieCoefficient.value = s.mieCoefficient;
      uniforms.mieDirectionalG.value = s.mieDirectionalG;

      const phi = THREE.MathUtils.degToRad(90 - s.elevation);
      const theta = THREE.MathUtils.degToRad(s.azimuth);
      this.sunDirection.setFromSphericalCoords(1, phi, theta);
      uniforms.sunPosition.value.copy(this.sunDirection);
    }

    this.sun.position.copy(this.sunDirection).multiplyScalar(50);
    this.sun.color.copy(s.sunColor);
    this.sun.intensity = s.sunIntensity;

    this.hemi.color.copy(s.hemiSkyColor);
    this.hemi.groundColor.copy(s.hemiGroundColor);
    this.hemi.intensity = s.hemiIntensity;

    this.renderer.toneMappingExposure = s.exposure;
    this.scene.environmentIntensity = s.environmentIntensity;
    (this.scene.fog as THREE.FogExp2).color.copy(s.fogColor);
  }

  private bakeEnvironment() {
    const renderTarget = this.pmrem.fromScene(this.envScene, 0.04);
    if (this.scene.environment) this.scene.environment.dispose();
    this.scene.environment = renderTarget.texture;
  }
}

function cloneState(state: SkyState): SkyState {
  return {
    ...state,
    sunColor: state.sunColor.clone(),
    hemiSkyColor: state.hemiSkyColor.clone(),
    hemiGroundColor: state.hemiGroundColor.clone(),
    fogColor: state.fogColor.clone(),
  };
}
