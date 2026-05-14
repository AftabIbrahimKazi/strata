/*!
 * Strata Components — Entry Point
 *
 * This file is the bundle manifest.
 * The build script concatenates all files in src/js/components/ (in filename order)
 * and writes the result to dist/strata.components.js.
 *
 * To add a new component:
 *   1. Create src/js/components/[name].js
 *   2. Run: npm run build
 *
 * Current components:
 *   modal.js    — Modal    (data-st-toggle, data-st-dismiss, data-st-backdrop)
 *   skeleton.js — Skeleton (Strata.skeleton.init / show / reveal / toggle)
 *   chart.js    — Chart    (Strata.Chart.create / toggleView / update / destroy) — requires Three.js
 */
