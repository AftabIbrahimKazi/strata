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
 *   init.js — Runtime marker (sets data-strata on <html> for plugin detection)
 *
 * Sourced from packages/ (single source of truth for Strata + standalone):
 *   modal/modal.js                     — Modal   (Strata.Modal / StrataModal)
 *   skeleton-loader/skeleton-loader.js — Skeleton (Strata.skeleton / SkeletonLoader)
 *   chart/chart.js                     — Chart   (Strata.Chart / StrataChart) — requires Three.js
 */
