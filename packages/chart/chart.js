"use strict";
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
// ─── Constants ────────────────────────────────────────────────────────────────
const TRANSITION_MS = 600;
// Cinematic 3D angle — elevated, diagonal, dramatic
const CAMERA_3D = { x: 3.5, y: 6.5, z: 9.5, fov: 42 };
// Near-orthographic 2D front view — narrow FOV simulates flat projection
const CAMERA_2D = { x: 0, y: 2, z: 22, fov: 18 };
const DEFAULT_COLORS = ['#4a90e2', '#e25f4a', '#50c878', '#f5a623', '#9b59b6', '#1abc9c'];
const VALID_TYPES = ['bar', 'line', 'pie', 'scatter'];
const MAX_POINTS = 100000;
// Three.js is lazy-loaded on first chart creation if window.THREE is absent.
const DEFAULT_THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
const STRIP_HTML = /<[^>]*>/g;
const SCALE_STEPS = 5;
const GRID_COLOR_NORMAL = 0xd4d4d4;
const GRID_COLOR_HIGHLIGHT = '#4a90e2';
// ─── Registry ─────────────────────────────────────────────────────────────────
const registry = new Map();
// ─── Utilities ────────────────────────────────────────────────────────────────
function readCSSVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
}
function lerp(a, b, t) { return a + (b - a) * t; }
// Smooth cubic ease — less aggressive than quadratic, avoids the snap at 1
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function dispatch(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
}
// ─── Data Pipeline ────────────────────────────────────────────────────────────
function validateData(input) {
    if (!Array.isArray(input))
        throw new Error('[Strata Chart] data must be an array.');
    if (input.length === 0)
        throw new Error('[Strata Chart] data array is empty.');
    if (input.length > MAX_POINTS)
        throw new Error(`[Strata Chart] data exceeds ${MAX_POINTS} points.`);
    return input.map((item, i) => {
        if (typeof item !== 'object' || item === null)
            throw new Error(`[Strata Chart] item at index ${i} must be an object.`);
        const rec = item;
        if (!('value' in rec))
            throw new Error(`[Strata Chart] item at index ${i} missing "value".`);
        const raw = rec['value'];
        if (raw !== null && raw !== undefined && typeof raw !== 'number')
            throw new Error(`[Strata Chart] item at index ${i}: "value" must be a number, null, or undefined.`);
        return {
            value: raw,
            label: typeof rec['label'] === 'string' ? rec['label'].replace(STRIP_HTML, '').slice(0, 256) : undefined,
            category: typeof rec['category'] === 'string' ? rec['category'].replace(STRIP_HTML, '').slice(0, 128) : undefined,
            timestamp: rec['timestamp'],
            meta: (typeof rec['meta'] === 'object' && rec['meta'] !== null) ? rec['meta'] : undefined,
        };
    });
}
function normalizeData(points) {
    const finite = points.map(p => p.value).filter((v) => typeof v === 'number' && isFinite(v));
    const finiteMax = finite.length > 0 ? Math.max(...finite) : 0;
    const finiteMin = finite.length > 0 ? Math.min(...finite) : 0;
    const out = [];
    points.forEach((p, i) => {
        var _a, _b, _c;
        const raw = p.value;
        let value;
        if (raw === null || raw === undefined || (typeof raw === 'number' && isNaN(raw))) {
            value = 0;
        }
        else if (!isFinite(raw)) {
            value = raw === Infinity ? finiteMax : finiteMin;
        }
        else {
            value = raw;
        }
        out.push({ value, label: (_a = p.label) !== null && _a !== void 0 ? _a : `Point ${i}`, category: (_b = p.category) !== null && _b !== void 0 ? _b : 'default', meta: (_c = p.meta) !== null && _c !== void 0 ? _c : {} });
    });
    return out;
}
function aggregateCategorical(points) {
    const groups = new Map();
    for (const p of points) {
        if (!groups.has(p.category))
            groups.set(p.category, []);
        groups.get(p.category).push(p);
    }
    const out = [];
    groups.forEach((group, cat) => {
        out.push({ value: group.reduce((s, p) => s + p.value, 0), label: cat, category: cat, meta: {} });
    });
    return out;
}
function processData(rawData, type) {
    const validated = validateData(rawData);
    const normalized = normalizeData(validated);
    return (type === 'bar' || type === 'pie') ? aggregateCategorical(normalized) : normalized;
}
// ─── Theme Adapter ────────────────────────────────────────────────────────────
function resolveColors(userColors, count) {
    const palette = (userColors && userColors.length > 0) ? userColors : [
        readCSSVar('--st-primary', DEFAULT_COLORS[0]),
        readCSSVar('--st-secondary', DEFAULT_COLORS[1]),
        readCSSVar('--st-success', DEFAULT_COLORS[2]),
        readCSSVar('--st-warning', DEFAULT_COLORS[3]),
        readCSSVar('--st-info', DEFAULT_COLORS[4]),
        DEFAULT_COLORS[5],
    ];
    return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
}
function resolveTheme(opt) {
    if (opt === 'dark' || opt === 'light')
        return opt;
    const attr = document.documentElement.getAttribute('data-st-theme');
    return (attr === 'dark' || attr === 'dim') ? 'dark' : 'light';
}
function sceneBgColor(theme) {
    return readCSSVar('--st-bg', theme === 'dark' ? '#16213e' : '#ffffff');
}
// ─── Scene Manager ────────────────────────────────────────────────────────────
class SceneManager {
    constructor(container, theme, startView, camCfg) {
        this.container = container;
        this.controls = null;
        this._raf = null;
        this._ro = null;
        const w = container.clientWidth || 400;
        const h = container.clientHeight || 300;
        const c = camCfg;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(sceneBgColor(theme));
        this.camera = new THREE.PerspectiveCamera(c.fov, w / h, 0.1, 1000);
        this.camera.position.set(c.x, c.y, c.z);
        this.camera.lookAt(0, 0, 0);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(w, h);
        this.renderer.shadowMap.enabled = true;
        const canvas = this.renderer.domElement;
        canvas.className = 'strata-chart-canvas';
        container.appendChild(canvas);
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        const key = new THREE.DirectionalLight(0xffffff, 0.9);
        key.position.set(6, 10, 7);
        key.castShadow = true;
        this.scene.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 0.25);
        fill.position.set(-5, 3, -5);
        this.scene.add(fill);
        if (THREE.OrbitControls) {
            this.controls = new THREE.OrbitControls(this.camera, canvas);
            this.controls.enablePan = false;
            this.controls.enableZoom = true;
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.07;
            this.controls.enabled = startView === '3d';
        }
    }
    startLoop(onFrame) {
        const tick = () => {
            this._raf = requestAnimationFrame(tick);
            if (this.controls && this.controls.enabled)
                this.controls.update();
            onFrame();
            this.renderer.render(this.scene, this.camera);
        };
        tick();
    }
    stopLoop() {
        if (this._raf !== null) {
            cancelAnimationFrame(this._raf);
            this._raf = null;
        }
    }
    watchResize() {
        if (!window.ResizeObserver)
            return;
        this._ro = new ResizeObserver(() => {
            const w = this.container.clientWidth;
            const h = this.container.clientHeight || 300;
            this.renderer.setSize(w, h);
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
        });
        this._ro.observe(this.container);
    }
    dispose() {
        var _a, _b, _c;
        this.stopLoop();
        (_a = this._ro) === null || _a === void 0 ? void 0 : _a.disconnect();
        (_b = this.controls) === null || _b === void 0 ? void 0 : _b.dispose();
        this.renderer.dispose();
        (_c = this.renderer.domElement.parentNode) === null || _c === void 0 ? void 0 : _c.removeChild(this.renderer.domElement);
    }
}
// ─── Geometry helpers ─────────────────────────────────────────────────────────
function disposeMeshes(scene, group) {
    if (!group)
        return;
    group.traverse(obj => {
        const node = obj;
        if (node.geometry)
            node.geometry.dispose();
        if (node.material) {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach(m => {
                // dispose CanvasTexture maps attached to SpriteMaterial
                const sm = m;
                if (sm.map)
                    sm.map.dispose();
                m.dispose();
            });
        }
    });
    scene.remove(group);
}
function tagMesh(mesh, p, index) {
    const ud = mesh.userData;
    ud.label = p.label;
    ud.value = p.value;
    ud.category = p.category;
    ud.index = index;
}
// ─── Label & Grid helpers ─────────────────────────────────────────────────────
function makeTextSprite(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = '26px sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 44);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    return new THREE.Sprite(mat);
}
// Builds horizontal (scale) and vertical (column) grid lines in the XY plane.
// Returns the parent group and refs to individual lines for interactive highlighting.
function buildGridLines(points, opts, labelColor, maxVal) {
    const group = new THREE.Group();
    const spacing = 1.2;
    const n = points.length;
    const startX = -(n * spacing / 2) + spacing / 2;
    const endX = startX + (n - 1) * spacing;
    const margin = spacing / 2;
    const hLines = [];
    const vLines = [];
    // Horizontal reference lines at each scale step
    for (let s = 0; s < SCALE_STEPS; s++) {
        const y = (s / (SCALE_STEPS - 1)) * 3;
        const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(startX - margin, y, 0),
            new THREE.Vector3(endX + margin, y, 0),
        ]);
        const mat = new THREE.LineBasicMaterial({ color: GRID_COLOR_NORMAL });
        const line = new THREE.Line(geo, mat);
        group.add(line);
        hLines.push(line);
        if (opts.showGridLabels) {
            const val = (s / (SCALE_STEPS - 1)) * maxVal;
            const label = makeTextSprite(val.toFixed(0), labelColor);
            label.position.set(endX + margin + 0.6, y, 0);
            label.scale.set(1.0, 0.26, 1);
            group.add(label);
        }
    }
    // Vertical reference lines at each data point
    for (let i = 0; i < n; i++) {
        const x = startX + i * spacing;
        const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, 0, 0),
            new THREE.Vector3(x, 3, 0),
        ]);
        const mat = new THREE.LineBasicMaterial({ color: GRID_COLOR_NORMAL });
        const line = new THREE.Line(geo, mat);
        group.add(line);
        vLines.push(line);
    }
    return { group, refs: { hLines, vLines } };
}
// ─── Bar Renderer ─────────────────────────────────────────────────────────────
function buildBarGroup(points, colors, opts) {
    const group = new THREE.Group();
    const maxVal = Math.max(...points.map(p => p.value)) || 1;
    const spacing = 1.2;
    const startX = -(points.length * spacing / 2) + spacing / 2;
    const labelColor = readCSSVar('--st-text', '#888888');
    let gridRefs = null;
    if (opts.gridView) {
        const { group: gGroup, refs } = buildGridLines(points, opts, labelColor, maxVal);
        group.add(gGroup);
        gridRefs = refs;
    }
    // Floor grid in 3D (existing aesthetic, preserved regardless of gridView)
    if (opts.is3D) {
        const grid = new THREE.GridHelper(points.length * spacing + 1, points.length, 0xaaaaaa, 0xdddddd);
        grid.position.y = -0.01;
        group.add(grid);
    }
    if (opts.showScale) {
        for (let s = 0; s < SCALE_STEPS; s++) {
            const y = (s / (SCALE_STEPS - 1)) * 3;
            const val = (s / (SCALE_STEPS - 1)) * maxVal;
            const lbl = makeTextSprite(val.toFixed(0), labelColor);
            lbl.position.set(startX - spacing * 0.85, y, 0);
            lbl.scale.set(1.0, 0.26, 1);
            group.add(lbl);
        }
    }
    points.forEach((p, i) => {
        const h = Math.max((p.value / maxVal) * 3, 0.05);
        const geo = new THREE.BoxGeometry(0.75, h, opts.is3D ? 0.75 : 0.01);
        const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(colors[i % colors.length]) });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(startX + i * spacing, h / 2, 0);
        mesh.castShadow = true;
        tagMesh(mesh, p, i);
        group.add(mesh);
        if (opts.showAxisLabels) {
            const lbl = makeTextSprite(p.label, labelColor);
            lbl.position.set(startX + i * spacing, -0.45, 0);
            lbl.scale.set(1.2, 0.3, 1);
            group.add(lbl);
        }
    });
    return { group, gridRefs, maxVal };
}
// ─── Line Renderer ────────────────────────────────────────────────────────────
function buildLineGroup(points, colors, opts) {
    const group = new THREE.Group();
    const maxVal = Math.max(...points.map(p => p.value)) || 1;
    const spacing = 1.2;
    const startX = -(points.length * spacing / 2) + spacing / 2;
    const labelColor = readCSSVar('--st-text', '#888888');
    let gridRefs = null;
    if (opts.gridView) {
        const { group: gGroup, refs } = buildGridLines(points, opts, labelColor, maxVal);
        group.add(gGroup);
        gridRefs = refs;
    }
    if (opts.showScale) {
        for (let s = 0; s < SCALE_STEPS; s++) {
            const y = (s / (SCALE_STEPS - 1)) * 3;
            const val = (s / (SCALE_STEPS - 1)) * maxVal;
            const lbl = makeTextSprite(val.toFixed(0), labelColor);
            lbl.position.set(startX - spacing * 0.85, y, 0);
            lbl.scale.set(1.0, 0.26, 1);
            group.add(lbl);
        }
    }
    const verts = points.map((p, i) => new THREE.Vector3(startX + i * spacing, (p.value / maxVal) * 3, opts.is3D ? Math.sin(i * 0.6) * 0.4 : 0));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(verts), new THREE.LineBasicMaterial({ color: new THREE.Color(colors[0]), linewidth: 2 })));
    verts.forEach((v, i) => {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(opts.is3D ? 0.13 : 0.09, 14, 14), new THREE.MeshLambertMaterial({ color: new THREE.Color(colors[i % colors.length]) }));
        mesh.position.copy(v);
        tagMesh(mesh, points[i], i);
        group.add(mesh);
        if (opts.showAxisLabels) {
            const lbl = makeTextSprite(points[i].label, labelColor);
            lbl.position.set(v.x, -0.45, 0);
            lbl.scale.set(1.2, 0.3, 1);
            group.add(lbl);
        }
    });
    return { group, gridRefs, maxVal };
}
// ─── Pie Renderer ─────────────────────────────────────────────────────────────
// Group rotation.x is always 0 here — rotation is handled by the transition / init code.
function buildPieGroup(points, colors, opts) {
    const group = new THREE.Group();
    const total = points.reduce((s, p) => s + p.value, 0) || 1;
    const height = opts.is3D ? 0.45 : 0.02;
    let start = 0;
    points.forEach((p, i) => {
        const arc = (p.value / total) * Math.PI * 2;
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, height, 80, 1, false, start, arc), new THREE.MeshLambertMaterial({ color: new THREE.Color(colors[i % colors.length]) }));
        mesh.castShadow = true;
        tagMesh(mesh, p, i);
        group.add(mesh);
        start += arc;
    });
    // gridRefs not applicable to pie
    return { group, gridRefs: null, maxVal: total };
}
// ─── Scatter Renderer ─────────────────────────────────────────────────────────
function buildScatterGroup(points, colors, opts) {
    const group = new THREE.Group();
    const vals = points.map(p => p.value);
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const range = (maxVal - minVal) || 1;
    const spacing = 1.2;
    const startX = -(points.length * spacing / 2) + spacing / 2;
    const labelColor = readCSSVar('--st-text', '#888888');
    let gridRefs = null;
    if (opts.gridView) {
        const { group: gGroup, refs } = buildGridLines(points, opts, labelColor, maxVal);
        group.add(gGroup);
        gridRefs = refs;
    }
    if (opts.showScale) {
        for (let s = 0; s < SCALE_STEPS; s++) {
            const y = (s / (SCALE_STEPS - 1)) * 3;
            const val = minVal + (s / (SCALE_STEPS - 1)) * (maxVal - minVal);
            const lbl = makeTextSprite(val.toFixed(0), labelColor);
            lbl.position.set(startX - spacing * 0.85, y, 0);
            lbl.scale.set(1.0, 0.26, 1);
            group.add(lbl);
        }
    }
    // Stable Z positions derived from index to avoid re-roll on update
    points.forEach((p, i) => {
        const norm = (p.value - minVal) / range;
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.09 + norm * 0.17, 14, 14), new THREE.MeshLambertMaterial({ color: new THREE.Color(colors[i % colors.length]) }));
        const zPos = opts.is3D ? (((i * 2654435761) % 100) / 50 - 1) : 0;
        mesh.position.set(startX + i * spacing, norm * 3, zPos);
        mesh.castShadow = true;
        tagMesh(mesh, p, i);
        group.add(mesh);
        if (opts.showAxisLabels) {
            const lbl = makeTextSprite(p.label, labelColor);
            lbl.position.set(startX + i * spacing, -0.45, 0);
            lbl.scale.set(1.2, 0.3, 1);
            group.add(lbl);
        }
    });
    return { group, gridRefs, maxVal };
}
// ─── Renderer router ──────────────────────────────────────────────────────────
function buildChartGroup(type, points, colors, opts) {
    switch (type) {
        case 'bar': return buildBarGroup(points, colors, opts);
        case 'line': return buildLineGroup(points, colors, opts);
        case 'pie': return buildPieGroup(points, colors, opts);
        case 'scatter': return buildScatterGroup(points, colors, opts);
    }
}
// ─── View Transition ──────────────────────────────────────────────────────────
// Uses a single PerspectiveCamera throughout. Going to 2D animates to a very
// narrow FOV + front position — visually indistinguishable from orthographic.
// No camera swap means the transition is always continuous and smooth.
class ChartViewTransition {
    constructor(sm, opts) {
        this.sm = sm;
        this.opts = opts;
        this._raf = null;
    }
    cancelTransition() {
        if (this._raf !== null) {
            cancelAnimationFrame(this._raf);
            this._raf = null;
        }
    }
    run(toView, group, container, fromRotX, toRotX, skipDepth, onComplete) {
        var _a, _b;
        // Cancel any in-progress transition so rapid toggles always reach the correct end state
        this.cancelTransition();
        container.setAttribute('data-st-chart-animated', 'true');
        if (this.sm.controls)
            this.sm.controls.enabled = false;
        const is3D = toView === '3d';
        const started = performance.now();
        const fromPos = this.sm.camera.position.clone();
        const fromFov = this.sm.camera.fov;
        const base = is3D ? CAMERA_3D : CAMERA_2D;
        const over = is3D ? ((_a = this.opts.camera3d) !== null && _a !== void 0 ? _a : {}) : ((_b = this.opts.camera2d) !== null && _b !== void 0 ? _b : {});
        const toC = Object.assign(Object.assign({}, base), over);
        const toPos = new THREE.Vector3(toC.x, toC.y, toC.z);
        const toFov = toC.fov;
        group.rotation.x = fromRotX;
        if (!skipDepth) {
            group.traverse(obj => {
                const mesh = obj;
                const ud = mesh.userData;
                if (!mesh.isMesh || ud.index === undefined)
                    return;
                ud._depthFrom = mesh.scale.z;
                ud._depthTo = is3D ? 1 : 0.01;
            });
        }
        const tick = () => {
            const t = Math.min((performance.now() - started) / TRANSITION_MS, 1);
            const et = easeInOutCubic(t);
            this.sm.camera.position.lerpVectors(fromPos, toPos, et);
            this.sm.camera.fov = lerp(fromFov, toFov, et);
            this.sm.camera.lookAt(0, 0, 0);
            this.sm.camera.updateProjectionMatrix();
            group.rotation.x = lerp(fromRotX, toRotX, et);
            if (!skipDepth) {
                group.traverse(obj => {
                    const mesh = obj;
                    const ud = mesh.userData;
                    if (!mesh.isMesh || ud.index === undefined || ud._depthFrom === undefined || ud._depthTo === undefined)
                        return;
                    mesh.scale.z = lerp(ud._depthFrom, ud._depthTo, et);
                });
            }
            if (t < 1) {
                this._raf = requestAnimationFrame(tick);
            }
            else {
                this._raf = null;
                if (!skipDepth) {
                    group.traverse(obj => {
                        const ud = obj.userData;
                        delete ud._depthFrom;
                        delete ud._depthTo;
                    });
                }
                container.setAttribute('data-st-chart-animated', 'false');
                if (is3D && this.sm.controls)
                    this.sm.controls.enabled = true;
                onComplete();
            }
        };
        this._raf = requestAnimationFrame(tick);
    }
}
// ─── Interaction Manager ──────────────────────────────────────────────────────
class InteractionManager {
    constructor(sm, container) {
        this.sm = sm;
        this.container = container;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2(-9999, -9999);
        this.hovered = null;
        this._group = null;
        // Called when hovered mesh changes; null means unhovered
        this.onHoverChange = null;
        this._canvas = sm.renderer.domElement;
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'strata-chart-tooltip';
        this.tooltip.setAttribute('data-st-chart-tooltip', 'false');
        container.appendChild(this.tooltip);
        this._canvas.addEventListener('mousemove', this._onMove.bind(this));
        this._canvas.addEventListener('mouseleave', this._onLeave.bind(this));
        this._canvas.addEventListener('click', this._onClick.bind(this));
    }
    setGroup(group) {
        if (this.hovered) {
            this._unhover(this.hovered);
            this.hovered = null;
        }
        this._group = group;
        this.tooltip.setAttribute('data-st-chart-tooltip', 'false');
    }
    update() {
        if (!this._group)
            return;
        const meshes = [];
        this._group.traverse(obj => {
            const mesh = obj;
            if (mesh.isMesh && mesh.userData.index !== undefined)
                meshes.push(mesh);
        });
        this.raycaster.setFromCamera(this.mouse, this.sm.camera);
        const hits = this.raycaster.intersectObjects(meshes, false);
        if (hits.length > 0) {
            const hit = hits[0].object;
            if (hit !== this.hovered) {
                if (this.hovered)
                    this._unhover(this.hovered);
                this._hover(hit);
                this.hovered = hit;
            }
            this._positionTooltip(hits[0].point);
        }
        else if (this.hovered) {
            this._unhover(this.hovered);
            this.hovered = null;
            this.tooltip.setAttribute('data-st-chart-tooltip', 'false');
        }
    }
    dispose() {
        var _a;
        this._canvas.removeEventListener('mousemove', this._onMove.bind(this));
        this._canvas.removeEventListener('mouseleave', this._onLeave.bind(this));
        this._canvas.removeEventListener('click', this._onClick.bind(this));
        (_a = this.tooltip.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(this.tooltip);
    }
    _onMove(e) {
        const rect = this._canvas.getBoundingClientRect();
        this.mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, ((e.clientY - rect.top) / rect.height) * -2 + 1);
    }
    _onLeave() {
        this.mouse.set(-9999, -9999);
        if (this.hovered) {
            this._unhover(this.hovered);
            this.hovered = null;
        }
        this.tooltip.setAttribute('data-st-chart-tooltip', 'false');
    }
    _onClick() {
        var _a, _b, _c, _d;
        if (!this.hovered)
            return;
        const ud = this.hovered.userData;
        dispatch('st:chart:click', { label: (_a = ud.label) !== null && _a !== void 0 ? _a : '', value: (_b = ud.value) !== null && _b !== void 0 ? _b : 0, category: (_c = ud.category) !== null && _c !== void 0 ? _c : '', index: (_d = ud.index) !== null && _d !== void 0 ? _d : 0 });
    }
    _hover(mesh) {
        var _a, _b, _c, _d, _e;
        const mat = mesh.material;
        mat.emissive.set(0x555555);
        const ud = mesh.userData;
        this.tooltip.innerHTML = `<span class="strata-chart-tooltip-label">${(_a = ud.label) !== null && _a !== void 0 ? _a : ''}</span><span class="strata-chart-tooltip-value">${(_b = ud.value) !== null && _b !== void 0 ? _b : 0}</span>`;
        this.tooltip.setAttribute('data-st-chart-tooltip', 'true');
        this.container.setAttribute('data-st-chart-hovered', 'true');
        (_c = this.onHoverChange) === null || _c === void 0 ? void 0 : _c.call(this, (_d = ud.index) !== null && _d !== void 0 ? _d : null, (_e = ud.value) !== null && _e !== void 0 ? _e : null);
    }
    _unhover(mesh) {
        var _a;
        const mat = mesh.material;
        mat.emissive.set(0x000000);
        this.container.setAttribute('data-st-chart-hovered', 'false');
        (_a = this.onHoverChange) === null || _a === void 0 ? void 0 : _a.call(this, null, null);
    }
    _positionTooltip(worldPoint) {
        const projected = worldPoint.clone().project(this.sm.camera);
        const w = this._canvas.clientWidth;
        const h = this._canvas.clientHeight;
        const x = Math.min((projected.x * 0.5 + 0.5) * w + 14, w - 130);
        const y = Math.max((-projected.y * 0.5 + 0.5) * h - 46, 4);
        this.tooltip.style.left = x + 'px';
        this.tooltip.style.top = y + 'px';
    }
}
// ─── StrataChart (public instance) ───────────────────────────────────────────
class StrataChart {
    constructor(container, _opts) {
        var _a, _b, _c, _d;
        this.container = container;
        this._opts = _opts;
        this._group = null;
        this._gridRefs = null;
        this._maxVal = 1;
        this._destroyed = false;
        const theme = resolveTheme(_opts.theme);
        const type = (_a = _opts.type) !== null && _a !== void 0 ? _a : 'bar';
        const view = _opts.view === '2d' ? '2d' : '3d';
        const is3D = view === '3d';
        container.classList.add('strata-chart');
        container.setAttribute('data-st-chart-type', type);
        container.setAttribute('data-st-chart-view', view);
        container.setAttribute('data-st-chart-loading', 'true');
        container.setAttribute('data-st-chart-animated', 'false');
        container.setAttribute('data-st-chart-hovered', 'false');
        if (!container.style.height)
            container.style.height = '300px';
        const initCam = Object.assign(Object.assign({}, (_opts.view === '2d' ? CAMERA_2D : CAMERA_3D)), (_opts.view === '2d' ? ((_b = _opts.camera2d) !== null && _b !== void 0 ? _b : {}) : ((_c = _opts.camera3d) !== null && _c !== void 0 ? _c : {})));
        this._sm = new SceneManager(container, theme, view, initCam);
        this._vt = new ChartViewTransition(this._sm, _opts);
        this._interaction = new InteractionManager(this._sm, container);
        this._interaction.onHoverChange = (index, value) => this._applyGridHighlight(index, value);
        const points = processData(_opts.data, type);
        const colors = resolveColors(_opts.colors, points.length);
        const result = buildChartGroup(type, points, colors, this._renderOpts(is3D));
        this._group = result.group;
        this._gridRefs = result.gridRefs;
        this._maxVal = result.maxVal;
        if (type === 'pie' && !is3D)
            this._group.rotation.x = Math.PI / 2;
        this._sm.scene.add(this._group);
        this._interaction.setGroup(this._group);
        this._sm.startLoop(() => this._interaction.update());
        this._sm.watchResize();
        container.setAttribute('data-st-chart-loading', 'false');
        dispatch('st:chart:ready', { chart: this, view });
        (_d = _opts.onReady) === null || _d === void 0 ? void 0 : _d.call(_opts, this);
    }
    setView(view) {
        var _a;
        if (this._destroyed)
            return;
        const current = this.container.getAttribute('data-st-chart-view');
        if (view === current)
            return;
        const type = (_a = this._opts.type) !== null && _a !== void 0 ? _a : 'bar';
        const is3D = view === '3d';
        const points = processData(this._opts.data, type);
        const colors = resolveColors(this._opts.colors, points.length);
        const isPie = type === 'pie';
        disposeMeshes(this._sm.scene, this._group);
        const result = buildChartGroup(type, points, colors, this._renderOpts(is3D));
        this._group = result.group;
        this._gridRefs = result.gridRefs;
        this._maxVal = result.maxVal;
        this._sm.scene.add(this._group);
        this._interaction.setGroup(this._group);
        this.container.setAttribute('data-st-chart-view', view);
        const fromRotX = isPie ? (current === '2d' ? Math.PI / 2 : 0) : 0;
        const toRotX = isPie ? (is3D ? 0 : Math.PI / 2) : 0;
        this._vt.run(view, this._group, this.container, fromRotX, toRotX, isPie, () => {
            var _a, _b;
            dispatch('st:chart:change', { chart: this, from: current, to: view });
            (_b = (_a = this._opts).onChange) === null || _b === void 0 ? void 0 : _b.call(_a, view);
        });
    }
    toggleView() {
        if (this._destroyed)
            return;
        const current = this.container.getAttribute('data-st-chart-view');
        this.setView(current === '3d' ? '2d' : '3d');
    }
    update(newData) {
        if (this._destroyed)
            return;
        this._opts.data = newData;
        this._rebuild();
        dispatch('st:chart:update', { chart: this });
    }
    // ─── Feature 4: Dynamic Data Entry API ───────────────────────────────────────
    addDataPoint(point) {
        if (this._destroyed)
            return;
        this._opts.data = [...this._opts.data, point];
        this._rebuild();
        dispatch('st:chart:update', { chart: this });
    }
    removeDataPoint(index) {
        if (this._destroyed)
            return;
        if (index < 0 || index >= this._opts.data.length)
            return;
        this._opts.data = this._opts.data.filter((_, i) => i !== index);
        if (this._opts.data.length === 0)
            return;
        this._rebuild();
        dispatch('st:chart:update', { chart: this });
    }
    addDataPoints(points) {
        if (this._destroyed || points.length === 0)
            return;
        this._opts.data = [...this._opts.data, ...points];
        this._rebuild();
        dispatch('st:chart:update', { chart: this });
    }
    removeDataPoints(indices) {
        if (this._destroyed || indices.length === 0)
            return;
        const set = new Set(indices);
        const next = this._opts.data.filter((_, i) => !set.has(i));
        if (next.length === 0)
            return;
        this._opts.data = next;
        this._rebuild();
        dispatch('st:chart:update', { chart: this });
    }
    updateDataPoint(index, data) {
        if (this._destroyed)
            return;
        if (index < 0 || index >= this._opts.data.length)
            return;
        this._opts.data = this._opts.data.map((p, i) => i === index ? Object.assign(Object.assign({}, p), data) : p);
        this._rebuild();
        dispatch('st:chart:update', { chart: this });
    }
    destroy() {
        if (this._destroyed)
            return;
        this._destroyed = true;
        disposeMeshes(this._sm.scene, this._group);
        this._interaction.dispose();
        this._sm.dispose();
        this.container.classList.remove('strata-chart');
        this.container.removeAttribute('data-st-chart-type');
        this.container.removeAttribute('data-st-chart-view');
        this.container.removeAttribute('data-st-chart-loading');
        this.container.removeAttribute('data-st-chart-animated');
        this.container.removeAttribute('data-st-chart-hovered');
        registry.delete(this.container);
        dispatch('st:chart:destroy', { chart: this });
    }
    // ─── Private helpers ──────────────────────────────────────────────────────────
    _renderOpts(is3D) {
        var _a, _b, _c, _d;
        return {
            is3D,
            gridView: (_a = this._opts.gridView) !== null && _a !== void 0 ? _a : false,
            showAxisLabels: (_b = this._opts.showAxisLabels) !== null && _b !== void 0 ? _b : false,
            showScale: (_c = this._opts.showScale) !== null && _c !== void 0 ? _c : false,
            showGridLabels: (_d = this._opts.showGridLabels) !== null && _d !== void 0 ? _d : false,
        };
    }
    _rebuild() {
        var _a;
        const type = (_a = this._opts.type) !== null && _a !== void 0 ? _a : 'bar';
        const view = this.container.getAttribute('data-st-chart-view');
        const is3D = view === '3d';
        this.container.setAttribute('data-st-chart-loading', 'true');
        const points = processData(this._opts.data, type);
        const colors = resolveColors(this._opts.colors, points.length);
        disposeMeshes(this._sm.scene, this._group);
        const result = buildChartGroup(type, points, colors, this._renderOpts(is3D));
        this._group = result.group;
        this._gridRefs = result.gridRefs;
        this._maxVal = result.maxVal;
        if (type === 'pie' && !is3D)
            this._group.rotation.x = Math.PI / 2;
        this._sm.scene.add(this._group);
        this._interaction.setGroup(this._group);
        this.container.setAttribute('data-st-chart-loading', 'false');
    }
    // Feature 3: highlight/restore grid lines on hover
    _applyGridHighlight(index, value) {
        var _a;
        if (!this._gridRefs || !((_a = this._opts.highlightGridOnInteract) !== null && _a !== void 0 ? _a : false))
            return;
        const { hLines, vLines } = this._gridRefs;
        if (index === null || value === null) {
            // Restore all lines to normal color
            hLines.forEach(l => l.material.color.set(GRID_COLOR_NORMAL));
            vLines.forEach(l => l.material.color.set(GRID_COLOR_NORMAL));
            return;
        }
        // Highlight the vertical line for this data point
        vLines.forEach((l, i) => {
            l.material.color.set(i === index ? GRID_COLOR_HIGHLIGHT : GRID_COLOR_NORMAL);
        });
        // Highlight the horizontal line closest to this data point's rendered Y position
        const renderedY = (value / this._maxVal) * 3;
        let closestIdx = 0;
        let closestDist = Infinity;
        hLines.forEach((_, s) => {
            const lineY = (s / (SCALE_STEPS - 1)) * 3;
            const dist = Math.abs(lineY - renderedY);
            if (dist < closestDist) {
                closestDist = dist;
                closestIdx = s;
            }
        });
        hLines.forEach((l, s) => {
            l.material.color.set(s === closestIdx ? GRID_COLOR_HIGHLIGHT : GRID_COLOR_NORMAL);
        });
    }
}
// ─── Bootstrap IIFE ───────────────────────────────────────────────────────────
;
(function (win) {
    // Lazy Three.js loader — fetched only on first chart creation if absent.
    let threeCache = null;
    function loadThree(url) {
        if (win.THREE)
            return Promise.resolve(win.THREE);
        if (!url)
            return Promise.reject(new Error('[Strata Chart] Three.js not found and no threeUrl configured.'));
        if (threeCache)
            return threeCache;
        threeCache = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = url;
            s.async = true;
            s.onload = () => { if (win.THREE)
                resolve(win.THREE);
            else {
                threeCache = null;
                reject(new Error('[Strata Chart] Three.js did not register after loading ' + url));
            } };
            s.onerror = () => { threeCache = null; reject(new Error('[Strata Chart] Failed to load ' + url)); };
            document.head.appendChild(s);
        });
        return threeCache;
    }
    // Validate + construct. Assumes Three.js is present.
    function build(selector, options) {
        const container = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (!container) {
            console.error(`[Strata Chart] Element not found: ${String(selector)}`);
            return null;
        }
        if (registry.has(container)) {
            console.warn('[Strata Chart] Chart already mounted here. Call .destroy() first.');
            return registry.get(container);
        }
        if (!Array.isArray(options === null || options === void 0 ? void 0 : options.data)) {
            console.error('[Strata Chart] options.data must be an array.');
            return null;
        }
        if (options.type && !VALID_TYPES.includes(options.type)) {
            console.error(`[Strata Chart] Invalid type "${options.type}". Use: ${VALID_TYPES.join(', ')}`);
            return null;
        }
        const instance = new StrataChart(container, options);
        registry.set(container, instance);
        return instance;
    }
    const api = {
        // Synchronous + unchanged when Three.js is already present. If absent, it is
        // lazy-loaded and create() returns a Promise<instance> (override the source
        // with options.threeUrl, or '' to require pre-load).
        create(selector, options) {
            options = options || {};
            if (win.THREE)
                return build(selector, options);
            const url = options.threeUrl === undefined ? DEFAULT_THREE_URL : options.threeUrl;
            return loadThree(url)
                .then(() => build(selector, options))
                .catch((err) => { console.error(err.message || err); return null; });
        },
        load(url) { return loadThree(url === undefined ? DEFAULT_THREE_URL : url); },
        destroyAll() { registry.forEach(inst => inst.destroy()); },
    };
    if (win.Strata) {
        win.Strata.Chart = api;
    }
    else {
        win.StrataChart = api;
    }
}(window));
