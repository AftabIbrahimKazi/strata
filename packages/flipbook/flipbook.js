/**
 * @strata-packages/flipbook
 * Version: 1.5.0
 *
 * Peer dependencies (load before this file):
 *   PDF source  : pdfjs-dist   (Apache-2.0)
 *   HTML export : html2canvas  (MIT)
 *   PDF export  : pdf-lib      (MIT)
 *
 * Usage (standalone):
 *   <script src="flipbook.js"></script>
 *   StrataFlipbook('#el', { source: 'html', content: [...] })
 *   StrataFlipbook.init('#el', { ... })   // same thing
 *
 * Usage (with Strata):
 *   Available as Strata.Flipbook
 *
 * Swiper-like zero-config:
 *   <div id="book"><div>Page 1</div><div>Page 2</div></div>
 *   StrataFlipbook('#book')
 */

;(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory)
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory()
  } else {
    var api = factory()
    if (root.Strata) root.Strata.Flipbook = api
    else root.StrataFlipbook = api
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  var doc = typeof document !== 'undefined' ? document : null
  var registry = new Map()

  // ─── DOM helpers ───────────────────────────────────────────────────────────

  function resolveEl(selector) {
    if (!selector) return null
    if (selector instanceof Element) return selector
    if (typeof selector === 'string') return doc.querySelector(selector)
    return null
  }

  function emit(name, detail) {
    if (!doc) return
    doc.dispatchEvent(new CustomEvent(name, { detail: detail, bubbles: true }))
  }

  function makeEl(tag, cls, attrs) {
    var el = doc.createElement(tag)
    if (cls) el.className = cls
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]) })
    return el
  }

  // ─── Lazy dependency loading ─────────────────────────────────────────────────
  // Heavy peer deps (pdf.js, html2canvas, pdf-lib) are fetched only when the
  // feature that needs them is first used — never at page load. If the global is
  // already present (pre-loaded by the host), it's used as-is and nothing fetches.
  var scriptCache = {}

  function loadScript(url) {
    if (!doc) return Promise.reject(new Error('no document'))
    if (scriptCache[url]) return scriptCache[url]
    scriptCache[url] = new Promise(function (resolve, reject) {
      var s = doc.createElement('script')
      s.src = url; s.async = true
      s.onload  = function () { resolve() }
      s.onerror = function () { scriptCache[url] = null; reject(new Error('Failed to load ' + url)) }
      doc.head.appendChild(s)
    })
    return scriptCache[url]
  }

  // Resolve a global, lazy-loading it from `url` if absent. `getter` is re-run
  // after the script loads so it reads the freshly-defined global.
  function ensureGlobal(getter, url, label) {
    var existing = getter()
    if (existing) return Promise.resolve(existing)
    if (!url) return Promise.reject(new Error('[StrataFlipbook] ' + (label || 'dependency') + ' not found and no URL configured.'))
    return loadScript(url).then(function () {
      var g = getter()
      if (!g) throw new Error('[StrataFlipbook] ' + (label || 'dependency') + ' did not register after loading ' + url)
      return g
    })
  }

  // ─── Spread model ──────────────────────────────────────────────────────────
  // Spread 0  : [null, 0]           — cover (right only)
  // Spread N  : [2N-1, 2N]          — inner spreads
  // Last      : [last, null]        — back cover if odd page count after cover

  function computeSpreads(count) {
    var s = [[null, 0]]
    var i = 1
    while (i < count) {
      s.push([i, i + 1 < count ? i + 1 : null])
      i += 2
    }
    return s
  }

  // ─── Content cloning ───────────────────────────────────────────────────────

  function cloneForPage(item) {
    if (!item) return null
    if (item instanceof HTMLImageElement) {
      var img = doc.createElement('img')
      img.src = item.src; img.alt = item.alt || ''
      return img
    }
    if (item instanceof HTMLCanvasElement) {
      var c = doc.createElement('canvas')
      c.width = item.width; c.height = item.height
      c.getContext('2d').drawImage(item, 0, 0)
      return c
    }
    if (item instanceof Element) return item.cloneNode(true)
    return null
  }

  function populatePage(pageEl, item) {
    pageEl.innerHTML = ''
    if (!item) return
    var clone = cloneForPage(item)
    if (clone) pageEl.appendChild(clone)
  }

  // ─── Sound engine ──────────────────────────────────────────────────────────

  function createSoundEngine(soundOpts) {
    var ctx = null
    var customBuffer = null
    var muted = !!soundOpts.mute
    var loaded = false

    function getCtx() {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
      if (ctx.state === 'suspended') ctx.resume()
      return ctx
    }

    function loadCustom() {
      if (!soundOpts.src || loaded) return
      loaded = true
      fetch(soundOpts.src)
        .then(function (r) { return r.arrayBuffer() })
        .then(function (ab) { return getCtx().decodeAudioData(ab) })
        .then(function (buf) { customBuffer = buf })
        .catch(function (e) { console.warn('[StrataFlipbook] Sound load error:', e) })
    }

    // Synthesised page-rustle — no file dependency
    function playSynth(vol) {
      var c   = getCtx()
      var dur = 0.13
      var n   = Math.floor(c.sampleRate * dur)
      var buf = c.createBuffer(1, n, c.sampleRate)
      var d   = buf.getChannelData(0)
      for (var i = 0; i < n; i++) {
        var t = i / n
        d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 22) * Math.min(t * 80, 1)
      }
      var src  = c.createBufferSource()
      src.buffer = buf
      var hp   = c.createBiquadFilter()
      hp.type  = 'highpass'; hp.frequency.value = 1200
      var gain = c.createGain(); gain.gain.value = vol
      src.connect(hp); hp.connect(gain); gain.connect(c.destination)
      src.start()
    }

    function playBuffer(buf, vol) {
      var c    = getCtx()
      var src  = c.createBufferSource(); src.buffer = buf
      var gain = c.createGain(); gain.gain.value = vol
      src.connect(gain); gain.connect(c.destination); src.start()
    }

    return {
      play: function () {
        if (!soundOpts.enabled || muted) return
        if (soundOpts.src && !customBuffer) { loadCustom(); return }
        try {
          var vol = Math.max(0, Math.min(1, soundOpts.volume || 0.5))
          if (customBuffer) playBuffer(customBuffer, vol)
          else playSynth(vol)
        } catch (e) { /* AudioContext blocked — silent fail */ }
      },
      setMute: function (m) { muted = m },
      getMute: function ()  { return muted },
    }
  }

  // ─── Core factory ──────────────────────────────────────────────────────────

  function create(container, options) {
    if (registry.has(container)) return registry.get(container)

    // Capture direct children BEFORE clearing innerHTML (Swiper-like zero-config)
    var autoChildren = []
    if ((!options || !options.content || (Array.isArray(options.content) && !options.content.length))
        && (!options || options.source !== 'pdf')) {
      autoChildren = Array.from(container.children).map(function (c) { return c.cloneNode(true) })
    }

    var opts = Object.assign({
      source:     'html',
      content:    [],
      exportable: false,
      renderer:   '2d',
      preset:     'notebook',
      pagination: 'controls',
      drag:       true,
      loop:       false,
      closed:     true,
      sound:      {},
      // Lazy-loaded peer deps — fetched on demand (PDF source / export) only if
      // the matching global isn't already on the page. Override with self-hosted
      // copies, or set to '' to require the host to pre-load the global.
      pdfjsUrl:       'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
      pdfjsWorkerUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
      html2canvasUrl: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
      pdfLibUrl:      'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
    }, options || {})

    opts.sound = Object.assign(
      { enabled: true, src: null, volume: 0.5, mute: false },
      typeof opts.sound === 'object' ? opts.sound : {}
    )

    var pages         = []
    var spreads       = []
    var currentSpread = 0
    var turning       = false
    var sound         = createSoundEngine(opts.sound)
    var resizeObs     = null

    // ── Container setup ────────────────────────────────────────────────────────

    container.classList.add('st-flipbook')
    if (opts.preset && opts.preset !== 'notebook') container.classList.add('st-flipbook--' + opts.preset)
    container.setAttribute('data-st-flip-open',    'false')
    container.setAttribute('data-st-flip-loading', 'true')
    container.setAttribute('data-st-flip-source',  opts.source)
    container.setAttribute('data-st-flip-layout',  'spread')
    if (opts.closed) container.setAttribute('data-st-flip-mode', 'closed')
    container.setAttribute('role',                 'region')
    container.setAttribute('aria-label',           'Flipbook')
    container.setAttribute('tabindex',             '0')
    container.innerHTML = ''

    // ── Book DOM ───────────────────────────────────────────────────────────────

    var scene     = makeEl('div', 'st-flipbook-scene', { 'aria-hidden': 'true' })
    var book      = makeEl('div', 'st-flipbook-book')
    var pageL     = makeEl('div', 'st-flipbook-page st-flipbook-page-left')
    var pageR     = makeEl('div', 'st-flipbook-page st-flipbook-page-right')
    var flipWrap  = makeEl('div', 'st-flipbook-flip-page', { 'aria-hidden': 'true' })
    var flipFront = makeEl('div', 'st-flipbook-flip-front')
    var flipBack  = makeEl('div', 'st-flipbook-flip-back')

    flipWrap.appendChild(flipFront)
    flipWrap.appendChild(flipBack)
    book.appendChild(pageL)
    book.appendChild(pageR)
    book.appendChild(flipWrap)

    if (opts.drag) {
      var dragZoneR = makeEl('div', 'st-flipbook-drag-zone st-flipbook-drag-zone-right', { 'aria-hidden': 'true' })
      var dragZoneL = makeEl('div', 'st-flipbook-drag-zone st-flipbook-drag-zone-left',  { 'aria-hidden': 'true' })
      book.appendChild(dragZoneR)
      book.appendChild(dragZoneL)
    }

    scene.appendChild(book)

    // ── Controls ───────────────────────────────────────────────────────────────

    var modes       = Array.isArray(opts.pagination) ? opts.pagination : [opts.pagination || 'controls']
    var showBar     = modes.indexOf('none') < 0
    var hasInput    = modes.indexOf('input') >= 0
    var hasDots     = modes.indexOf('dots') >= 0
    var hasThumbs   = modes.indexOf('thumbnails') >= 0

    var controls  = makeEl('div', 'st-flipbook-controls')
    var btnPrev   = makeEl('button', 'st-flipbook-btn st-flipbook-btn-prev', { 'aria-label': 'Previous page', type: 'button' })
    btnPrev.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'
    var btnNext   = makeEl('button', 'st-flipbook-btn st-flipbook-btn-next', { 'aria-label': 'Next page', type: 'button' })
    btnNext.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'

    var counter   = null
    var pageInput = null
    var dotsEl    = null
    var thumbsEl  = null
    var btnMute   = null
    var btnExport = null

    controls.appendChild(btnPrev)

    if (hasInput) {
      pageInput = makeEl('input', 'st-flipbook-page-input', { type: 'number', min: '1', 'aria-label': 'Go to spread' })
      controls.appendChild(pageInput)
    } else {
      counter = makeEl('span', 'st-flipbook-counter', { 'aria-live': 'polite' })
      controls.appendChild(counter)
    }

    controls.appendChild(btnNext)

    if (opts.sound.enabled) {
      btnMute = makeEl('button', 'st-flipbook-btn st-flipbook-btn-mute', { type: 'button' })
      btnMute.setAttribute('data-st-flip-muted', opts.sound.mute ? 'true' : 'false')
      btnMute.setAttribute('aria-label', opts.sound.mute ? 'Unmute' : 'Mute')
      btnMute.innerHTML = muteIcon(!!opts.sound.mute)
      controls.appendChild(btnMute)
    }

    if (opts.exportable) {
      btnExport = makeEl('button', 'st-flipbook-btn st-flipbook-btn-export', { 'aria-label': 'Export as PDF', type: 'button' })
      btnExport.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
      controls.appendChild(btnExport)
    }

    if (hasDots)   dotsEl   = makeEl('div', 'st-flipbook-dots',   { role: 'tablist', 'aria-label': 'Spreads' })
    if (hasThumbs) thumbsEl = makeEl('div', 'st-flipbook-thumbs', { role: 'tablist', 'aria-label': 'Page thumbnails' })

    container.appendChild(scene)
    if (showBar)  container.appendChild(controls)
    if (dotsEl)   container.appendChild(dotsEl)
    if (thumbsEl) container.appendChild(thumbsEl)

    // ── Icon helpers ───────────────────────────────────────────────────────────

    function muteIcon(on) {
      return on
        ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'
        : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>'
    }

    // ── Content loading ────────────────────────────────────────────────────────

    function normalise(raw) {
      if (!raw || (Array.isArray(raw) && !raw.length)) return autoChildren
      if (Array.isArray(raw))          return raw
      if (raw instanceof NodeList)     return Array.from(raw)
      if (raw instanceof Element)      return [raw]
      if (typeof raw === 'string')     return Array.from(doc.querySelectorAll(raw))
      return []
    }

    function loadHTML(raw) {
      pages = normalise(raw).map(function (item) {
        return item instanceof Element ? item.cloneNode(true) : null
      }).filter(Boolean)
      afterLoad()
    }

    function loadPDF(url) {
      ensureGlobal(function () {
        return typeof window !== 'undefined' && (window.pdfjsLib || window['pdfjs-dist'])
      }, opts.pdfjsUrl, 'pdf.js').then(function (pdfjs) {
        // Point the worker at the configured URL if the host hasn't already.
        if (opts.pdfjsWorkerUrl && pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = opts.pdfjsWorkerUrl
        }
        return pdfjs.getDocument(url).promise
      }).then(function (pdf) {
        var jobs = []
        for (var n = 1; n <= pdf.numPages; n++) jobs.push(renderPDFPage(pdf, n))
        return Promise.all(jobs)
      }).then(function (canvases) {
        pages = canvases; afterLoad()
      }).catch(function (err) {
        console.error('[StrataFlipbook] PDF load error:', err)
        container.setAttribute('data-st-flip-loading', 'false')
      })
    }

    function renderPDFPage(pdf, n) {
      return pdf.getPage(n).then(function (page) {
        var vp = page.getViewport({ scale: 1.5 })
        var canvas = doc.createElement('canvas')
        canvas.width = vp.width; canvas.height = vp.height
        return page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
          .then(function () { return canvas })
      })
    }

    function afterLoad() {
      if (!pages.length) {
        console.warn('[StrataFlipbook] No pages.')
        container.setAttribute('data-st-flip-loading', 'false')
        return
      }
      spreads = computeSpreads(pages.length)
      container.setAttribute('data-st-flip-total',   spreads.length)
      container.setAttribute('data-st-flip-loading', 'false')
      container.setAttribute('data-st-flip-open',    'true')
      currentSpread = 0
      renderSpread(0)
      updateSoloState()
      buildDots()
      buildThumbs()
      syncUI()
      emit('st:flipbook:ready', { flipbook: api })
    }

    // ── Spread rendering ───────────────────────────────────────────────────────

    function renderSpread(idx) {
      var spread = spreads[idx]
      if (!spread) return
      var lIdx = spread[0], rIdx = spread[1]
      populatePage(pageL, lIdx !== null ? pages[lIdx] : null)
      populatePage(pageR, rIdx !== null ? pages[rIdx] : null)
      pageL.setAttribute('data-st-flip-blank', lIdx === null ? 'true' : 'false')
      pageR.setAttribute('data-st-flip-blank', rIdx === null ? 'true' : 'false')
      container.setAttribute('data-st-flip-page', idx + 1)
    }

    // ── Solo / closed-book helpers ─────────────────────────────────────────────

    function isSoloSpread(idx) {
      if (!opts.closed) return null
      var s = spreads[idx]
      if (!s) return null
      if (s[0] === null) return 'right'
      if (s[1] === null) return 'left'
      return null
    }

    function updateSoloState() {
      if (!opts.closed) return
      var solo = isSoloSpread(currentSpread)
      if (solo) container.setAttribute('data-st-flip-solo', solo)
      else container.removeAttribute('data-st-flip-solo')
    }

    // Set the closed/solo state from the flip's DESTINATION at the start of a turn,
    // so the book glides open OR closed concurrently with the page rotation. Opening
    // (dest is a normal spread) drops solo → the book expands; closing (dest is a
    // cover) adds solo → the book glides centred with its thickness, mirroring the open.
    function setSoloForFlip(direction) {
      if (!opts.closed) return
      var destIdx = direction === 'forward'
        ? (opts.loop && currentSpread === spreads.length - 1 ? 0 : currentSpread + 1)
        : (opts.loop && currentSpread === 0 ? spreads.length - 1 : currentSpread - 1)
      var destSolo = isSoloSpread(destIdx)
      if (destSolo) container.setAttribute('data-st-flip-solo', destSolo)
      else container.removeAttribute('data-st-flip-solo')
    }

    // ── Pagination UI ──────────────────────────────────────────────────────────

    function syncUI() {
      var total = spreads.length
      var cur   = currentSpread
      if (counter)   { counter.textContent = (cur + 1) + ' / ' + total; counter.setAttribute('aria-label', 'Spread ' + (cur + 1) + ' of ' + total) }
      if (pageInput) { pageInput.value = cur + 1; pageInput.max = total }
      var atStart = !opts.loop && cur === 0
      var atEnd   = !opts.loop && cur === total - 1
      btnPrev.disabled = atStart || turning
      btnNext.disabled = atEnd   || turning
      if (btnExport) btnExport.disabled = turning
      syncDots()
      syncThumbs()
    }

    function buildDots() {
      if (!dotsEl) return
      dotsEl.innerHTML = ''
      spreads.forEach(function (_, i) {
        var dot = makeEl('button', 'st-flipbook-dot', { type: 'button', role: 'tab', 'aria-label': 'Spread ' + (i + 1) })
        dot.setAttribute('data-spread', i)
        dotsEl.appendChild(dot)
        dot.addEventListener('click', function () { goTo(i) })
      })
    }

    function syncDots() {
      if (!dotsEl) return
      Array.from(dotsEl.children).forEach(function (dot, i) {
        dot.setAttribute('aria-selected', i === currentSpread ? 'true' : 'false')
        dot.setAttribute('data-st-flip-active', i === currentSpread ? 'true' : 'false')
      })
    }

    function buildThumbs() {
      if (!thumbsEl) return
      thumbsEl.innerHTML = ''
      spreads.forEach(function (spread, i) {
        var thumb = makeEl('button', 'st-flipbook-thumb', { type: 'button', role: 'tab', 'aria-label': 'Spread ' + (i + 1) })
        thumb.setAttribute('data-spread', i)
        var lNum = spread[0] !== null ? String(spread[0] + 1) : ''
        var rNum = spread[1] !== null ? String(spread[1] + 1) : ''
        thumb.innerHTML =
          '<span class="st-flipbook-thumb-l">' + lNum + '</span>' +
          '<span class="st-flipbook-thumb-r">' + rNum + '</span>'
        thumbsEl.appendChild(thumb)
        thumb.addEventListener('click', function () { goTo(i) })
      })
    }

    function syncThumbs() {
      if (!thumbsEl) return
      Array.from(thumbsEl.children).forEach(function (thumb, i) {
        thumb.setAttribute('aria-selected', i === currentSpread ? 'true' : 'false')
        thumb.setAttribute('data-st-flip-active', i === currentSpread ? 'true' : 'false')
      })
    }

    // ── Flip logic ─────────────────────────────────────────────────────────────

    function prepareFlipForward() {
      var next = spreads[currentSpread + 1] || spreads[0]
      var cur  = spreads[currentSpread]
      // The leaf is the current RIGHT page: it lifts and rotates leftward (front face).
      // Its back face is the destination LEFT page, which lands on the left half.
      populatePage(flipFront, cur[1]  !== null ? pages[cur[1]]  : null)
      populatePage(flipBack,  next[0] !== null ? pages[next[0]] : null)
      flipFront.setAttribute('data-st-flip-blank', cur[1]  === null ? 'true' : 'false')
      flipBack.setAttribute('data-st-flip-blank',  next[0] === null ? 'true' : 'false')
      // Underneath: the right half reveals the destination right page as the leaf lifts.
      populatePage(pageR, next[1] !== null ? pages[next[1]] : null)
      pageR.setAttribute('data-st-flip-blank', next[1] === null ? 'true' : 'false')
      // pageL stays as current-left — updated in onFlipDone while the landed leaf covers it.
    }

    function prepareFlipBackward() {
      var prev = spreads[currentSpread - 1] || spreads[spreads.length - 1]
      var cur  = spreads[currentSpread]
      // The leaf is the current LEFT page: it lifts and rotates rightward (front face).
      // Its back face is the destination RIGHT page, which lands on the right half.
      populatePage(flipFront, cur[0]  !== null ? pages[cur[0]]  : null)
      populatePage(flipBack,  prev[1] !== null ? pages[prev[1]] : null)
      flipFront.setAttribute('data-st-flip-blank', cur[0]  === null ? 'true' : 'false')
      flipBack.setAttribute('data-st-flip-blank',  prev[1] === null ? 'true' : 'false')
      // Underneath: the left half reveals the destination left page as the leaf lifts;
      // the right half keeps the current right page until the leaf lands (swapped in onFlipDone).
      populatePage(pageL, prev[0] !== null ? pages[prev[0]] : null)
      populatePage(pageR, cur[1]  !== null ? pages[cur[1]]  : null)
      pageL.setAttribute('data-st-flip-blank', prev[0] === null ? 'true' : 'false')
      pageR.setAttribute('data-st-flip-blank', cur[1]  === null ? 'true' : 'false')
    }

    function startFlip(direction) {
      turning = true
      syncUI()
      // Drive the closed-book glide concurrently with the turn (open or close).
      setSoloForFlip(direction)
      container.setAttribute('data-st-flip-direction', direction)
      container.setAttribute('data-st-flip-grab', 'bottom')   // button turns peel from the bottom corner
      requestAnimationFrame(function () {
        container.setAttribute('data-st-flip-turning', 'true')
        flipWrap.addEventListener('animationend', onFlipDone, false)
      })
    }

    function onFlipDone(e) {
      if (e.target !== flipWrap) return
      // Ignore the parallel shading animation — act once, on the rotation animation.
      if (e.animationName !== 'st-flip-forward' && e.animationName !== 'st-flip-backward' && e.animationName !== 'st-flip-complete-fwd' && e.animationName !== 'st-flip-complete-bwd') return
      flipWrap.removeEventListener('animationend', onFlipDone)
      var direction = container.getAttribute('data-st-flip-direction')

      if (direction === 'forward') {
        currentSpread = opts.loop && currentSpread === spreads.length - 1 ? 0 : Math.min(currentSpread + 1, spreads.length - 1)
      } else {
        currentSpread = opts.loop && currentSpread === 0 ? spreads.length - 1 : Math.max(currentSpread - 1, 0)
      }

      turning = false
      flipWrap.style.removeProperty('--st-flip-angle')
      flipWrap.style.removeProperty('--st-flip-shade')
      container.removeAttribute('data-st-flip-turning')
      container.removeAttribute('data-st-flip-completing')

      // Swap the page now landed beneath the leaf while data-st-flip-direction is still
      // set (the flat leaf face still covers that half) — the page changes with no flash.
      var destSpread = spreads[currentSpread]
      if (direction === 'forward') {
        populatePage(pageL, destSpread[0] !== null ? pages[destSpread[0]] : null)
        pageL.setAttribute('data-st-flip-blank', destSpread[0] === null ? 'true' : 'false')
      } else {
        populatePage(pageR, destSpread[1] !== null ? pages[destSpread[1]] : null)
        pageR.setAttribute('data-st-flip-blank', destSpread[1] === null ? 'true' : 'false')
      }

      container.removeAttribute('data-st-flip-direction')
      container.removeAttribute('data-st-flip-grab')
      updateSoloState()
      container.setAttribute('data-st-flip-page', currentSpread + 1)
      syncUI()
      sound.play()
      emit('st:flipbook:flip', { flipbook: api, spread: currentSpread, direction: direction })
    }

    function flipForward() {
      var canFlip = opts.loop || currentSpread < spreads.length - 1
      if (turning || !canFlip) return
      prepareFlipForward()
      startFlip('forward')
    }

    function flipBackward() {
      var canFlip = opts.loop || currentSpread > 0
      if (turning || !canFlip) return
      prepareFlipBackward()
      startFlip('backward')
    }

    function goTo(idx) {
      if (turning || idx < 0 || idx >= spreads.length || idx === currentSpread) return
      currentSpread = idx
      renderSpread(currentSpread)
      updateSoloState()
      syncUI()
      emit('st:flipbook:goto', { flipbook: api, spread: currentSpread })
    }

    // ── Drag engine ────────────────────────────────────────────────────────────
    // --st-flip-angle drives the leaf rotation (0deg = unflipped, ±180deg = turned)
    // and --st-flip-shade the face shading. Both are set on the container during the
    // drag (they inherit to the leaf via @property). On completion the angle is set
    // directly on flipWrap so the snap animation starts from the exact drag position.

    if (opts.drag) {
      var drag = { active: false, direction: null, startX: 0, pointerId: null, grab: 'side' }
      var COMPLETE_THRESHOLD = 0.35

      // Which corner/edge the page is grabbed by — drives the turn's twist.
      function grabZone(y, h) {
        return y < h * 0.33 ? 'top' : y > h * 0.67 ? 'bottom' : 'side'
      }

      function dragDirection(e) {
        var rect   = book.getBoundingClientRect()
        var x      = e.clientX - rect.left
        var y      = e.clientY - rect.top
        var layout = container.getAttribute('data-st-flip-layout')

        // Single layout: whole scene is a swipe target — resolve on first move
        if (layout === 'single') return 'detect'

        // Spread: full-height edge strips (right edge = forward, left edge = backward)
        var inRight = x > rect.width - 80
        var inLeft  = x < 80
        if (inRight && (opts.loop || currentSpread < spreads.length - 1)) { drag.grab = grabZone(y, rect.height); return 'forward' }
        if (inLeft  && (opts.loop || currentSpread > 0))                 { drag.grab = grabZone(y, rect.height); return 'backward' }
        return null
      }

      function setDragVars(dir, progress) {
        var angle = (dir === 'forward' ? -1 : 1) * progress * 180
        var shade = (1 - Math.abs(progress - 0.5) * 2) * 0.55   // peaks edge-on at 0.5
        container.style.setProperty('--st-flip-angle', angle.toFixed(2) + 'deg')
        container.style.setProperty('--st-flip-shade', shade.toFixed(3))
      }

      function clearDragVars() {
        container.style.removeProperty('--st-flip-angle')
        container.style.removeProperty('--st-flip-shade')
      }

      function onPointerDown(e) {
        if (turning || drag.active) return
        if (e.target.closest('.st-flipbook-controls, .st-flipbook-dots, .st-flipbook-thumbs')) return
        var dir = dragDirection(e)
        if (!dir) return

        e.preventDefault()
        drag.active    = true
        drag.direction = dir
        drag.startX    = e.clientX
        drag.pointerId = e.pointerId

        if (dir !== 'detect') {
          if (dir === 'forward') prepareFlipForward()
          else prepareFlipBackward()
          turning = true
          syncUI()
          setSoloForFlip(dir)
          container.setAttribute('data-st-flip-direction', dir)
          container.setAttribute('data-st-flip-grab', drag.grab)
          container.setAttribute('data-st-flip-dragging', 'true')
          setDragVars(dir, 0)
        }

        doc.addEventListener('pointermove', onPointerMove, { passive: false })
        doc.addEventListener('pointerup',      onPointerUp,   false)
        doc.addEventListener('pointercancel',  onPointerUp,   false)
      }

      function onPointerMove(e) {
        if (!drag.active) return
        e.preventDefault()

        var moved = drag.startX - e.clientX

        // Resolve detect direction on first significant move
        if (drag.direction === 'detect') {
          if (Math.abs(moved) < 12) return
          var det   = moved > 0 ? 'forward' : 'backward'
          var canDo = det === 'forward' ? (opts.loop || currentSpread < spreads.length - 1) : (opts.loop || currentSpread > 0)
          if (!canDo) { cancelDrag(); return }
          drag.direction = det
          drag.startX    = e.clientX
          moved = 0
          if (det === 'forward') prepareFlipForward()
          else prepareFlipBackward()
          turning = true
          syncUI()
          setSoloForFlip(det)
          drag.grab = 'side'   // a free swipe turns straight
          container.setAttribute('data-st-flip-direction', det)
          container.setAttribute('data-st-flip-grab', 'side')
          container.setAttribute('data-st-flip-dragging', 'true')
          setDragVars(det, 0)
          return
        }

        var pageW    = book.getBoundingClientRect().width * 0.5
        var progress = Math.max(0, Math.min(1, (drag.direction === 'forward' ? moved : -moved) / pageW))
        setDragVars(drag.direction, progress)
      }

      function onPointerUp(e) {
        if (!drag.active) return
        doc.removeEventListener('pointermove', onPointerMove)
        doc.removeEventListener('pointerup',   onPointerUp)
        doc.removeEventListener('pointercancel', onPointerUp)

        if (drag.direction === 'detect') { drag.active = false; drag.direction = null; return }

        var moved    = drag.startX - e.clientX
        var pageW    = book.getBoundingClientRect().width * 0.5
        var progress = Math.max(0, Math.min(1, (drag.direction === 'forward' ? moved : -moved) / pageW))
        var dir      = drag.direction

        drag.active    = false
        drag.direction = null

        if (progress >= COMPLETE_THRESHOLD) {
          // Seed the angle on flipWrap so the snap animation starts from the drag position,
          // then clear the container-level vars (the flipWrap animation takes priority).
          var seedAngle = (dir === 'forward' ? -1 : 1) * progress * 180
          flipWrap.style.setProperty('--st-flip-angle', seedAngle.toFixed(2) + 'deg')
          clearDragVars()
          container.removeAttribute('data-st-flip-dragging')
          container.setAttribute('data-st-flip-completing', 'true')
          flipWrap.addEventListener('animationend', onFlipDone, false)
        } else {
          clearDragVars()
          container.removeAttribute('data-st-flip-dragging')
          cancelDrag()
        }
      }

      function cancelDrag() {
        doc.removeEventListener('pointermove', onPointerMove)
        doc.removeEventListener('pointerup',   onPointerUp)
        doc.removeEventListener('pointercancel', onPointerUp)
        flipWrap.style.removeProperty('--st-flip-angle')
        flipWrap.style.removeProperty('--st-flip-shade')
        clearDragVars()
        container.removeAttribute('data-st-flip-dragging')
        container.removeAttribute('data-st-flip-direction')
        container.removeAttribute('data-st-flip-grab')
        turning = false
        drag.active = false
        drag.direction = null
        drag.grab = 'side'
        renderSpread(currentSpread)
        updateSoloState()
        syncUI()
      }

      scene.addEventListener('pointerdown', onPointerDown, { passive: false })
    }

    // ── Mute button ────────────────────────────────────────────────────────────

    if (btnMute) {
      btnMute.addEventListener('click', function () {
        var nowMuted = btnMute.getAttribute('data-st-flip-muted') !== 'true'
        sound.setMute(nowMuted)
        btnMute.setAttribute('data-st-flip-muted', nowMuted ? 'true' : 'false')
        btnMute.setAttribute('aria-label', nowMuted ? 'Unmute' : 'Mute')
        btnMute.innerHTML = muteIcon(nowMuted)
      })
    }

    // ── Page input ─────────────────────────────────────────────────────────────

    if (pageInput) {
      function commitInput() {
        var val = parseInt(pageInput.value, 10) - 1
        if (!isNaN(val)) goTo(Math.max(0, Math.min(val, spreads.length - 1)))
      }
      pageInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') commitInput() })
      pageInput.addEventListener('blur', commitInput)
    }

    // ── Export ─────────────────────────────────────────────────────────────────

    function exportPDF() {
      container.setAttribute('data-st-flip-loading', 'true')
      emit('st:flipbook:exportStart', { flipbook: api })

      ensureGlobal(function () {
        return typeof window !== 'undefined' && window.PDFLib
      }, opts.pdfLibUrl, 'pdf-lib').then(function (PDFLib) {
        if (opts.source === 'pdf') return exportCanvases(PDFLib, pages)

        return ensureGlobal(function () {
          return typeof window !== 'undefined' && window.html2canvas
        }, opts.html2canvasUrl, 'html2canvas').then(function (html2canvas) {
          return normalise(opts.content).reduce(function (chain, el) {
            return chain.then(function (acc) {
              return captureElement(html2canvas, el).then(function (c) { acc.push(c); return acc })
            })
          }, Promise.resolve([])).then(function (canvases) { return exportCanvases(PDFLib, canvases) })
        })
      }).catch(function (err) {
        console.error('[StrataFlipbook] Export error:', err)
        container.setAttribute('data-st-flip-loading', 'false')
      })
    }

    function captureElement(html2canvas, el) {
      var w = pageL.offsetWidth  || 480
      var h = pageL.offsetHeight || 680
      var shell = makeEl('div', null, {})
      shell.style.cssText =
        'position:fixed;left:-' + (w + 50) + 'px;top:0;' +
        'width:' + w + 'px;height:' + h + 'px;overflow:hidden;'
      var snapshot = el.cloneNode(true)
      shell.appendChild(snapshot)
      doc.body.appendChild(shell)
      return html2canvas(snapshot, { useCORS: true, scale: 2, width: w, height: h })
        .then(function (c) {
          doc.body.removeChild(shell)
          return c
        })
        .catch(function (err) {
          if (shell.parentNode) doc.body.removeChild(shell)
          return Promise.reject(err)
        })
    }

    function canvasToBytes(canvas) {
      var useJpeg = opts.source === 'pdf'
      var mime    = useJpeg ? 'image/jpeg' : 'image/png'
      var quality = 0.92
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) { reject(new Error('canvas.toBlob returned null')); return }
          blob.arrayBuffer().then(function (buf) { resolve(new Uint8Array(buf)) }).catch(reject)
        }, mime, quality)
      })
    }

    function exportCanvases(PDFLib, canvases) {
      var useJpeg = opts.source === 'pdf'
      PDFLib.PDFDocument.create().then(function (pdf) {
        return canvases.reduce(function (chain, canvas) {
          return chain.then(function () {
            return canvasToBytes(canvas).then(function (bytes) {
              var embed = useJpeg ? pdf.embedJpg(bytes) : pdf.embedPng(bytes)
              return embed.then(function (img) {
                pdf.addPage([canvas.width, canvas.height])
                  .drawImage(img, { x: 0, y: 0, width: canvas.width, height: canvas.height })
              })
            })
          })
        }, Promise.resolve()).then(function () { return pdf.save({ useObjectStreams: false }) })
      }).then(function (bytes) {
        var url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
        var a   = makeEl('a', null, { href: url, download: 'flipbook.pdf' })
        doc.body.appendChild(a); a.click(); doc.body.removeChild(a)
        setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
        container.setAttribute('data-st-flip-loading', 'false')
        emit('st:flipbook:exportDone', { flipbook: api })
      }).catch(function (err) {
        console.error('[StrataFlipbook] Export error:', err)
        container.setAttribute('data-st-flip-loading', 'false')
      })
    }

    // ── Keyboard & button events ───────────────────────────────────────────────

    btnNext.addEventListener('click', flipForward)
    btnPrev.addEventListener('click', flipBackward)
    if (btnExport) btnExport.addEventListener('click', exportPDF)

    container.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); flipForward() }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')  { e.preventDefault(); flipBackward() }
    })

    // ── ResizeObserver — switches spread ↔ single layout ──────────────────────

    if (typeof ResizeObserver !== 'undefined') {
      resizeObs = new ResizeObserver(function (entries) {
        var w = entries[0].contentRect.width
        container.setAttribute('data-st-flip-layout', w < 500 ? 'single' : 'spread')
      })
      resizeObs.observe(scene)
    }

    // ── Destroy ────────────────────────────────────────────────────────────────

    function destroy() {
      if (resizeObs) resizeObs.disconnect()
      flipWrap.removeEventListener('animationend', onFlipDone)
      btnNext.removeEventListener('click', flipForward)
      btnPrev.removeEventListener('click', flipBackward)
      if (btnExport) btnExport.removeEventListener('click', exportPDF)
      container.innerHTML = ''
      container.classList.remove('st-flipbook')
      if (opts.preset) container.classList.remove('st-flipbook--' + opts.preset)
      ;['data-st-flip-open','data-st-flip-loading','data-st-flip-source','data-st-flip-layout',
        'data-st-flip-total','data-st-flip-page','data-st-flip-direction','data-st-flip-turning',
        'data-st-flip-dragging','data-st-flip-completing','data-st-flip-mode','data-st-flip-solo',
        'data-st-flip-grab','role','aria-label','tabindex'
      ].forEach(function (a) { container.removeAttribute(a) })
      flipWrap.style.removeProperty('--st-flip-angle')
      flipWrap.style.removeProperty('--st-flip-shade')
      container.style.removeProperty('--st-flip-angle')
      container.style.removeProperty('--st-flip-shade')
      registry.delete(container)
      emit('st:flipbook:destroy', { flipbook: api })
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    var api = {
      next:             flipForward,
      prev:             flipBackward,
      goTo:             goTo,
      export:           exportPDF,
      destroy:          destroy,
      getCurrentSpread: function () { return currentSpread },
      getSpreadCount:   function () { return spreads.length },
      on:  function (event, fn) { doc.addEventListener('st:flipbook:' + event, fn); return api },
      off: function (event, fn) { doc.removeEventListener('st:flipbook:' + event, fn); return api },
    }

    // ── Kick off ────────────────────────────────────────────────────────────────

    if (opts.source === 'pdf') {
      if (typeof opts.content === 'string') loadPDF(opts.content)
      else { console.warn('[StrataFlipbook] source:"pdf" needs a URL string.'); container.setAttribute('data-st-flip-loading', 'false') }
    } else {
      loadHTML(opts.content)
    }

    registry.set(container, api)
    return api
  }

  // ─── Auto-init ──────────────────────────────────────────────────────────────

  function autoInit() {
    if (!doc) return
    doc.querySelectorAll('[data-st-flipbook]:not([data-st-flip-open])').forEach(function (el) {
      create(el, {
        source:     el.getAttribute('data-st-flip-source')     || 'html',
        exportable: el.getAttribute('data-st-flip-exportable') === 'true',
        preset:     el.getAttribute('data-st-flip-preset')     || 'notebook',
        pagination: el.getAttribute('data-st-flip-pagination') || 'controls',
        drag:       el.getAttribute('data-st-flip-drag')       !== 'false',
        content:    el.getAttribute('data-st-flip-content')    || [],
      })
    })
  }

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoInit)
    else autoInit()
  }

  // ─── Module export — callable as function AND as .init() ──────────────────

  function Flipbook(selector, options) { return Flipbook.init(selector, options) }

  Flipbook.init = function (selector, options) {
    var el = resolveEl(selector)
    if (!el) { console.warn('[StrataFlipbook] Not found:', selector); return null }
    return create(el, options)
  }

  Flipbook.destroy = function (selector) {
    var el = resolveEl(selector)
    if (el && registry.has(el)) registry.get(el).destroy()
  }

  return Flipbook
}))
