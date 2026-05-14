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
 *   init.js     — Runtime marker (sets data-strata on <html> for plugin detection)
 *   modal.js    — Modal       (data-st-toggle, data-st-dismiss, data-st-backdrop)
 *   chart.js    — Chart       (Strata.Chart.create / toggleView / update / destroy) — requires Three.js
 *
 * Sourced from packages/:
 *   skeleton-loader/skeleton-loader.js — Skeleton (Strata.skeleton / SkeletonLoader — single source of truth)
 */
