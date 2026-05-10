'use strict'

/**
 * Strata Feature Verification
 * Tests that key classes resolve correctly in the registry
 * and that the build output contains expected CSS.
 */

const path = require('path')
const fs   = require('fs')

let passed = 0
let failed = 0

function ok(label, condition) {
  if (condition) {
    console.log(`  ✓  ${label}`)
    passed++
  } else {
    console.error(`  ✗  ${label}`)
    failed++
  }
}

// ─── Registry lookup tests ────────────────────────────────────────────────────

const { lookup } = require('../src/registry/registry')

console.log('\n── Registry ──────────────────────────────────────────────────')

// Grid
ok('col-6 resolves',            !!lookup('col-6'))
ok('col-xs-6 resolves',         !!lookup('col-xs-6'))
ok('col-md-4 resolves',         !!lookup('col-md-4'))
ok('col-lg-3 resolves',         !!lookup('col-lg-3'))
ok('col-xxl-2 resolves',        !!lookup('col-xxl-2'))
ok('offset-md-2 resolves',      !!lookup('offset-md-2'))
ok('row-cols-3 resolves',       !!lookup('row-cols-3'))
ok('row-cols-md-4 resolves',    !!lookup('row-cols-md-4'))
ok('container resolves',        !!lookup('container'))
ok('container-md resolves',     !!lookup('container-md'))
ok('container-fluid resolves',  !!lookup('container-fluid'))
ok('g-3 resolves',              !!lookup('g-3'))
ok('gx-2 resolves',             !!lookup('gx-2'))
ok('gy-md-4 resolves',          !!lookup('gy-md-4'))

// Buttons
ok('btn-primary resolves',        !!lookup('btn-primary'))
ok('btn-secondary resolves',      !!lookup('btn-secondary'))
ok('btn-danger resolves',         !!lookup('btn-danger'))
ok('btn-outline-primary resolves',!!lookup('btn-outline-primary'))
ok('btn-outline-success resolves',!!lookup('btn-outline-success'))
ok('btn-sm resolves',             !!lookup('btn-sm'))
ok('btn-lg resolves',             !!lookup('btn-lg'))

// Alerts
ok('alert resolves',          !!lookup('alert'))
ok('alert-dismissible resolves', !!lookup('alert-dismissible'))

// Badges
ok('badge resolves',          !!lookup('badge'))
ok('badge-primary resolves',  !!lookup('badge-primary'))
ok('badge-success resolves',  !!lookup('badge-success'))

// Cards
ok('card resolves',           !!lookup('card'))
ok('card-body resolves',      !!lookup('card-body'))
ok('card-header resolves',    !!lookup('card-header'))
ok('card-footer resolves',    !!lookup('card-footer'))
ok('card-img-top resolves',   !!lookup('card-img-top'))

// Modal
ok('modal resolves',                  !!lookup('modal'))
ok('modal-dialog resolves',           !!lookup('modal-dialog'))
ok('modal-dialog-centered resolves',  !!lookup('modal-dialog-centered'))
ok('modal-dialog-scrollable resolves',!!lookup('modal-dialog-scrollable'))
ok('modal-content resolves',          !!lookup('modal-content'))
ok('modal-header resolves',           !!lookup('modal-header'))
ok('modal-body resolves',             !!lookup('modal-body'))
ok('modal-footer resolves',           !!lookup('modal-footer'))
ok('modal-lg resolves',               !!lookup('modal-lg'))
ok('modal-fullscreen resolves',       !!lookup('modal-fullscreen'))

// Navbar
ok('navbar resolves',              !!lookup('navbar'))
ok('navbar-expand-md resolves',    !!lookup('navbar-expand-md'))
ok('navbar-expand-lg resolves',    !!lookup('navbar-expand-lg'))
ok('navbar-dark resolves',         !!lookup('navbar-dark'))

// Forms
ok('form-control resolves',        !!lookup('form-control'))
ok('form-select resolves',         !!lookup('form-select'))
ok('form-check resolves',          !!lookup('form-check'))
ok('form-switch resolves',         !!lookup('form-switch'))
ok('form-floating resolves',       !!lookup('form-floating'))
ok('form-range resolves',          !!lookup('form-range'))
ok('input-group resolves',         !!lookup('input-group'))
ok('was-validated resolves',       !!lookup('was-validated'))
ok('needs-validation resolves',    !!lookup('needs-validation'))

// Tables
ok('table resolves',               !!lookup('table'))
ok('table-striped resolves',       !!lookup('table-striped'))
ok('table-dark resolves',          !!lookup('table-dark'))
ok('table-primary resolves',       !!lookup('table-primary'))
ok('table-responsive resolves',    !!lookup('table-responsive'))

// Interactive components
ok('accordion resolves',           !!lookup('accordion'))
ok('carousel resolves',            !!lookup('carousel'))
ok('dropdown resolves',            !!lookup('dropdown'))
ok('offcanvas resolves',           !!lookup('offcanvas'))
ok('offcanvas-start resolves',     !!lookup('offcanvas-start'))
ok('collapse resolves',            !!lookup('collapse'))
ok('toast resolves',               !!lookup('toast'))
ok('tooltip resolves',             !!lookup('tooltip'))
ok('popover resolves',             !!lookup('popover'))
ok('progress resolves',            !!lookup('progress'))
ok('progress-bar resolves',        !!lookup('progress-bar'))
ok('spinner-border resolves',      !!lookup('spinner-border'))
ok('placeholder resolves',         !!lookup('placeholder'))

// Navs
ok('nav resolves',                 !!lookup('nav'))
ok('nav-tabs resolves',            !!lookup('nav-tabs'))
ok('nav-pills resolves',           !!lookup('nav-pills'))
ok('nav-underline resolves',       !!lookup('nav-underline'))
ok('pagination resolves',          !!lookup('pagination'))
ok('breadcrumb resolves',          !!lookup('breadcrumb'))
ok('list-group resolves',          !!lookup('list-group'))

// Utilities — spacing
ok('m-3 resolves',                 !!lookup('m-3'))
ok('px-4 resolves',                !!lookup('px-4'))
ok('mt-md-2 resolves',             !!lookup('mt-md-2'))

// Utilities — display
ok('d-none resolves',              !!lookup('d-none'))
ok('d-flex resolves',              !!lookup('d-flex'))
ok('d-md-block resolves',          !!lookup('d-md-block'))

// Utilities — flex
ok('flex-row resolves',            !!lookup('flex-row'))
ok('align-items-center resolves',  !!lookup('align-items-center'))
ok('justify-content-between resolves', !!lookup('justify-content-between'))
ok('gap-3 resolves',               !!lookup('gap-3'))
ok('gap-md-4 resolves',            !!lookup('gap-md-4'))
ok('order-2 resolves',             !!lookup('order-2'))
ok('order-md-first resolves',      !!lookup('order-md-first'))

// Utilities — text
ok('text-center resolves',         !!lookup('text-center'))
ok('text-md-start resolves',       !!lookup('text-md-start'))
ok('text-primary resolves',        !!lookup('text-primary'))
ok('text-danger resolves',         !!lookup('text-danger'))
ok('fw-bold resolves',             !!lookup('fw-bold'))
ok('fst-italic resolves',          !!lookup('fst-italic'))
ok('lh-sm resolves',               !!lookup('lh-sm'))
ok('text-truncate resolves',       !!lookup('text-truncate'))
ok('text-decoration-none resolves',!!lookup('text-decoration-none'))

// Utilities — color
ok('bg-primary resolves',          !!lookup('bg-primary'))
ok('bg-success resolves',          !!lookup('bg-success'))
ok('bg-primary-subtle resolves',   !!lookup('bg-primary-subtle'))
ok('bg-opacity-50 resolves',       !!lookup('bg-opacity-50'))
ok('border-primary-subtle resolves', !!lookup('border-primary-subtle'))
ok('text-opacity-75 resolves',     !!lookup('text-opacity-75'))

// Utilities — sizing
ok('w-100 resolves',               !!lookup('w-100'))
ok('w-50 resolves',                !!lookup('w-50'))
ok('h-auto resolves',              !!lookup('h-auto'))
ok('vh-100 resolves',              !!lookup('vh-100'))
ok('mw-100 resolves',              !!lookup('mw-100'))

// Utilities — misc
ok('rounded resolves',             !!lookup('rounded'))
ok('rounded-circle resolves',      !!lookup('rounded-circle'))
ok('shadow resolves',              !!lookup('shadow'))
ok('shadow-lg resolves',           !!lookup('shadow-lg'))
ok('overflow-hidden resolves',     !!lookup('overflow-hidden'))
ok('overflow-x-auto resolves',     !!lookup('overflow-x-auto'))
ok('position-absolute resolves',   !!lookup('position-absolute'))
ok('position-sticky resolves',     !!lookup('position-sticky'))
ok('object-fit-cover resolves',    !!lookup('object-fit-cover'))
ok('float-end resolves',           !!lookup('float-end'))
ok('float-md-start resolves',      !!lookup('float-md-start'))
ok('visually-hidden resolves',     !!lookup('visually-hidden'))
ok('stretched-link resolves',      !!lookup('stretched-link'))
ok('user-select-none resolves',    !!lookup('user-select-none'))
ok('pe-none resolves',             !!lookup('pe-none'))
ok('ratio-16x9 resolves',         !!lookup('ratio-16x9'))
ok('fixed-top resolves',           !!lookup('fixed-top'))
ok('sticky-top resolves',          !!lookup('sticky-top'))
ok('hstack resolves',              !!lookup('hstack'))
ok('vstack resolves',              !!lookup('vstack'))
ok('clearfix resolves',            !!lookup('clearfix'))
ok('img-fluid resolves',           !!lookup('img-fluid'))
ok('link-primary resolves',        !!lookup('link-primary'))
ok('d-print-none resolves',        !!lookup('d-print-none'))
ok('d-print-inline resolves',      !!lookup('d-print-inline'))

// Tooltip/Popover directions
ok('bs-tooltip-top resolves',      !!lookup('bs-tooltip-top'))
ok('bs-tooltip-bottom resolves',   !!lookup('bs-tooltip-bottom'))
ok('bs-tooltip-start resolves',    !!lookup('bs-tooltip-start'))
ok('bs-tooltip-end resolves',      !!lookup('bs-tooltip-end'))
ok('bs-popover-top resolves',      !!lookup('bs-popover-top'))
ok('bs-popover-bottom resolves',   !!lookup('bs-popover-bottom'))

// Arbitrary values
ok('mt-[12px] resolves',           !!lookup('mt-[12px]'))
ok('px-[2rem] resolves',           !!lookup('px-[2rem]'))
ok('text-[#ff0000] resolves',      !!lookup('text-[#ff0000]'))
ok('bg-[#123456] resolves',        !!lookup('bg-[#123456]'))
ok('w-[320px] resolves',           !!lookup('w-[320px]'))

// Breakpoint routing check
const colMd4 = lookup('col-md-4')
ok('col-md-4 has media query',     colMd4 && colMd4.css.includes('@media'))
ok('col-md-4 is components layer', colMd4 && colMd4.layer === 'components')

const col6 = lookup('col-6')
ok('col-6 has no media query',     col6 && !col6.css.includes('@media'))

const dMdFlex = lookup('d-md-flex')
ok('d-md-flex has 768px query',    dMdFlex && dMdFlex.css.includes('768px'))

// ─── Dist output tests ───────────────────────────────────────────────────────

console.log('\n── Dist Output ───────────────────────────────────────────────')

const distCSS = fs.readFileSync(
  path.join(__dirname, '..', 'dist', 'strata.output.css'), 'utf8'
)
const distJS = fs.readFileSync(
  path.join(__dirname, '..', 'dist', 'strata.components.js'), 'utf8'
)

ok('@layer declaration present',           distCSS.includes('@layer'))
ok('st-components-xs layer declared',      distCSS.includes('st-components-xs'))
ok('st-components-md layer declared',      distCSS.includes('st-components-md'))
ok('st-utilities-xs layer declared',       distCSS.includes('st-utilities-xs'))
ok('body.modal-open in output',            distCSS.includes('body.modal-open'))
ok('modal-static animation in output',     distCSS.includes('st-modal-shake'))
ok('CSS custom properties present',        distCSS.includes('--st-primary'))
ok('Dark theme present',                   distCSS.includes('[data-st-theme="dark"]'))
ok('Skeleton layer present',               distCSS.includes('@layer st-skeleton'))
ok('JS bundle contains Modal',             distJS.includes('Strata.Modal'))
ok('JS bundle contains skeleton',          distJS.includes('Strata.skeleton'))
ok('JS bundle has build banner',           distJS.includes('Strata Components'))

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n── Result ────────────────────────────────────────────────────`)
console.log(`   Passed: ${passed}`)
console.log(`   Failed: ${failed}`)
console.log(`   Total:  ${passed + failed}`)
if (failed === 0) console.log('\n   All tests passed.\n')
else              console.error(`\n   ${failed} test(s) failed.\n`)

process.exit(failed > 0 ? 1 : 0)
