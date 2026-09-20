import * as THREE from "three";

/**
 * Airborne particulate steered by a curl field, with the cursor able to shove
 * it around.
 *
 * The field is a 3D port of the approach in `@strata-packages/cursorfx`'s
 * `motion/curl` behaviour, and its rationale carries over exactly: giving each
 * axis its own independent wave makes every particle orbit its own centre,
 * which reads as a cloud of blobs wobbling in place. Deriving the heading from
 * a *shared* scalar field instead means neighbouring particles inherit nearly
 * the same direction and curl around one another — which is what turbulence
 * actually looks like. Two-and-a-bit trig calls per particle per frame is the
 * budget; as in cursorfx, this is not true Perlin curl noise and at these
 * scales the difference doesn't read.
 *
 * The cursor contributes a *gust*: a world-space impulse at a world-space
 * origin that decays. That's what makes dragging feel like pushing air rather
 * than nudging a global offset — particles near the drag move a lot, particles
 * across the shot barely notice.
 */
export interface DustOptions {
  count: number;
  /** Radius of the cylinder the particles live in. */
  radius: number;
  /** Vertical extent, centred on `centerY`. */
  height: number;
  centerY: number;
  color: number;
  size: number;
  opacity: number;
  /** Constant world-space drift, before any curl or gust. */
  drift: THREE.Vector3;
  /** Spatial frequency of the curl field. Lower = broader, lazier eddies. */
  curlScale: number;
  /** How hard the field pushes. */
  curlStrength: number;
  /** How strongly a cursor gust displaces this field. */
  gustInfluence: number;
}

function makeSpriteTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.32)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export class DustField {
  readonly points: THREE.Points;
  private readonly velocities: Float32Array;
  private readonly seeds: Float32Array;
  private readonly texture: THREE.Texture;
  private readonly opts: DustOptions;

  /** Current gust: direction * strength, and where in the world it happened. */
  private readonly gust = new THREE.Vector3();
  private readonly gustOrigin = new THREE.Vector3();
  private gustLife = 0;
  private time = 0;

  constructor(
    private readonly scene: THREE.Scene,
    opts: DustOptions
  ) {
    this.opts = opts;
    const { count, radius, height, centerY } = opts;

    const positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      // sqrt keeps the distribution even across the disc instead of clumping
      // everything toward the axis.
      const r = Math.sqrt(Math.random()) * radius;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = centerY + (Math.random() - 0.5) * height;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      this.seeds[i] = Math.random() * 1000;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    this.texture = makeSpriteTexture();
    const material = new THREE.PointsMaterial({
      size: opts.size,
      map: this.texture,
      transparent: true,
      opacity: opts.opacity,
      depthWrite: false,
      color: opts.color,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  /**
   * Push the air. `direction` is a world-space shove, `origin` is where it
   * happened — particles fall off with distance from it, which is what makes
   * the drag feel local instead of global.
   */
  addGust(direction: THREE.Vector3, origin: THREE.Vector3) {
    this.gust.copy(direction);
    this.gustOrigin.copy(origin);
    this.gustLife = 1;
  }

  update(dt: number) {
    if (!this.points.visible) return;
    this.time += dt;

    const {
      count,
      radius,
      height,
      centerY,
      drift,
      curlScale,
      curlStrength,
      gustInfluence,
    } = this.opts;

    // A gust is an event, not a state — it decays out over about a second.
    this.gustLife = Math.max(0, this.gustLife - dt * 1.1);
    const gustActive = this.gustLife > 0.001 && gustInfluence > 0;

    const attr = this.points.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const halfHeight = height / 2;
    const t = this.time;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;
      const x = arr[ix];
      const y = arr[iy];
      const z = arr[iz];
      const seed = this.seeds[i];

      // One shared scalar field drives the heading, so neighbours agree — see
      // the note at the top of this file.
      const azimuth =
        (Math.sin((x + seed) * curlScale + t * 0.6) +
          Math.cos((z + seed) * curlScale * 1.3 - t * 0.45)) *
        Math.PI;
      const elevation = Math.sin((y + seed) * curlScale * 1.1 - t * 0.35) * 0.6;

      const cosEl = Math.cos(elevation);
      let vx = Math.cos(azimuth) * cosEl * curlStrength;
      let vy = Math.sin(elevation) * curlStrength;
      let vz = Math.sin(azimuth) * cosEl * curlStrength;

      if (gustActive) {
        const dx = x - this.gustOrigin.x;
        const dy = y - this.gustOrigin.y;
        const dz = z - this.gustOrigin.z;
        // Inverse-square-ish falloff, softened so the near field doesn't spike.
        const falloff = 1 / (1 + (dx * dx + dy * dy + dz * dz) * 1.4);
        const g = falloff * this.gustLife * gustInfluence;
        vx += this.gust.x * g;
        vy += this.gust.y * g;
        vz += this.gust.z * g;
      }

      // Birth/gust velocity is damped out so the field always wins eventually,
      // which is what keeps the whole volume coherent rather than gradually
      // shredding into independent trajectories.
      this.velocities[ix] = this.velocities[ix] * 0.94 + vx * 0.06;
      this.velocities[iy] = this.velocities[iy] * 0.94 + vy * 0.06;
      this.velocities[iz] = this.velocities[iz] * 0.94 + vz * 0.06;

      arr[ix] += (this.velocities[ix] + drift.x) * dt;
      arr[iy] += (this.velocities[iy] + drift.y) * dt;
      arr[iz] += (this.velocities[iz] + drift.z) * dt;

      // Wrap rather than respawn at a fixed point, so the field reads as
      // continuous instead of visibly recycling.
      if (arr[ix] * arr[ix] + arr[iz] * arr[iz] > radius * radius) {
        arr[ix] = -arr[ix] * 0.92;
        arr[iz] = -arr[iz] * 0.92;
      }
      if (arr[iy] > centerY + halfHeight) arr[iy] = centerY - halfHeight;
      if (arr[iy] < centerY - halfHeight) arr[iy] = centerY + halfHeight;
    }
    attr.needsUpdate = true;
  }

  /** Underground motes follow the camera so the field is always around the
   * viewer rather than a fixed patch they fall out of. */
  setCenter(y: number) {
    this.opts.centerY = y;
  }

  setVisible(visible: boolean) {
    this.points.visible = visible;
  }

  setOpacity(opacity: number) {
    (this.points.material as THREE.PointsMaterial).opacity = opacity;
  }

  dispose() {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    (this.points.material as THREE.PointsMaterial).dispose();
    this.texture.dispose();
  }
}
