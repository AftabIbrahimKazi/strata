// Ambient declarations for the Three.js APIs used by chart.ts.
// Covers only what the plugin needs — not the full three.js surface.
// THREE is provided at runtime via CDN (window.THREE).

declare namespace THREE {
  class Color {
    constructor(color?: string | number)
    set(color: string | number): this
  }

  class Vector2 {
    x: number
    y: number
    constructor(x?: number, y?: number)
    set(x: number, y: number): this
  }

  interface Intersection {
    object:   Object3D
    point:    Vector3
    distance: number
  }

  class Raycaster {
    setFromCamera(coords: Vector2, camera: Camera): void
    intersectObjects(objects: Object3D[], recursive?: boolean): Intersection[]
  }

  class Vector3 {
    x: number
    y: number
    z: number
    constructor(x?: number, y?: number, z?: number)
    set(x: number, y: number, z: number): this
    copy(v: Vector3): this
    clone(): Vector3
    lerpVectors(v1: Vector3, v2: Vector3, t: number): this
    project(camera: Camera): this
  }

  class Euler {
    x: number
    y: number
    z: number
  }

  class Object3D {
    position:   Vector3
    rotation:   Euler
    scale:      Vector3
    visible:    boolean
    userData:   Record<string, unknown>
    castShadow: boolean
    isMesh:     boolean
    traverse(callback: (obj: Object3D) => void): void
  }

  class Camera extends Object3D {
    lookAt(x: number | Vector3, y?: number, z?: number): void
    updateProjectionMatrix(): void
  }

  class PerspectiveCamera extends Camera {
    aspect: number
    fov:    number
    constructor(fov?: number, aspect?: number, near?: number, far?: number)
  }

  class OrthographicCamera extends Camera {
    left:   number
    right:  number
    top:    number
    bottom: number
    constructor(left?: number, right?: number, top?: number, bottom?: number, near?: number, far?: number)
  }

  class Light extends Object3D {}

  class AmbientLight extends Light {
    constructor(color?: number | string, intensity?: number)
  }

  class DirectionalLight extends Light {
    constructor(color?: number | string, intensity?: number)
  }

  class BufferGeometry {
    dispose(): void
    setFromPoints(points: Vector3[]): this
  }

  class BoxGeometry extends BufferGeometry {
    constructor(w?: number, h?: number, d?: number)
  }

  class SphereGeometry extends BufferGeometry {
    constructor(radius?: number, widthSeg?: number, heightSeg?: number)
  }

  class CylinderGeometry extends BufferGeometry {
    constructor(
      radiusTop?: number, radiusBottom?: number, height?: number,
      radialSeg?: number, heightSeg?: number, openEnded?: boolean,
      thetaStart?: number, thetaLength?: number,
    )
  }

  class CanvasTexture {
    constructor(canvas: HTMLCanvasElement)
    dispose(): void
  }

  class Material {
    dispose(): void
  }

  class MeshLambertMaterial extends Material {
    color:             Color
    emissive:          Color
    emissiveIntensity: number
    constructor(params?: { color?: Color | string | number; emissive?: Color | string | number })
  }

  class LineBasicMaterial extends Material {
    color: Color
    constructor(params?: { color?: Color | string | number; linewidth?: number })
  }

  class SpriteMaterial extends Material {
    map:         CanvasTexture | null
    transparent: boolean
    constructor(params?: { map?: CanvasTexture; transparent?: boolean })
  }

  class Mesh extends Object3D {
    geometry: BufferGeometry
    material: Material | Material[]
    constructor(geometry?: BufferGeometry, material?: Material)
  }

  class Line extends Object3D {
    geometry: BufferGeometry
    material: Material | Material[]
    constructor(geometry?: BufferGeometry, material?: Material)
  }

  class Sprite extends Object3D {
    material: SpriteMaterial
    constructor(material?: SpriteMaterial)
  }

  class Group extends Object3D {
    add(...objects: Object3D[]): this
    remove(...objects: Object3D[]): this
  }

  class Scene extends Object3D {
    background: Color | null
    add(...objects: Object3D[]): this
    remove(...objects: Object3D[]): this
  }

  class WebGLRenderer {
    domElement:  HTMLCanvasElement
    shadowMap:   { enabled: boolean }
    constructor(params?: { antialias?: boolean; alpha?: boolean })
    setPixelRatio(ratio: number): void
    setSize(w: number, h: number): void
    render(scene: Scene, camera: Camera): void
    dispose(): void
  }

  class GridHelper extends Object3D {
    constructor(size?: number, divisions?: number, color1?: number, color2?: number)
  }

  // OrbitControls — optional, loaded separately via CDN
  const OrbitControls: (new (camera: Camera, domElement: HTMLElement) => {
    enabled:        boolean
    enablePan:      boolean
    enableZoom:     boolean
    enableDamping:  boolean
    dampingFactor:  number
    object:         Camera
    update():       void
    dispose():      void
  }) | undefined
}
