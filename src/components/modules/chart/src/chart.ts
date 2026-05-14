/*!
 * Strata Chart Component
 *
 * Requires Three.js loaded before this script (window.THREE must exist).
 *
 * Usage:
 *   const chart = Strata.Chart.create('#myChart', {
 *     type: 'bar' | 'line' | 'pie' | 'scatter',
 *     view: '2d' | '3d',
 *     data: [{ label, value, category }],
 *     colors: ['#hex'],
 *     theme: 'auto' | 'light' | 'dark',
 *
 *     // Feature flags (all default false)
 *     gridView:                false,  // show scale reference grid
 *     showAxisLabels:          false,  // X-axis category labels
 *     showScale:               false,  // Y-axis numeric scale indicators
 *     showGridLabels:          false,  // labels at each horizontal grid line
 *     highlightGridOnInteract: false,  // highlight grid lines on hover/click
 *
 *     onReady:  (chart) => void,
 *     onChange: (view) => void,
 *     onClick:  (point) => void,
 *   })
 *
 *   chart.toggleView()
 *   chart.setView('2d' | '3d')
 *   chart.update(newData)
 *   chart.addDataPoint(point)
 *   chart.removeDataPoint(index)
 *   chart.addDataPoints(points)
 *   chart.removeDataPoints(indices)
 *   chart.updateDataPoint(index, data)
 *   chart.destroy()
 *
 * Data attributes set on the container:
 *   data-st-chart-view     — '2d' | '3d'
 *   data-st-chart-type     — 'bar' | 'line' | 'pie' | 'scatter'
 *   data-st-chart-loading  — 'true' | 'false'
 *   data-st-chart-animated — 'true' | 'false'
 *   data-st-chart-hovered  — 'true' | 'false'
 *
 * Events fired on document:
 *   st:chart:ready   — detail: { chart, view }
 *   st:chart:change  — detail: { chart, from, to }
 *   st:chart:update  — detail: { chart }
 *   st:chart:click   — detail: { label, value, category, index }
 *   st:chart:destroy — detail: { chart }
 */

// ─── Types ────────────────────────────────────────────────────────────────────

type ChartType = 'bar' | 'line' | 'pie' | 'scatter'
type ChartView = '2d'  | '3d'
type ThemeOpt  = 'auto' | 'light' | 'dark'

interface RawPoint {
  value:      number | null | undefined
  label?:     string
  category?:  string
  timestamp?: number | string
  meta?:      Record<string, unknown>
}

interface NormalizedPoint {
  value:    number
  label:    string
  category: string
  meta:     Record<string, unknown>
}

interface CameraConfig {
  x: number
  y: number
  z: number
  fov: number
}

interface ChartOptions {
  type?:     ChartType
  view?:     ChartView
  data:      RawPoint[]
  colors?:   string[]
  theme?:    ThemeOpt
  camera3d?: Partial<CameraConfig>
  camera2d?: Partial<CameraConfig>

  // Feature 1: Grid View System
  gridView?: boolean

  // Feature 2: Chart Labels & Scales
  showAxisLabels?: boolean
  showScale?:      boolean
  showGridLabels?: boolean

  // Feature 3: Interactive Grid Highlighting
  highlightGridOnInteract?: boolean

  onReady?:  (chart: StrataChart) => void
  onChange?: (view: ChartView) => void
  onClick?:  (point: { label: string; value: number; category: string; index: number }) => void
}

interface OrbitControlsInstance {
  enabled:        boolean
  enablePan:      boolean
  enableZoom:     boolean
  enableDamping:  boolean
  dampingFactor:  number
  object:         THREE.Camera
  update():       void
  dispose():      void
}

interface StrataNamespace { Chart: ChartPlugin }

interface ChartPlugin {
  create(selector: string | Element, options: ChartOptions): StrataChart | null
  destroyAll(): void
}

interface MeshUserData {
  label?:      string
  value?:      number
  category?:   string
  index?:      number
  _depthFrom?: number
  _depthTo?:   number
}

interface GridRefs {
  hLines: THREE.Line[]
  vLines: THREE.Line[]
}

interface BuildResult {
  group:    THREE.Group
  gridRefs: GridRefs | null
  maxVal:   number
}

interface RenderOpts {
  is3D:            boolean
  gridView:        boolean
  showAxisLabels:  boolean
  showScale:       boolean
  showGridLabels:  boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TRANSITION_MS  = 600
// Cinematic 3D angle — elevated, diagonal, dramatic
const CAMERA_3D      = { x: 3.5, y: 6.5, z: 9.5, fov: 42 }
// Near-orthographic 2D front view — narrow FOV simulates flat projection
const CAMERA_2D      = { x: 0,   y: 2,   z: 22,  fov: 18 }
const DEFAULT_COLORS = ['#4a90e2', '#e25f4a', '#50c878', '#f5a623', '#9b59b6', '#1abc9c']
const VALID_TYPES    = ['bar', 'line', 'pie', 'scatter'] as ChartType[]
const MAX_POINTS     = 100_000
const STRIP_HTML     = /<[^>]*>/g
const SCALE_STEPS    = 5
const GRID_COLOR_NORMAL    = 0xd4d4d4
const GRID_COLOR_HIGHLIGHT = '#4a90e2'

// ─── Registry ─────────────────────────────────────────────────────────────────

const registry = new Map<Element, StrataChart>()

// ─── Utilities ────────────────────────────────────────────────────────────────

function readCSSVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t }

// Smooth cubic ease — less aggressive than quadratic, avoids the snap at 1
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function dispatch(name: string, detail: Record<string, unknown>): void {
  document.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }))
}

// ─── Data Pipeline ────────────────────────────────────────────────────────────

function validateData(input: unknown): RawPoint[] {
  if (!Array.isArray(input))     throw new Error('[Strata Chart] data must be an array.')
  if (input.length === 0)        throw new Error('[Strata Chart] data array is empty.')
  if (input.length > MAX_POINTS) throw new Error(`[Strata Chart] data exceeds ${MAX_POINTS} points.`)

  return (input as unknown[]).map((item, i): RawPoint => {
    if (typeof item !== 'object' || item === null)
      throw new Error(`[Strata Chart] item at index ${i} must be an object.`)
    const rec = item as Record<string, unknown>
    if (!('value' in rec)) throw new Error(`[Strata Chart] item at index ${i} missing "value".`)
    const raw = rec['value']
    if (raw !== null && raw !== undefined && typeof raw !== 'number')
      throw new Error(`[Strata Chart] item at index ${i}: "value" must be a number, null, or undefined.`)
    return {
      value:     raw as number | null | undefined,
      label:     typeof rec['label']    === 'string' ? rec['label'].replace(STRIP_HTML, '').slice(0, 256)  : undefined,
      category:  typeof rec['category'] === 'string' ? rec['category'].replace(STRIP_HTML, '').slice(0, 128) : undefined,
      timestamp: rec['timestamp'] as number | string | undefined,
      meta:      (typeof rec['meta'] === 'object' && rec['meta'] !== null) ? rec['meta'] as Record<string, unknown> : undefined,
    }
  })
}

function normalizeData(points: RawPoint[]): NormalizedPoint[] {
  const finite = points.map(p => p.value).filter((v): v is number => typeof v === 'number' && isFinite(v))
  const finiteMax = finite.length > 0 ? Math.max(...finite) : 0
  const finiteMin = finite.length > 0 ? Math.min(...finite) : 0
  const out: NormalizedPoint[] = []
  points.forEach((p, i) => {
    const raw = p.value
    let value: number
    if (raw === null || raw === undefined || (typeof raw === 'number' && isNaN(raw))) {
      value = 0
    } else if (!isFinite(raw)) {
      value = raw === Infinity ? finiteMax : finiteMin
    } else {
      value = raw
    }
    out.push({ value, label: p.label ?? `Point ${i}`, category: p.category ?? 'default', meta: p.meta ?? {} })
  })
  return out
}

function aggregateCategorical(points: NormalizedPoint[]): NormalizedPoint[] {
  const groups = new Map<string, NormalizedPoint[]>()
  for (const p of points) {
    if (!groups.has(p.category)) groups.set(p.category, [])
    groups.get(p.category)!.push(p)
  }
  const out: NormalizedPoint[] = []
  groups.forEach((group, cat) => {
    out.push({ value: group.reduce((s, p) => s + p.value, 0), label: cat, category: cat, meta: {} })
  })
  return out
}

function processData(rawData: unknown, type: ChartType): NormalizedPoint[] {
  const validated  = validateData(rawData)
  const normalized = normalizeData(validated)
  return (type === 'bar' || type === 'pie') ? aggregateCategorical(normalized) : normalized
}

// ─── Theme Adapter ────────────────────────────────────────────────────────────

function resolveColors(userColors: string[] | undefined, count: number): string[] {
  const palette: string[] = (userColors && userColors.length > 0) ? userColors : [
    readCSSVar('--st-primary',   DEFAULT_COLORS[0]),
    readCSSVar('--st-secondary', DEFAULT_COLORS[1]),
    readCSSVar('--st-success',   DEFAULT_COLORS[2]),
    readCSSVar('--st-warning',   DEFAULT_COLORS[3]),
    readCSSVar('--st-info',      DEFAULT_COLORS[4]),
    DEFAULT_COLORS[5],
  ]
  return Array.from({ length: count }, (_, i) => palette[i % palette.length])
}

function resolveTheme(opt: ThemeOpt | undefined): 'light' | 'dark' {
  if (opt === 'dark' || opt === 'light') return opt
  const attr = document.documentElement.getAttribute('data-st-theme')
  return (attr === 'dark' || attr === 'dim') ? 'dark' : 'light'
}

function sceneBgColor(theme: 'light' | 'dark'): string {
  return readCSSVar('--st-bg', theme === 'dark' ? '#16213e' : '#ffffff')
}

// ─── Scene Manager ────────────────────────────────────────────────────────────

class SceneManager {
  scene:    THREE.Scene
  camera:   THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControlsInstance | null = null
  private _raf: number | null = null
  private _ro:  ResizeObserver | null = null

  constructor(private container: HTMLElement, theme: 'light' | 'dark', startView: ChartView, camCfg: CameraConfig) {
    const w = container.clientWidth  || 400
    const h = container.clientHeight || 300
    const c = camCfg

    this.scene            = new THREE.Scene()
    this.scene.background = new THREE.Color(sceneBgColor(theme))

    this.camera = new THREE.PerspectiveCamera(c.fov, w / h, 0.1, 1000)
    this.camera.position.set(c.x, c.y, c.z)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h)
    this.renderer.shadowMap.enabled = true

    const canvas = this.renderer.domElement
    canvas.className = 'strata-chart-canvas'
    container.appendChild(canvas)

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const key = new THREE.DirectionalLight(0xffffff, 0.9)
    key.position.set(6, 10, 7)
    key.castShadow = true
    this.scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.25)
    fill.position.set(-5, 3, -5)
    this.scene.add(fill)

    if (THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, canvas)
      this.controls.enablePan   = false
      this.controls.enableZoom  = true
      this.controls.enableDamping  = true
      this.controls.dampingFactor  = 0.07
      this.controls.enabled = startView === '3d'
    }
  }

  startLoop(onFrame: () => void): void {
    const tick = (): void => {
      this._raf = requestAnimationFrame(tick)
      if (this.controls && this.controls.enabled) this.controls.update()
      onFrame()
      this.renderer.render(this.scene, this.camera)
    }
    tick()
  }

  stopLoop(): void {
    if (this._raf !== null) { cancelAnimationFrame(this._raf); this._raf = null }
  }

  watchResize(): void {
    if (!window.ResizeObserver) return
    this._ro = new ResizeObserver(() => {
      const w = this.container.clientWidth
      const h = this.container.clientHeight || 300
      this.renderer.setSize(w, h)
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
    })
    this._ro.observe(this.container)
  }

  dispose(): void {
    this.stopLoop()
    this._ro?.disconnect()
    this.controls?.dispose()
    this.renderer.dispose()
    this.renderer.domElement.parentNode?.removeChild(this.renderer.domElement)
  }
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function disposeMeshes(scene: THREE.Scene, group: THREE.Group | null): void {
  if (!group) return
  group.traverse(obj => {
    const node = obj as THREE.Mesh
    if (node.geometry) node.geometry.dispose()
    if (node.material) {
      const mats = Array.isArray(node.material) ? node.material : [node.material]
      mats.forEach(m => {
        // dispose CanvasTexture maps attached to SpriteMaterial
        const sm = m as THREE.SpriteMaterial
        if (sm.map) sm.map.dispose()
        m.dispose()
      })
    }
  })
  scene.remove(group)
}

function tagMesh(mesh: THREE.Mesh, p: NormalizedPoint, index: number): void {
  const ud = mesh.userData as MeshUserData
  ud.label    = p.label
  ud.value    = p.value
  ud.category = p.category
  ud.index    = index
}

// ─── Label & Grid helpers ─────────────────────────────────────────────────────

function makeTextSprite(text: string, color: string): THREE.Sprite {
  const canvas  = document.createElement('canvas')
  canvas.width  = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.font      = '26px sans-serif'
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.fillText(text, 128, 44)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
  return new THREE.Sprite(mat)
}

// Builds horizontal (scale) and vertical (column) grid lines in the XY plane.
// Returns the parent group and refs to individual lines for interactive highlighting.
function buildGridLines(
  points:     NormalizedPoint[],
  opts:       RenderOpts,
  labelColor: string,
  maxVal:     number,
): { group: THREE.Group; refs: GridRefs } {
  const group   = new THREE.Group()
  const spacing = 1.2
  const n       = points.length
  const startX  = -(n * spacing / 2) + spacing / 2
  const endX    = startX + (n - 1) * spacing
  const margin  = spacing / 2
  const hLines: THREE.Line[] = []
  const vLines: THREE.Line[] = []

  // Horizontal reference lines at each scale step
  for (let s = 0; s < SCALE_STEPS; s++) {
    const y   = (s / (SCALE_STEPS - 1)) * 3
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(startX - margin, y, 0),
      new THREE.Vector3(endX + margin, y, 0),
    ])
    const mat  = new THREE.LineBasicMaterial({ color: GRID_COLOR_NORMAL })
    const line = new THREE.Line(geo, mat)
    group.add(line)
    hLines.push(line)

    if (opts.showGridLabels) {
      const val    = (s / (SCALE_STEPS - 1)) * maxVal
      const label  = makeTextSprite(val.toFixed(0), labelColor)
      label.position.set(endX + margin + 0.6, y, 0)
      label.scale.set(1.0, 0.26, 1)
      group.add(label)
    }
  }

  // Vertical reference lines at each data point
  for (let i = 0; i < n; i++) {
    const x   = startX + i * spacing
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, 0, 0),
      new THREE.Vector3(x, 3, 0),
    ])
    const mat  = new THREE.LineBasicMaterial({ color: GRID_COLOR_NORMAL })
    const line = new THREE.Line(geo, mat)
    group.add(line)
    vLines.push(line)
  }

  return { group, refs: { hLines, vLines } }
}

// ─── Bar Renderer ─────────────────────────────────────────────────────────────

function buildBarGroup(points: NormalizedPoint[], colors: string[], opts: RenderOpts): BuildResult {
  const group      = new THREE.Group()
  const maxVal     = Math.max(...points.map(p => p.value)) || 1
  const spacing    = 1.2
  const startX     = -(points.length * spacing / 2) + spacing / 2
  const labelColor = readCSSVar('--st-text', '#888888')
  let gridRefs: GridRefs | null = null

  if (opts.gridView) {
    const { group: gGroup, refs } = buildGridLines(points, opts, labelColor, maxVal)
    group.add(gGroup)
    gridRefs = refs
  }

  // Floor grid in 3D (existing aesthetic, preserved regardless of gridView)
  if (opts.is3D) {
    const grid = new THREE.GridHelper(points.length * spacing + 1, points.length, 0xaaaaaa, 0xdddddd)
    grid.position.y = -0.01
    group.add(grid)
  }

  if (opts.showScale) {
    for (let s = 0; s < SCALE_STEPS; s++) {
      const y   = (s / (SCALE_STEPS - 1)) * 3
      const val = (s / (SCALE_STEPS - 1)) * maxVal
      const lbl = makeTextSprite(val.toFixed(0), labelColor)
      lbl.position.set(startX - spacing * 0.85, y, 0)
      lbl.scale.set(1.0, 0.26, 1)
      group.add(lbl)
    }
  }

  points.forEach((p, i) => {
    const h    = Math.max((p.value / maxVal) * 3, 0.05)
    const geo  = new THREE.BoxGeometry(0.75, h, opts.is3D ? 0.75 : 0.01)
    const mat  = new THREE.MeshLambertMaterial({ color: new THREE.Color(colors[i % colors.length]) })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(startX + i * spacing, h / 2, 0)
    mesh.castShadow = true
    tagMesh(mesh, p, i)
    group.add(mesh)

    if (opts.showAxisLabels) {
      const lbl = makeTextSprite(p.label, labelColor)
      lbl.position.set(startX + i * spacing, -0.45, 0)
      lbl.scale.set(1.2, 0.3, 1)
      group.add(lbl)
    }
  })

  return { group, gridRefs, maxVal }
}

// ─── Line Renderer ────────────────────────────────────────────────────────────

function buildLineGroup(points: NormalizedPoint[], colors: string[], opts: RenderOpts): BuildResult {
  const group      = new THREE.Group()
  const maxVal     = Math.max(...points.map(p => p.value)) || 1
  const spacing    = 1.2
  const startX     = -(points.length * spacing / 2) + spacing / 2
  const labelColor = readCSSVar('--st-text', '#888888')
  let gridRefs: GridRefs | null = null

  if (opts.gridView) {
    const { group: gGroup, refs } = buildGridLines(points, opts, labelColor, maxVal)
    group.add(gGroup)
    gridRefs = refs
  }

  if (opts.showScale) {
    for (let s = 0; s < SCALE_STEPS; s++) {
      const y   = (s / (SCALE_STEPS - 1)) * 3
      const val = (s / (SCALE_STEPS - 1)) * maxVal
      const lbl = makeTextSprite(val.toFixed(0), labelColor)
      lbl.position.set(startX - spacing * 0.85, y, 0)
      lbl.scale.set(1.0, 0.26, 1)
      group.add(lbl)
    }
  }

  const verts: THREE.Vector3[] = points.map((p, i) => new THREE.Vector3(
    startX + i * spacing,
    (p.value / maxVal) * 3,
    opts.is3D ? Math.sin(i * 0.6) * 0.4 : 0,
  ))

  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(verts),
    new THREE.LineBasicMaterial({ color: new THREE.Color(colors[0]), linewidth: 2 }),
  ))

  verts.forEach((v, i) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(opts.is3D ? 0.13 : 0.09, 14, 14),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(colors[i % colors.length]) }),
    )
    mesh.position.copy(v)
    tagMesh(mesh, points[i], i)
    group.add(mesh)

    if (opts.showAxisLabels) {
      const lbl = makeTextSprite(points[i].label, labelColor)
      lbl.position.set(v.x, -0.45, 0)
      lbl.scale.set(1.2, 0.3, 1)
      group.add(lbl)
    }
  })

  return { group, gridRefs, maxVal }
}

// ─── Pie Renderer ─────────────────────────────────────────────────────────────
// Group rotation.x is always 0 here — rotation is handled by the transition / init code.

function buildPieGroup(points: NormalizedPoint[], colors: string[], opts: RenderOpts): BuildResult {
  const group  = new THREE.Group()
  const total  = points.reduce((s, p) => s + p.value, 0) || 1
  const height = opts.is3D ? 0.45 : 0.02
  let start    = 0

  points.forEach((p, i) => {
    const arc  = (p.value / total) * Math.PI * 2
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2, height, 80, 1, false, start, arc),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(colors[i % colors.length]) }),
    )
    mesh.castShadow = true
    tagMesh(mesh, p, i)
    group.add(mesh)
    start += arc
  })

  // gridRefs not applicable to pie
  return { group, gridRefs: null, maxVal: total }
}

// ─── Scatter Renderer ─────────────────────────────────────────────────────────

function buildScatterGroup(points: NormalizedPoint[], colors: string[], opts: RenderOpts): BuildResult {
  const group      = new THREE.Group()
  const vals       = points.map(p => p.value)
  const minVal     = Math.min(...vals)
  const maxVal     = Math.max(...vals)
  const range      = (maxVal - minVal) || 1
  const spacing    = 1.2
  const startX     = -(points.length * spacing / 2) + spacing / 2
  const labelColor = readCSSVar('--st-text', '#888888')
  let gridRefs: GridRefs | null = null

  if (opts.gridView) {
    const { group: gGroup, refs } = buildGridLines(points, opts, labelColor, maxVal)
    group.add(gGroup)
    gridRefs = refs
  }

  if (opts.showScale) {
    for (let s = 0; s < SCALE_STEPS; s++) {
      const y   = (s / (SCALE_STEPS - 1)) * 3
      const val = minVal + (s / (SCALE_STEPS - 1)) * (maxVal - minVal)
      const lbl = makeTextSprite(val.toFixed(0), labelColor)
      lbl.position.set(startX - spacing * 0.85, y, 0)
      lbl.scale.set(1.0, 0.26, 1)
      group.add(lbl)
    }
  }

  // Stable Z positions derived from index to avoid re-roll on update
  points.forEach((p, i) => {
    const norm = (p.value - minVal) / range
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.09 + norm * 0.17, 14, 14),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(colors[i % colors.length]) }),
    )
    const zPos = opts.is3D ? (((i * 2654435761) % 100) / 50 - 1) : 0
    mesh.position.set(startX + i * spacing, norm * 3, zPos)
    mesh.castShadow = true
    tagMesh(mesh, p, i)
    group.add(mesh)

    if (opts.showAxisLabels) {
      const lbl = makeTextSprite(p.label, labelColor)
      lbl.position.set(startX + i * spacing, -0.45, 0)
      lbl.scale.set(1.2, 0.3, 1)
      group.add(lbl)
    }
  })

  return { group, gridRefs, maxVal }
}

// ─── Renderer router ──────────────────────────────────────────────────────────

function buildChartGroup(type: ChartType, points: NormalizedPoint[], colors: string[], opts: RenderOpts): BuildResult {
  switch (type) {
    case 'bar':     return buildBarGroup(points, colors, opts)
    case 'line':    return buildLineGroup(points, colors, opts)
    case 'pie':     return buildPieGroup(points, colors, opts)
    case 'scatter': return buildScatterGroup(points, colors, opts)
  }
}

// ─── View Transition ──────────────────────────────────────────────────────────
// Uses a single PerspectiveCamera throughout. Going to 2D animates to a very
// narrow FOV + front position — visually indistinguishable from orthographic.
// No camera swap means the transition is always continuous and smooth.

class ChartViewTransition {
  private _raf: number | null = null

  constructor(private sm: SceneManager, private opts: ChartOptions) {}

  cancelTransition(): void {
    if (this._raf !== null) { cancelAnimationFrame(this._raf); this._raf = null }
  }

  run(
    toView:       ChartView,
    group:        THREE.Group,
    container:    HTMLElement,
    fromRotX:     number,
    toRotX:       number,
    skipDepth:    boolean,
    onComplete:   () => void,
  ): void {
    // Cancel any in-progress transition so rapid toggles always reach the correct end state
    this.cancelTransition()

    container.setAttribute('data-st-chart-animated', 'true')
    if (this.sm.controls) this.sm.controls.enabled = false

    const is3D    = toView === '3d'
    const started = performance.now()
    const fromPos = this.sm.camera.position.clone()
    const fromFov = this.sm.camera.fov
    const base    = is3D ? CAMERA_3D : CAMERA_2D
    const over    = is3D ? (this.opts.camera3d ?? {}) : (this.opts.camera2d ?? {})
    const toC     = { ...base, ...over }
    const toPos   = new THREE.Vector3(toC.x, toC.y, toC.z)
    const toFov   = toC.fov

    group.rotation.x = fromRotX

    if (!skipDepth) {
      group.traverse(obj => {
        const mesh = obj as THREE.Mesh
        const ud   = mesh.userData as MeshUserData
        if (!mesh.isMesh || ud.index === undefined) return
        ud._depthFrom = mesh.scale.z
        ud._depthTo   = is3D ? 1 : 0.01
      })
    }

    const tick = (): void => {
      const t  = Math.min((performance.now() - started) / TRANSITION_MS, 1)
      const et = easeInOutCubic(t)

      this.sm.camera.position.lerpVectors(fromPos, toPos, et)
      this.sm.camera.fov = lerp(fromFov, toFov, et)
      this.sm.camera.lookAt(0, 0, 0)
      this.sm.camera.updateProjectionMatrix()

      group.rotation.x = lerp(fromRotX, toRotX, et)

      if (!skipDepth) {
        group.traverse(obj => {
          const mesh = obj as THREE.Mesh
          const ud   = mesh.userData as MeshUserData
          if (!mesh.isMesh || ud.index === undefined || ud._depthFrom === undefined || ud._depthTo === undefined) return
          mesh.scale.z = lerp(ud._depthFrom, ud._depthTo, et)
        })
      }

      if (t < 1) {
        this._raf = requestAnimationFrame(tick)
      } else {
        this._raf = null
        if (!skipDepth) {
          group.traverse(obj => {
            const ud = (obj as THREE.Mesh).userData as MeshUserData
            delete ud._depthFrom
            delete ud._depthTo
          })
        }
        container.setAttribute('data-st-chart-animated', 'false')
        if (is3D && this.sm.controls) this.sm.controls.enabled = true
        onComplete()
      }
    }

    this._raf = requestAnimationFrame(tick)
  }
}

// ─── Interaction Manager ──────────────────────────────────────────────────────

class InteractionManager {
  private raycaster = new THREE.Raycaster()
  private mouse     = new THREE.Vector2(-9999, -9999)
  private hovered:  THREE.Mesh | null = null
  private tooltip:  HTMLElement
  private _group:   THREE.Group | null = null
  private _canvas:  HTMLCanvasElement

  // Called when hovered mesh changes; null means unhovered
  onHoverChange: ((index: number | null, value: number | null) => void) | null = null

  constructor(private sm: SceneManager, private container: HTMLElement) {
    this._canvas = sm.renderer.domElement

    this.tooltip = document.createElement('div')
    this.tooltip.className = 'strata-chart-tooltip'
    this.tooltip.setAttribute('data-st-chart-tooltip', 'false')
    container.appendChild(this.tooltip)

    this._canvas.addEventListener('mousemove',  this._onMove.bind(this))
    this._canvas.addEventListener('mouseleave', this._onLeave.bind(this))
    this._canvas.addEventListener('click',      this._onClick.bind(this))
  }

  setGroup(group: THREE.Group | null): void {
    if (this.hovered) { this._unhover(this.hovered); this.hovered = null }
    this._group = group
    this.tooltip.setAttribute('data-st-chart-tooltip', 'false')
  }

  update(): void {
    if (!this._group) return

    const meshes: THREE.Object3D[] = []
    this._group.traverse(obj => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh && (mesh.userData as MeshUserData).index !== undefined) meshes.push(mesh)
    })

    this.raycaster.setFromCamera(this.mouse, this.sm.camera)
    const hits = this.raycaster.intersectObjects(meshes, false)

    if (hits.length > 0) {
      const hit = hits[0].object as THREE.Mesh
      if (hit !== this.hovered) {
        if (this.hovered) this._unhover(this.hovered)
        this._hover(hit)
        this.hovered = hit
      }
      this._positionTooltip(hits[0].point)
    } else if (this.hovered) {
      this._unhover(this.hovered)
      this.hovered = null
      this.tooltip.setAttribute('data-st-chart-tooltip', 'false')
    }
  }

  dispose(): void {
    this._canvas.removeEventListener('mousemove',  this._onMove.bind(this))
    this._canvas.removeEventListener('mouseleave', this._onLeave.bind(this))
    this._canvas.removeEventListener('click',      this._onClick.bind(this))
    this.tooltip.parentNode?.removeChild(this.tooltip)
  }

  private _onMove(e: MouseEvent): void {
    const rect = this._canvas.getBoundingClientRect()
    this.mouse.set(
      ((e.clientX - rect.left) / rect.width)  *  2 - 1,
      ((e.clientY - rect.top)  / rect.height) * -2 + 1,
    )
  }

  private _onLeave(): void {
    this.mouse.set(-9999, -9999)
    if (this.hovered) { this._unhover(this.hovered); this.hovered = null }
    this.tooltip.setAttribute('data-st-chart-tooltip', 'false')
  }

  private _onClick(): void {
    if (!this.hovered) return
    const ud = this.hovered.userData as MeshUserData
    dispatch('st:chart:click', { label: ud.label ?? '', value: ud.value ?? 0, category: ud.category ?? '', index: ud.index ?? 0 })
  }

  private _hover(mesh: THREE.Mesh): void {
    const mat = mesh.material as THREE.MeshLambertMaterial
    mat.emissive.set(0x555555)
    const ud = mesh.userData as MeshUserData
    this.tooltip.innerHTML = `<span class="strata-chart-tooltip-label">${ud.label ?? ''}</span><span class="strata-chart-tooltip-value">${ud.value ?? 0}</span>`
    this.tooltip.setAttribute('data-st-chart-tooltip', 'true')
    this.container.setAttribute('data-st-chart-hovered', 'true')
    this.onHoverChange?.(ud.index ?? null, ud.value ?? null)
  }

  private _unhover(mesh: THREE.Mesh): void {
    const mat = mesh.material as THREE.MeshLambertMaterial
    mat.emissive.set(0x000000)
    this.container.setAttribute('data-st-chart-hovered', 'false')
    this.onHoverChange?.(null, null)
  }

  private _positionTooltip(worldPoint: THREE.Vector3): void {
    const projected = worldPoint.clone().project(this.sm.camera)
    const w = this._canvas.clientWidth
    const h = this._canvas.clientHeight
    const x = Math.min((projected.x * 0.5 + 0.5) * w + 14, w - 130)
    const y = Math.max((-projected.y * 0.5 + 0.5) * h - 46, 4)
    this.tooltip.style.left = x + 'px'
    this.tooltip.style.top  = y + 'px'
  }
}

// ─── StrataChart (public instance) ───────────────────────────────────────────

class StrataChart {
  private _sm:          SceneManager
  private _vt:          ChartViewTransition
  private _interaction: InteractionManager
  private _group:       THREE.Group | null = null
  private _gridRefs:    GridRefs | null    = null
  private _maxVal:      number             = 1
  private _destroyed    = false

  constructor(
    private readonly container: HTMLElement,
    private _opts: ChartOptions,
  ) {
    const theme = resolveTheme(_opts.theme)
    const type  = _opts.type ?? 'bar'
    const view  = _opts.view === '2d' ? '2d' : '3d' as ChartView
    const is3D  = view === '3d'

    container.classList.add('strata-chart')
    container.setAttribute('data-st-chart-type',     type)
    container.setAttribute('data-st-chart-view',     view)
    container.setAttribute('data-st-chart-loading',  'true')
    container.setAttribute('data-st-chart-animated', 'false')
    container.setAttribute('data-st-chart-hovered',  'false')

    if (!container.style.height) container.style.height = '300px'

    const initCam = { ...(_opts.view === '2d' ? CAMERA_2D : CAMERA_3D), ...(_opts.view === '2d' ? (_opts.camera2d ?? {}) : (_opts.camera3d ?? {})) }
    this._sm          = new SceneManager(container, theme, view, initCam)
    this._vt          = new ChartViewTransition(this._sm, _opts)
    this._interaction = new InteractionManager(this._sm, container)

    this._interaction.onHoverChange = (index, value) => this._applyGridHighlight(index, value)

    const points = processData(_opts.data, type)
    const colors = resolveColors(_opts.colors, points.length)
    const result = buildChartGroup(type, points, colors, this._renderOpts(is3D))
    this._group    = result.group
    this._gridRefs = result.gridRefs
    this._maxVal   = result.maxVal

    if (type === 'pie' && !is3D) this._group.rotation.x = Math.PI / 2
    this._sm.scene.add(this._group)
    this._interaction.setGroup(this._group)

    this._sm.startLoop(() => this._interaction.update())
    this._sm.watchResize()

    container.setAttribute('data-st-chart-loading', 'false')
    dispatch('st:chart:ready', { chart: this as unknown as Record<string, unknown>, view })
    _opts.onReady?.(this)
  }

  setView(view: ChartView): void {
    if (this._destroyed) return
    const current = this.container.getAttribute('data-st-chart-view') as ChartView
    if (view === current) return

    const type   = this._opts.type ?? 'bar'
    const is3D   = view === '3d'
    const points = processData(this._opts.data, type)
    const colors = resolveColors(this._opts.colors, points.length)
    const isPie  = type === 'pie'

    disposeMeshes(this._sm.scene, this._group)
    const result   = buildChartGroup(type, points, colors, this._renderOpts(is3D))
    this._group    = result.group
    this._gridRefs = result.gridRefs
    this._maxVal   = result.maxVal

    this._sm.scene.add(this._group)
    this._interaction.setGroup(this._group)
    this.container.setAttribute('data-st-chart-view', view)

    const fromRotX = isPie ? (current === '2d' ? Math.PI / 2 : 0) : 0
    const toRotX   = isPie ? (is3D ? 0 : Math.PI / 2) : 0

    this._vt.run(view, this._group, this.container, fromRotX, toRotX, isPie, () => {
      dispatch('st:chart:change', { chart: this as unknown as Record<string, unknown>, from: current, to: view })
      this._opts.onChange?.(view)
    })
  }

  toggleView(): void {
    if (this._destroyed) return
    const current = this.container.getAttribute('data-st-chart-view') as ChartView
    this.setView(current === '3d' ? '2d' : '3d')
  }

  update(newData: RawPoint[]): void {
    if (this._destroyed) return
    this._opts.data = newData
    this._rebuild()
    dispatch('st:chart:update', { chart: this as unknown as Record<string, unknown> })
  }

  // ─── Feature 4: Dynamic Data Entry API ───────────────────────────────────────

  addDataPoint(point: RawPoint): void {
    if (this._destroyed) return
    this._opts.data = [...this._opts.data, point]
    this._rebuild()
    dispatch('st:chart:update', { chart: this as unknown as Record<string, unknown> })
  }

  removeDataPoint(index: number): void {
    if (this._destroyed) return
    if (index < 0 || index >= this._opts.data.length) return
    this._opts.data = this._opts.data.filter((_, i) => i !== index)
    if (this._opts.data.length === 0) return
    this._rebuild()
    dispatch('st:chart:update', { chart: this as unknown as Record<string, unknown> })
  }

  addDataPoints(points: RawPoint[]): void {
    if (this._destroyed || points.length === 0) return
    this._opts.data = [...this._opts.data, ...points]
    this._rebuild()
    dispatch('st:chart:update', { chart: this as unknown as Record<string, unknown> })
  }

  removeDataPoints(indices: number[]): void {
    if (this._destroyed || indices.length === 0) return
    const set = new Set(indices)
    const next = this._opts.data.filter((_, i) => !set.has(i))
    if (next.length === 0) return
    this._opts.data = next
    this._rebuild()
    dispatch('st:chart:update', { chart: this as unknown as Record<string, unknown> })
  }

  updateDataPoint(index: number, data: Partial<RawPoint>): void {
    if (this._destroyed) return
    if (index < 0 || index >= this._opts.data.length) return
    this._opts.data = this._opts.data.map((p, i) => i === index ? { ...p, ...data } : p)
    this._rebuild()
    dispatch('st:chart:update', { chart: this as unknown as Record<string, unknown> })
  }

  destroy(): void {
    if (this._destroyed) return
    this._destroyed = true

    disposeMeshes(this._sm.scene, this._group)
    this._interaction.dispose()
    this._sm.dispose()

    this.container.classList.remove('strata-chart')
    this.container.removeAttribute('data-st-chart-type')
    this.container.removeAttribute('data-st-chart-view')
    this.container.removeAttribute('data-st-chart-loading')
    this.container.removeAttribute('data-st-chart-animated')
    this.container.removeAttribute('data-st-chart-hovered')

    registry.delete(this.container)
    dispatch('st:chart:destroy', { chart: this as unknown as Record<string, unknown> })
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private _renderOpts(is3D: boolean): RenderOpts {
    return {
      is3D,
      gridView:       this._opts.gridView       ?? false,
      showAxisLabels: this._opts.showAxisLabels  ?? false,
      showScale:      this._opts.showScale       ?? false,
      showGridLabels: this._opts.showGridLabels  ?? false,
    }
  }

  private _rebuild(): void {
    const type  = this._opts.type ?? 'bar'
    const view  = this.container.getAttribute('data-st-chart-view') as ChartView
    const is3D  = view === '3d'

    this.container.setAttribute('data-st-chart-loading', 'true')

    const points = processData(this._opts.data, type)
    const colors = resolveColors(this._opts.colors, points.length)
    disposeMeshes(this._sm.scene, this._group)
    const result   = buildChartGroup(type, points, colors, this._renderOpts(is3D))
    this._group    = result.group
    this._gridRefs = result.gridRefs
    this._maxVal   = result.maxVal

    if (type === 'pie' && !is3D) this._group.rotation.x = Math.PI / 2
    this._sm.scene.add(this._group)
    this._interaction.setGroup(this._group)

    this.container.setAttribute('data-st-chart-loading', 'false')
  }

  // Feature 3: highlight/restore grid lines on hover
  private _applyGridHighlight(index: number | null, value: number | null): void {
    if (!this._gridRefs || !(this._opts.highlightGridOnInteract ?? false)) return

    const { hLines, vLines } = this._gridRefs

    if (index === null || value === null) {
      // Restore all lines to normal color
      hLines.forEach(l => (l.material as THREE.LineBasicMaterial).color.set(GRID_COLOR_NORMAL))
      vLines.forEach(l => (l.material as THREE.LineBasicMaterial).color.set(GRID_COLOR_NORMAL))
      return
    }

    // Highlight the vertical line for this data point
    vLines.forEach((l, i) => {
      (l.material as THREE.LineBasicMaterial).color.set(
        i === index ? GRID_COLOR_HIGHLIGHT : GRID_COLOR_NORMAL,
      )
    })

    // Highlight the horizontal line closest to this data point's rendered Y position
    const renderedY = (value / this._maxVal) * 3
    let closestIdx  = 0
    let closestDist = Infinity
    hLines.forEach((_, s) => {
      const lineY = (s / (SCALE_STEPS - 1)) * 3
      const dist  = Math.abs(lineY - renderedY)
      if (dist < closestDist) { closestDist = dist; closestIdx = s }
    })
    hLines.forEach((l, s) => {
      (l.material as THREE.LineBasicMaterial).color.set(
        s === closestIdx ? GRID_COLOR_HIGHLIGHT : GRID_COLOR_NORMAL,
      )
    })
  }
}

// ─── Bootstrap IIFE ───────────────────────────────────────────────────────────

;(function (win: Window & typeof globalThis & { Strata?: Partial<StrataNamespace> }) {
  if (!(win as unknown as Record<string, unknown>)['THREE']) {
    console.error('[Strata Chart] Three.js (window.THREE) is required. Load it before strata.components.js.')
    return
  }

  win.Strata = win.Strata ?? {}
  win.Strata.Chart = {
    create(selector, options) {
      const container = typeof selector === 'string' ? document.querySelector(selector) : selector as Element
      if (!container) { console.error(`[Strata Chart] Element not found: ${String(selector)}`); return null }
      if (registry.has(container)) {
        console.warn('[Strata Chart] Chart already mounted here. Call .destroy() first.')
        return registry.get(container)!
      }
      if (!Array.isArray(options?.data)) { console.error('[Strata Chart] options.data must be an array.'); return null }
      if (options.type && !VALID_TYPES.includes(options.type)) {
        console.error(`[Strata Chart] Invalid type "${options.type}". Use: ${VALID_TYPES.join(', ')}`)
        return null
      }
      const instance = new StrataChart(container as HTMLElement, options)
      registry.set(container, instance)
      return instance
    },
    destroyAll() { registry.forEach(inst => inst.destroy()) },
  }
}(window))
