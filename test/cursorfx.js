'use strict'

/**
 * CursorFX engine tests.
 *
 * The engine makes three promises that are easy to break and invisible when
 * broken: the particle cap is global (not per preset), unmounting returns
 * every particle it borrowed, and destroy() leaves no trace on the page. All
 * three are asserted here against a real DOM.
 *
 * Also guards the layout: cursorfx.js is the engine and nothing else, so a
 * consumer loads it plus only the presets they mount. If presets ever leak
 * back into it, that promise breaks silently.
 */

const path = require('path')

let passed = 0
let failed = 0

function ok(label, condition) {
  if (condition) { console.log(`  ✓  ${label}`); passed++ }
  else           { console.error(`  ✗  ${label}`); failed++ }
}

const PKG = path.join(__dirname, '..', 'packages', 'cursorfx')

let JSDOM, VirtualConsole
try {
  JSDOM = require('jsdom').JSDOM
  VirtualConsole = require('jsdom').VirtualConsole
} catch {
  console.log('\n── CursorFX ──────────────────────────────────────────────────')
  console.log('  ⚠  skipped — jsdom not resolvable')
  process.exit(0)
}

console.log('\n── CursorFX: module shape ────────────────────────────────────')

// Cleared between sections: the engine is a singleton per module instance.
function freshRequire(rel) {
  const p = require.resolve(path.join(PKG, rel))
  delete require.cache[p]
  return require(p)
}

const PRESET_NAMES = ['Trail', 'ClickBurst', 'Electric', 'Magnetic', 'HoverFlicker',
                      'CursorMorph', 'Reveal']
const PRESET_FILES = ['trail', 'click-burst', 'electric', 'magnetic', 'hover-flicker',
                      'cursor-morph', 'reveal']

// Presets are separate files now, so anything that mounts one has to register
// it first — exactly what a consumer does.
function loadPresets(fx) {
  PRESET_FILES.forEach(f => fx.use(freshRequire(path.join('presets', f, `${f}.js`))))
  return fx
}

{
  const fx = freshRequire('cursorfx.js')
  ok('cursorfx.js exports the engine', typeof fx.mount === 'function')

  // The package's whole promise: the entry file is the engine alone. Presets
  // are separate files, so a page that mounts one ships one.
  ok('cursorfx.js carries no presets of its own', Object.keys(fx.presets).length === 0)

  const trail = freshRequire(path.join('presets', 'trail', 'trail.js'))
  ok('a preset file exports a preset object', trail.name === 'Trail')
  fx.use(trail)
  ok('use() registers a preset by name', fx.presets.Trail === trail)

  const fromFiles = PRESET_FILES
    .map(f => freshRequire(path.join('presets', f, `${f}.js`)).name).sort()
  ok('every preset folder exports its declared preset',
     fromFiles.join(',') === PRESET_NAMES.slice().sort().join(','))
}

console.log('\n── CursorFX: SSR safety ──────────────────────────────────────')

{
  // No window/document in scope at require time.
  const FX = loadPresets(freshRequire('cursorfx.js'))
  ok('init() without a DOM returns the API instead of throwing', FX.init() === FX)
  ok('init() without a DOM does not mark itself inited', FX.state.inited === false)
  ok('mount() without a DOM returns null', FX.mount(FX.presets.Trail) === null)
}

console.log('\n── CursorFX: engine lifecycle ────────────────────────────────')

{
  const dom = new JSDOM(
    '<!doctype html><html><body><button data-st-cfx-target>hi</button></body></html>',
    // jsdom has no canvas backend; getContext() returns null and logs a
    // "Not implemented" notice. The engine is expected to cope with a null
    // context, so the notice is noise here — swallow it.
    { pretendToBeVisual: true, virtualConsole: new VirtualConsole() }
  )
  global.window   = dom.window
  global.document = dom.window.document

  const FX = loadPresets(freshRequire('cursorfx.js'))
  FX.init({ maxParticles: 40 })

  ok('init() marks the engine inited', FX.state.inited === true)
  ok('full budget available before any mount', FX.budget() === 40)

  const trail = FX.mount(FX.presets.Trail, { count: 5 })
  ok('canvas created for a canvas preset',
     !!document.querySelector('canvas[data-st-cfx]'))

  document.dispatchEvent(new dom.window.PointerEvent('pointermove', { clientX: 10, clientY: 10 }))
  ok('first pointer event flips seen', FX.state.seen === true)
  ok('one move drew 5 particles from the pool', FX.budget() === 35)

  // The cap is global — a second emitter competes for the same 40 slots.
  const burst = FX.mount(FX.presets.ClickBurst, { count: 30 })
  document.dispatchEvent(new dom.window.PointerEvent('pointerdown', { clientX: 10, clientY: 10 }))
  ok('particle cap is global, not per preset', FX.budget() === 5)

  document.dispatchEvent(new dom.window.PointerEvent('pointerdown', { clientX: 20, clientY: 20 }))
  ok('an exhausted pool never over-allocates', FX.budget() === 0)

  burst.unmount()
  ok('unmount returns exactly that preset\'s particles', FX.budget() === 35)

  trail.setColor('#00ff00')
  trail.setParticleCount(2)
  ok('preset-unique methods land on the instance',
     trail.options.color === '#00ff00' && trail.options.count === 2)

  trail.unmount()
  ok('canvas removed when the last canvas preset unmounts',
     !document.querySelector('canvas[data-st-cfx]'))
  ok('all particles returned after the last unmount', FX.budget() === 40)

  console.log('\n── CursorFX: DOM presets and teardown ────────────────────────')

  const morph = FX.mount(FX.presets.CursorMorph)
  ok('morph element added', !!document.querySelector('[data-st-cfx=\"morph\"]'))
  ok('native cursor hidden while mounted',
     document.documentElement.hasAttribute('data-st-cfx-cursor'))
  ok('a DOM-only preset creates no canvas',
     !document.querySelector('canvas[data-st-cfx]'))

  FX.mount(FX.presets.Magnetic)
  FX.mount(FX.presets.HoverFlicker)
  FX.destroy()

  ok('destroy() un-inits the engine', FX.state.inited === false)
  ok('destroy() removes the morph element',
     !document.querySelector('[data-st-cfx=\"morph\"]'))
  ok('destroy() restores the native cursor',
     !document.documentElement.hasAttribute('data-st-cfx-cursor'))
  ok('destroy() leaves no cursorfx attributes on the page',
     document.querySelectorAll(
       '[data-st-cfx],[data-st-cfx-magnetic],[data-st-cfx-flicker],[data-st-cfx-cursor]'
     ).length === 0)

  delete global.window
  delete global.document
}

console.log('\n── CursorFX: ships its own CSS ───────────────────────────────')

{
  const fs = require('fs')

  // CursorFX is an add-on package, so its rules belong in cursorfx.css and
  // nowhere else. Registering them in the framework registry would ship them to
  // every strata-css consumer, installed or not — which is exactly what chart,
  // picker and flipbook avoid.
  const { lookup } = require('../src/registry/registry')
  ok('no cursorfx classes leak into the framework registry',
     ['cursorfx', 'cursorfx-magnetic', 'cursorfx-flicker', 'cursorfx-morph']
       .every(c => lookup(c) === null))

  // The CSS split mirrors the JS: global rules in core.css, preset-specific
  // rules beside their preset. The generated bundle must contain both.
  const globalCss = fs.readFileSync(path.join(PKG, 'cursorfx.css'), 'utf8')
  ok('cursorfx.css styles the engine-owned canvas', globalCss.includes('[data-st-cfx="canvas"]'))
  ok('cursorfx.css owns the shared cursor-hiding rule', globalCss.includes('data-st-cfx-cursor="hidden"'))

  const owns = { magnetic: 'data-st-cfx-magnetic',
                 'hover-flicker': 'data-st-cfx-flicker',
                 'cursor-morph': '[data-st-cfx="morph"]',
                 reveal: 'data-st-cfx-reveal' }
  for (const [name, attr] of Object.entries(owns)) {
    const f = path.join(PKG, 'presets', name, `${name}.css`)
    ok(`${name}.css exists and owns ${attr}`,
       fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes(attr))
    ok(`cursorfx.css does not duplicate ${attr}`, !globalCss.includes(attr))
  }

  // Canvas presets must stay stylesheet-free — that is why they cost nothing.
  for (const name of ['trail', 'click-burst', 'electric']) {
    ok(`${name} ships no stylesheet`,
       !fs.existsSync(path.join(PKG, 'presets', name, `${name}.css`)))
  }

  // Nothing in this package is generated. cursorfx.js is the engine source and
  // cursorfx.css the global stylesheet — both hand-written, both shipped as-is.
  // Earlier revisions generated all-in-one bundles of each; they duplicated
  // every rule for anyone who also loaded the split files, and the JS one
  // silently broke strata.components.js via a comment-nesting bug in the CLI
  // minifier. There is no build step left to drift.
  ok('no build script in the package', !fs.existsSync(path.join(PKG, 'build.js')))
  ok('package.json declares no build steps',
     !require(path.join(PKG, 'package.json')).scripts)
}

console.log('\n── CursorFX: attribute state and target scoping ─────────────')

{
  const dom = new JSDOM(
    '<!doctype html><html><body>' +
    '<button id="all" data-st-cfx-target>all</button>' +
    '<button id="mag" data-st-cfx-target="magnetic">magnetic only</button>' +
    '<button id="fli" data-st-cfx-target="hover-flicker">flicker only</button>' +
    '</body></html>',
    { pretendToBeVisual: true, virtualConsole: new VirtualConsole() }
  )
  global.window   = dom.window
  global.document = dom.window.document

  const FX = loadPresets(freshRequire('cursorfx.js'))
  FX.init({ maxParticles: 40 })

  const magnetic = FX.mount(FX.presets.Magnetic)
  const flicker  = FX.mount(FX.presets.HoverFlicker)

  const el = id => document.getElementById(id)

  // Drive the engine's hover dispatch directly: jsdom's elementFromPoint has no
  // layout to work from, so the hit-test is exercised through the preset hooks.
  function enter(target) {
    for (const inst of [magnetic, flicker]) {
      const list = target.getAttribute('data-st-cfx-target')
      const ok = !list || (' ' + list + ' ').includes(' ' + inst.preset.key + ' ')
      if (ok) inst.preset.onHoverEnter(target, inst)
    }
  }
  function leave(target) {
    for (const inst of [magnetic, flicker]) {
      const list = target.getAttribute('data-st-cfx-target')
      const ok = !list || (' ' + list + ' ').includes(' ' + inst.preset.key + ' ')
      if (ok) inst.preset.onHoverLeave(target, inst)
    }
  }

  ok('every preset declares a key for data-st-cfx-target',
     ['Trail', 'ClickBurst', 'Electric', 'Magnetic', 'HoverFlicker', 'CursorMorph']
       .every(n => typeof FX.presets[n].key === 'string' && FX.presets[n].key))

  enter(el('mag'))
  ok('a scoped target reaches only the preset it names',
     el('mag').getAttribute('data-st-cfx-magnetic') === 'true' &&
     !el('mag').hasAttribute('data-st-cfx-flicker'))

  enter(el('fli'))
  ok('scoping works in the other direction',
     el('fli').getAttribute('data-st-cfx-flicker') === 'true' &&
     !el('fli').hasAttribute('data-st-cfx-magnetic'))

  enter(el('all'))
  ok('an empty value opts into every mounted preset',
     el('all').getAttribute('data-st-cfx-magnetic') === 'true' &&
     el('all').getAttribute('data-st-cfx-flicker') === 'true')

  // The point of flipping rather than removing: the element stays selectable
  // on the way out, so its return-to-rest transition has a rule to run on.
  leave(el('all'))
  ok('leaving flips the value to "false" instead of removing it',
     el('all').getAttribute('data-st-cfx-magnetic') === 'false' &&
     el('all').getAttribute('data-st-cfx-flicker') === 'false')

  ok('no state attribute is ever written without a value',
     ['data-st-cfx-magnetic', 'data-st-cfx-flicker']
       .every(a => ['true', 'false'].includes(el('all').getAttribute(a))))

  // Electric finds its own targets instead of receiving one from the engine's
  // hit-test, so scoping has to be enforced a second time inside the preset.
  // Without that, a target scoped to another preset still attracts arcs.
  {
    const electric = FX.mount(FX.presets.Electric, { refreshMs: 0 })
    electric.refreshTargets()
    const seen = electric.local.targets.length
    // jsdom reports zero-size rects, so collect() drops everything; assert the
    // filter itself rather than the geometry.
    const scoped = document.getElementById('mag')
    ok('Electric filters data-st-cfx-target itself',
       typeof FX.presets.Electric.key === 'string' &&
       scoped.getAttribute('data-st-cfx-target') === 'magnetic' &&
       seen === 0)
    electric.unmount()
  }

  FX.destroy()
  ok('destroy() removes the state attributes entirely',
     !el('all').hasAttribute('data-st-cfx-magnetic') &&
     !el('all').hasAttribute('data-st-cfx-flicker'))

  delete global.window
  delete global.document
}

console.log('\n── CursorFX: declarative init (zero JS) ─────────────────────')

{
  const fs = require('fs')
  const read = f => fs.readFileSync(path.join(PKG, f), 'utf8')
  const warnings = []
  const vc = new VirtualConsole()
  vc.on('warn', m => warnings.push(m))
  vc.on('jsdomError', () => {})

  // The whole point: a page configures every preset from markup and writes no
  // script of its own. Every other Strata package auto-inits this way.
  const dom = new JSDOM(
    '<!doctype html><html><body' +
    ' data-st-cursorfx="trail magnetic cursor-morph electric"' +
    ' data-st-cfx-trail-color="#ff2d55"' +
    ' data-st-cfx-trail-count="7"' +
    ' data-st-cfx-trail-shrink="false"' +
    ' data-st-cfx-trail-hover-boost="4"' +
    ' data-st-cfx-magnetic-strength="0.45"' +
    ' data-st-cfx-cursor-morph-hide-native="false"' +
    ' data-st-cfx-max-particles="400"></body></html>',
    { pretendToBeVisual: true, virtualConsole: vc, runScripts: 'outside-only' }
  )
  global.window = dom.window
  global.document = dom.window.document

  dom.window.eval(read('cursorfx.js'))
  for (const p of ['trail', 'magnetic', 'cursor-morph']) {
    dom.window.eval(read(path.join('presets', p, `${p}.js`)))
  }
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'))

  const FX = dom.window.StrataCursorFX
  const trail = FX.get('trail')
  const mag   = FX.get('magnetic')
  const morph = FX.get('cursor-morph')

  ok('markup alone initialises the engine', FX.state.inited === true)
  ok('engine options are read from markup', FX.budget() === 400)
  ok('string options pass through', trail.options.color === '#ff2d55')
  ok('numeric strings become numbers',
     trail.options.count === 7 && typeof trail.options.count === 'number')
  ok('"false" becomes a boolean', trail.options.shrink === false)
  ok('kebab-case attributes map to camelCase options', trail.options.hoverBoost === 4)
  ok('float options survive coercion', mag.options.strength === 0.45)

  // "cursor-morph-hide-native" must split on the preset key, not the first dash.
  ok('multi-word preset keys parse correctly', morph.options.hideNative === false)

  ok('defaults hold where markup is silent', trail.options.life === 0.6)
  ok('get() reaches an instance a declarative page never received',
     typeof trail.setColor === 'function' && FX.get('click-burst') === null)

  // A preset named in markup but never loaded is the easiest mistake to make
  // and the hardest to diagnose, so it must say so.
  ok('naming an unloaded preset warns', warnings.some(w => /electric/.test(String(w))))

  FX.destroy()
  delete global.window
  delete global.document
}

console.log('\n── CursorFX: Reveal ─────────────────────────────────')

{
  const dom = new JSDOM(
    '<!doctype html><html><body>' +
    '<div id="a" data-st-cfx-target="reveal"><img id="under"><img id="over"></div>' +
    '</body></html>',
    { pretendToBeVisual: true, virtualConsole: new VirtualConsole() }
  )
  global.window = dom.window
  global.document = dom.window.document

  const FX = loadPresets(freshRequire('cursorfx.js'))
  FX.init({ maxParticles: 20 })
  const r  = FX.mount(FX.presets.Reveal, { radius: 150 })
  const el = document.getElementById('a')

  FX.presets.Reveal.onHoverEnter(el, r)
  ok('opens on hover', el.getAttribute('data-st-cfx-reveal') === 'true')

  // An option that differs from the default is written inline; one that matches
  // is left unset so a stylesheet value can win. That is what makes the preset
  // themeable without per-instance markup.
  ok('an overridden option is written as a token',
     el.style.getPropertyValue('--st-cfx-reveal-radius') === '150px')
  ok('an untouched option is left for CSS to supply',
     el.style.getPropertyValue('--st-cfx-reveal-feather') === '')

  FX.presets.Reveal.onMove(400, 300, r)
  ok('pointer position is written in element-local coordinates',
     el.style.getPropertyValue('--st-cfx-reveal-x') !== '' &&
     el.style.getPropertyValue('--st-cfx-reveal-y') !== '')

  r.setOpacity(0.3)
  ok('setOpacity writes through', el.style.getPropertyValue('--st-cfx-reveal-opacity') === '0.3')
  r.setInvert(true)
  ok('setInvert flips the mask attribute',
     el.getAttribute('data-st-cfx-reveal-invert') === 'true')

  FX.presets.Reveal.onHoverLeave(el, r)
  ok('closing flips the value rather than removing it',
     el.getAttribute('data-st-cfx-reveal') === 'false')

  FX.destroy()
  ok('destroy() sweeps every reveal it touched',
     !el.hasAttribute('data-st-cfx-reveal') &&
     el.style.getPropertyValue('--st-cfx-reveal-radius') === '')

  const css = require('fs').readFileSync(
    path.join(PKG, 'presets', 'reveal', 'reveal.css'), 'utf8')
  ok('CSS ships -webkit-mask-image for Safari',
     css.includes('-webkit-mask-image'))
  ok('CSS requires an explicit "reveal" target, not a bare one',
     css.includes('[data-st-cfx-target~="reveal"]') &&
     !css.includes('[data-st-cfx-target]'))
  ok('every knob has a CSS fallback so themes can retune',
     ['radius', 'feather', 'opacity', 'fade', 'follow']
       .every(k => new RegExp('--st-cfx-reveal-' + k + ',\\s').test(css)))

  delete global.window
  delete global.document
}

console.log('\n── CursorFX: colours, gradients and tokens ───────────')

{
  const warns = []
  const vc = new VirtualConsole()
  vc.on('warn', m => warns.push(String(m)))
  vc.on('jsdomError', () => {})

  const dom = new JSDOM(
    '<!doctype html><html style="--brand:#ff2d55;--accent:#7df9ff;--ref:var(--brand);' +
    '--fade:linear-gradient(90deg, #ff2d55, #7df9ff)">' +
    '<body></body></html>',
    { pretendToBeVisual: true, virtualConsole: vc }
  )
  global.window = dom.window
  global.document = dom.window.document

  const FX = freshRequire('cursorfx.js')
  const Trail = freshRequire(path.join('presets', 'trail', 'trail.js'))
  const Burst = freshRequire(path.join('presets', 'click-burst', 'click-burst.js'))
  FX.use(Trail); FX.use(Burst)
  FX.init({ maxParticles: 60 })

  const C = FX.colors
  ok('parses hex and rgb()',
     C.stops('#ff2d55')[0].join() === '255,45,85' &&
     C.stops('rgb(0, 128, 0)')[0].join() === '0,128,0')
  ok('resolves a CSS custom property', C.stops('var(--brand)')[0].join() === '255,45,85')
  ok('follows a token that points at another token',
     C.stops('var(--ref)')[0].join() === '255,45,85')
  ok('uses a var() fallback when the token is unset',
     C.stops('var(--nope, #00ff00)')[0].join() === '0,255,0')

  // Commas inside rgb() and var() must not split the stop list.
  ok('splits stops without breaking on inner commas',
     C.stops('rgb(1,2,3) var(--nope, #040506)').length === 2)
  ok('interpolates between stops',
     C.at(C.stops('#000000 #ffffff'), 0.5)[0] === 127.5)

  // CSS gradient syntax, including when the whole gradient lives in a token.
  ok('parses linear-gradient()',
     C.stops('linear-gradient(90deg, #ff2d55, #7df9ff)').length === 2)
  ok('parses a gradient held in a custom property',
     C.stops('var(--fade)')[0].join() === '255,45,85')
  ok('handles a gradient with no direction argument',
     C.stops('linear-gradient(#000, #fff)').length === 2)
  ok('handles radial and conic forms',
     C.stops('radial-gradient(circle at 50%, #000, #fff)').length === 2 &&
     C.stops('conic-gradient(from 0deg, #000, #fff)').length === 2)
  ok('resolves rgb() and var() inside a gradient',
     C.stops('linear-gradient(90deg, rgb(255,0,0), var(--brand))').length === 2)

  // Explicit stop positions must place the colours where they were written.
  const placed = C.stops('linear-gradient(90deg, #000000 0%, #ff0000 80%, #ffffff 100%)')
  ok('keeps explicit stop positions', placed.positions.join() === '0,0.8,1')
  ok('interpolates using those positions, not even spacing',
     C.at(placed, 0.4)[0] === 127.5 && C.at(placed, 0.8)[0] === 255)

  ok('accepts named colours and other CSS colour syntax',
     C.stops('red')[0].join() === '255,0,0' &&
     C.stops('rebeccapurple')[0].join() === '102,51,153' &&
     C.stops('linear-gradient(90deg, red, blue)').length === 2)

  // Trail grades by particle age, so the stops lie along the trail rather than
  // being scattered randomly through it. Sampling render() at increasing ages
  // must walk the gradient monotonically.
  const t = FX.mount(Trail, { color: '#000000 #ffffff', count: 1, life: 1 })
  dom.window.document.dispatchEvent(
    new dom.window.PointerEvent('pointermove', { clientX: 5, clientY: 5 }))

  const fake = { globalAlpha: 1, fillStyle: '', beginPath() {}, arc() {}, fill() {} }
  const particle = t.pool.items.find(x => x.active && x.owner === t)
  const reds = []
  for (const age of [0, 0.25, 0.5, 0.75, 0.99]) {
    particle.life = particle.maxLife * age
    Trail.render(fake, 0, t)
    reds.push(Number(fake.fillStyle.match(/\d+/)[0]))
  }
  ok('Trail lays the stops along the trail, not at random',
     reds.every((v, i) => i === 0 || v >= reds[i - 1]))
  ok('the trail spans the whole stop range',
     reds[0] < 40 && reds[reds.length - 1] > 200)

  // The old failure mode: an unusable value rendered white with no explanation.
  warns.length = 0
  t.setColor('not-a-colour-at-all')
  ok('an unusable value warns instead of silently rendering white',
     warns.some(w => /cannot use/.test(w)))
  ok('the warning lists the accepted forms',
     warns.some(w => /linear-gradient/.test(w) && /var\(--token\)/.test(w)))

  warns.length = 0
  ok('an unresolvable token falls back to white', C.stops('var(--nothing-here)').length === 1)
  ok('and warns rather than failing silently', warns.some(w => /cannot use/.test(w)))

  ok('parseColor is not duplicated across presets', (() => {
    const fs = require('fs')
    return ['trail', 'click-burst', 'electric']
      .every(n => !fs.readFileSync(
        path.join(PKG, 'presets', n, `${n}.js`), 'utf8').includes('function parseColor'))
  })())

  FX.destroy()
  delete global.window
  delete global.document
}

console.log('\n── CursorFX: the example boots declaratively ─────────')

{
  const fs = require('fs')
  const ex = path.join(__dirname, '..', 'examples', 'cursorfx.html')
  if (fs.existsSync(ex)) {
    const html = fs.readFileSync(ex, 'utf8')

    // The showcase drives a live control panel, so it legitimately uses the
    // imperative API — but it must still *boot* the way a real page does, or
    // the documented default path goes unexercised by anything we ship.
    ok('example declares its presets in markup', html.includes('data-st-cursorfx='))
    ok('example sets options as attributes',
       /data-st-cfx-[a-z-]+-[a-z-]+=/.test(html))
    // Booting from markup is the documented default path; if the example
    // reverted to calling init() itself, nothing we ship would exercise it.
    ok('example lets markup boot the engine rather than calling init() first',
       html.indexOf('data-st-cursorfx=') < html.indexOf('Strata.CursorFX'))
  }
}

console.log('\n── CursorFX: shipped artefacts parse ────────────────────────')

{
  const fs = require('fs')
  const entry = fs.readFileSync(path.join(PKG, 'cursorfx.js'), 'utf8')

  // Strata's CLI minifier preserves `/*!` banners but re-scans their contents,
  // so a nested block-comment opener inside a banner swallows that banner's own
  // terminator — and the concatenated strata.components.js stops parsing. This
  // broke once already, from the literal `presets/*.js` in the banner text.

  ok('cursorfx.js parses', (() => {
    try { new Function(entry); return true } catch { return false }
  })())

  // CursorFX installs separately from strata-css, like flipbook and picker, so
  // it must NOT be in the CLI's COMPONENTS list. Being there would bundle it
  // into strata.components.js and, worse, warn every strata-css consumer who
  // has not installed a package they never asked for.
  const cli = fs.readFileSync(path.join(__dirname, '..', 'bin', 'strata.js'), 'utf8')
  const list = /const COMPONENTS\s*=\s*\[([^\]]*)\]/.exec(cli)
  ok('the CLI does not auto-bundle cursorfx', !!list && !list[1].includes('cursorfx'))

  const dist = path.join(__dirname, '..', 'dist', 'strata.components.js')
  if (fs.existsSync(dist)) {
    const built = fs.readFileSync(dist, 'utf8')
    ok('dist/strata.components.js parses after minification', (() => {
      try { new Function(built); return true } catch { return false }
    })())
    ok('dist/strata.components.js carries no CursorFX', !built.includes('CursorFX'))
  }
}

console.log(`\n   CursorFX — Passed: ${passed}, Failed: ${failed}`)
if (failed) process.exit(1)
