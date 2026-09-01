/**
 * Strata Registry — Optimised
 * O(1) lookup via pre-computed Map for known classes
 * Regex fallback only for arbitrary values
 */

'use strict'

const { wrapInMediaQuery } = require('./breakpoints')

// ─── Escape helpers ───────────────────────────────────────────────────

function escapeClass(cls) {
  // Escape every character that is not a safe unescaped CSS identifier character.
  // Valid unescaped: a-z A-Z 0-9 _ -
  return cls.replace(/[^\w-]/g, (c) => '\\' + c)
}

function parseArbitrary(value) {
  const match = value.match(/^\[(.+)\]$/)
  return match ? match[1] : null
}

// Builds a multi-property declaration block for arbitrary side patterns
// (border-top/x/y-[...], rounded-top/end/bottom/start-[...]) — same value
// applied to every property in `props`, e.g. border-x sets both left+right.
function sideArbitraryDecl(props, val, important) {
  const i = important ? ' !important' : ''
  return props.map(p => `  ${p}: ${val.replace(/_/g,' ')}${i};`).join('\n')
}

// Builds the gutter custom-property declaration for g-[...]/gx-[...]/gy-[...]
function gutterArbitraryDecl(prop, val, important) {
  const i = important ? ' !important' : ''
  const v = val.replace(/_/g,' ')
  if (prop === 'g') return `--st-gutter-x: ${v}${i}; --st-gutter-y: ${v}${i};`
  return prop === 'gx' ? `--st-gutter-x: ${v}${i};` : `--st-gutter-y: ${v}${i};`
}

// ─── Spacing scale ────────────────────────────────────────────────────

const SPACING_SCALE = {
  '0': '0', '1': '0.25rem', '2': '0.5rem',
  '3': '1rem', '4': '1.5rem', '5': '3rem', 'auto': 'auto',
}

// NOTE: the arbitrary-value regex below accepts the suffix set [trblxyes] —
// the union of physical naming (t/r/b/l, as in Tailwind and Bootstrap 4) and
// logical-style naming (x/y/e/s, as in Bootstrap 5). Every suffix the regex
// accepts MUST have an entry here: a key that is matched but undefined makes
// the pattern fn return null, so the class compiles silently to nothing —
// no CSS, no warning, no way for a consumer to notice. `ml`/`mr`/`pl`/`pr`
// were exactly that trap, and they're the spellings anyone arriving from
// Tailwind reaches for first. They are plain aliases of ms/me/ps/pe, which
// are themselves physical (left/right), not logical — so no RTL behaviour
// differs between the two spellings.
const SPACING_PROPS = {
  'm':  ['margin'],
  'mt': ['margin-top'],    'mb': ['margin-bottom'],
  'ms': ['margin-left'],   'me': ['margin-right'],
  'ml': ['margin-left'],   'mr': ['margin-right'],
  'mx': ['margin-left',  'margin-right'],
  'my': ['margin-top',   'margin-bottom'],
  'p':  ['padding'],
  'pt': ['padding-top'],   'pb': ['padding-bottom'],
  'ps': ['padding-left'],  'pe': ['padding-right'],
  'pl': ['padding-left'],  'pr': ['padding-right'],
  'px': ['padding-left',  'padding-right'],
  'py': ['padding-top',   'padding-bottom'],
}

// ─── Border side / border-radius side property maps ──────────────────
// Shared by named-scale registration and arbitrary-value patterns below.

const BORDER_SIDE_PROPS = {
  'top':    ['border-top'],
  'end':    ['border-right'],
  'bottom': ['border-bottom'],
  'start':  ['border-left'],
  'x':      ['border-left',  'border-right'],
  'y':      ['border-top',   'border-bottom'],
}

const ROUNDED_SIDE_PROPS = {
  'top':    ['border-top-left-radius',    'border-top-right-radius'],
  'end':    ['border-top-right-radius',   'border-bottom-right-radius'],
  'bottom': ['border-bottom-left-radius', 'border-bottom-right-radius'],
  'start':  ['border-top-left-radius',    'border-bottom-left-radius'],
}

// ─── Color maps ───────────────────────────────────────────────────────

const TEXT_COLOR_MAP = {
  primary: 'var(--st-primary)', secondary: 'var(--st-secondary)',
  success: 'var(--st-success)', danger: 'var(--st-danger)',
  warning: 'var(--st-warning)', info: 'var(--st-info)',
  light: 'var(--st-light)', dark: 'var(--st-dark)',
  white: '#ffffff', muted: 'var(--st-text-muted)', body: 'var(--st-text)',
}

const BG_COLOR_MAP = {
  primary: 'var(--st-primary)', secondary: 'var(--st-secondary)',
  success: 'var(--st-success)', danger: 'var(--st-danger)',
  warning: 'var(--st-warning)', info: 'var(--st-info)',
  light: 'var(--st-light)', dark: 'var(--st-dark)',
  white: '#ffffff', transparent: 'transparent', body: 'var(--st-bg)',
}

const BORDER_COLOR_MAP = {
  primary: 'var(--st-primary)', secondary: 'var(--st-secondary)',
  success: 'var(--st-success)', danger: 'var(--st-danger)',
  warning: 'var(--st-warning)', info: 'var(--st-info)',
  light: 'var(--st-light)', dark: 'var(--st-dark)', white: '#ffffff',
}

const DISPLAY_MAP = {
  none: 'none', inline: 'inline', 'inline-block': 'inline-block',
  block: 'block', grid: 'grid', 'inline-grid': 'inline-grid',
  flex: 'flex', 'inline-flex': 'inline-flex', table: 'table',
}

const JUSTIFY_MAP = {
  start: 'flex-start', end: 'flex-end', center: 'center',
  between: 'space-between', around: 'space-around', evenly: 'space-evenly',
}

const ALIGN_MAP = {
  start: 'flex-start', end: 'flex-end', center: 'center',
  baseline: 'baseline', stretch: 'stretch',
}

const OPACITY_SCALE = { '0':'0', '25':'.25', '50':'.5', '75':'.75', '100':'1' }
const SIZE_SCALE    = { '25':'25%', '50':'50%', '75':'75%', '100':'100%', 'auto':'auto' }
const Z_SCALE       = { '0':'0', '1':'1', '2':'2', '3':'3', 'auto':'auto' }
const BREAKPOINTS   = ['xs','sm','md','lg','xl','xxl']
const CURSOR_VALUES = new Set(['auto','default','pointer','wait','text','move','not-allowed','grab'])
const OBJECT_FIT    = new Set(['contain','cover','fill','none','scale-down'])
const EASE_MAP      = {
  'in': 'cubic-bezier(0.4,0,1,1)', 'out': 'cubic-bezier(0,0,0.2,1)',
  'in-out': 'cubic-bezier(0.4,0,0.2,1)', 'linear': 'linear',
}

// ─── O(1) Pre-computed class Map ─────────────────────────────────────
// All known non-arbitrary classes pre-built at startup
// Lookup is instant — no regex needed

const EXACT_MAP = new Map()

// Actual breakpoint pixel values — CSS variables cannot be used in media queries
const BP_VALUES = {
  sm:  '576px',
  md:  '768px',
  lg:  '992px',
  xl:  '1200px',
  xxl: '1400px',
}

function reg(cls, layer, css) {
  EXACT_MAP.set(cls, { layer, css })
}

// Media query helper using actual pixel values
function mq(bp, css) {
  return `@media (min-width: ${BP_VALUES[bp]}) { ${css} }`
}

// Display utilities
Object.keys(DISPLAY_MAP).forEach(v => {
  reg(`d-${v}`, 'utilities', `.d-${v} { display: ${DISPLAY_MAP[v]}; }`)
  BREAKPOINTS.forEach(bp => {
    if (bp === 'xs') return
    reg(`d-${bp}-${v}`, 'utilities',
      mq(bp, `.d-${bp}-${v} { display: ${DISPLAY_MAP[v]}; }`))
  })
})

// Spacing utilities
Object.keys(SPACING_PROPS).forEach(prop => {
  const props = SPACING_PROPS[prop]
  Object.keys(SPACING_SCALE).forEach(scale => {
    const val = SPACING_SCALE[scale]
    const decl = props.map(p => `  ${p}: ${val};`).join('\n')
    reg(`${prop}-${scale}`, 'utilities', `.${prop}-${scale} {\n${decl}\n}`)

    // Important variant
    const declImp = props.map(p => `  ${p}: ${val} !important;`).join('\n')
    reg(`!${prop}-${scale}`, 'utilities', `.\\!${prop}-${scale} {\n${declImp}\n}`)

    // Breakpoint variants
    BREAKPOINTS.forEach(bp => {
      if (bp === 'xs') return
      const bpDecl = props.map(p => `  ${p}: ${val};`).join('\n')
      reg(`${prop}-${bp}-${scale}`, 'utilities',
        mq(bp, `.${prop}-${bp}-${scale} {\n${bpDecl}\n}`))
    })
  })
})

// Text alignment
const TEXT_ALIGN = { start:'left', end:'right', center:'center', justify:'justify' }
Object.entries(TEXT_ALIGN).forEach(([k, v]) => {
  reg(`text-${k}`, 'utilities', `.text-${k} { text-align: ${v}; }`)
  reg(`!text-${k}`, 'utilities', `.\\!text-${k} { text-align: ${v} !important; }`)
  BREAKPOINTS.forEach(bp => {
    if (bp === 'xs') return
    reg(`text-${bp}-${k}`, 'utilities',
      mq(bp, `.text-${bp}-${k} { text-align: ${v}; }`))
  })
})

// Text transform
;['uppercase','lowercase','capitalize','none'].forEach(v => {
  reg(`text-${v}`, 'utilities', `.text-${v} { text-transform: ${v}; }`)
  reg(`!text-${v}`, 'utilities', `.\\!text-${v} { text-transform: ${v} !important; }`)
})

// Text colors
Object.entries(TEXT_COLOR_MAP).forEach(([k, v]) => {
  reg(`text-${k}`, 'utilities', `.text-${k} { color: ${v}; }`)
  reg(`!text-${k}`, 'utilities', `.\\!text-${k} { color: ${v} !important; }`)
})

// Background colors
Object.entries(BG_COLOR_MAP).forEach(([k, v]) => {
  reg(`bg-${k}`, 'utilities', `.bg-${k} { background-color: ${v}; }`)
  reg(`!bg-${k}`, 'utilities', `.\\!bg-${k} { background-color: ${v} !important; }`)
})

// Border colors
reg('border', 'utilities', '.border { border: 1px solid var(--st-border); }')
reg('border-0', 'utilities', '.border-0 { border: none; }')
Object.entries(BORDER_COLOR_MAP).forEach(([k, v]) => {
  reg(`border-${k}`, 'utilities', `.border-${k} { border-color: ${v}; }`)
})
reg('border-muted', 'utilities', `.border-muted { border-color: var(--st-text-muted); }`)

// Sizing
Object.entries(SIZE_SCALE).forEach(([k, v]) => {
  reg(`w-${k}`, 'utilities', `.w-${k} { width: ${v}; }`)
  reg(`h-${k}`, 'utilities', `.h-${k} { height: ${v}; }`)
  reg(`!w-${k}`, 'utilities', `.\\!w-${k} { width: ${v} !important; }`)
  reg(`!h-${k}`, 'utilities', `.\\!h-${k} { height: ${v} !important; }`)
})

// Flexbox
reg('flex-row',     'utilities', '.flex-row { flex-direction: row; }')
reg('flex-column',  'utilities', '.flex-column { flex-direction: column; }')
reg('flex-wrap',    'utilities', '.flex-wrap { flex-wrap: wrap; }')
reg('flex-nowrap',  'utilities', '.flex-nowrap { flex-wrap: nowrap; }')
reg('flex-fill',    'utilities', '.flex-fill { flex: 1 1 auto; }')
reg('flex-grow-0',  'utilities', '.flex-grow-0 { flex-grow: 0; }')
reg('flex-grow-1',  'utilities', '.flex-grow-1 { flex-grow: 1; }')
reg('flex-shrink-0','utilities', '.flex-shrink-0 { flex-shrink: 0; }')
reg('flex-shrink-1','utilities', '.flex-shrink-1 { flex-shrink: 1; }')

// Justify content
Object.entries(JUSTIFY_MAP).forEach(([k, v]) => {
  reg(`justify-content-${k}`, 'utilities', `.justify-content-${k} { justify-content: ${v}; }`)
  BREAKPOINTS.forEach(bp => {
    if (bp === 'xs') return
    reg(`justify-content-${bp}-${k}`, 'utilities',
      mq(bp, `.justify-content-${bp}-${k} { justify-content: ${v}; }`))
  })
})

// Align items
Object.entries(ALIGN_MAP).forEach(([k, v]) => {
  reg(`align-items-${k}`, 'utilities', `.align-items-${k} { align-items: ${v}; }`)
  BREAKPOINTS.forEach(bp => {
    if (bp === 'xs') return
    reg(`align-items-${bp}-${k}`, 'utilities',
      mq(bp, `.align-items-${bp}-${k} { align-items: ${v}; }`))
  })
})

// Position
;['static','relative','absolute','fixed','sticky'].forEach(v => {
  reg(`position-${v}`, 'utilities', `.position-${v} { position: ${v}; }`)
  reg(`!position-${v}`, 'utilities', `.\\!position-${v} { position: ${v} !important; }`)
})

// Overflow
;['auto','hidden','visible','scroll'].forEach(v => {
  reg(`overflow-${v}`, 'utilities', `.overflow-${v} { overflow: ${v}; }`)
  reg(`!overflow-${v}`, 'utilities', `.\\!overflow-${v} { overflow: ${v} !important; }`)
})

// Opacity
Object.entries(OPACITY_SCALE).forEach(([k, v]) => {
  reg(`opacity-${k}`, 'utilities', `.opacity-${k} { opacity: ${v}; }`)
  reg(`!opacity-${k}`, 'utilities', `.\\!opacity-${k} { opacity: ${v} !important; }`)
})

// Visibility
reg('visible',    'utilities', '.visible { visibility: visible; }')
reg('invisible',  'utilities', '.invisible { visibility: hidden; }')
reg('!visible',   'utilities', '.\\!visible { visibility: visible !important; }')
reg('!invisible', 'utilities', '.\\!invisible { visibility: hidden !important; }')

// Shadow
reg('shadow',      'utilities', '.shadow { box-shadow: var(--st-shadow); }')
reg('shadow-sm',   'utilities', '.shadow-sm { box-shadow: var(--st-shadow-sm); }')
reg('shadow-lg',   'utilities', '.shadow-lg { box-shadow: var(--st-shadow-lg); }')
reg('shadow-none', 'utilities', '.shadow-none { box-shadow: none; }')

// Z-index
Object.entries(Z_SCALE).forEach(([k, v]) => {
  reg(`z-${k}`, 'utilities', `.z-${k} { z-index: ${v}; }`)
})

// Cursor
CURSOR_VALUES.forEach(v => {
  reg(`cursor-${v}`, 'utilities', `.cursor-${v} { cursor: ${v}; }`)
})

// Object fit
OBJECT_FIT.forEach(v => {
  reg(`object-fit-${v}`, 'utilities', `.object-fit-${v} { object-fit: ${v}; }`)
})

// Transitions
reg('transition', 'utilities', `.transition {
  transition-property: color, background-color, border-color, box-shadow, opacity, transform, visibility;
  transition-duration: var(--st-duration, 200ms);
  transition-timing-function: var(--st-easing, cubic-bezier(0.4, 0, 0.2, 1));
}`)
reg('transition-fast', 'utilities', `.transition-fast {
  transition-property: color, background-color, border-color, box-shadow, opacity, transform, visibility;
  transition-duration: var(--st-duration-fast, 100ms);
  transition-timing-function: var(--st-easing, cubic-bezier(0.4, 0, 0.2, 1));
}`)
reg('transition-slow', 'utilities', `.transition-slow {
  transition-property: color, background-color, border-color, box-shadow, opacity, transform, visibility;
  transition-duration: var(--st-duration-slow, 400ms);
  transition-timing-function: var(--st-easing, cubic-bezier(0.4, 0, 0.2, 1));
}`)
reg('transition-none', 'utilities', '.transition-none { transition: none; }')

// Easing
Object.entries(EASE_MAP).forEach(([k, v]) => {
  reg(`ease-${k}`, 'utilities', `.ease-${k} { transition-timing-function: ${v}; }`)
})

// ─── Grid — cols ─────────────────────────────────────────────────────
// 12 column system — matches Bootstrap exactly
// col-xs-* = col-* (xs is default, no media query needed)

for (let n = 1; n <= 12; n++) {
  // 4 decimal places — browser-precise, ~30% fewer chars than 8dp
  const pct     = ((n / 12) * 100).toFixed(4).replace(/\.?0+$/, '') + '%'
  // xs/base cols keep max-width:100% (same layer as .row>*, needs explicit override)
  const colBase = `flex: 0 0 auto; width: ${pct}; max-width: 100%;`
  // breakpoint cols drop max-width:100% — higher layer already beats .row>* without it
  const colBp   = `flex: 0 0 auto; width: ${pct};`

  reg(`col-${n}`,    'components', `.col-${n}    { ${colBase} }`)
  reg(`col-xs-${n}`, 'components', `.col-xs-${n} { ${colBase} }`)

  Object.keys(BP_VALUES).forEach(bp => {
    reg(`col-${bp}-${n}`, 'components',
      mq(bp, `.col-${bp}-${n} { ${colBp} }`))
  })
}

// Auto width columns
reg('col',      'components', `.col      { flex: 1 0 0%; }`)
reg('col-auto', 'components', `.col-auto { flex: 0 0 auto; width: auto; max-width: 100%; }`)

// Equal width at specific breakpoints
Object.keys(BP_VALUES).forEach(bp => {
  reg(`col-${bp}`,      'components', mq(bp, `.col-${bp}      { flex: 1 0 0%; }`))
  reg(`col-${bp}-auto`, 'components', mq(bp, `.col-${bp}-auto { flex: 0 0 auto; width: auto; max-width: 100%; }`))
})

// ─── Grid — row ──────────────────────────────────────────────────────
// Full Bootstrap-equivalent row with gutter support

reg('row', 'components', `.row {
  --st-gutter-x: 1.5rem;
  --st-gutter-y: 0;
  display:        flex;
  flex-wrap:      wrap;
  margin-top:     calc(-1 * var(--st-gutter-y));
  margin-right:   calc(-0.5 * var(--st-gutter-x));
  margin-left:    calc(-0.5 * var(--st-gutter-x));
}

.row > * {
  flex-shrink:   0;
  width:         100%;
  max-width:     100%;
  padding-right: calc(var(--st-gutter-x) * 0.5);
  padding-left:  calc(var(--st-gutter-x) * 0.5);
  margin-top:    var(--st-gutter-y);
}`)

// Gutter utilities — g-0 through g-5
const GUTTER_SCALE = { '0':'0', '1':'0.25rem', '2':'0.5rem', '3':'1rem', '4':'1.5rem', '5':'3rem' }

Object.entries(GUTTER_SCALE).forEach(([k, v]) => {
  // g-* — both axes
  reg(`g-${k}`,  'utilities', `.g-${k}  { --st-gutter-x: ${v}; --st-gutter-y: ${v}; }`)
  // gx-* — horizontal only
  reg(`gx-${k}`, 'utilities', `.gx-${k} { --st-gutter-x: ${v}; }`)
  // gy-* — vertical only
  reg(`gy-${k}`, 'utilities', `.gy-${k} { --st-gutter-y: ${v}; }`)

  // Responsive gutter variants
  Object.keys(BP_VALUES).forEach(bp => {
    reg(`g-${bp}-${k}`,  'utilities', mq(bp, `.g-${bp}-${k}  { --st-gutter-x: ${v}; --st-gutter-y: ${v}; }`))
    reg(`gx-${bp}-${k}`, 'utilities', mq(bp, `.gx-${bp}-${k} { --st-gutter-x: ${v}; }`))
    reg(`gy-${bp}-${k}`, 'utilities', mq(bp, `.gy-${bp}-${k} { --st-gutter-y: ${v}; }`))
  })
})

// ─── Grid — container ────────────────────────────────────────────────
// Bootstrap-equivalent responsive containers with correct max-widths
// Bootstrap breakpoint max-widths:
//   sm  (≥576px)  → 540px
//   md  (≥768px)  → 720px
//   lg  (≥992px)  → 960px
//   xl  (≥1200px) → 1140px
//   xxl (≥1400px) → 1320px

const CONTAINER_MAX = {
  sm:  '540px',
  md:  '720px',
  lg:  '960px',
  xl:  '1140px',
  xxl: '1320px',
}

const CONTAINER_BASE = `
  width:         100%;
  padding-right: calc(var(--st-gutter-x, 1.5rem) * 0.5);
  padding-left:  calc(var(--st-gutter-x, 1.5rem) * 0.5);
  margin-right:  auto;
  margin-left:   auto;`

// .container — responsive, grows with breakpoints
reg('container', 'components',
  `.container {${CONTAINER_BASE}
}
@media (min-width: 576px)  { .container { max-width: 540px;  } }
@media (min-width: 768px)  { .container { max-width: 720px;  } }
@media (min-width: 992px)  { .container { max-width: 960px;  } }
@media (min-width: 1200px) { .container { max-width: 1140px; } }
@media (min-width: 1400px) { .container { max-width: 1320px; } }`)

// .container-fluid — always 100%
reg('container-fluid', 'components', `.container-fluid {${CONTAINER_BASE}
}`)

// .container-{bp} — 100% below breakpoint, max-width above
// e.g. container-md is full width on xs/sm, then 720px at md, 960px at lg etc.
const BP_ORDER = ['sm', 'md', 'lg', 'xl', 'xxl']

BP_ORDER.forEach((bp, i) => {
  // Start with base styles
  let css = `.container-${bp} {${CONTAINER_BASE}
}\n`
  // Add max-widths from this breakpoint upward
  BP_ORDER.slice(i).forEach(activeBp => {
    css += `@media (min-width: ${BP_VALUES[activeBp]}) { .container-${bp} { max-width: ${CONTAINER_MAX[activeBp]}; } }\n`
  })
  reg(`container-${bp}`, 'components', css.trim())
})

// ─── Components — Card ───────────────────────────────────────────────

reg('card', 'components', `.card {
  position:       relative;
  display:        flex;
  flex-direction: column;
  height:         100%;
  min-width:      0;
  word-wrap:      break-word;
  background:     var(--st-bg);
  border:         1px solid var(--st-border);
  border-radius:  var(--st-border-radius);
  box-shadow:     var(--st-shadow-sm);
}`)

reg('card-body', 'components', `.card-body {
  flex:    1 1 auto;
  padding: 1rem;
}`)

reg('card-header', 'components', `.card-header {
  padding:          0.75rem 1rem;
  background-color: var(--st-bg-secondary);
  border-bottom:    1px solid var(--st-border);
  border-radius:    calc(var(--st-border-radius) - 1px) calc(var(--st-border-radius) - 1px) 0 0;
}`)

reg('card-footer', 'components', `.card-footer {
  padding:          0.75rem 1rem;
  background-color: var(--st-bg-secondary);
  border-top:       1px solid var(--st-border);
  border-radius:    0 0 calc(var(--st-border-radius) - 1px) calc(var(--st-border-radius) - 1px);
}`)

reg('card-title', 'components', `.card-title {
  margin-bottom: 0.5rem;
  font-size:     1.125rem;
  font-weight:   600;
  color:         var(--st-text);
}`)

reg('card-subtitle', 'components', `.card-subtitle {
  margin-top:    -0.25rem;
  margin-bottom: 0;
  color:         var(--st-text-muted);
  font-size:     0.875rem;
}`)

reg('card-text', 'components', `.card-text {
  font-size:     0.9375rem;
  color:         var(--st-text-muted);
  line-height:   1.6;
  margin-bottom: 0.75rem;
}

.card-text:last-child { margin-bottom: 0; }`)

reg('card-link', 'components', `.card-link {
  color:           var(--st-primary);
  text-decoration: none;
}

.card-link:hover { color: var(--st-primary-hover); text-decoration: underline; }`)

reg('card-img-top', 'components', `.card-img-top {
  width:                   100%;
  border-top-left-radius:  calc(var(--st-border-radius) - 1px);
  border-top-right-radius: calc(var(--st-border-radius) - 1px);
  object-fit:              cover;
  display:                 block;
}`)

reg('card-img-bottom', 'components', `.card-img-bottom {
  width:                      100%;
  border-bottom-left-radius:  calc(var(--st-border-radius) - 1px);
  border-bottom-right-radius: calc(var(--st-border-radius) - 1px);
  object-fit:                 cover;
  display:                    block;
}`)

reg('card-img', 'components', `.card-img {
  width:         100%;
  border-radius: calc(var(--st-border-radius) - 1px);
  object-fit:    cover;
  display:       block;
}`)

reg('card-img-overlay', 'components', `.card-img-overlay {
  --st-card-overlay-color: #fff;
  position:      absolute;
  inset:         0;
  padding:       1rem;
  border-radius: calc(var(--st-border-radius) - 1px);
  background:    rgba(0, 0, 0, 0.45);
  color:         var(--st-card-overlay-color);
}`)

reg('card-group', 'components', `.card-group {
  display:    flex;
  flex-flow:  row wrap;
}

.card-group > .card {
  flex:          1 0 0%;
  margin-bottom: 0;
}

.card-group > .card + .card {
  margin-left:                 0;
  border-left:                 0;
  border-top-left-radius:      0;
  border-bottom-left-radius:   0;
}

.card-group > .card:not(:last-child) {
  border-top-right-radius:    0;
  border-bottom-right-radius: 0;
}`)

// ─── Components — Alert ──────────────────────────────────────────────

const ALERT_COLORS = {
  primary:   { bg: 'rgba(13,110,253,0.1)',  border: 'rgba(13,110,253,0.3)',  text: '#084298'  },
  secondary: { bg: 'rgba(108,117,125,0.1)', border: 'rgba(108,117,125,0.3)', text: '#41464b'  },
  success:   { bg: 'rgba(25,135,84,0.1)',   border: 'rgba(25,135,84,0.3)',   text: '#0a3622'  },
  danger:    { bg: 'rgba(220,53,69,0.1)',   border: 'rgba(220,53,69,0.3)',   text: '#842029'  },
  warning:   { bg: 'rgba(255,193,7,0.1)',   border: 'rgba(255,193,7,0.3)',   text: '#664d03'  },
  info:      { bg: 'rgba(13,202,240,0.1)',  border: 'rgba(13,202,240,0.3)',  text: '#055160'  },
  light:     { bg: 'rgba(248,249,250,0.5)', border: 'rgba(248,249,250,0.8)', text: '#636464'  },
  dark:      { bg: 'rgba(33,37,41,0.1)',    border: 'rgba(33,37,41,0.3)',    text: '#141619'  },
}

reg('alert', 'components', `.alert {
  position:      relative;
  padding:       1rem 1rem;
  margin-bottom: 1rem;
  border:        1px solid transparent;
  border-radius: var(--st-border-radius);
  font-size:     0.9375rem;
  line-height:   1.5;
}`)

Object.entries(ALERT_COLORS).forEach(([color, { bg, border, text }]) => {
  reg(`alert-${color}`, 'components', `.alert-${color} {
  background-color: ${bg};
  border-color:     ${border};
  color:            ${text};
}`)
})

reg('alert-dismissible', 'components', `.alert-dismissible {
  padding-right: 3rem;
}

.alert-dismissible .btn-close {
  position: absolute;
  top:      0;
  right:    0;
  z-index:  2;
  padding:  1.25rem 1rem;
}`)

reg('alert-heading', 'components', `.alert-heading {
  color:       inherit;
  font-weight: 600;
  font-size:   1.1rem;
  margin-top:  0;
}`)

reg('alert-link', 'components', `.alert-link {
  font-weight: 700;
  color:       inherit;
}`)

// ─── Components — Badge ──────────────────────────────────────────────

reg('badge', 'components', `.badge {
  --st-badge-color: #fff;
  display:          inline-block;
  padding:          0.35em 0.65em;
  font-size:        0.75em;
  font-weight:      700;
  line-height:      1;
  color:            var(--st-badge-color);
  text-align:       center;
  white-space:      nowrap;
  vertical-align:   baseline;
  border-radius:    var(--st-border-radius);
  background-color: var(--st-secondary);
}`)

const BADGE_COLORS = ['primary','secondary','success','danger','warning','info','light','dark']
BADGE_COLORS.forEach(color => {
  const defaultFg = ['warning','info','light'].includes(color) ? 'var(--st-dark)' : '#fff'
  reg(`badge-${color}`, 'components', `.badge-${color} {
  --st-badge-color: ${defaultFg};
  background-color: var(--st-${color});
  color:            var(--st-badge-color);
}`)
})

reg('badge-pill', 'components', `.badge-pill { border-radius: 999px; }`)
reg('rounded-pill', 'utilities', `.rounded-pill { border-radius: 999px; }`)

// ─── Components — Label (Bootstrap 3 aliases) ────────────────────────
// .label and .label-{color} are Bootstrap 3's label component.
// Bootstrap 4+ renamed them to .badge / .badge-{color}.
// These are aliases — identical output to their badge equivalents so
// Bootstrap 3 markup works without changes.

reg('label', 'components', `.label {
  --st-badge-color: #fff;
  display:          inline-block;
  padding:          0.35em 0.65em;
  font-size:        0.75em;
  font-weight:      700;
  line-height:      1;
  color:            var(--st-badge-color);
  text-align:       center;
  white-space:      nowrap;
  vertical-align:   baseline;
  border-radius:    var(--st-border-radius);
  background-color: var(--st-secondary);
}`)

const LABEL_COLORS = ['default','primary','secondary','success','info','warning','danger','light','dark']
LABEL_COLORS.forEach(color => {
  const mappedColor = color === 'default' ? 'secondary' : color
  const defaultFg   = ['warning','info','light'].includes(mappedColor) ? 'var(--st-dark)' : '#fff'
  reg(`label-${color}`, 'components', `.label-${color} {
  --st-badge-color: ${defaultFg};
  background-color: var(--st-${mappedColor});
  color:            var(--st-badge-color);
}`)
})

// ─── Components — Buttons ────────────────────────────────────────────

const BTN_COLORS = ['primary','secondary','success','danger','warning','info','light','dark']

BTN_COLORS.forEach(color => {
  const defaultFg = ['warning','info','light'].includes(color) ? 'var(--st-dark)' : '#fff'
  reg(`btn-${color}`, 'components', `.btn-${color} {
  --st-btn-color:       ${defaultFg};
  --st-btn-bg:          var(--st-${color});
  --st-btn-border:      var(--st-${color});
  --st-btn-hover-bg:    var(--st-${color}-hover, color-mix(in srgb, var(--st-${color}) 85%, black));
  --st-btn-hover-border:var(--st-${color}-hover, color-mix(in srgb, var(--st-${color}) 85%, black));
  display:          inline-flex;
  align-items:      center;
  justify-content:  center;
  padding:          0.375rem 0.75rem;
  font-size:        1rem;
  font-weight:      400;
  line-height:      1.5;
  color:            var(--st-btn-color);
  background-color: var(--st-btn-bg);
  border:           1px solid var(--st-btn-border);
  border-radius:    var(--st-border-radius);
  cursor:           pointer;
  text-decoration:  none;
  white-space:      nowrap;
  vertical-align:   middle;
  user-select:      none;
  transition:       color var(--st-duration) var(--st-easing),
                    background-color var(--st-duration) var(--st-easing),
                    border-color var(--st-duration) var(--st-easing),
                    box-shadow var(--st-duration) var(--st-easing);
}

.btn-${color}:hover {
  background-color: var(--st-btn-hover-bg);
  border-color:     var(--st-btn-hover-border);
  color:            var(--st-btn-color);
}

.btn-${color}:focus-visible {
  box-shadow: var(--st-focus-ring);
  outline:    none;
}

.btn-${color}:active {
  transform: scale(0.97);
}`)

  reg(`btn-outline-${color}`, 'components', `.btn-outline-${color} {
  --st-btn-outline-color:      var(--st-${color});
  --st-btn-outline-hover-color:${defaultFg};
  --st-btn-outline-hover-bg:   var(--st-${color});
  display:          inline-flex;
  align-items:      center;
  justify-content:  center;
  padding:          0.375rem 0.75rem;
  font-size:        1rem;
  font-weight:      400;
  line-height:      1.5;
  color:            var(--st-btn-outline-color);
  background-color: transparent;
  border:           1px solid var(--st-${color});
  border-radius:    var(--st-border-radius);
  cursor:           pointer;
  text-decoration:  none;
  white-space:      nowrap;
  user-select:      none;
  transition:       color var(--st-duration) var(--st-easing),
                    background-color var(--st-duration) var(--st-easing),
                    box-shadow var(--st-duration) var(--st-easing);
}

.btn-outline-${color}:hover {
  background-color: var(--st-btn-outline-hover-bg);
  color:            var(--st-btn-outline-hover-color);
}

.btn-outline-${color}:focus-visible {
  box-shadow: var(--st-focus-ring);
  outline:    none;
}`)
})

reg('btn-sm', 'components', `.btn-sm {
  padding:       0.25rem 0.5rem;
  font-size:     0.875rem;
  border-radius: calc(var(--st-border-radius) * 0.75);
}`)

reg('btn-lg', 'components', `.btn-lg {
  padding:       0.5rem 1rem;
  font-size:     1.125rem;
  border-radius: calc(var(--st-border-radius) * 1.5);
}`)

reg('btn-close', 'components', `.btn-close {
  display:          inline-flex;
  align-items:      center;
  justify-content:  center;
  width:            1.25em;
  height:           1.25em;
  padding:          0.25em;
  background:       none;
  border:           none;
  border-radius:    var(--st-border-radius);
  cursor:           pointer;
  opacity:          0.5;
  font-size:        1rem;
  color:            var(--st-text);
  transition:       opacity var(--st-duration) var(--st-easing);
}

.btn-close::before {
  content: '×';
  font-size: 1.5em;
  line-height: 1;
}

.btn-close:hover { opacity: 1; }`)

// ─── Components — Button Group ───────────────────────────────────────

reg('btn-group', 'components', `.btn-group {
  position:       relative;
  display:        inline-flex;
  vertical-align: middle;
}

.btn-group > [class*="btn-"]:not(:first-child) {
  border-top-left-radius:    0;
  border-bottom-left-radius: 0;
  margin-left: -1px;
}

.btn-group > [class*="btn-"]:not(:last-child) {
  border-top-right-radius:    0;
  border-bottom-right-radius: 0;
}`)

reg('btn-group-sm', 'components', `.btn-group-sm > [class*="btn-"] {
  padding:       0.25rem 0.5rem;
  font-size:     0.875rem;
  border-radius: calc(var(--st-border-radius) * 0.75);
}`)

reg('btn-group-lg', 'components', `.btn-group-lg > [class*="btn-"] {
  padding:       0.5rem 1rem;
  font-size:     1.125rem;
  border-radius: calc(var(--st-border-radius) * 1.5);
}`)

reg('btn-toolbar', 'components', `.btn-toolbar {
  display:     flex;
  flex-wrap:   wrap;
  gap:         0.5rem;
  align-items: center;
}`)

// ─── Components — Navbar ─────────────────────────────────────────────

reg('navbar', 'components', `.navbar {
  position:        relative;
  display:         flex;
  flex-wrap:       wrap;
  align-items:     center;
  justify-content: space-between;
  padding:         0.75rem 1rem;
  background:      var(--st-bg);
  border-bottom:   1px solid var(--st-border);
}`)

reg('navbar-brand', 'components', `.navbar-brand {
  display:         inline-flex;
  align-items:     center;
  padding:         0.25rem 0;
  margin-right:    1rem;
  font-size:       1.25rem;
  font-weight:     700;
  color:           var(--st-text);
  text-decoration: none;
  white-space:     nowrap;
}

.navbar-brand:hover { color: var(--st-primary); }`)

reg('navbar-nav', 'components', `.navbar-nav {
  display:        flex;
  flex-direction: column;
  padding-left:   0;
  margin-bottom:  0;
  list-style:     none;
}

.navbar-nav .nav-link {
  padding-right: 0;
  padding-left:  0;
}`)

reg('navbar-toggler', 'components', `.navbar-toggler {
  padding:          0.25rem 0.75rem;
  font-size:        1.25rem;
  line-height:      1;
  background:       transparent;
  border:           1px solid var(--st-border);
  border-radius:    var(--st-border-radius);
  cursor:           pointer;
  color:            var(--st-text);
  transition:       box-shadow var(--st-duration) var(--st-easing);
}

.navbar-toggler:focus-visible { box-shadow: var(--st-focus-ring); }`)

reg('navbar-toggler-icon', 'components', `.navbar-toggler-icon {
  display:    inline-block;
  width:      1.5em;
  height:     1.5em;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba%2833, 37, 41, 0.75%29' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e");
  background-repeat:   no-repeat;
  background-position: center;
  background-size:     100%;
  vertical-align:      middle;
}`)

reg('navbar-collapse', 'components', `.navbar-collapse {
  flex-basis: 100%;
  flex-grow:  1;
  align-items: center;
}`)

reg('navbar-text', 'components', `.navbar-text {
  padding-top:    0.5rem;
  padding-bottom: 0.5rem;
  color:          var(--st-text-muted);
}`)

// navbar-expand-* — at breakpoint navbar-nav becomes horizontal
Object.keys(BP_VALUES).forEach(bp => {
  reg(`navbar-expand-${bp}`, 'components', mq(bp, `.navbar-expand-${bp} {
  flex-wrap: nowrap;
  justify-content: flex-start;
}

.navbar-expand-${bp} .navbar-nav {
  flex-direction: row;
}

.navbar-expand-${bp} .navbar-nav .nav-link {
  padding-right: 0.5rem;
  padding-left:  0.5rem;
}

.navbar-expand-${bp} .navbar-collapse {
  display:    flex;
  flex-basis: auto;
}

.navbar-expand-${bp} .navbar-toggler {
  display: none;
}`))
})

// ─── Components — Nav ────────────────────────────────────────────────

reg('nav', 'components', `.nav {
  display:     flex;
  flex-wrap:   wrap;
  padding:     0;
  margin:      0;
  list-style:  none;
}`)

reg('nav-item', 'components', `.nav-item { flex-shrink: 0; }`)

reg('nav-link', 'components', `.nav-link {
  display:         block;
  padding:         0.5rem 1rem;
  font-size:       0.9375rem;
  color:           var(--st-primary);
  text-decoration: none;
  background:      none;
  border:          0;
  cursor:          pointer;
  transition:      color var(--st-duration) var(--st-easing),
                   background-color var(--st-duration) var(--st-easing);
}

.nav-link:hover { color: var(--st-primary-hover); }

.nav-link.active {
  color:       var(--st-text);
  font-weight: 600;
}

.nav-link.disabled {
  color:          var(--st-text-muted);
  pointer-events: none;
  cursor:         default;
}`)

reg('nav-tabs', 'components', `.nav-tabs {
  border-bottom: 2px solid var(--st-border);
}

.nav-tabs .nav-link {
  margin-bottom:              -2px;
  border:                     2px solid transparent;
  border-top-left-radius:     var(--st-border-radius);
  border-top-right-radius:    var(--st-border-radius);
  color:                      var(--st-text-muted);
}

.nav-tabs .nav-link:hover {
  color:            var(--st-text);
  border-color:     var(--st-border) var(--st-border) transparent;
}

.nav-tabs .nav-link.active {
  color:            var(--st-text);
  background-color: var(--st-bg);
  border-color:     var(--st-border) var(--st-border) var(--st-bg);
}`)

reg('nav-pills', 'components', `.nav-pills .nav-link {
  border-radius: var(--st-border-radius);
  color:         var(--st-text-muted);
}

.nav-pills .nav-link:hover {
  background-color: var(--st-bg-secondary);
  color:            var(--st-text);
}

.nav-pills .nav-link.active {
  --st-nav-pills-active-color: #fff;
  background-color: var(--st-primary);
  color:            var(--st-nav-pills-active-color);
}`)

reg('nav-fill', 'components', `.nav-fill .nav-item { flex: 1 1 auto; text-align: center; }`)
reg('nav-justified', 'components', `.nav-justified .nav-item { flex-basis: 0; flex-grow: 1; text-align: center; }`)

reg('tab-content', 'components', `.tab-content > .tab-pane { display: none; }
.tab-content > .tab-pane.active { display: block; }`)

// ─── Components — Table ──────────────────────────────────────────────

reg('table', 'components', `.table {
  width:          100%;
  margin-bottom:  1rem;
  color:          var(--st-text);
  vertical-align: top;
  border-color:   var(--st-border);
  border-collapse: collapse;
}

.table > thead {
  vertical-align: bottom;
}

.table > :not(caption) > * > * {
  padding:        0.75rem;
  border-bottom:  1px solid var(--st-border);
}

.table > thead > tr > th {
  font-weight:      600;
  font-size:        0.8125rem;
  text-transform:   uppercase;
  letter-spacing:   0.04em;
  color:            var(--st-text-muted);
  background-color: var(--st-bg-secondary);
  border-bottom:    2px solid var(--st-border);
}

.table > tbody > tr:last-child > * { border-bottom: none; }`)

reg('table-striped', 'components', `.table-striped > tbody > tr:nth-child(odd) > * {
  background-color: var(--st-bg-secondary);
}`)

reg('table-hover', 'components', `.table-hover > tbody > tr:hover > * {
  background-color: color-mix(in srgb, var(--st-primary) 5%, var(--st-bg));
}`)

reg('table-bordered', 'components', `.table-bordered > :not(caption) > * {
  border-width: 1px 0;
}

.table-bordered > :not(caption) > * > * {
  border-width: 0 1px;
  border-style: solid;
  border-color: var(--st-border);
}`)

reg('table-borderless', 'components', `.table-borderless > :not(caption) > * > * { border-bottom: none; }`)

reg('table-sm', 'components', `.table-sm > :not(caption) > * > * { padding: 0.35rem 0.5rem; }`)

reg('table-responsive', 'components', `.table-responsive {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}`)

reg('caption-top', 'components', `.caption-top { caption-side: top; }`)

// ─── Components — Form ───────────────────────────────────────────────

reg('form-label', 'components', `.form-label {
  display:       block;
  margin-bottom: 0.375rem;
  font-size:     0.9375rem;
  font-weight:   500;
  color:         var(--st-text);
}`)

reg('form-control', 'components', `.form-control {
  display:          block;
  width:            100%;
  padding:          0.375rem 0.75rem;
  font-size:        1rem;
  font-weight:      400;
  line-height:      1.5;
  color:            var(--st-text);
  background-color: var(--st-bg);
  border:           1px solid var(--st-border);
  border-radius:    var(--st-border-radius);
  outline:          none;
  transition:       border-color var(--st-duration) var(--st-easing),
                    box-shadow var(--st-duration) var(--st-easing);
  appearance:       none;
}

.form-control::placeholder { color: var(--st-text-muted); opacity: 0.7; }

.form-control:focus {
  border-color: var(--st-primary);
  box-shadow:   var(--st-focus-ring);
}

.form-control:disabled,
.form-control[readonly] {
  background-color: var(--st-bg-secondary);
  opacity: 0.7;
}`)

reg('form-control-sm', 'components', `.form-control-sm {
  min-height:    calc(1.5em + 0.5rem + 2px);
  padding:       0.25rem 0.5rem;
  font-size:     0.875rem;
  border-radius: calc(var(--st-border-radius) * 0.75);
}`)

reg('form-control-lg', 'components', `.form-control-lg {
  min-height:    calc(1.5em + 1rem + 2px);
  padding:       0.5rem 1rem;
  font-size:     1.125rem;
  border-radius: calc(var(--st-border-radius) * 1.5);
}`)

reg('form-select', 'components', `.form-select {
  display:          block;
  width:            100%;
  padding:          0.375rem 2.25rem 0.375rem 0.75rem;
  font-size:        1rem;
  font-weight:      400;
  line-height:      1.5;
  color:            var(--st-text);
  background-color: var(--st-bg);
  border:           1px solid var(--st-border);
  border-radius:    var(--st-border-radius);
  outline:          none;
  cursor:           pointer;
  appearance:       none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-repeat:   no-repeat;
  background-position: right 0.75rem center;
  background-size:     16px 12px;
  transition:       border-color var(--st-duration) var(--st-easing),
                    box-shadow var(--st-duration) var(--st-easing);
}

.form-select:focus {
  border-color: var(--st-primary);
  box-shadow:   var(--st-focus-ring);
}

.form-select:disabled {
  background-color: var(--st-bg-secondary);
  opacity:          0.7;
}`)

reg('form-check', 'components', `.form-check {
  display:       block;
  min-height:    1.5rem;
  padding-left:  1.75rem;
  margin-bottom: 0.25rem;
}`)

reg('form-check-input', 'components', `.form-check-input {
  float:            left;
  margin-left:      -1.75rem;
  width:            1.125rem;
  height:           1.125rem;
  margin-top:       0.1875rem;
  background-color: var(--st-bg);
  border:           1px solid var(--st-border);
  border-radius:    0.25rem;
  appearance:       none;
  cursor:           pointer;
  transition:       background-color var(--st-duration) var(--st-easing),
                    border-color var(--st-duration) var(--st-easing),
                    box-shadow var(--st-duration) var(--st-easing);
}

.form-check-input[type="radio"] { border-radius: 50%; }

.form-check-input:checked {
  background-color: var(--st-primary);
  border-color:     var(--st-primary);
}

.form-check-input:focus { box-shadow: var(--st-focus-ring); }`)

reg('form-check-label', 'components', `.form-check-label {
  font-size: 0.9375rem;
  color:     var(--st-text);
  cursor:    pointer;
}`)

reg('form-check-inline', 'components', `.form-check-inline {
  display:     inline-flex;
  align-items: center;
  margin-right: 1rem;
}`)

reg('form-switch', 'components', `.form-switch {
  padding-left: 2.5rem;
}

.form-switch .form-check-input {
  width:         2rem;
  border-radius: 999px;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='rgba%280,0,0,.25%29'/%3e%3c/svg%3e");
  background-repeat:   no-repeat;
  background-position: left center;
  transition:          background-position var(--st-duration) var(--st-easing);
}

.form-switch .form-check-input:checked {
  background-position: right center;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='%23fff'/%3e%3c/svg%3e");
}`)

reg('form-range', 'components', `.form-range {
  width:      100%;
  height:     1.5rem;
  padding:    0;
  cursor:     pointer;
  appearance: none;
  background: transparent;
}

.form-range::-webkit-slider-runnable-track {
  height:        0.5rem;
  border-radius: 999px;
  background:    var(--st-border);
}

.form-range::-webkit-slider-thumb {
  width:         1rem;
  height:        1rem;
  margin-top:    -0.25rem;
  background:    var(--st-primary);
  border:        none;
  border-radius: 50%;
  appearance:    none;
}`)

reg('form-text', 'components', `.form-text {
  display:    block;
  margin-top: 0.25rem;
  font-size:  0.875rem;
  color:      var(--st-text-muted);
}`)

reg('form-floating', 'components', `.form-floating {
  position: relative;
}

.form-floating > .form-control,
.form-floating > .form-select {
  height:       calc(3.5rem + 2px);
  line-height:  1.25;
  padding:      1rem 0.75rem;
}

.form-floating > label {
  position:       absolute;
  top:            0;
  left:           0;
  width:          100%;
  height:         100%;
  padding:        1rem 0.75rem;
  pointer-events: none;
  color:          var(--st-text-muted);
  transition:     opacity var(--st-duration) var(--st-easing),
                  transform var(--st-duration) var(--st-easing);
  transform-origin: 0 0;
}

.form-floating > .form-control:focus ~ label,
.form-floating > .form-control:not(:placeholder-shown) ~ label {
  opacity:   0.65;
  transform: scale(0.85) translateY(-0.5rem) translateX(0.15rem);
}`)

reg('input-group', 'components', `.input-group {
  position:        relative;
  display:         flex;
  flex-wrap:       wrap;
  align-items:     stretch;
  width:           100%;
}

.input-group > .form-control,
.input-group > .form-select {
  position:  relative;
  flex:      1 1 auto;
  width:     1%;
  min-width: 0;
}

.input-group > .form-control:not(:last-child),
.input-group > .form-select:not(:last-child) {
  border-top-right-radius:    0;
  border-bottom-right-radius: 0;
}

.input-group > .form-control:not(:first-child),
.input-group > .form-select:not(:first-child) {
  border-top-left-radius:    0;
  border-bottom-left-radius: 0;
  margin-left:               -1px;
}`)

reg('input-group-text', 'components', `.input-group-text {
  display:          flex;
  align-items:      center;
  padding:          0.375rem 0.75rem;
  font-size:        1rem;
  font-weight:      400;
  line-height:      1.5;
  color:            var(--st-text-muted);
  text-align:       center;
  white-space:      nowrap;
  background-color: var(--st-bg-secondary);
  border:           1px solid var(--st-border);
  border-radius:    var(--st-border-radius);
}`)

reg('input-group-sm', 'components', `.input-group-sm > .form-control,
.input-group-sm > .form-select,
.input-group-sm > .input-group-text,
.input-group-sm > [class*="btn-"] {
  padding:       0.25rem 0.5rem;
  font-size:     0.875rem;
  border-radius: calc(var(--st-border-radius) * 0.75);
}`)

reg('input-group-lg', 'components', `.input-group-lg > .form-control,
.input-group-lg > .form-select,
.input-group-lg > .input-group-text,
.input-group-lg > [class*="btn-"] {
  padding:       0.5rem 1rem;
  font-size:     1.125rem;
  border-radius: calc(var(--st-border-radius) * 1.5);
}`)

reg('valid-feedback',   'components', `.valid-feedback   { display: none; font-size: 0.875rem; color: var(--st-success); margin-top: 0.25rem; }`)
reg('invalid-feedback', 'components', `.invalid-feedback { display: none; font-size: 0.875rem; color: var(--st-danger);  margin-top: 0.25rem; }`)
reg('was-validated', 'components', `.was-validated .form-control:valid   { border-color: var(--st-success); }
.was-validated .form-control:invalid { border-color: var(--st-danger); }
.was-validated .form-control:valid   ~ .valid-feedback   { display: block; }
.was-validated .form-control:invalid ~ .invalid-feedback { display: block; }`)

// ─── Components — List Group ─────────────────────────────────────────

reg('list-group', 'components', `.list-group {
  display:       flex;
  flex-direction: column;
  padding-left:  0;
  margin-bottom: 0;
  border-radius: var(--st-border-radius);
  overflow:      hidden;
}`)

reg('list-group-item', 'components', `.list-group-item {
  position:         relative;
  display:          block;
  padding:          0.75rem 1rem;
  color:            var(--st-text);
  background-color: var(--st-bg);
  border:           1px solid var(--st-border);
  margin-bottom:    -1px;
}

.list-group-item:first-child {
  border-top-left-radius:  inherit;
  border-top-right-radius: inherit;
}

.list-group-item:last-child {
  border-bottom-left-radius:  inherit;
  border-bottom-right-radius: inherit;
  margin-bottom: 0;
}

.list-group-item.active {
  --st-list-group-active-color: #fff;
  z-index:          2;
  background-color: var(--st-primary);
  border-color:     var(--st-primary);
  color:            var(--st-list-group-active-color);
}

.list-group-item.disabled {
  color:          var(--st-text-muted);
  pointer-events: none;
  background-color: var(--st-bg-secondary);
}`)

reg('list-group-item-action', 'components', `.list-group-item-action {
  width:           100%;
  color:           var(--st-text);
  text-align:      inherit;
  text-decoration: none;
  cursor:          pointer;
  transition:      background-color var(--st-duration) var(--st-easing),
                   color var(--st-duration) var(--st-easing);
}

.list-group-item-action:hover,
.list-group-item-action:focus {
  background-color: var(--st-bg-secondary);
  color:            var(--st-text);
  z-index:          1;
}`)

reg('list-group-flush', 'components', `.list-group-flush {
  border-radius: 0;
}

.list-group-flush .list-group-item {
  border-right:  0;
  border-left:   0;
  border-radius: 0;
}

.list-group-flush > .list-group-item:first-child { border-top: 0; }
.list-group-flush > .list-group-item:last-child  { border-bottom: 0; }`)

reg('list-group-horizontal', 'components', `.list-group-horizontal {
  flex-direction: row;
}

.list-group-horizontal .list-group-item {
  border-bottom: 1px solid var(--st-border);
  margin-bottom: 0;
  margin-right:  -1px;
}

.list-group-horizontal .list-group-item:first-child {
  border-top-left-radius:     var(--st-border-radius);
  border-bottom-left-radius:  var(--st-border-radius);
  border-top-right-radius:    0;
}

.list-group-horizontal .list-group-item:last-child {
  border-top-right-radius:    var(--st-border-radius);
  border-bottom-right-radius: var(--st-border-radius);
  border-bottom-left-radius:  0;
  margin-right:               0;
}`)

// ─── Components — Progress ───────────────────────────────────────────

reg('progress', 'components', `.progress {
  display:          flex;
  height:           0.75rem;
  overflow:         hidden;
  background-color: var(--st-bg-secondary);
  border:           1px solid var(--st-border);
  border-radius:    999px;
}`)

reg('progress-bar', 'components', `.progress-bar {
  --st-progress-bar-color: #fff;
  display:          flex;
  flex-direction:   column;
  justify-content:  center;
  overflow:         hidden;
  color:            var(--st-progress-bar-color);
  text-align:       center;
  white-space:      nowrap;
  background-color: var(--st-primary);
  transition:       width var(--st-duration-slow) var(--st-easing);
  font-size:        0.7rem;
}

.progress-bar-striped {
  background-image: linear-gradient(
    45deg,
    rgba(255,255,255,0.15) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255,255,255,0.15) 50%,
    rgba(255,255,255,0.15) 75%,
    transparent 75%,
    transparent
  );
  background-size: 1rem 1rem;
}`)

// ─── Components — Spinner ────────────────────────────────────────────

reg('spinner-border', 'components', `.spinner-border {
  display:        inline-block;
  width:          2rem;
  height:         2rem;
  vertical-align: text-bottom;
  border:         0.25em solid var(--st-primary);
  border-right-color: transparent;
  border-radius:  50%;
  animation:      spinner-border 0.75s linear infinite;
}

.spinner-border-sm {
  width:        1rem;
  height:       1rem;
  border-width: 0.2em;
}

@keyframes spinner-border {
  to { transform: rotate(360deg); }
}`)

reg('spinner-grow', 'components', `.spinner-grow {
  display:        inline-block;
  width:          2rem;
  height:         2rem;
  vertical-align: text-bottom;
  background-color: var(--st-primary);
  border-radius:  50%;
  opacity:        0;
  animation:      spinner-grow 0.75s linear infinite;
}

.spinner-grow-sm {
  width:  1rem;
  height: 1rem;
}

@keyframes spinner-grow {
  0%   { transform: scale(0); }
  50%  { opacity: 0.5; }
  100% { opacity: 0; transform: scale(1); }
}`)

// ─── Components — Breadcrumb ─────────────────────────────────────────

reg('breadcrumb', 'components', `.breadcrumb {
  display:     flex;
  flex-wrap:   wrap;
  padding:     0;
  margin:      0;
  list-style:  none;
  font-size:   0.875rem;
}`)

reg('breadcrumb-item', 'components', `.breadcrumb-item + .breadcrumb-item {
  padding-left: 0.5rem;
}

.breadcrumb-item + .breadcrumb-item::before {
  float:        left;
  padding-right: 0.5rem;
  color:         var(--st-text-muted);
  content:       "/";
}

.breadcrumb-item.active { color: var(--st-text-muted); }

.breadcrumb-item a {
  color:           var(--st-primary);
  text-decoration: none;
}

.breadcrumb-item a:hover { text-decoration: underline; }`)

// ─── Components — Pagination ─────────────────────────────────────────

reg('pagination', 'components', `.pagination {
  display:     flex;
  padding:     0;
  margin:      0;
  list-style:  none;
  flex-wrap:   wrap;
  gap:         0.25rem;
}`)

reg('page-item', 'components', `.page-item.disabled .page-link {
  color:          var(--st-text-muted);
  pointer-events: none;
  background:     var(--st-bg-secondary);
  border-color:   var(--st-border);
}

.page-item.active .page-link {
  --st-pagination-active-color: #fff;
  background-color: var(--st-primary);
  border-color:     var(--st-primary);
  color:            var(--st-pagination-active-color);
}`)

reg('page-link', 'components', `.page-link {
  display:          flex;
  align-items:      center;
  justify-content:  center;
  padding:          0.375rem 0.75rem;
  min-width:        2.25rem;
  font-size:        0.9375rem;
  color:            var(--st-primary);
  background-color: var(--st-bg);
  border:           1px solid var(--st-border);
  border-radius:    var(--st-border-radius);
  text-decoration:  none;
  cursor:           pointer;
  transition:       color var(--st-duration) var(--st-easing),
                    background-color var(--st-duration) var(--st-easing);
}

.page-link:hover {
  background-color: var(--st-bg-secondary);
  color:            var(--st-primary-hover);
}

.page-link:focus-visible { box-shadow: var(--st-focus-ring); outline: none; }`)

// ─── Components — Modal ──────────────────────────────────────────────
// Modal uses data-st-visible for show/hide — no JavaScript plugin needed
// Toggle: element.setAttribute('data-st-visible', 'true')

reg('modal', 'components', `.modal {
  position:            fixed;
  inset:               0;
  z-index:             var(--st-z-modal, 1050);
  overflow-x:          hidden;
  overflow-y:          auto;
  outline:             0;
  visibility:          hidden;
  opacity:             0;
  overscroll-behavior: contain;
  transition:          opacity var(--st-duration) var(--st-easing),
                       visibility var(--st-duration) var(--st-easing);
}

.modal[data-st-visible="true"] {
  visibility: visible;
  opacity:    1;
}

@keyframes st-modal-shake {
  0%, 100% { transform: translateX(0); }
  25%       { transform: translateX(-5px); }
  75%       { transform: translateX(5px); }
}

.modal[data-st-shake="true"] .modal-dialog {
  animation: st-modal-shake 0.25s var(--st-easing);
}

body:has(.modal[aria-hidden="false"]) {
  overflow:         hidden;
  scrollbar-gutter: stable;
}`)

reg('modal-backdrop', 'components', `.modal-backdrop {
  position:   fixed;
  inset:      0;
  z-index:    var(--st-z-modal-backdrop, 1040);
  background: rgba(0, 0, 0, 0.5);
  visibility: hidden;
  opacity:    0;
  transition: opacity var(--st-duration) var(--st-easing),
              visibility var(--st-duration) var(--st-easing);
}

.modal-backdrop[data-st-visible="true"] {
  visibility: visible;
  opacity:    1;
}`)

reg('modal-dialog', 'components', `.modal-dialog {
  position:       relative;
  width:          auto;
  max-width:      500px;
  margin:         1.75rem auto;
  pointer-events: none;
  transform:      translateY(-1.5rem);
  transition:     transform var(--st-duration) var(--st-easing);
}

@media (max-width: 575.98px) {
  .modal-dialog { margin: 0.5rem; }
}

.modal[data-st-visible="true"] .modal-dialog {
  transform: translateY(0);
}`)

reg('modal-dialog-centered', 'components', `.modal-dialog-centered {
  display:     flex;
  align-items: center;
  min-height:  calc(100% - 3.5rem);
}`)

reg('modal-dialog-scrollable', 'components', `.modal-dialog-scrollable {
  height: calc(100% - 3.5rem);
}

.modal-dialog-scrollable .modal-content {
  max-height: 100%;
  overflow:   hidden;
}

.modal-dialog-scrollable .modal-body {
  overflow-y: auto;
}`)

reg('modal-content', 'components', `.modal-content {
  position:         relative;
  display:          flex;
  flex-direction:   column;
  width:            100%;
  pointer-events:   auto;
  background-color: var(--st-bg);
  border:           1px solid var(--st-border);
  border-radius:    calc(var(--st-border-radius) * 1.5);
  box-shadow:       var(--st-shadow);
  outline:          0;
}`)

reg('modal-header', 'components', `.modal-header {
  display:         flex;
  flex-shrink:     0;
  align-items:     center;
  justify-content: space-between;
  padding:         1rem 1.25rem;
  border-bottom:   1px solid var(--st-border);
  border-radius:   calc(var(--st-border-radius) * 1.5) calc(var(--st-border-radius) * 1.5) 0 0;
}`)

reg('modal-title', 'components', `.modal-title {
  margin:      0;
  font-size:   1.125rem;
  font-weight: 600;
  color:       var(--st-text);
  line-height: 1.5;
}`)

reg('modal-body', 'components', `.modal-body {
  position: relative;
  flex:     1 1 auto;
  padding:  1.25rem;
  color:    var(--st-text);
}`)

reg('modal-footer', 'components', `.modal-footer {
  display:         flex;
  flex-shrink:     0;
  flex-wrap:       wrap;
  align-items:     center;
  justify-content: flex-end;
  padding:         0.75rem 1.25rem;
  gap:             0.5rem;
  border-top:      1px solid var(--st-border);
  border-radius:   0 0 calc(var(--st-border-radius) * 1.5) calc(var(--st-border-radius) * 1.5);
}`)

// Modal size variants — class goes on .modal element: <div class="modal modal-lg">
reg('modal-sm',         'components', `.modal-sm         .modal-dialog { max-width: 300px; }`)
reg('modal-lg',         'components', `.modal-lg         .modal-dialog { max-width: 800px; }`)
reg('modal-xl',         'components', `.modal-xl         .modal-dialog { max-width: 1140px; }`)
reg('modal-fullscreen', 'components', `.modal-fullscreen .modal-dialog {
  width:         100vw;
  max-width:     none;
  height:        100%;
  margin:        0;
}

.modal-fullscreen .modal-content {
  height:        100%;
  border:        0;
  border-radius: 0;
}`)

// ─── Components — Toast ──────────────────────────────────────────────

reg('toast-container', 'components', `.toast-container {
  position:       fixed;
  z-index:        var(--st-z-toast, 1070);
  display:        flex;
  flex-direction: column;
  gap:            0.5rem;
  pointer-events: none;
}

.toast-container .toast { pointer-events: auto; }`)

reg('toast', 'components', `.toast {
  width:            350px;
  max-width:        100%;
  background-color: var(--st-bg);
  border:           1px solid var(--st-border);
  border-radius:    var(--st-border-radius);
  box-shadow:       var(--st-shadow);
  font-size:        0.875rem;
  opacity:          0;
  visibility:       hidden;
  transition:       opacity var(--st-duration) var(--st-easing),
                    visibility var(--st-duration) var(--st-easing);
}

.toast[data-st-visible="true"] {
  opacity:    1;
  visibility: visible;
}`)

reg('toast-header', 'components', `.toast-header {
  display:          flex;
  align-items:      center;
  padding:          0.5rem 0.75rem;
  background-color: var(--st-bg-secondary);
  border-bottom:    1px solid var(--st-border);
  border-radius:    calc(var(--st-border-radius) - 1px) calc(var(--st-border-radius) - 1px) 0 0;
  color:            var(--st-text-muted);
  font-weight:      600;
  font-size:        0.8125rem;
}`)

reg('toast-body', 'components', `.toast-body {
  padding:    0.75rem;
  word-break: break-word;
  color:      var(--st-text);
}`)

// ─── Components — Accordion ──────────────────────────────────────────

reg('accordion', 'components', `.accordion {
  border-radius: var(--st-border-radius);
  border:        1px solid var(--st-border);
  overflow:      hidden;
}`)

reg('accordion-item', 'components', `.accordion-item {
  background-color: var(--st-bg);
  border-bottom:    1px solid var(--st-border);
}

.accordion-item:last-child { border-bottom: none; }`)

reg('accordion-header', 'components', `.accordion-header {
  margin:     0;
}`)

reg('accordion-button', 'components', `.accordion-button {
  position:         relative;
  display:          flex;
  align-items:      center;
  width:            100%;
  padding:          1rem 1.25rem;
  font-size:        1rem;
  font-weight:      500;
  color:            var(--st-text);
  text-align:       left;
  background-color: var(--st-bg);
  border:           0;
  cursor:           pointer;
  overflow-anchor:  none;
  transition:       color var(--st-duration) var(--st-easing),
                    background-color var(--st-duration) var(--st-easing);
}

.accordion-button::after {
  flex-shrink:        0;
  width:              1.25rem;
  height:             1.25rem;
  margin-left:        auto;
  content:            "";
  background-image:   url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23212529'%3e%3cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3e%3c/svg%3e");
  background-repeat:  no-repeat;
  background-size:    1.25rem;
  transition:         transform var(--st-duration) var(--st-easing);
}

.accordion-button:not(.collapsed) {
  color:            var(--st-primary);
  background-color: var(--st-bg-secondary);
}

.accordion-button:not(.collapsed)::after {
  transform: rotate(-180deg);
}

.accordion-button:focus-visible {
  box-shadow: var(--st-focus-ring);
  outline:    none;
}`)

reg('accordion-collapse', 'components', `.accordion-collapse {
  overflow: hidden;
  transition: max-height var(--st-duration-slow) var(--st-easing);
}

.accordion-collapse[data-st-collapsed="true"] {
  max-height: 0;
}

.accordion-collapse[data-st-collapsed="false"] {
  max-height: 9999px;
}`)

reg('accordion-body', 'components', `.accordion-body {
  padding: 1rem 1.25rem;
  color:   var(--st-text);
}`)

reg('accordion-flush', 'components', `.accordion-flush {
  border: none;
}

.accordion-flush .accordion-item {
  border-left:   0;
  border-right:  0;
  border-radius: 0;
}

.accordion-flush .accordion-item:first-child { border-top: 0; }`)

// ─── Components — Dropdowns ──────────────────────────────────────────

reg('dropdown', 'components', `.dropdown {
  position: relative;
  display:  inline-block;
}`)

reg('dropdown-toggle', 'components', `.dropdown-toggle::after {
  display:       inline-block;
  margin-left:   0.255em;
  vertical-align: 0.255em;
  content:       "";
  border-top:    0.3em solid;
  border-right:  0.3em solid transparent;
  border-bottom: 0;
  border-left:   0.3em solid transparent;
}`)

reg('dropdown-menu', 'components', `.dropdown-menu {
  position:         absolute;
  top:              100%;
  left:             0;
  z-index:          var(--st-z-dropdown, 1000);
  display:          none;
  min-width:        10rem;
  padding:          0.5rem 0;
  margin:           0;
  font-size:        0.9375rem;
  color:            var(--st-text);
  background-color: var(--st-bg);
  border:           1px solid var(--st-border);
  border-radius:    var(--st-border-radius);
  box-shadow:       var(--st-shadow);
  list-style:       none;
}

.dropdown-menu.show { display: block; }

.dropdown-menu[data-st-visible="true"] { display: block; }`)

reg('dropdown-item', 'components', `.dropdown-item {
  display:          block;
  width:            100%;
  padding:          0.5rem 1rem;
  clear:            both;
  font-weight:      400;
  color:            var(--st-text);
  text-align:       inherit;
  text-decoration:  none;
  white-space:      nowrap;
  background-color: transparent;
  border:           0;
  cursor:           pointer;
  transition:       background-color var(--st-duration) var(--st-easing),
                    color var(--st-duration) var(--st-easing);
}

.dropdown-item:hover,
.dropdown-item:focus {
  background-color: var(--st-bg-secondary);
  color:            var(--st-text);
}

.dropdown-item.active,
.dropdown-item:active {
  --st-dropdown-active-color: #fff;
  background-color: var(--st-primary);
  color:            var(--st-dropdown-active-color);
}

.dropdown-item.disabled {
  color:          var(--st-text-muted);
  pointer-events: none;
}`)

reg('dropdown-divider', 'components', `.dropdown-divider {
  height:       0;
  margin:       0.5rem 0;
  overflow:     hidden;
  border-top:   1px solid var(--st-border);
}`)

reg('dropdown-header', 'components', `.dropdown-header {
  display:     block;
  padding:     0.25rem 1rem;
  margin:      0;
  font-size:   0.8rem;
  font-weight: 600;
  color:       var(--st-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}`)

reg('dropdown-menu-end', 'components', `.dropdown-menu-end { left: auto; right: 0; }`)

reg('dropup', 'components', `.dropup .dropdown-menu {
  top:    auto;
  bottom: 100%;
  margin-bottom: 0.125rem;
}`)

// ─── Components — Close button ───────────────────────────────────────

reg('close', 'components', `.close {
  float:      right;
  font-size:  1.25rem;
  font-weight: 700;
  line-height: 1;
  color:      var(--st-text);
  opacity:    0.5;
  background: none;
  border:     none;
  cursor:     pointer;
  padding:    0;
}

.close:hover { opacity: 1; }`)

// ─── Components — Offcanvas ──────────────────────────────────────────

reg('offcanvas', 'components', `.offcanvas {
  position:         fixed;
  z-index:          var(--st-z-offcanvas, 1045);
  display:          flex;
  flex-direction:   column;
  max-width:        100%;
  background-color: var(--st-bg);
  border:           1px solid var(--st-border);
  outline:          0;
  visibility:       hidden;
  transition:       transform var(--st-duration) var(--st-easing),
                    visibility var(--st-duration) var(--st-easing);
}

.offcanvas[data-st-side="left"] {
  top:       0;
  bottom:    0;
  left:      0;
  width:     var(--st-offcanvas-width, 300px);
  transform: translateX(-100%);
}

.offcanvas[data-st-side="right"] {
  top:       0;
  bottom:    0;
  right:     0;
  width:     var(--st-offcanvas-width, 300px);
  transform: translateX(100%);
}

.offcanvas[data-st-side="top"] {
  top:       0;
  left:      0;
  right:     0;
  height:    var(--st-offcanvas-height, 30vh);
  transform: translateY(-100%);
}

.offcanvas[data-st-side="bottom"] {
  bottom:    0;
  left:      0;
  right:     0;
  height:    var(--st-offcanvas-height, 30vh);
  transform: translateY(100%);
}

.offcanvas[aria-hidden="false"] {
  visibility: visible;
  transform:  none;
}`)

reg('offcanvas-header', 'components', `.offcanvas-header {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  padding:         1rem 1.25rem;
  border-bottom:   1px solid var(--st-border);
}`)

reg('offcanvas-title', 'components', `.offcanvas-title {
  margin:      0;
  font-size:   1.125rem;
  font-weight: 600;
  color:       var(--st-text);
}`)

reg('offcanvas-body', 'components', `.offcanvas-body {
  flex-grow:  1;
  padding:    1.25rem;
  overflow-y: auto;
  color:      var(--st-text);
}`)

// ─── Row cols ────────────────────────────────────────────────────────
for (let n = 1; n <= 6; n++) {
  const pct = (100/n).toFixed(4).replace(/\.?0+$/, '') + '%'
  reg(`row-cols-${n}`, 'components', `.row-cols-${n} > * { flex: 0 0 auto; width: ${pct}; }`)
  Object.keys(BP_VALUES).forEach(bp => {
    reg(`row-cols-${bp}-${n}`, 'components',
      mq(bp, `.row-cols-${bp}-${n} > * { flex: 0 0 auto; width: ${pct}; }`))
  })
}
reg('row-cols-auto', 'components', `.row-cols-auto > * { flex: 0 0 auto; width: auto; }`)

// ─── Column offsets ───────────────────────────────────────────────────
for (let n = 0; n <= 11; n++) {
  const ml = n === 0 ? '0' : `${((n / 12) * 100).toFixed(4).replace(/\.?0+$/, '')}%`
  reg(`offset-${n}`, 'components', `.offset-${n} { margin-left: ${ml}; }`)
  Object.keys(BP_VALUES).forEach(bp => {
    reg(`offset-${bp}-${n}`, 'components',
      mq(bp, `.offset-${bp}-${n} { margin-left: ${ml}; }`))
  })
}

// ─── Images & Figures ────────────────────────────────────────────────
reg('img-fluid',     'utilities', `.img-fluid     { max-width: 100%; height: auto; }`)
reg('img-thumbnail', 'utilities', `.img-thumbnail {
  padding:          0.25rem;
  background-color: var(--st-bg);
  border:           1px solid var(--st-border);
  border-radius:    var(--st-border-radius);
  max-width:        100%;
  height:           auto;
}`)
reg('figure',         'utilities', `.figure         { display: inline-block; }`)
reg('figure-img',     'utilities', `.figure-img     { margin-bottom: 0.5rem; line-height: 1; }`)
reg('figure-caption', 'utilities', `.figure-caption { font-size: 0.875rem; color: var(--st-text-muted); }`)

// ─── Table colour variants ────────────────────────────────────────────
const TABLE_COLORS = {
  primary:   'rgba(13,110,253,0.1)',
  secondary: 'rgba(108,117,125,0.1)',
  success:   'rgba(25,135,84,0.1)',
  danger:    'rgba(220,53,69,0.1)',
  warning:   'rgba(255,193,7,0.1)',
  info:      'rgba(13,202,240,0.1)',
  light:     'rgba(248,249,250,0.5)',
  active:    'rgba(0,0,0,0.05)',
}
Object.entries(TABLE_COLORS).forEach(([color, bg]) => {
  reg(`table-${color}`, 'components', `.table-${color} { --st-table-bg: ${bg}; }
.table-${color} > :not(caption) > * > * { background-color: var(--st-table-bg); }`)
})
reg('table-dark', 'components', `.table-dark {
  --st-table-dark-bg:          #212529;
  --st-table-dark-color:       #dee2e6;
  --st-table-dark-border:      #373b3e;
  --st-table-dark-head-bg:     #1a1d20;
  --st-table-dark-head-color:  #adb5bd;
  --st-table-bg: var(--st-table-dark-bg);
  color:        var(--st-table-dark-color);
  border-color: var(--st-table-dark-border);
}
.table-dark > :not(caption) > * > * { background-color: var(--st-table-bg); color: var(--st-table-dark-color); }
.table-dark > thead > tr > th { background-color: var(--st-table-dark-head-bg); color: var(--st-table-dark-head-color); }`)
reg('table-striped-columns', 'components', `.table-striped-columns > :not(caption) > tr > :nth-child(even) {
  background-color: var(--st-bg-secondary);
}`)
reg('table-group-divider', 'components', `.table-group-divider { border-top: 2px solid var(--st-border); }`)

// ─── Button extra variants ────────────────────────────────────────────
reg('btn-link', 'components', `.btn-link {
  display:          inline-flex;
  align-items:      center;
  padding:          0.375rem 0.75rem;
  font-size:        1rem;
  color:            var(--st-primary);
  background:       none;
  border:           none;
  cursor:           pointer;
  text-decoration:  underline;
  text-underline-offset: 2px;
  transition:       color var(--st-duration) var(--st-easing);
}
.btn-link:hover { color: var(--st-primary-hover); }`)
reg('btn-close-white', 'components', `.btn-close-white { filter: invert(1) grayscale(100%) brightness(200%); }`)
reg('btn-group-vertical', 'components', `.btn-group-vertical {
  flex-direction: column;
  align-items:    flex-start;
  justify-content: center;
}
.btn-group-vertical > [class*="btn-"] {
  width: 100%;
}
.btn-group-vertical > [class*="btn-"]:not(:first-child) {
  border-top-left-radius:  0;
  border-top-right-radius: 0;
  margin-top: -1px;
}
.btn-group-vertical > [class*="btn-"]:not(:last-child) {
  border-bottom-left-radius:  0;
  border-bottom-right-radius: 0;
}`)

// ─── Collapse ────────────────────────────────────────────────────────
reg('collapse', 'components', `.collapse:not(.show) { display: none; }`)
reg('collapsing', 'components', `.collapsing {
  height:     0;
  overflow:   hidden;
  transition: height var(--st-duration-slow) var(--st-easing);
}`)

// ─── Carousel ────────────────────────────────────────────────────────
reg('carousel', 'components', `.carousel { position: relative; }`)
reg('carousel-inner', 'components', `.carousel-inner { position: relative; width: 100%; overflow: hidden; }`)
reg('carousel-item', 'components', `.carousel-item {
  position:   relative;
  display:    none;
  float:      left;
  width:      100%;
  backface-visibility: hidden;
  transition: transform var(--st-duration-slow) var(--st-easing);
}
.carousel-item.active,
.carousel-item-next,
.carousel-item-prev { display: block; }`)
reg('carousel-control-prev', 'components', `.carousel-control-prev {
  --st-carousel-control-color: #fff;
  position: absolute; top: 0; bottom: 0; left: 0;
  display: flex; align-items: center; justify-content: center;
  width: 15%; padding: 0; color: var(--st-carousel-control-color); text-align: center;
  background: rgba(0,0,0,0.2); border: 0; opacity: 0.5;
  cursor: pointer; transition: opacity var(--st-duration) var(--st-easing);
}
.carousel-control-prev:hover { opacity: 0.9; }`)
reg('carousel-control-next', 'components', `.carousel-control-next {
  --st-carousel-control-color: #fff;
  position: absolute; top: 0; right: 0; bottom: 0;
  display: flex; align-items: center; justify-content: center;
  width: 15%; padding: 0; color: var(--st-carousel-control-color); text-align: center;
  background: rgba(0,0,0,0.2); border: 0; opacity: 0.5;
  cursor: pointer; transition: opacity var(--st-duration) var(--st-easing);
}
.carousel-control-next:hover { opacity: 0.9; }`)
reg('carousel-indicators', 'components', `.carousel-indicators {
  --st-carousel-indicator-bg: #fff;
  position: absolute; right: 0; bottom: 0; left: 0;
  display: flex; justify-content: center;
  padding: 0; margin: 0 15%; list-style: none;
}
.carousel-indicators [data-bs-target],
.carousel-indicators button {
  width: 30px; height: 3px; margin: 0 3px;
  background-color: var(--st-carousel-indicator-bg); border: none; cursor: pointer;
  opacity: 0.5; transition: opacity var(--st-duration) var(--st-easing);
}
.carousel-indicators .active { opacity: 1; }`)
reg('carousel-caption', 'components', `.carousel-caption {
  --st-carousel-caption-color: #fff;
  position: absolute; right: 15%; bottom: 1.25rem; left: 15%;
  padding: 1.25rem; color: var(--st-carousel-caption-color); text-align: center;
}`)
reg('carousel-fade', 'components', `.carousel-fade .carousel-item { opacity: 0; transition: opacity var(--st-duration-slow) var(--st-easing); transform: none; }
.carousel-fade .carousel-item.active { opacity: 1; }`)
reg('carousel-dark', 'components', `.carousel-dark .carousel-control-prev,
.carousel-dark .carousel-control-next { filter: invert(1); }
.carousel-dark .carousel-indicators button { background-color: #000; }
.carousel-dark .carousel-caption { color: #000; }`)
reg('slide', 'components', `.slide .carousel-item { transition: transform var(--st-duration-slow) var(--st-easing); }`)

// ─── Dropdown responsive ──────────────────────────────────────────────
Object.keys(BP_VALUES).forEach(bp => {
  reg(`dropdown-menu-${bp}-start`, 'components', mq(bp, `.dropdown-menu-${bp}-start { left: 0; right: auto; }`))
  reg(`dropdown-menu-${bp}-end`,   'components', mq(bp, `.dropdown-menu-${bp}-end   { left: auto; right: 0; }`))
})
reg('dropend',          'components', `.dropend  .dropdown-menu { top: 0; right: auto; left: 100%; margin-left: 0.125rem; }`)
reg('dropstart',        'components', `.dropstart .dropdown-menu { top: 0; right: 100%; left: auto; margin-right: 0.125rem; }`)
reg('dropdown-center',  'components', `.dropdown-center .dropdown-menu { left: 50%; transform: translateX(-50%); }`)
reg('dropup-center',    'components', `.dropup-center .dropdown-menu   { left: 50%; transform: translateX(-50%); bottom: 100%; top: auto; }`)

// ─── List group extras ────────────────────────────────────────────────
Object.keys(BP_VALUES).forEach(bp => {
  reg(`list-group-horizontal-${bp}`, 'components', mq(bp, `.list-group-horizontal-${bp} {
  flex-direction: row;
}
.list-group-horizontal-${bp} .list-group-item {
  border-bottom: 1px solid var(--st-border);
  margin-bottom: 0;
  margin-right: -1px;
}
.list-group-horizontal-${bp} .list-group-item:first-child {
  border-top-left-radius:    var(--st-border-radius);
  border-bottom-left-radius: var(--st-border-radius);
  border-top-right-radius:   0;
}
.list-group-horizontal-${bp} .list-group-item:last-child {
  border-top-right-radius:    var(--st-border-radius);
  border-bottom-right-radius: var(--st-border-radius);
  border-bottom-left-radius:  0;
  margin-right: 0;
}`))
})

const LG_COLORS = { primary:'#084298', success:'#0a3622', danger:'#842029', warning:'#664d03' }
Object.entries(LG_COLORS).forEach(([color, text]) => {
  reg(`list-group-item-${color}`, 'components', `.list-group-item-${color} {
  background-color: color-mix(in srgb, var(--st-${color}) 15%, var(--st-bg));
  color: ${text};
}`)
})
reg('list-group-numbered', 'components', `.list-group-numbered { list-style-type: none; counter-reset: section; }
.list-group-numbered > .list-group-item::before {
  content: counters(section, ".") ". ";
  counter-increment: section;
  font-weight: 600;
}`)

// ─── Modal fullscreen responsive ─────────────────────────────────────
const MODAL_DOWN = { sm:'576px', md:'768px', lg:'992px', xl:'1200px', xxl:'1400px' }
Object.entries(MODAL_DOWN).forEach(([bp, px]) => {
  reg(`modal-fullscreen-${bp}-down`, 'components',
    `@media (max-width: ${parseFloat(px)-0.02}px) {
  .modal-fullscreen-${bp}-down .modal-dialog {
    width: 100vw; max-width: none; height: 100%; margin: 0;
  }
  .modal-fullscreen-${bp}-down .modal-content {
    height: 100%; border: 0; border-radius: 0;
  }
}`)
})

// ─── Nav extras ───────────────────────────────────────────────────────
reg('nav-underline', 'components', `.nav-underline .nav-link {
  border-bottom: 2px solid transparent;
  border-radius: 0;
  padding-bottom: calc(0.5rem - 2px);
}
.nav-underline .nav-link:hover { border-color: var(--st-border); }
.nav-underline .nav-link.active { border-color: var(--st-primary); color: var(--st-primary); font-weight: 600; }`)
reg('tab-pane', 'components', `.tab-pane { display: none; }
.tab-pane.active { display: block; }
.tab-pane.fade { opacity: 0; transition: opacity var(--st-duration) var(--st-easing); }
.tab-pane.fade.show { opacity: 1; }`)
reg('active', 'utilities', `.active { /* active state — set by component context */ }`)
reg('fade',   'utilities', `.fade { opacity: 0; transition: opacity var(--st-duration) var(--st-easing); }
.fade.show { opacity: 1; }`)
reg('show',   'utilities', `.show { display: block; }`)

// ─── Navbar extras ────────────────────────────────────────────────────
reg('navbar-expand', 'components', `.navbar-expand {
  flex-wrap: nowrap;
  justify-content: flex-start;
}
.navbar-expand .navbar-nav { flex-direction: row; }
.navbar-expand .navbar-collapse { display: flex; flex-basis: auto; }
.navbar-expand .navbar-toggler { display: none; }`)
reg('navbar-dark', 'components', `.navbar-dark {
  --st-navbar-dark-color:          rgba(255,255,255,0.75);
  --st-navbar-dark-color-hover:    rgba(255,255,255,0.9);
  --st-navbar-dark-toggler-border: rgba(255,255,255,0.1);
  background-color: var(--st-dark);
  border-color: transparent;
}
.navbar-dark .navbar-brand,
.navbar-dark .nav-link { color: var(--st-navbar-dark-color-hover); }
.navbar-dark .navbar-toggler { border-color: var(--st-navbar-dark-toggler-border); color: var(--st-navbar-dark-color); }`)
reg('navbar-light', 'components', `.navbar-light {
  background-color: var(--st-bg);
  border-color: var(--st-border);
}`)

// ─── Offcanvas backdrop ───────────────────────────────────────────────
reg('offcanvas-backdrop', 'components', `.offcanvas-backdrop {
  position:   fixed;
  inset:      0;
  z-index:    calc(var(--st-z-offcanvas, 1045) - 1);
  background: rgba(0,0,0,0.5);
  opacity:    0;
  visibility: hidden;
  transition: opacity var(--st-duration) var(--st-easing), visibility var(--st-duration) var(--st-easing);
}
body:has(.offcanvas[aria-hidden="false"]) .offcanvas-backdrop { opacity: 1; visibility: visible; }
body:has(.offcanvas[aria-hidden="false"]) { overflow: hidden; scrollbar-gutter: stable; }`)

// ─── Pagination size variants ─────────────────────────────────────────
reg('pagination-sm', 'components', `.pagination-sm .page-link {
  padding:       0.25rem 0.5rem;
  font-size:     0.875rem;
  border-radius: calc(var(--st-border-radius) * 0.75);
}`)
reg('pagination-lg', 'components', `.pagination-lg .page-link {
  padding:       0.75rem 1.5rem;
  font-size:     1.125rem;
  border-radius: calc(var(--st-border-radius) * 1.5);
}`)

// ─── Placeholders ────────────────────────────────────────────────────
reg('placeholder', 'components', `.placeholder {
  display:          inline-block;
  min-height:       1em;
  vertical-align:   middle;
  cursor:           wait;
  background-color: var(--st-skeleton-base);
  border-radius:    var(--st-skeleton-radius, 4px);
  opacity:          0.5;
}
.col-1 .placeholder, .col-2 .placeholder,
.col-3 .placeholder, .col-4 .placeholder { width: 100%; }`)
reg('placeholder-glow', 'components', `.placeholder-glow .placeholder {
  animation: placeholder-glow 2s ease-in-out infinite;
}
@keyframes placeholder-glow {
  50% { opacity: 0.2; }
}`)
reg('placeholder-wave', 'components', `.placeholder-wave .placeholder {
  -webkit-mask-image: linear-gradient(130deg, #000 55%, rgba(0,0,0,0.8) 75%, #000 95%);
  mask-image: linear-gradient(130deg, #000 55%, rgba(0,0,0,0.8) 75%, #000 95%);
  -webkit-mask-size: 200% 100%;
  mask-size: 200% 100%;
  animation: placeholder-wave 2s linear infinite;
}
@keyframes placeholder-wave { 100% { -webkit-mask-position: -200% 0%; mask-position: -200% 0%; } }`)
reg('placeholder-xs', 'components', `.placeholder-xs { min-height: 0.6em; }`)
reg('placeholder-sm', 'components', `.placeholder-sm { min-height: 0.8em; }`)
reg('placeholder-lg', 'components', `.placeholder-lg { min-height: 1.2em; }`)

// ─── Progress extras ──────────────────────────────────────────────────
reg('progress-stacked', 'components', `.progress-stacked { display: flex; }
.progress-stacked .progress { border-radius: 0; }
.progress-stacked .progress:first-child { border-top-left-radius: 999px; border-bottom-left-radius: 999px; }
.progress-stacked .progress:last-child  { border-top-right-radius: 999px; border-bottom-right-radius: 999px; }`)
reg('progress-bar-animated', 'components', `.progress-bar-animated {
  animation: progress-bar-stripes 1s linear infinite;
}
@keyframes progress-bar-stripes {
  0% { background-position-x: 1rem; }
}`)

// ─── Spinner size variants ────────────────────────────────────────────
reg('spinner-border-sm', 'components', `.spinner-border-sm { width: 1rem; height: 1rem; border-width: 0.2em; }`)
reg('spinner-grow-sm',   'components', `.spinner-grow-sm   { width: 1rem; height: 1rem; }`)

// ─── Form extras ──────────────────────────────────────────────────────
reg('form-control-color', 'components', `.form-control-color {
  width:   3rem;
  height:  calc(1.5em + 0.75rem + 2px);
  padding: 0.375rem;
  cursor:  pointer;
}
.form-control-color::-webkit-color-swatch { border-radius: calc(var(--st-border-radius) * 0.75); }`)
reg('form-control-plaintext', 'components', `.form-control-plaintext {
  display:          block;
  width:            100%;
  padding:          0.375rem 0;
  background:       transparent;
  border:           solid transparent;
  border-width:     1px 0;
  color:            var(--st-text);
  font-size:        1rem;
  line-height:      1.5;
}`)
reg('form-select-sm', 'components', `.form-select-sm {
  padding:       0.25rem 2.25rem 0.25rem 0.5rem;
  font-size:     0.875rem;
  border-radius: calc(var(--st-border-radius) * 0.75);
}`)
reg('form-select-lg', 'components', `.form-select-lg {
  padding:       0.5rem 2.25rem 0.5rem 1rem;
  font-size:     1.125rem;
  border-radius: calc(var(--st-border-radius) * 1.5);
}`)
reg('valid-tooltip',   'components', `.valid-tooltip   { display: none; position: absolute; top: 100%; padding: 0.25rem 0.5rem; margin-top: 0.1rem; font-size: 0.875rem; color: #fff; background-color: var(--st-success); border-radius: var(--st-border-radius); }`)
reg('invalid-tooltip', 'components', `.invalid-tooltip { display: none; position: absolute; top: 100%; padding: 0.25rem 0.5rem; margin-top: 0.1rem; font-size: 0.875rem; color: #fff; background-color: var(--st-danger);  border-radius: var(--st-border-radius); }`)
reg('is-valid',   'components', `.is-valid.form-control,
.is-valid.form-select { border-color: var(--st-success); }
.is-valid ~ .valid-feedback,
.is-valid ~ .valid-tooltip { display: block; }`)
reg('is-invalid', 'components', `.is-invalid.form-control,
.is-invalid.form-select { border-color: var(--st-danger); }
.is-invalid ~ .invalid-feedback,
.is-invalid ~ .invalid-tooltip { display: block; }`)
reg('col-form-label',    'components', `.col-form-label { padding-top: calc(0.375rem + 1px); padding-bottom: calc(0.375rem + 1px); margin-bottom: 0; font-size: inherit; line-height: 1.5; font-weight: 500; }`)
reg('col-form-label-sm', 'components', `.col-form-label-sm { padding-top: calc(0.25rem + 1px); padding-bottom: calc(0.25rem + 1px); font-size: 0.875rem; }`)
reg('col-form-label-lg', 'components', `.col-form-label-lg { padding-top: calc(0.5rem + 1px);  padding-bottom: calc(0.5rem + 1px);  font-size: 1.125rem; }`)

// ─── Tooltip / Popover CSS shells ─────────────────────────────────────
reg('tooltip', 'components', `.tooltip {
  position: absolute; z-index: var(--st-z-tooltip, 1060);
  display: block; margin: 0; padding: 4px 0;
  font-size: 0.875rem; opacity: 0; pointer-events: none;
}
.tooltip.show { opacity: 0.9; }`)
reg('tooltip-inner', 'components', `.tooltip-inner {
  --st-tooltip-color: #fff;
  --st-tooltip-bg:    #000;
  max-width: 200px; padding: 0.25rem 0.5rem;
  color: var(--st-tooltip-color); text-align: center;
  background-color: var(--st-tooltip-bg); border-radius: var(--st-border-radius);
}`)
reg('bs-tooltip-top', 'components', `.bs-tooltip-top { padding: 4px 0; }
.bs-tooltip-top .tooltip-arrow::before {
  top: -1px; border-width: 4px 4px 0;
  border-top-color: var(--st-tooltip-bg, #000);
}`)
reg('popover', 'components', `.popover {
  position: absolute; z-index: var(--st-z-popover, 1070);
  display: block; max-width: 276px; padding: 0;
  font-size: 0.875rem; background-color: var(--st-bg);
  border: 1px solid var(--st-border); border-radius: var(--st-border-radius);
  box-shadow: var(--st-shadow);
}`)
reg('popover-header', 'components', `.popover-header {
  padding: 0.5rem 1rem; margin-bottom: 0;
  font-size: 1rem; font-weight: 600;
  background-color: var(--st-bg-secondary);
  border-bottom: 1px solid var(--st-border);
  border-radius: calc(var(--st-border-radius) - 1px) calc(var(--st-border-radius) - 1px) 0 0;
}`)
reg('popover-body', 'components', `.popover-body { padding: 1rem; color: var(--st-text); }`)
reg('bs-popover-top', 'components', `.bs-popover-top { margin-bottom: 0.5rem; }`)

// ─── Helpers ─────────────────────────────────────────────────────────
reg('clearfix', 'utilities', `.clearfix::after { display: block; clear: both; content: ""; }`)
reg('color-body', 'utilities', `.color-body { color: var(--st-text); }`)

// ─── Aspect ratio ────────────────────────────────────────────────────
// `.ratio` predates the aspect-ratio property and implemented ratios with the
// padding-top percentage hack: a ::before spacer forcing the height, and
// `.ratio > *` absolutely positioning children to fill it. Two costs came with
// that. It needs a wrapper element to work at all, and `> *` stretches EVERY
// direct child — so a tile holding an image plus an overlay button had the
// button stretched to the full box too, which is how a circular play button
// rendered as a giant ellipse.
//
// Both are now reimplemented on the real property. `.ratio` keeps its name and
// its --st-aspect-ratio custom property so existing markup and any project
// overriding that variable keep working, but the value is now a ratio rather
// than a padding percentage, and no child is positioned or stretched.
const ASPECT_RATIOS = {
  '1x1':  '1 / 1',
  '4x3':  '4 / 3',
  '16x9': '16 / 9',
  '21x9': '21 / 9',
}

// `position: relative` stays so an absolutely-positioned overlay still anchors
// to the box. The fill rule is scoped to replaced elements rather than `> *`:
// an <iframe>/<img>/<video> has its own intrinsic size and will not fill the
// box on its own, so embeds — the primary use of `.ratio` — keep working, while
// an overlay button, caption or badge is left at its natural size instead of
// being stretched edge to edge.
reg('ratio', 'utilities', `.ratio { position: relative; width: 100%; aspect-ratio: var(--st-aspect-ratio, 1 / 1); }
.ratio > img,
.ratio > video,
.ratio > iframe,
.ratio > embed,
.ratio > object { width: 100%; height: 100%; object-fit: cover; }`)
Object.entries(ASPECT_RATIOS).forEach(([name, value]) => {
  reg(`ratio-${name}`, 'utilities', `.ratio-${name} { --st-aspect-ratio: ${value}; }`)
})

// The utility form. Unlike `.ratio` it needs no companion class and no wrapper:
// one class on the element is the whole feature.
const ASPECT_NAMED = {
  'square': '1 / 1',
  'video':  '16 / 9',
  'auto':   'auto',
}
Object.entries(ASPECT_NAMED).forEach(([name, value]) => {
  reg(`aspect-${name}`, 'utilities', `.aspect-${name} { aspect-ratio: ${value}; }`)
  BREAKPOINTS.forEach(bp => {
    if (bp === 'xs') return
    reg(`aspect-${bp}-${name}`, 'utilities',
      mq(bp, `.aspect-${bp}-${name} { aspect-ratio: ${value}; }`))
  })
})
// The named scale under its .ratio-* spelling too, so migrating from the
// component to the utility does not mean relearning the names.
Object.entries(ASPECT_RATIOS).forEach(([name, value]) => {
  reg(`aspect-${name}`, 'utilities', `.aspect-${name} { aspect-ratio: ${value}; }`)
  BREAKPOINTS.forEach(bp => {
    if (bp === 'xs') return
    reg(`aspect-${bp}-${name}`, 'utilities',
      mq(bp, `.aspect-${bp}-${name} { aspect-ratio: ${value}; }`))
  })
})

reg('fixed-top',    'components', `.fixed-top    { position: fixed; top: 0;    right: 0; left: 0; z-index: var(--st-z-fixed, 1030); }`)
reg('fixed-bottom', 'components', `.fixed-bottom { position: fixed; bottom: 0; right: 0; left: 0; z-index: var(--st-z-fixed, 1030); }`)
reg('sticky-top',    'components', `.sticky-top    { position: sticky; top:    0; z-index: var(--st-z-sticky, 1020); }`)
reg('sticky-bottom', 'components', `.sticky-bottom { position: sticky; bottom: 0; z-index: var(--st-z-sticky, 1020); }`)
Object.keys(BP_VALUES).forEach(bp => {
  reg(`sticky-${bp}-top`,    'components', mq(bp, `.sticky-${bp}-top    { position: sticky; top: 0;    z-index: var(--st-z-sticky, 1020); }`))
  reg(`sticky-${bp}-bottom`, 'components', mq(bp, `.sticky-${bp}-bottom { position: sticky; bottom: 0; z-index: var(--st-z-sticky, 1020); }`))
})

reg('hstack', 'utilities', `.hstack { display: flex; flex-direction: row; align-items: center; align-self: stretch; }`)
reg('vstack', 'utilities', `.vstack { display: flex; flex-direction: column; flex: 1 1 auto; }`)

const GAP_SCALE = { '0':'0', '1':'0.25rem', '2':'0.5rem', '3':'1rem', '4':'1.5rem', '5':'3rem' }
Object.entries(GAP_SCALE).forEach(([k, v]) => {
  reg(`gap-${k}`,     'utilities', `.gap-${k}     { gap:        ${v}; }`)
  reg(`row-gap-${k}`, 'utilities', `.row-gap-${k} { row-gap:    ${v}; }`)
  reg(`col-gap-${k}`, 'utilities', `.col-gap-${k} { column-gap: ${v}; }`)
  Object.keys(BP_VALUES).forEach(bp => {
    reg(`gap-${bp}-${k}`,     'utilities', mq(bp, `.gap-${bp}-${k}     { gap: ${v}; }`))
    reg(`row-gap-${bp}-${k}`, 'utilities', mq(bp, `.row-gap-${bp}-${k} { row-gap: ${v}; }`))
    reg(`col-gap-${bp}-${k}`, 'utilities', mq(bp, `.col-gap-${bp}-${k} { column-gap: ${v}; }`))
  })
})

reg('stretched-link', 'utilities', `.stretched-link::after {
  position: absolute; inset: 0; z-index: 1; content: "";
}`)
reg('text-truncate', 'utilities', `.text-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }`)
reg('text-break',    'utilities', `.text-break { word-wrap: break-word; word-break: break-word; }`)
reg('visually-hidden', 'utilities', `.visually-hidden {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}`)
reg('visually-hidden-focusable', 'utilities', `.visually-hidden-focusable:not(:focus):not(:focus-within) {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}`)
reg('icon-link', 'utilities', `.icon-link {
  display: inline-flex; align-items: center; gap: 0.375rem;
  color: var(--st-primary); text-decoration: underline;
  text-underline-offset: 2px;
  transition: color var(--st-duration) var(--st-easing);
}
.icon-link:hover { color: var(--st-primary-hover); }`)
reg('icon-link-hover', 'utilities', `.icon-link-hover { gap: 0.5rem; }`)

// ─── Background extras ────────────────────────────────────────────────
reg('bg-body',           'utilities', `.bg-body           { background-color: var(--st-bg); }`)
reg('bg-body-secondary', 'utilities', `.bg-body-secondary { background-color: var(--st-bg-secondary); }`)
reg('bg-body-tertiary',  'utilities', `.bg-body-tertiary  { background-color: color-mix(in srgb, var(--st-bg-secondary) 50%, var(--st-bg)); }`)
reg('bg-black',          'utilities', `.bg-black          { background-color: #000; }`)
reg('bg-gradient',       'utilities', `.bg-gradient       { background-image: linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0)); }`)
;[10,25,50,75,100].forEach(n => {
  reg(`bg-opacity-${n}`, 'utilities', `.bg-opacity-${n} { --st-bg-opacity: ${n/100}; }`)
})

// ─── Border extras ────────────────────────────────────────────────────
reg('border-top',      'utilities', `.border-top    { border-top:    1px solid var(--st-border); }`)
reg('border-end',      'utilities', `.border-end    { border-right:  1px solid var(--st-border); }`)
reg('border-bottom',   'utilities', `.border-bottom { border-bottom: 1px solid var(--st-border); }`)
reg('border-start',    'utilities', `.border-start  { border-left:   1px solid var(--st-border); }`)
reg('border-top-0',    'utilities', `.border-top-0    { border-top:    0; }`)
reg('border-end-0',    'utilities', `.border-end-0    { border-right:  0; }`)
reg('border-bottom-0', 'utilities', `.border-bottom-0 { border-bottom: 0; }`)
reg('border-start-0',  'utilities', `.border-start-0  { border-left:   0; }`)
reg('border-x',        'utilities', `.border-x   { border-left: 1px solid var(--st-border); border-right:  1px solid var(--st-border); }`)
reg('border-y',        'utilities', `.border-y   { border-top:  1px solid var(--st-border); border-bottom: 1px solid var(--st-border); }`)
reg('border-x-0',      'utilities', `.border-x-0 { border-left: 0; border-right: 0; }`)
reg('border-y-0',      'utilities', `.border-y-0 { border-top: 0; border-bottom: 0; }`)
reg('border-black',    'utilities', `.border-black { border-color: #000; }`)
reg('border-white',    'utilities', `.border-white { border-color: #fff; }`)
;[1,2,3,4,5].forEach(n => {
  reg(`border-${n}`, 'utilities', `.border-${n} { border-width: ${n}px; }`)
})
;[10,25,50,75].forEach(n => {
  reg(`border-opacity-${n}`, 'utilities', `.border-opacity-${n} { --st-border-opacity: ${n/100}; }`)
})

// ─── Text color extras ────────────────────────────────────────────────
reg('text-body-secondary', 'utilities', `.text-body-secondary { color: var(--st-text-muted); }`)
reg('text-body-tertiary',  'utilities', `.text-body-tertiary  { color: color-mix(in srgb, var(--st-text-muted) 65%, transparent); }`)
reg('text-body-emphasis',  'utilities', `.text-body-emphasis  { color: var(--st-text); font-weight: 600; }`)
reg('text-black',          'utilities', `.text-black    { color: #000; }`)
reg('text-white',          'utilities', `.text-white    { color: #fff; }`)
reg('text-black-50',       'utilities', `.text-black-50 { color: rgba(0,0,0,0.5); }`)
reg('text-white-50',       'utilities', `.text-white-50 { color: rgba(255,255,255,0.5); }`)
;['primary','secondary','success','danger','warning','info'].forEach(c => {
  reg(`text-${c}-emphasis`, 'utilities',
    `.text-${c}-emphasis { color: color-mix(in srgb, var(--st-${c}) 70%, black); }`)
})

// ─── Link utilities ───────────────────────────────────────────────────
;['primary','secondary','success','danger','warning','info','light','dark'].forEach(c => {
  const hover = ['light'].includes(c) ? '#000' : `color-mix(in srgb, var(--st-${c}) 80%, black)`
  reg(`link-${c}`, 'utilities', `.link-${c} { color: var(--st-${c}); text-decoration-color: var(--st-${c}); }
.link-${c}:hover { color: ${hover}; }`)
})
reg('link-body-emphasis', 'utilities', `.link-body-emphasis { color: var(--st-text); }
.link-body-emphasis:hover { color: var(--st-text-muted); }`)
;[1,2,3].forEach(n => {
  reg(`link-offset-${n}`, 'utilities', `.link-offset-${n} { text-underline-offset: ${n*2}px; }`)
})
reg('link-underline',         'utilities', `.link-underline { text-decoration: underline; }`)
;['primary','secondary','success','danger','warning','info','light','dark'].forEach(c => {
  reg(`link-underline-${c}`, 'utilities', `.link-underline-${c} { text-decoration-color: var(--st-${c}); }`)
})

// ─── Display extras ───────────────────────────────────────────────────
reg('d-table-cell', 'utilities', `.d-table-cell { display: table-cell; }`)
reg('d-table-row',  'utilities', `.d-table-row  { display: table-row;  }`)
reg('d-print-none',  'utilities', `@media print { .d-print-none  { display: none;  } }`)
reg('d-print-block', 'utilities', `@media print { .d-print-block { display: block; } }`)
reg('d-print-flex',  'utilities', `@media print { .d-print-flex  { display: flex;  } }`)

// ─── Flex extras ──────────────────────────────────────────────────────
reg('flex-row-reverse',    'utilities', `.flex-row-reverse    { flex-direction: row-reverse;    }`)
reg('flex-column-reverse', 'utilities', `.flex-column-reverse { flex-direction: column-reverse; }`)
reg('flex-wrap-reverse',   'utilities', `.flex-wrap-reverse   { flex-wrap: wrap-reverse;        }`)

;['start','center','end','between','around','stretch'].forEach(v => {
  const val = v === 'start' ? 'flex-start' : v === 'end' ? 'flex-end' : v
  reg(`align-content-${v}`, 'utilities', `.align-content-${v} { align-content: ${val}; }`)
})

;['auto','start','center','end','baseline','stretch'].forEach(v => {
  const val = v === 'start' ? 'flex-start' : v === 'end' ? 'flex-end' : v
  reg(`align-self-${v}`, 'utilities', `.align-self-${v} { align-self: ${val}; }`)
  Object.keys(BP_VALUES).forEach(bp => {
    reg(`align-self-${bp}-${v}`, 'utilities', mq(bp, `.align-self-${bp}-${v} { align-self: ${val}; }`))
  })
})

;[0,1,2,3,4,5].forEach(n => {
  reg(`order-${n}`, 'utilities', `.order-${n} { order: ${n}; }`)
  Object.keys(BP_VALUES).forEach(bp => {
    reg(`order-${bp}-${n}`, 'utilities', mq(bp, `.order-${bp}-${n} { order: ${n}; }`))
  })
})
reg('order-first', 'utilities', `.order-first { order: -1; }`)
reg('order-last',  'utilities', `.order-last  { order: 6;  }`)
Object.keys(BP_VALUES).forEach(bp => {
  reg(`order-${bp}-first`, 'utilities', mq(bp, `.order-${bp}-first { order: -1; }`))
  reg(`order-${bp}-last`,  'utilities', mq(bp, `.order-${bp}-last  { order: 6;  }`))
})

// ─── Float ────────────────────────────────────────────────────────────
reg('float-start', 'utilities', `.float-start { float: left;  }`)
reg('float-end',   'utilities', `.float-end   { float: right; }`)
reg('float-none',  'utilities', `.float-none  { float: none;  }`)
Object.keys(BP_VALUES).forEach(bp => {
  reg(`float-${bp}-start`, 'utilities', mq(bp, `.float-${bp}-start { float: left;  }`))
  reg(`float-${bp}-end`,   'utilities', mq(bp, `.float-${bp}-end   { float: right; }`))
  reg(`float-${bp}-none`,  'utilities', mq(bp, `.float-${bp}-none  { float: none;  }`))
})

// ─── Interactions ─────────────────────────────────────────────────────
reg('user-select-all',  'utilities', `.user-select-all  { user-select: all;  }`)
reg('user-select-auto', 'utilities', `.user-select-auto { user-select: auto; }`)
reg('user-select-none', 'utilities', `.user-select-none { user-select: none; }`)
reg('pe-none', 'utilities', `.pe-none { pointer-events: none; }`)
reg('pe-auto', 'utilities', `.pe-auto { pointer-events: auto; }`)

// ─── Object fit responsive ────────────────────────────────────────────
;['contain','cover','fill','none','scale-down'].forEach(v => {
  Object.keys(BP_VALUES).forEach(bp => {
    reg(`object-fit-${bp}-${v}`, 'utilities',
      mq(bp, `.object-fit-${bp}-${v} { object-fit: ${v}; }`))
  })
})

// ─── Overflow extras ──────────────────────────────────────────────────
;['auto','hidden','visible','scroll'].forEach(v => {
  reg(`overflow-x-${v}`, 'utilities', `.overflow-x-${v} { overflow-x: ${v}; }`)
  reg(`overflow-y-${v}`, 'utilities', `.overflow-y-${v} { overflow-y: ${v}; }`)
})

// ─── Position offset utilities ────────────────────────────────────────
;['top','bottom','start','end'].forEach(side => {
  const prop = side === 'start' ? 'left' : side === 'end' ? 'right' : side
  ;[['0','0'],['50','50%'],['100','100%']].forEach(([k, v]) => {
    reg(`${side}-${k}`, 'utilities', `.${side}-${k} { ${prop}: ${v}; }`)
  })
})
reg('translate-middle',   'utilities', `.translate-middle   { transform: translate(-50%, -50%); }`)
reg('translate-middle-x', 'utilities', `.translate-middle-x { transform: translateX(-50%);      }`)
reg('translate-middle-y', 'utilities', `.translate-middle-y { transform: translateY(-50%);      }`)

// ─── Positional offset scale: top/right/bottom/left/inset ────────────
;[
  ['top',    'top'],
  ['bottom', 'bottom'],
  ['start',  'left'],
  ['end',    'right'],
].forEach(([cls, prop]) => {
  reg(`${cls}-0`,   'utilities', `.${cls}-0   { ${prop}: 0; }`)
  reg(`${cls}-50`,  'utilities', `.${cls}-50  { ${prop}: 50%; }`)
  reg(`${cls}-100`, 'utilities', `.${cls}-100 { ${prop}: 100%; }`)
})
reg('inset-0', 'utilities', `.inset-0 { inset: 0; }`)

// ─── Sizing extras ────────────────────────────────────────────────────
reg('mw-100',    'utilities', `.mw-100    { max-width:  100%; }`)
reg('mh-100',    'utilities', `.mh-100    { max-height: 100%; }`)

// ─── max-w-* named scale (aligned to Bootstrap container breakpoints) ─
// max-w-xs  → 320px   small phone portrait
// max-w-sm  → 540px   Bootstrap sm container
// max-w-md  → 720px   Bootstrap md container
// max-w-lg  → 960px   Bootstrap lg container
// max-w-xl  → 1140px  Bootstrap xl container
// max-w-xxl → 1320px  Bootstrap xxl container
const MAX_W_SCALE = {
  'xs':   '320px',
  'sm':   '540px',
  'md':   '720px',
  'lg':   '960px',
  'xl':   '1140px',
  'xxl':  '1320px',
  'full': '100%',
  'none': 'none',
}
Object.entries(MAX_W_SCALE).forEach(([k, v]) => {
  reg(`max-w-${k}`, 'utilities', `.max-w-${k} { max-width: ${v}; }`)
})

// ─── min-w-* ──────────────────────────────────────────────────────────
reg('min-w-0',      'utilities', `.min-w-0      { min-width: 0; }`)
reg('min-w-full',   'utilities', `.min-w-full   { min-width: 100%; }`)
reg('min-w-screen', 'utilities', `.min-w-screen { min-width: 100vw; }`)

// max-h-* and min-h-* common values
reg('max-h-full',   'utilities', `.max-h-full   { max-height: 100%; }`)
reg('max-h-screen', 'utilities', `.max-h-screen { max-height: 100vh; }`)
reg('max-h-none',   'utilities', `.max-h-none   { max-height: none; }`)
reg('min-h-0',      'utilities', `.min-h-0      { min-height: 0; }`)
reg('min-h-full',   'utilities', `.min-h-full   { min-height: 100%; }`)
reg('min-h-screen', 'utilities', `.min-h-screen { min-height: 100vh; }`)
reg('vw-100',    'utilities', `.vw-100    { width:      100vw; }`)
reg('vh-100',    'utilities', `.vh-100    { height:     100vh; }`)
reg('min-vw-100','utilities', `.min-vw-100{ min-width:  100vw; }`)
reg('min-vh-100','utilities', `.min-vh-100{ min-height: 100vh; }`)
reg('w-auto',    'utilities', `.w-auto    { width:      auto; }`)
reg('h-auto',    'utilities', `.h-auto    { height:     auto; }`)

// ─── Text extras ──────────────────────────────────────────────────────
reg('text-wrap',   'utilities', `.text-wrap   { white-space: normal;   }`)
reg('text-nowrap', 'utilities', `.text-nowrap { white-space: nowrap;   }`)
reg('text-reset',  'utilities', `.text-reset  { color: inherit; text-decoration: none; }`)

;[
  ['fw-light',    '300'],
  ['fw-lighter',  'lighter'],
  ['fw-normal',   '400'],
  ['fw-medium',   '500'],
  ['fw-semibold', '600'],
  ['fw-bold',     '700'],
  ['fw-bolder',   'bolder'],
].forEach(([cls, val]) => reg(cls, 'utilities', `.${cls} { font-weight: ${val}; }`))

reg('fst-italic', 'utilities', `.fst-italic { font-style: italic; }`)
reg('fst-normal', 'utilities', `.fst-normal { font-style: normal; }`)

;[
  ['lh-1',    '1'],
  ['lh-sm',   '1.25'],
  ['lh-base', '1.5'],
  ['lh-lg',   '2'],
].forEach(([cls, val]) => reg(cls, 'utilities', `.${cls} { line-height: ${val}; }`))

reg('font-monospace', 'utilities', `.font-monospace { font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace; }`)

reg('text-decoration-none',         'utilities', `.text-decoration-none         { text-decoration: none;         }`)
reg('text-decoration-underline',    'utilities', `.text-decoration-underline    { text-decoration: underline;    }`)
reg('text-decoration-line-through', 'utilities', `.text-decoration-line-through { text-decoration: line-through; }`)

// ─── Vertical alignment ───────────────────────────────────────────────
;['baseline','top','middle','bottom','text-top','text-bottom'].forEach(v => {
  reg(`align-${v}`, 'utilities', `.align-${v} { vertical-align: ${v}; }`)
})

// ─── Z-index extras ───────────────────────────────────────────────────
reg('z-n1', 'utilities', `.z-n1 { z-index: -1; }`)

// ─── Rounded utilities ────────────────────────────────────────────────
reg('rounded',        'utilities', `.rounded        { border-radius: var(--st-border-radius); }`)
reg('rounded-0',      'utilities', `.rounded-0      { border-radius: 0; }`)
reg('rounded-1',      'utilities', `.rounded-1      { border-radius: 0.25rem; }`)
reg('rounded-2',      'utilities', `.rounded-2      { border-radius: 0.375rem; }`)
reg('rounded-3',      'utilities', `.rounded-3      { border-radius: 0.5rem; }`)
reg('rounded-4',      'utilities', `.rounded-4      { border-radius: 0.75rem; }`)
reg('rounded-5',      'utilities', `.rounded-5      { border-radius: 1rem; }`)
reg('rounded-circle', 'utilities', `.rounded-circle { border-radius: 50%; }`)
reg('rounded-top',    'utilities', `.rounded-top    { border-top-left-radius: var(--st-border-radius); border-top-right-radius: var(--st-border-radius); }`)
reg('rounded-end',    'utilities', `.rounded-end    { border-top-right-radius: var(--st-border-radius); border-bottom-right-radius: var(--st-border-radius); }`)
reg('rounded-bottom', 'utilities', `.rounded-bottom { border-bottom-left-radius: var(--st-border-radius); border-bottom-right-radius: var(--st-border-radius); }`)
reg('rounded-start',  'utilities', `.rounded-start  { border-top-left-radius: var(--st-border-radius); border-bottom-left-radius: var(--st-border-radius); }`)

// ─── Text opacity ────────────────────────────────────────────────────
;[10,25,50,75,100].forEach(n => {
  reg(`text-opacity-${n}`, 'utilities', `.text-opacity-${n} { --st-text-opacity: ${n/100}; }`)
})

// ─── Print display utilities (complete set) ───────────────────────────
;['inline','inline-block','inline-flex','grid','table','table-row','table-cell'].forEach(v => {
  reg(`d-print-${v}`, 'utilities', `@media print { .d-print-${v} { display: ${v}; } }`)
})

// ─── Bootstrap 5.3 subtle colour variants ────────────────────────────
const SUBTLE_COLORS = {
  primary:   { bg: 'rgba(13,110,253,0.1)',   border: 'rgba(13,110,253,0.3)'   },
  secondary: { bg: 'rgba(108,117,125,0.1)',  border: 'rgba(108,117,125,0.3)'  },
  success:   { bg: 'rgba(25,135,84,0.1)',    border: 'rgba(25,135,84,0.3)'    },
  danger:    { bg: 'rgba(220,53,69,0.1)',    border: 'rgba(220,53,69,0.3)'    },
  warning:   { bg: 'rgba(255,193,7,0.1)',    border: 'rgba(255,193,7,0.3)'    },
  info:      { bg: 'rgba(13,202,240,0.1)',   border: 'rgba(13,202,240,0.3)'   },
  light:     { bg: 'rgba(248,249,250,0.5)',  border: 'rgba(248,249,250,0.8)'  },
  dark:      { bg: 'rgba(33,37,41,0.1)',     border: 'rgba(33,37,41,0.3)'     },
}
Object.entries(SUBTLE_COLORS).forEach(([c, { bg, border }]) => {
  reg(`bg-${c}-subtle`,     'utilities', `.bg-${c}-subtle     { background-color: ${bg}; }`)
  reg(`border-${c}-subtle`, 'utilities', `.border-${c}-subtle { border-color: ${border}; }`)
})

// ─── needs-validation ─────────────────────────────────────────────────
reg('needs-validation', 'components', `.needs-validation .form-control:invalid,
.needs-validation .form-select:invalid {
  border-color: var(--st-danger);
}

.needs-validation .form-control:valid,
.needs-validation .form-select:valid {
  border-color: var(--st-success);
}

.needs-validation .form-control:invalid ~ .invalid-feedback,
.needs-validation .form-select:invalid ~ .invalid-feedback {
  display: block;
}

.needs-validation .form-control:valid ~ .valid-feedback,
.needs-validation .form-select:valid ~ .valid-feedback {
  display: block;
}`)

// ─── Tooltip directional variants ────────────────────────────────────
const TOOLTIP_ARROW = `
.tooltip-arrow {
  position:    absolute;
  display:     block;
  width:       0.8rem;
  height:      0.4rem;
}
.tooltip-arrow::before {
  position:   absolute;
  content:    "";
  border-color: transparent;
  border-style: solid;
}`

reg('tooltip-arrow', 'components', TOOLTIP_ARROW)

;[
  ['bs-tooltip-bottom', 'bottom', 'top',    '0.4rem', '0',      'border-bottom-color: rgba(0,0,0,0.7); border-width: 0 0.4rem 0.4rem; top: 0;'],
  ['bs-tooltip-start',  'left',   'right',  '0',      '0.4rem', 'border-left-color:   rgba(0,0,0,0.7); border-width: 0.4rem 0 0.4rem 0.4rem; right: 0; top: 50%; transform: translateY(-50%);'],
  ['bs-tooltip-end',    'right',  'left',   '0',      '0.4rem', 'border-right-color:  rgba(0,0,0,0.7); border-width: 0.4rem 0.4rem 0.4rem 0; left: 0; top: 50%; transform: translateY(-50%);'],
].forEach(([cls, placement, arrowSide, arrowTop, arrowBottom, arrowStyle]) => {
  reg(cls, 'components', `.${cls} { padding: ${arrowTop === '0' ? '0 0.4rem' : '0.4rem 0'}; }
.${cls} .tooltip-arrow { ${arrowSide}: 0; top: ${arrowTop}; bottom: ${arrowBottom}; }
.${cls} .tooltip-arrow::before { ${arrowStyle} }`)
})

// ─── Popover directional variants ────────────────────────────────────
;[
  ['bs-popover-bottom', 'top',    '0.5rem', 'border-bottom-color: var(--st-border); border-width: 0 0.5rem 0.5rem;'],
  ['bs-popover-start',  'right',  '0.5rem', 'border-left-color:   var(--st-border); border-width: 0.5rem 0 0.5rem 0.5rem;'],
  ['bs-popover-end',    'left',   '0.5rem', 'border-right-color:  var(--st-border); border-width: 0.5rem 0.5rem 0.5rem 0;'],
].forEach(([cls, arrowSide, arrowSize, arrowStyle]) => {
  reg(cls, 'components', `.${cls} { margin-${arrowSide}: ${arrowSize}; }
.${cls} > .popover-arrow::before { ${arrowStyle} }`)
})

// ─── List utilities ───────────────────────────────────────────────────

// Remove list styling entirely — resets padding, margin, and list-style
reg('list-unstyled', 'utilities', `.list-unstyled {
  padding-left:  0;
  margin-top:    0;
  margin-bottom: 0;
  list-style:    none;
}`)

// Inline list — items sit side by side
reg('list-inline', 'utilities', `.list-inline {
  padding-left:  0;
  margin-top:    0;
  margin-bottom: 0;
  list-style:    none;
}`)

reg('list-inline-item', 'utilities', `.list-inline-item {
  display: inline-block;
}

.list-inline-item:not(:last-child) {
  margin-right: 0.5rem;
}`)

// list-style-type variants
reg('list-disc',    'utilities', `.list-disc    { list-style-type: disc; }`)
reg('list-decimal', 'utilities', `.list-decimal { list-style-type: decimal; }`)
reg('list-circle',  'utilities', `.list-circle  { list-style-type: circle; }`)
reg('list-square',  'utilities', `.list-square  { list-style-type: square; }`)
reg('list-none',    'utilities', `.list-none    { list-style-type: none; }`)
reg('list-lower-alpha', 'utilities', `.list-lower-alpha { list-style-type: lower-alpha; }`)
reg('list-upper-alpha', 'utilities', `.list-upper-alpha { list-style-type: upper-alpha; }`)
reg('list-lower-roman', 'utilities', `.list-lower-roman { list-style-type: lower-roman; }`)
reg('list-upper-roman', 'utilities', `.list-upper-roman { list-style-type: upper-roman; }`)

// list-style-position variants
reg('list-inside',  'utilities', `.list-inside  { list-style-position: inside; }`)
reg('list-outside', 'utilities', `.list-outside { list-style-position: outside; }`)

// Spaced list — adds breathing room between items
reg('list-spaced', 'utilities', `.list-spaced > li + li { margin-top: 0.5rem; }`)

// ─── Form group ───────────────────────────────────────────────────────
reg('form-group', 'components', `.form-group {
  margin-bottom: 1rem;
}`)

// ─── Outline utilities ────────────────────────────────────────────────
reg('outline-none', 'utilities', `.outline-none { outline: none; }`)

const OUTLINE_COLOR_MAP = {
  primary:   'var(--st-primary)',
  secondary: 'var(--st-secondary)',
  success:   'var(--st-success)',
  danger:    'var(--st-danger)',
  warning:   'var(--st-warning)',
  info:      'var(--st-info)',
  light:     'var(--st-light)',
  dark:      'var(--st-dark)',
}

Object.entries(OUTLINE_COLOR_MAP).forEach(([k, v]) => {
  reg(`outline-${k}`, 'utilities', `.outline-${k} {
  outline: 2px solid ${v};
  outline-offset: 2px;
}`)
})

;[1, 2, 3, 4, 5].forEach(n => {
  reg(`outline-${n}`, 'utilities', `.outline-${n} { outline-width: ${n}px; }`)
})

// ─── Responsive variants ─────────────────────────────────────────────
// Breakpoint-prefixed versions of utilities that were previously static.
// Pattern: {utility}-{bp}-{value}  e.g. flex-md-row, fw-lg-bold, rounded-md-3

const BP_KEYS = Object.keys(BP_VALUES) // sm md lg xl xxl

// Outline — responsive named variants
BP_KEYS.forEach(bp => {
  reg(`outline-${bp}-none`, 'utilities', mq(bp, `.outline-${bp}-none { outline: none; }`))
})
Object.entries(OUTLINE_COLOR_MAP).forEach(([k, v]) => {
  BP_KEYS.forEach(bp => {
    reg(`outline-${bp}-${k}`, 'utilities', mq(bp, `.outline-${bp}-${k} {
  outline: 2px solid ${v};
  outline-offset: 2px;
}`))
  })
})
;[1, 2, 3, 4, 5].forEach(n => {
  BP_KEYS.forEach(bp => {
    reg(`outline-${bp}-${n}`, 'utilities', mq(bp, `.outline-${bp}-${n} { outline-width: ${n}px; }`))
  })
})

// Flex direction
;['row','column','wrap','nowrap','row-reverse','column-reverse'].forEach(v => {
  const prop = ['wrap','nowrap'].includes(v)
    ? `flex-wrap: ${v === 'nowrap' ? 'nowrap' : 'wrap'};`
    : `flex-direction: ${v};`
  BP_KEYS.forEach(bp => {
    reg(`flex-${bp}-${v}`, 'utilities',
      mq(bp, `.flex-${bp}-${v} { ${prop} }`))
  })
})

// Font weight
const FW_MAP = {
  light: '300', lighter: 'lighter', normal: '400',
  medium: '500', semibold: '600', bold: '700', bolder: 'bolder',
}
Object.entries(FW_MAP).forEach(([k, v]) => {
  BP_KEYS.forEach(bp => {
    reg(`fw-${bp}-${k}`, 'utilities',
      mq(bp, `.fw-${bp}-${k} { font-weight: ${v}; }`))
  })
})

// Font style
;['italic','normal'].forEach(v => {
  BP_KEYS.forEach(bp => {
    reg(`fst-${bp}-${v}`, 'utilities',
      mq(bp, `.fst-${bp}-${v} { font-style: ${v}; }`))
  })
})

// Text transform
;['uppercase','lowercase','capitalize','none'].forEach(v => {
  BP_KEYS.forEach(bp => {
    reg(`text-${bp}-${v}`, 'utilities',
      mq(bp, `.text-${bp}-${v} { text-transform: ${v}; }`))
  })
})

// Text decoration
;['none','underline','line-through'].forEach(v => {
  BP_KEYS.forEach(bp => {
    reg(`text-${bp}-decoration-${v}`, 'utilities',
      mq(bp, `.text-${bp}-decoration-${v} { text-decoration: ${v}; }`))
  })
})

// Text wrap
;['wrap','nowrap'].forEach(v => {
  BP_KEYS.forEach(bp => {
    reg(`text-${bp}-${v}`, 'utilities',
      mq(bp, `.text-${bp}-${v} { white-space: ${v === 'nowrap' ? 'nowrap' : 'normal'}; }`))
  })
})

// Border radius
const ROUNDED_SCALE = {
  '0':'0', '1':'0.25rem', '2':'0.375rem', '3':'0.5rem',
  '4':'0.75rem', '5':'1rem',
  'pill':'999px', 'circle':'50%',
}
Object.entries(ROUNDED_SCALE).forEach(([k, v]) => {
  BP_KEYS.forEach(bp => {
    reg(`rounded-${bp}-${k}`, 'utilities',
      mq(bp, `.rounded-${bp}-${k} { border-radius: ${v}; }`))
  })
})
BP_KEYS.forEach(bp => {
  reg(`rounded-${bp}`, 'utilities',
    mq(bp, `.rounded-${bp} { border-radius: var(--st-border-radius); }`))
})

// Border-radius corner-pairs — responsive: rounded-top-md, rounded-end-lg
Object.entries(ROUNDED_SIDE_PROPS).forEach(([side, props]) => {
  BP_KEYS.forEach(bp => {
    reg(`rounded-${side}-${bp}`, 'utilities',
      mq(bp, `.rounded-${side}-${bp} {\n${sideArbitraryDecl(props, 'var(--st-border-radius)', false)}\n}`))
  })
})

// Border sides — responsive named + removal: border-top-md, border-x-lg, border-top-md-0
Object.entries(BORDER_SIDE_PROPS).forEach(([side, props]) => {
  BP_KEYS.forEach(bp => {
    reg(`border-${side}-${bp}`, 'utilities',
      mq(bp, `.border-${side}-${bp} {\n${sideArbitraryDecl(props, '1px solid var(--st-border)', false)}\n}`))
    reg(`border-${side}-${bp}-0`, 'utilities',
      mq(bp, `.border-${side}-${bp}-0 {\n${sideArbitraryDecl(props, '0', false)}\n}`))
  })
})

// Shadow
// BP_KEYS ('sm','md','lg','xl','xxl') overlaps with the named shadow scale's
// own suffixes ('sm','lg') — a bare `shadow-${bp}` registration for bp='sm'
// or bp='lg' collides character-for-character with the base named-scale
// classes `shadow-sm`/`shadow-lg` registered above. Map.set-based reg() lets
// the later call win outright, so that used to silently overwrite the small/
// large shadow classes with "default shadow from this breakpoint up" instead
// — shadow-sm and shadow-lg stopped applying their own strength entirely.
// The k === '' case is also not part of the documented shadow-{bp}-{variant}
// pattern (shadow-md-sm, shadow-lg-lg, ...), so it's dropped rather than
// renamed — nothing documented depended on a bare shadow-{bp} class existing.
const SHADOW_MAP = {
  'sm': 'var(--st-shadow-sm)', '': 'var(--st-shadow)',
  'lg': 'var(--st-shadow-lg)', 'none': 'none',
}
Object.entries(SHADOW_MAP).forEach(([k, v]) => {
  if (!k) return
  BP_KEYS.forEach(bp => {
    reg(`shadow-${bp}-${k}`, 'utilities',
      mq(bp, `.shadow-${bp}-${k} { box-shadow: ${v}; }`))
  })
})

// Width
Object.entries(SIZE_SCALE).forEach(([k, v]) => {
  BP_KEYS.forEach(bp => {
    reg(`w-${bp}-${k}`, 'utilities',
      mq(bp, `.w-${bp}-${k} { width: ${v}; }`))
  })
})

// Height
Object.entries(SIZE_SCALE).forEach(([k, v]) => {
  BP_KEYS.forEach(bp => {
    reg(`h-${bp}-${k}`, 'utilities',
      mq(bp, `.h-${bp}-${k} { height: ${v}; }`))
  })
})

// Opacity
Object.entries(OPACITY_SCALE).forEach(([k, v]) => {
  BP_KEYS.forEach(bp => {
    reg(`opacity-${bp}-${k}`, 'utilities',
      mq(bp, `.opacity-${bp}-${k} { opacity: ${v}; }`))
  })
})

// Overflow
;['auto','hidden','visible','scroll'].forEach(v => {
  BP_KEYS.forEach(bp => {
    reg(`overflow-${bp}-${v}`, 'utilities',
      mq(bp, `.overflow-${bp}-${v} { overflow: ${v}; }`))
    reg(`overflow-x-${bp}-${v}`, 'utilities',
      mq(bp, `.overflow-x-${bp}-${v} { overflow-x: ${v}; }`))
    reg(`overflow-y-${bp}-${v}`, 'utilities',
      mq(bp, `.overflow-y-${bp}-${v} { overflow-y: ${v}; }`))
  })
})

// Position
;['static','relative','absolute','fixed','sticky'].forEach(v => {
  BP_KEYS.forEach(bp => {
    reg(`position-${bp}-${v}`, 'utilities',
      mq(bp, `.position-${bp}-${v} { position: ${v}; }`))
  })
})

// Cursor
;['auto','default','pointer','wait','text','move','not-allowed','grab'].forEach(v => {
  BP_KEYS.forEach(bp => {
    reg(`cursor-${bp}-${v}`, 'utilities',
      mq(bp, `.cursor-${bp}-${v} { cursor: ${v}; }`))
  })
})

// Line height
const LH_MAP = { '1':'1', 'sm':'1.25', 'base':'1.5', 'lg':'2' }
Object.entries(LH_MAP).forEach(([k, v]) => {
  BP_KEYS.forEach(bp => {
    reg(`lh-${bp}-${k}`, 'utilities',
      mq(bp, `.lh-${bp}-${k} { line-height: ${v}; }`))
  })
})

// Visibility
BP_KEYS.forEach(bp => {
  reg(`visible-${bp}`, 'utilities',
    mq(bp, `.visible-${bp} { visibility: visible; }`))
  reg(`invisible-${bp}`, 'utilities',
    mq(bp, `.invisible-${bp} { visibility: hidden; }`))
})

// ─── Arbitrary value patterns — regex fallback ────────────────────────
// Only used when no exact match found in EXACT_MAP

// Every family below is declared twice — once with a breakpoint segment, once
// without — because the two produce different selectors and different output
// (one wrapped in @media, one not). Hand-writing both is what caused
// `w-md-[40%]` to silently generate nothing for as long as it did: the plain
// `w-[…]` twin existed and the responsive one was simply never written, and a
// class that matches no pattern returns null rather than complaining.
//
// `arbFamily` emits both from a single declaration, so a family cannot be
// half-registered any more. `spaces: true` maps underscores to spaces for
// multi-part values (`inset-[0_1rem]`); it is opt-in per family rather than
// universal because a token name may legitimately contain an underscore
// (`w-[var(--my_token)]`), and rewriting that would break the value.
// text-[…] picks its property from the value: a bare length is a font-size,
// anything else is a colour. Shared by the plain and responsive twins.
function textArbitraryProp(val) {
  return /^[\d.]+(px|rem|em|%|vw|vh|ch|ex|pt|cm|mm)$/.test(val) ? 'font-size' : 'color'
}

function arbFamily(prefix, prop, opts = {}) {
  const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const val = (v) => (opts.spaces ? v.replace(/_/g, ' ') : v)
  return [
    { re: new RegExp(`^(!?)${esc}-(sm|md|lg|xl|xxl)-\\[(.+)\\]$`), fn: (m) => {
      const i = m[1] ? ' !important' : ''
      return { layer: 'utilities', css: mq(m[2], `.${escapeClass(m[0])} { ${prop}: ${val(m[3])}${i}; }`) }
    }},
    { re: new RegExp(`^(!?)${esc}-\\[(.+)\\]$`), fn: (m) => {
      const i = m[1] ? ' !important' : ''
      return { layer: 'utilities', css: `.${escapeClass(m[0])} { ${prop}: ${val(m[2])}${i}; }` }
    }},
  ]
}

// Single-property families. Ordered longest-prefix-first where one prefix is a
// prefix of another (`max-w` before `w`), so the more specific pattern wins.
const SIMPLE_ARBITRARY = [
  ...arbFamily('max-w',  'max-width'),
  ...arbFamily('min-w',  'min-width'),
  ...arbFamily('max-h',  'max-height'),
  ...arbFamily('min-h',  'min-height'),
  ...arbFamily('w',      'width'),
  ...arbFamily('h',      'height'),
  ...arbFamily('fs',     'font-size'),
  ...arbFamily('fw',     'font-weight'),
  ...arbFamily('opacity','opacity'),
  ...arbFamily('z',      'z-index'),
  ...arbFamily('top',    'top'),
  ...arbFamily('bottom', 'bottom'),
  ...arbFamily('left',   'left'),
  ...arbFamily('right',  'right'),
  // Logical aliases, matching the named scale above (`start-0` is `left: 0`).
  // The named form existed without an arbitrary twin, so `start-[33%]` was
  // another silent no-op — found by the new build warning, in a shipped example.
  ...arbFamily('start',  'left'),
  ...arbFamily('end',    'right'),
  ...arbFamily('inset',  'inset',            { spaces: true }),
  ...arbFamily('object-position', 'object-position', { spaces: true }),
  // aspect-[16/10], aspect-[4/3], aspect-[1.85]. Unlike letter-spacing and
  // line-height, an aspect ratio is contained to the element's own box and
  // cannot cascade into sibling or descendant alignment, so the arbitrary form
  // carries none of the risk that keeps those two on a closed named scale.
  ...arbFamily('aspect', 'aspect-ratio', { spaces: true }),
  ...arbFamily('cursor', 'cursor'),
  ...arbFamily('duration', 'transition-duration'),
  ...arbFamily('transition', 'transition',   { spaces: true }),
]

const ARBITRARY_PATTERNS = [
  // Spacing arbitrary — responsive: px-sm-[var(--space-40)], py-md-[1rem_2rem]
  { re: /^(!?)(m[trblxyes]?|p[trblxyes]?)-(sm|md|lg|xl|xxl)-\[(.+)\]$/, fn: (m) => {
    const [, imp, prop, bp, val] = m
    const props = SPACING_PROPS[prop]
    if (!props) return null
    const i = imp ? ' !important' : ''
    const decl = props.map(p => `  ${p}: ${val.replace(/_/g,' ')}${i};`).join('\n')
    return { layer: 'utilities', css: mq(bp, `.${escapeClass(m[0])} {\n${decl}\n}`) }
  }},
  // Spacing arbitrary: mt-[12px], !px-[2rem]
  { re: /^(!?)(m[trblxyes]?|p[trblxyes]?)-\[(.+)\]$/, fn: (m) => {
    const [, imp, prop, val] = m
    const props = SPACING_PROPS[prop]
    if (!props) return null
    const i = imp ? ' !important' : ''
    const decl = props.map(p => `  ${p}: ${val.replace(/_/g,' ')}${i};`).join('\n')
    return { layer: 'utilities', css: `.${escapeClass(m[0])} {\n${decl}\n}` }
  }},
  // Text arbitrary: text-[#ff0000] → color, text-[15px] → font-size
  // Values ending in a CSS length unit are font-size; everything else is color.
  // Kept hand-written rather than routed through arbFamily because the property
  // is chosen from the value, not fixed by the family.
  { re: /^(!?)text-(sm|md|lg|xl|xxl)-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: mq(m[2], `.${escapeClass(m[0])} { ${textArbitraryProp(m[3])}: ${m[3]}${i}; }`) }
  }},
  { re: /^(!?)text-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: `.${escapeClass(m[0])} { ${textArbitraryProp(m[2])}: ${m[2]}${i}; }` }
  }},
  // BG arbitrary — responsive: bg-md-[#ff0000]
  // Uses the `background` shorthand so gradients work; solid colours also do.
  ...arbFamily('bg', 'background', { spaces: true }),
  // Border side arbitrary — responsive: border-top-sm-[2px_dashed_red], border-x-md-[...]
  { re: /^(!?)border-(top|end|bottom|start|x|y)-(sm|md|lg|xl|xxl)-\[(.+)\]$/, fn: (m) => {
    const [, imp, side, bp, val] = m
    const props = BORDER_SIDE_PROPS[side]
    if (!props) return null
    return { layer: 'utilities', css: mq(bp, `.${escapeClass(m[0])} {\n${sideArbitraryDecl(props, val, imp)}\n}`) }
  }},
  // Border side arbitrary: border-top-[2px_dashed_red], border-x-[...]
  { re: /^(!?)border-(top|end|bottom|start|x|y)-\[(.+)\]$/, fn: (m) => {
    const [, imp, side, val] = m
    const props = BORDER_SIDE_PROPS[side]
    if (!props) return null
    return { layer: 'utilities', css: `.${escapeClass(m[0])} {\n${sideArbitraryDecl(props, val, imp)}\n}` }
  }},
  // Border arbitrary — responsive: border-sm-[2px_solid_red]
  { re: /^(!?)border-(sm|md|lg|xl|xxl)-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: mq(m[2], `.${escapeClass(m[0])} { border: ${m[3].replace(/_/g,' ')}${i}; }`) }
  }},
  // Border arbitrary: border-[2px_solid_red]
  { re: /^(!?)border-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: `.${escapeClass(m[0])} { border: ${m[2].replace(/_/g,' ')}${i}; }` }
  }},
  // Rounded (border-radius) side arbitrary — responsive: rounded-top-sm-[8px_8px_0_0]
  { re: /^(!?)rounded-(top|end|bottom|start)-(sm|md|lg|xl|xxl)-\[(.+)\]$/, fn: (m) => {
    const [, imp, side, bp, val] = m
    const props = ROUNDED_SIDE_PROPS[side]
    if (!props) return null
    return { layer: 'utilities', css: mq(bp, `.${escapeClass(m[0])} {\n${sideArbitraryDecl(props, val, imp)}\n}`) }
  }},
  // Rounded side arbitrary: rounded-top-[8px_8px_0_0]
  { re: /^(!?)rounded-(top|end|bottom|start)-\[(.+)\]$/, fn: (m) => {
    const [, imp, side, val] = m
    const props = ROUNDED_SIDE_PROPS[side]
    if (!props) return null
    return { layer: 'utilities', css: `.${escapeClass(m[0])} {\n${sideArbitraryDecl(props, val, imp)}\n}` }
  }},
  // Rounded arbitrary — responsive: rounded-sm-[var(--r)]
  { re: /^(!?)rounded-(sm|md|lg|xl|xxl)-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: mq(m[2], `.${escapeClass(m[0])} { border-radius: ${m[3].replace(/_/g,' ')}${i}; }`) }
  }},
  // Rounded arbitrary: rounded-[var(--r)], rounded-[8px_8px_0_0]
  { re: /^(!?)rounded-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: `.${escapeClass(m[0])} { border-radius: ${m[2].replace(/_/g,' ')}${i}; }` }
  }},
  // Shadow arbitrary — responsive: shadow-sm-[0_4px_6px_rgba(0,0,0,0.1)]
  { re: /^(!?)shadow-(sm|md|lg|xl|xxl)-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: mq(m[2], `.${escapeClass(m[0])} { box-shadow: ${m[3].replace(/_/g,' ')}${i}; }`) }
  }},
  // Shadow arbitrary: shadow-[0_4px_6px_rgba(0,0,0,0.1)]
  { re: /^(!?)shadow-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: `.${escapeClass(m[0])} { box-shadow: ${m[2].replace(/_/g,' ')}${i}; }` }
  }},
  // Gap arbitrary — responsive: gap-sm-[var(--space)], gap-md-[1rem_2rem]
  { re: /^(!?)gap-(sm|md|lg|xl|xxl)-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: mq(m[2], `.${escapeClass(m[0])} { gap: ${m[3].replace(/_/g,' ')}${i}; }`) }
  }},
  // Gap arbitrary: gap-[var(--space)], gap-[1rem_2rem]
  { re: /^(!?)gap-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: `.${escapeClass(m[0])} { gap: ${m[2].replace(/_/g,' ')}${i}; }` }
  }},
  // Row-gap arbitrary — responsive: row-gap-sm-[1rem]
  { re: /^(!?)row-gap-(sm|md|lg|xl|xxl)-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: mq(m[2], `.${escapeClass(m[0])} { row-gap: ${m[3].replace(/_/g,' ')}${i}; }`) }
  }},
  // Row-gap arbitrary: row-gap-[1rem]
  { re: /^(!?)row-gap-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: `.${escapeClass(m[0])} { row-gap: ${m[2]}${i}; }` }
  }},
  // Col-gap arbitrary — responsive: col-gap-sm-[1rem]
  { re: /^(!?)col-gap-(sm|md|lg|xl|xxl)-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: mq(m[2], `.${escapeClass(m[0])} { column-gap: ${m[3].replace(/_/g,' ')}${i}; }`) }
  }},
  // Col-gap arbitrary: col-gap-[1rem]
  { re: /^(!?)col-gap-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: `.${escapeClass(m[0])} { column-gap: ${m[2]}${i}; }` }
  }},
  // Gutter arbitrary — responsive: g-sm-[var(--gutter)], gx-md-[2rem], gy-lg-[1rem]
  { re: /^(!?)(g|gx|gy)-(sm|md|lg|xl|xxl)-\[(.+)\]$/, fn: (m) => {
    const [, imp, prop, bp, val] = m
    return { layer: 'utilities', css: mq(bp, `.${escapeClass(m[0])} { ${gutterArbitraryDecl(prop, val, imp)} }`) }
  }},
  // Gutter arbitrary: g-[var(--gutter)], gx-[2rem], gy-[1rem]
  { re: /^(!?)(g|gx|gy)-\[(.+)\]$/, fn: (m) => {
    const [, imp, prop, val] = m
    return { layer: 'utilities', css: `.${escapeClass(m[0])} { ${gutterArbitraryDecl(prop, val, imp)} }` }
  }},
  // Outline arbitrary — responsive: outline-sm-[2px_dashed_red]
  { re: /^(!?)outline-(sm|md|lg|xl|xxl)-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: mq(m[2], `.${escapeClass(m[0])} { outline: ${m[3].replace(/_/g,' ')}${i}; }`) }
  }},
  // Outline arbitrary: outline-[2px_dashed_red]
  { re: /^(!?)outline-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: `.${escapeClass(m[0])} { outline: ${m[2].replace(/_/g,' ')}${i}; }` }
  }},
  // Single-property families, both twins generated from one declaration each.
  // See SIMPLE_ARBITRARY above.
  ...SIMPLE_ARBITRARY,
  // grid-template-columns arbitrary — responsive: gtc-sm-[1fr_1fr]
  { re: /^(!?)gtc-(sm|md|lg|xl|xxl)-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: mq(m[2], `.${escapeClass(m[0])} { grid-template-columns: ${m[3].replace(/_/g,' ')}${i}; }`) }
  }},
  // grid-template-columns arbitrary: gtc-[1fr_1fr], gtc-[260px_1fr]
  { re: /^(!?)gtc-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: `.${escapeClass(m[0])} { grid-template-columns: ${m[2].replace(/_/g,' ')}${i}; }` }
  }},
  // grid-template-rows arbitrary — responsive: gtr-sm-[auto_1fr_auto]
  { re: /^(!?)gtr-(sm|md|lg|xl|xxl)-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: mq(m[2], `.${escapeClass(m[0])} { grid-template-rows: ${m[3].replace(/_/g,' ')}${i}; }`) }
  }},
  // grid-template-rows arbitrary: gtr-[auto_1fr_auto]
  { re: /^(!?)gtr-\[(.+)\]$/, fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: `.${escapeClass(m[0])} { grid-template-rows: ${m[2].replace(/_/g,' ')}${i}; }` }
  }},
]

// ─── Variants — pseudo-classes, pseudo-elements, relational states ───
//
// Authored as one variant per class token: `hover:bg-primary`, never
// `hover:[bg-primary text-white]`. The grouped form cannot work: the HTML
// parser splits `class` on whitespace into a token list before any CSS is
// consulted, so `hover:[a p-3 b]` becomes the tokens `hover:[a`, `p-3`, `b]` —
// the middle one is a bare `p-3` that applies permanently, and the last carries
// no record of which state it belonged to. It fails silently, and no amount of
// scanner intelligence recovers information the parser already discarded.
//
// The class form was chosen over `data-st-hover="a b"`, which measures better
// (constant atomic CSS, ~12% less gzipped HTML at six utilities per state),
// because it has no dead zones: Shopify theme-editor class fields and Liquid
// filters like `link_to` accept a class string and nothing else. The class form
// works everywhere the attribute form does, plus those.
//
// Breakpoints need no new syntax. Strata already spells them infix inside the
// utility (`w-md-[40%]`, `d-md-flex`), so a variant is a pure prefix on an
// existing utility: `hover:w-md-[40%]`. The base utility's CSS already carries
// its own @media, so sub-layer routing keeps working with no change — the rule
// lands in st-utilities-md exactly as `w-md-[40%]` does.

// Simple pseudo-classes: appended to the selector.
const VARIANT_PSEUDO = {
  // Interaction
  'hover': ':hover', 'focus': ':focus', 'focus-visible': ':focus-visible',
  'focus-within': ':focus-within', 'active': ':active', 'visited': ':visited',
  'target': ':target',
  // Form state
  'checked': ':checked', 'indeterminate': ':indeterminate',
  'disabled': ':disabled', 'enabled': ':enabled',
  'required': ':required', 'optional': ':optional',
  'valid': ':valid', 'invalid': ':invalid',
  // :invalid fires on load for empty required fields, so a form looks angry
  // before anyone types. :user-invalid waits for interaction. Both ship, and
  // the docs explain the difference rather than choosing for the author.
  'user-valid': ':user-valid', 'user-invalid': ':user-invalid',
  'in-range': ':in-range', 'out-of-range': ':out-of-range',
  'read-only': ':read-only', 'read-write': ':read-write',
  'placeholder-shown': ':placeholder-shown', 'autofill': ':autofill',
  'default': ':default',
  // Structural
  'first': ':first-child', 'last': ':last-child', 'only': ':only-child',
  'odd': ':nth-child(odd)', 'even': ':nth-child(even)',
  'first-of-type': ':first-of-type', 'last-of-type': ':last-of-type',
  'only-of-type': ':only-of-type', 'empty': ':empty',
}

// Pseudo-elements. `descendants` emits a second rule matching children too —
// you put `marker:text-muted` on a <ul> and mean it for the <li>s.
const VARIANT_ELEMENT = {
  'placeholder':  { sel: '::placeholder' },
  'marker':       { sel: '::marker',    descendants: true },
  'selection':    { sel: '::selection', descendants: true },
  'file':         { sel: '::file-selector-button' },
  'first-line':   { sel: '::first-line' },
  'first-letter': { sel: '::first-letter' },
  'backdrop':     { sel: '::backdrop' },
  // These render nothing without `content`, so it is emitted for them. An
  // author who wants different content overrides it in custom CSS.
  'before':       { sel: '::before', content: true },
  'after':        { sel: '::after',  content: true },
}

// Wrapped in @media rather than matched by a selector.
const VARIANT_MEDIA = {
  'motion-safe':   '(prefers-reduced-motion: no-preference)',
  'motion-reduce': '(prefers-reduced-motion: reduce)',
  'contrast-more': '(prefers-contrast: more)',
  'contrast-less': '(prefers-contrast: less)',
  'forced-colors': '(forced-colors: active)',
  'portrait':      '(orientation: portrait)',
  'landscape':     '(orientation: landscape)',
  'print':         'print',
}

// Matched via an ancestor rather than the element itself.
const VARIANT_ANCESTOR = {
  'rtl': '[dir="rtl"] ',
  'ltr': '[dir="ltr"] ',
}

// Sticky hover on touch devices is the most-reported complaint about hover
// utilities, and gating it later would be a breaking change. Gate from the
// start, as Tailwind does.
const HOVER_MEDIA = '(hover: hover)'

function regexEscape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Rewrite every occurrence of the base class's selector into the variant's.
// The negative lookahead matters: without it, transforming `bg-primary` inside
// a rule that also mentions `.bg-primary-subtle` would corrupt the longer name.
function rewriteSelector(css, escBase, replacement) {
  const re = new RegExp('\\.' + regexEscape(escBase) + '(?![\\w-])', 'g')
  return css.replace(re, replacement)
}

// Split `hover:bg-primary` into its first variant and the remainder. Returns
// null when the leading segment is not a known variant, so an ordinary class
// containing a colon is left alone rather than guessed at.
function splitVariant(className) {
  const i = className.indexOf(':')
  if (i <= 0) return null
  const name = className.slice(0, i)
  const rest = className.slice(i + 1)
  if (!rest) return null
  const known =
    Object.prototype.hasOwnProperty.call(VARIANT_PSEUDO, name)   ||
    Object.prototype.hasOwnProperty.call(VARIANT_ELEMENT, name)  ||
    Object.prototype.hasOwnProperty.call(VARIANT_MEDIA, name)    ||
    Object.prototype.hasOwnProperty.call(VARIANT_ANCESTOR, name) ||
    RELATIONAL_RE.test(name)
  return known ? { name, rest } : null
}

// group-hover / peer-checked and friends. The trigger carries `.group` or
// `.peer`; the styled element carries the variant.
const RELATIONAL_RE = /^(group|peer)-(.+)$/

function lookupVariant(className) {
  const split = splitVariant(className)
  if (!split) return null

  // Recursive, so variants stack: `hover:focus:bg-primary` works, and so does
  // `motion-safe:hover:translate-y-1`, with no special case for the pair.
  const base = lookup(split.rest)
  if (!base || !base.css) return null

  const escBase = escapeClass(split.rest)
  const escFull = escapeClass(className)
  const name    = split.name
  let css       = base.css

  const rel = RELATIONAL_RE.exec(name)
  if (rel) {
    const [, kind, state] = rel
    const pseudo = VARIANT_PSEUDO[state]
    if (!pseudo) return null
    // :where() contributes zero specificity, so a relational utility scores the
    // same (0,2,0) as a plain one. Without it the trigger marker would add
    // specificity and relational utilities would silently outrank normal ones.
    const combinator = kind === 'group' ? ' ' : ' ~ '
    const prefix = `:where(.${kind})${pseudo}${combinator}`
    css = rewriteSelector(css, escBase, prefix + '.' + escFull)
    // Same touch-device reasoning as plain hover.
    if (state === 'hover') css = `@media ${HOVER_MEDIA} { ${css} }`
    return { layer: base.layer, css }
  }

  if (VARIANT_ANCESTOR[name]) {
    // Two selectors, because `dir` is usually on an ancestor (<html dir="rtl">)
    // but may sit on the element itself. Both score (0,2,0), so the flat
    // specificity guarantee holds either way.
    const dir = VARIANT_ANCESTOR[name].trim()
    css = rewriteSelector(css, escBase,
      `${dir} .${escFull}, ${dir}.${escFull}`)
    return { layer: base.layer, css }
  }

  if (VARIANT_MEDIA[name]) {
    css = rewriteSelector(css, escBase, '.' + escFull)
    return { layer: base.layer, css: `@media ${VARIANT_MEDIA[name]} { ${css} }` }
  }

  const el = VARIANT_ELEMENT[name]
  if (el) {
    const own = '.' + escFull + el.sel
    const replacement = el.descendants
      ? `.${escFull} ${el.sel}, ${own}`
      : own
    css = rewriteSelector(css, escBase, replacement)
    if (el.content) {
      // Insert into the declaration block belonging to the selector we just
      // built, not merely the first `{` in the string — that would be the
      // @media wrapper for a responsive base utility.
      css = css.replace(own + ' {', own + ' { content: "";')
    }
    return { layer: base.layer, css }
  }

  const pseudo = VARIANT_PSEUDO[name]
  if (!pseudo) return null
  css = rewriteSelector(css, escBase, '.' + escFull + pseudo)
  if (name === 'hover') css = `@media ${HOVER_MEDIA} { ${css} }`
  return { layer: base.layer, css }
}

// ─── Lookup — O(1) first, regex fallback ─────────────────────────────

const resultCache = new Map()

function lookup(className) {
  // L1 cache — fastest
  if (resultCache.has(className)) return resultCache.get(className)

  // L2 — exact map — O(1)
  if (EXACT_MAP.has(className)) {
    const result = EXACT_MAP.get(className)
    resultCache.set(className, result)
    return result
  }

  // L3 — variants. Must precede the bracket fast-path below, or every
  // bracket-less variant (`hover:bg-primary`) would be rejected before it is
  // ever considered. Gated on a colon so ordinary class names skip it, keeping
  // the cost off the common path.
  if (className.indexOf(':') !== -1) {
    const variant = lookupVariant(className)
    resultCache.set(className, variant)
    return variant
  }

  // L4 — arbitrary value patterns — O(patterns)
  // Every arbitrary pattern requires a bracket — skip the whole loop for
  // bracket-less classes (the majority of custom class names in real projects)
  if (className.indexOf('[') === -1) {
    resultCache.set(className, null)
    return null
  }

  for (let i = 0; i < ARBITRARY_PATTERNS.length; i++) {
    const m = className.match(ARBITRARY_PATTERNS[i].re)
    if (m) {
      const result = ARBITRARY_PATTERNS[i].fn(m)
      if (result) {
        resultCache.set(className, result)
        return result
      }
    }
  }

  resultCache.set(className, null)
  return null
}

function clearResultCache() {
  resultCache.clear()
}

module.exports = { lookup, EXACT_MAP, ARBITRARY_PATTERNS, escapeClass, parseArbitrary, clearResultCache }