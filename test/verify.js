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

// Physical-naming aliases (ml/mr/pl/pr). The arbitrary regex accepts the
// suffix set [trblxyes]; every accepted suffix must be defined in
// SPACING_PROPS, or the class matches, emits nothing, and warns nothing.
// These guard that silent-no-op regression in named, arbitrary and
// breakpoint forms alike.
ok('ml-3 resolves',                !!lookup('ml-3'))
ok('mr-3 resolves',                !!lookup('mr-3'))
ok('pl-3 resolves',                !!lookup('pl-3'))
ok('pr-3 resolves',                !!lookup('pr-3'))
ok('ml-[10px] resolves',           !!lookup('ml-[10px]'))
ok('pr-[10px] resolves',           !!lookup('pr-[10px]'))
ok('pl-sm-[1rem] resolves',        !!lookup('pl-sm-[1rem]'))
ok('ml aliases ms (margin-left)',  /margin-left:\s*1rem/.test((lookup('ml-3') || {}).css || ''))
ok('pr aliases pe (padding-right)',/padding-right:\s*1rem/.test((lookup('pr-3') || {}).css || ''))
// Every suffix the arbitrary regex accepts must resolve — catches a future
// suffix being added to the char class without a SPACING_PROPS entry.
ok('no unmapped spacing suffixes',
  'trblxyes'.split('').every(s => !!lookup(`m${s}-[1px]`) && !!lookup(`p${s}-[1px]`)))

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

// Arbitrary values — breakpoint-scoped (spacing, border, shadow)
const pxSmArb = lookup('px-sm-[var(--space-40)]')
ok('px-sm-[var(--space-40)] resolves',      !!pxSmArb)
ok('px-sm-[var(--space-40)] has media query', pxSmArb && pxSmArb.css.includes('@media'))
ok('px-sm-[var(--space-40)] has 576px query', pxSmArb && pxSmArb.css.includes('576px'))
ok('px-sm-[var(--space-40)] sets padding-left/right',
  pxSmArb && pxSmArb.css.includes('padding-left: var(--space-40);') &&
             pxSmArb.css.includes('padding-right: var(--space-40);'))

const pSmMultiArb = lookup('p-sm-[1rem_2rem]')
ok('p-sm-[1rem_2rem] resolves',             !!pSmMultiArb)
ok('p-sm-[1rem_2rem] unescapes underscore', pSmMultiArb && pSmMultiArb.css.includes('padding: 1rem 2rem;'))

const mLgImpArb = lookup('!m-lg-[10px]')
ok('!m-lg-[10px] resolves',                 !!mLgImpArb)
ok('!m-lg-[10px] has !important',           mLgImpArb && mLgImpArb.css.includes('margin: 10px !important;'))

ok('bogus-sm-[10px] does not resolve',      !lookup('bogus-sm-[10px]'))

const borderSmArb = lookup('border-sm-[2px_solid_red]')
ok('border-sm-[2px_solid_red] resolves',        !!borderSmArb)
ok('border-sm-[2px_solid_red] has media query', borderSmArb && borderSmArb.css.includes('@media'))
ok('border-sm-[2px_solid_red] unescapes underscore',
  borderSmArb && borderSmArb.css.includes('border: 2px solid red;'))

const borderMdImpArb = lookup('!border-md-[1px_solid_var(--x)]')
ok('!border-md-[1px_solid_var(--x)] resolves',  !!borderMdImpArb)
ok('!border-md-[1px_solid_var(--x)] has 768px query and !important',
  borderMdImpArb && borderMdImpArb.css.includes('768px') &&
                    borderMdImpArb.css.includes('border: 1px solid var(--x) !important;'))

const shadowLgArb = lookup('shadow-lg-[0_4px_20px_rgba(0,0,0,0.1)]')
ok('shadow-lg-[0_4px_20px_rgba(0,0,0,0.1)] resolves',        !!shadowLgArb)
ok('shadow-lg-[0_4px_20px_rgba(0,0,0,0.1)] has media query', shadowLgArb && shadowLgArb.css.includes('@media'))
ok('shadow-lg-[0_4px_20px_rgba(0,0,0,0.1)] unescapes underscore',
  shadowLgArb && shadowLgArb.css.includes('box-shadow: 0 4px 20px rgba(0,0,0,0.1);'))

const shadowXlImpArb = lookup('!shadow-xl-[var(--st-shadow-custom)]')
ok('!shadow-xl-[var(--st-shadow-custom)] resolves', !!shadowXlImpArb)
ok('!shadow-xl-[var(--st-shadow-custom)] has 1200px query and !important',
  shadowXlImpArb && shadowXlImpArb.css.includes('1200px') &&
                    shadowXlImpArb.css.includes('box-shadow: var(--st-shadow-custom) !important;'))

// Border sides — border-x / border-y (new named utilities)
const borderX = lookup('border-x')
ok('border-x resolves',            !!borderX)
ok('border-x sets left and right', borderX && borderX.css.includes('border-left: 1px solid var(--st-border);') &&
                                              borderX.css.includes('border-right:  1px solid var(--st-border);'))

const borderY0 = lookup('border-y-0')
ok('border-y-0 resolves',          !!borderY0)
ok('border-y-0 removes top/bottom', borderY0 && borderY0.css.includes('border-top: 0;') && borderY0.css.includes('border-bottom: 0;'))

// Border sides — responsive named + removal
const borderTopMd = lookup('border-top-md')
ok('border-top-md resolves',       !!borderTopMd)
ok('border-top-md has 768px query', borderTopMd && borderTopMd.css.includes('768px'))

const borderXLg = lookup('border-x-lg')
ok('border-x-lg resolves',         !!borderXLg)
ok('border-x-lg has 992px query and both sides',
  borderXLg && borderXLg.css.includes('992px') &&
               borderXLg.css.includes('border-left: 1px solid var(--st-border);') &&
               borderXLg.css.includes('border-right: 1px solid var(--st-border);'))

const borderTopMd0 = lookup('border-top-md-0')
ok('border-top-md-0 resolves',     !!borderTopMd0)
ok('border-top-md-0 has 768px query and removes border', borderTopMd0 && borderTopMd0.css.includes('768px') && borderTopMd0.css.includes('border-top: 0;'))

// Border sides — arbitrary + responsive-arbitrary
const borderTopArb = lookup('border-top-[3px_dashed_red]')
ok('border-top-[3px_dashed_red] resolves', !!borderTopArb)
ok('border-top-[3px_dashed_red] unescapes underscore', borderTopArb && borderTopArb.css.includes('border-top: 3px dashed red;'))

const borderXMdImpArb = lookup('!border-x-md-[2px_solid_var(--c)]')
ok('!border-x-md-[2px_solid_var(--c)] resolves', !!borderXMdImpArb)
ok('!border-x-md-[2px_solid_var(--c)] has 768px query and !important on both sides',
  borderXMdImpArb && borderXMdImpArb.css.includes('768px') &&
                      borderXMdImpArb.css.includes('border-left: 2px solid var(--c) !important;') &&
                      borderXMdImpArb.css.includes('border-right: 2px solid var(--c) !important;'))

ok('border-bogus-[10px] does not resolve',    !lookup('border-bogus-[10px]'))
ok('border-bogus-md-[10px] does not resolve', !lookup('border-bogus-md-[10px]'))

// Border-radius corner-pairs — responsive named
const roundedTopLg = lookup('rounded-top-lg')
ok('rounded-top-lg resolves',        !!roundedTopLg)
ok('rounded-top-lg has 992px query and both top corners',
  roundedTopLg && roundedTopLg.css.includes('992px') &&
                  roundedTopLg.css.includes('border-top-left-radius: var(--st-border-radius);') &&
                  roundedTopLg.css.includes('border-top-right-radius: var(--st-border-radius);'))

// Border-radius corner-pairs — arbitrary + responsive-arbitrary
const roundedTopArb = lookup('rounded-top-[12px]')
ok('rounded-top-[12px] resolves', !!roundedTopArb)
ok('rounded-top-[12px] sets both top corners',
  roundedTopArb && roundedTopArb.css.includes('border-top-left-radius: 12px;') &&
                   roundedTopArb.css.includes('border-top-right-radius: 12px;'))

const roundedTopMdArb = lookup('rounded-top-md-[12px_4px]')
ok('rounded-top-md-[12px_4px] resolves', !!roundedTopMdArb)
ok('rounded-top-md-[12px_4px] has 768px query and unescapes underscore',
  roundedTopMdArb && roundedTopMdArb.css.includes('768px') &&
                     roundedTopMdArb.css.includes('border-top-left-radius: 12px 4px;'))

ok('rounded-bogus-[10px] does not resolve', !lookup('rounded-bogus-[10px]'))

// Border-radius (full corner) — arbitrary, previously missing entirely
const roundedArb = lookup('rounded-[var(--r)]')
ok('rounded-[var(--r)] resolves',        !!roundedArb)
ok('rounded-[var(--r)] sets border-radius', roundedArb && roundedArb.css.includes('border-radius: var(--r);'))

const roundedMdArb = lookup('rounded-md-[var(--r)]')
ok('rounded-md-[var(--r)] resolves',     !!roundedMdArb)
ok('rounded-md-[var(--r)] has 768px query', roundedMdArb && roundedMdArb.css.includes('768px'))

const roundedXlImpArb = lookup('!rounded-xl-[12px]')
ok('!rounded-xl-[12px] resolves',        !!roundedXlImpArb)
ok('!rounded-xl-[12px] has 1200px query and !important',
  roundedXlImpArb && roundedXlImpArb.css.includes('1200px') &&
                     roundedXlImpArb.css.includes('border-radius: 12px !important;'))

// Outline — responsive named variants
const outlineMdNone = lookup('outline-md-none')
ok('outline-md-none resolves',           !!outlineMdNone)
ok('outline-md-none has 768px query',    outlineMdNone && outlineMdNone.css.includes('768px'))

const outlineLgPrimary = lookup('outline-lg-primary')
ok('outline-lg-primary resolves',        !!outlineLgPrimary)
ok('outline-lg-primary has 992px query and outline-offset',
  outlineLgPrimary && outlineLgPrimary.css.includes('992px') && outlineLgPrimary.css.includes('outline-offset: 2px;'))

const outlineXl3 = lookup('outline-xl-3')
ok('outline-xl-3 resolves',              !!outlineXl3)
ok('outline-xl-3 has 1200px query and width', outlineXl3 && outlineXl3.css.includes('1200px') && outlineXl3.css.includes('outline-width: 3px;'))

// Outline — arbitrary + responsive-arbitrary (new — no arbitrary form existed before)
const outlineArb = lookup('outline-[2px_dashed_red]')
ok('outline-[2px_dashed_red] resolves',  !!outlineArb)
ok('outline-[2px_dashed_red] unescapes underscore', outlineArb && outlineArb.css.includes('outline: 2px dashed red;'))

const outlineMdImpArb = lookup('!outline-md-[3px_solid_var(--c)]')
ok('!outline-md-[3px_solid_var(--c)] resolves', !!outlineMdImpArb)
ok('!outline-md-[3px_solid_var(--c)] has 768px query and !important',
  outlineMdImpArb && outlineMdImpArb.css.includes('768px') && outlineMdImpArb.css.includes('outline: 3px solid var(--c) !important;'))

ok('outline-bogus-[10px] does not resolve', !lookup('outline-bogus-[10px]'))

// Gutters — arbitrary + responsive-arbitrary (new — no arbitrary form existed before)
const gArb = lookup('g-[var(--gutter)]')
ok('g-[var(--gutter)] resolves',         !!gArb)
ok('g-[var(--gutter)] sets both axes',   gArb && gArb.css.includes('--st-gutter-x: var(--gutter);') && gArb.css.includes('--st-gutter-y: var(--gutter);'))

const gxArb = lookup('gx-[2rem]')
ok('gx-[2rem] resolves',                 !!gxArb)
ok('gx-[2rem] sets only x-axis',         gxArb && gxArb.css.includes('--st-gutter-x: 2rem;') && !gxArb.css.includes('--st-gutter-y'))

const gySmArb = lookup('gy-sm-[1rem]')
ok('gy-sm-[1rem] resolves',              !!gySmArb)
ok('gy-sm-[1rem] has 576px query and sets only y-axis',
  gySmArb && gySmArb.css.includes('576px') && gySmArb.css.includes('--st-gutter-y: 1rem;') && !gySmArb.css.includes('--st-gutter-x'))

const gMdImpArb = lookup('!g-md-[3rem]')
ok('!g-md-[3rem] resolves',              !!gMdImpArb)
ok('!g-md-[3rem] has 768px query and !important on both axes',
  gMdImpArb && gMdImpArb.css.includes('768px') &&
               gMdImpArb.css.includes('--st-gutter-x: 3rem !important;') &&
               gMdImpArb.css.includes('--st-gutter-y: 3rem !important;'))

ok('g-bogus-[10px] does not resolve',    !lookup('g-bogus-[10px]'))
ok('gap-[1rem] still resolves (no collision with new g-[...] pattern)', !!lookup('gap-[1rem]'))

// Grid-template — responsive-arbitrary (new — only unconditional existed before)
const gtcMdArb = lookup('gtc-md-[260px_1fr]')
ok('gtc-md-[260px_1fr] resolves',        !!gtcMdArb)
ok('gtc-md-[260px_1fr] has 768px query and unescapes underscore',
  gtcMdArb && gtcMdArb.css.includes('768px') && gtcMdArb.css.includes('grid-template-columns: 260px 1fr;'))

const gtrLgImpArb = lookup('!gtr-lg-[auto_1fr_auto]')
ok('!gtr-lg-[auto_1fr_auto] resolves',   !!gtrLgImpArb)
ok('!gtr-lg-[auto_1fr_auto] has 992px query and !important',
  gtrLgImpArb && gtrLgImpArb.css.includes('992px') && gtrLgImpArb.css.includes('grid-template-rows: auto 1fr auto !important;'))

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
