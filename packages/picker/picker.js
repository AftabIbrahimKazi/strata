/**
 * Strata Picker
 * Version: 1.0.0
 *
 * Date / Time / DateTime picker. Works standalone or with Strata CSS.
 *
 * Usage (standalone):
 *   <script src="picker.js"></script>
 *   StrataPicker.date('#myInput')
 *   StrataPicker.time('#myInput')
 *   StrataPicker.datetime('#myInput')
 *
 * Usage (with Strata):
 *   Included in strata.components.js — available as Strata.Picker.*
 *
 * Declarative (auto-init on DOMContentLoaded):
 *   <input data-st-datepicker>
 *   <input data-st-timepicker>
 *   <input data-st-datetimepicker>
 *
 * Options:
 *   format         string   'YYYY-MM-DD' | 'DD/MM/YYYY' | 'YYYY-MM-DD HH:mm' etc.
 *   weekStart      0|1      0=Sunday (default), 1=Monday
 *   min            string   ISO date string minimum
 *   max            string   ISO date string maximum
 *   disable        array    [dateString, (date)=>bool, ...]
 *   range          bool     enable date range selection
 *   endInput       string   selector for range end input
 *   presets        bool     show Today/Yesterday/Last 7 days etc. shortcuts
 *   hour24         bool     24-hour time format
 *   step           number   minute step (default 5)
 *   showSeconds    bool     show seconds column
 *
 * Events fired on document:
 *   st:datepicker:open    st:datepicker:close    st:datepicker:change
 *   st:timepicker:open    st:timepicker:close    st:timepicker:change
 *   st:datetimepicker:open st:datetimepicker:close st:datetimepicker:change
 *
 * UMD — works as browser global, CommonJS, or AMD.
 * Registers as Strata.Picker when Strata is present, else StrataPicker.
 */

;(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory)
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory()
  } else {
    if (root.Strata) root.Strata.Picker = factory()
    else root.StrataPicker = factory()
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  var doc = typeof document !== 'undefined' ? document : null
  var win = typeof window  !== 'undefined' ? window  : null
  if (!doc) return {}

  // ── Registries ────────────────────────────────────────────────────────────────
  var dateReg = new Map()
  var timeReg = new Map()
  var dtReg   = new Map()

  // ── Constants ─────────────────────────────────────────────────────────────────
  var MONTHS       = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December']
  var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun',
                      'Jul','Aug','Sep','Oct','Nov','Dec']
  var DAYS_SHORT   = ['Su','Mo','Tu','We','Th','Fr','Sa']

  var PRESETS = [
    { label: 'Today',        fn: function(t) { return [t, t] } },
    { label: 'Yesterday',    fn: function(t) { var d=cp(t); d.setDate(d.getDate()-1); return [d,d] } },
    { label: 'Last 7 days',  fn: function(t) { var d=cp(t); d.setDate(d.getDate()-6); return [d,t] } },
    { label: 'Last 30 days', fn: function(t) { var d=cp(t); d.setDate(d.getDate()-29); return [d,t] } },
    { label: 'This month',   fn: function(t) { return [new Date(t.getFullYear(),t.getMonth(),1), new Date(t.getFullYear(),t.getMonth()+1,0)] } },
    { label: 'Last month',   fn: function(t) { return [new Date(t.getFullYear(),t.getMonth()-1,1), new Date(t.getFullYear(),t.getMonth(),0)] } },
  ]

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function el(tag, attrs, kids) {
    var e = doc.createElement(tag)
    if (attrs) Object.keys(attrs).forEach(function(k) {
      if (k === 'class') e.className = attrs[k]
      else e.setAttribute(k, attrs[k])
    })
    if (kids) kids.forEach(function(k) {
      if (k == null) return
      e.appendChild(typeof k === 'string' ? doc.createTextNode(k) : k)
    })
    return e
  }

  function emit(name, detail) {
    doc.dispatchEvent(new CustomEvent(name, { detail: detail, bubbles: true }))
  }

  function qs(sel) {
    if (!sel) return null
    if (sel instanceof Element) return sel
    return doc.querySelector(sel)
  }

  // Map from theme option keys to CSS variable names
  var THEME_MAP = {
    primary:    '--stp-primary',
    primaryHover:'--stp-primary-h',
    bg:         '--stp-bg',
    bgAlt:      '--stp-bg2',
    text:       '--stp-text',
    muted:      '--stp-muted',
    border:     '--stp-border',
    radius:     '--stp-radius',
    shadow:     '--stp-shadow',
    focus:      '--stp-focus',
    cellSize:   '--stp-cell',
    fontSize:   '--stp-font-size',
  }

  // Apply theme object + className to a popup element
  function applyTheme(popup, opts) {
    if (opts.className) {
      opts.className.split(/\s+/).forEach(function(c) { if (c) popup.classList.add(c) })
    }
    if (opts.theme) {
      Object.keys(opts.theme).forEach(function(key) {
        var varName = THEME_MAP[key]
        if (varName) popup.style.setProperty(varName, opts.theme[key])
      })
    }
  }

  function cp(d) { return new Date(d.getTime()) }

  function sod(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }

  function sameDay(a, b) {
    return a && b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth()    === b.getMonth()    &&
      a.getDate()     === b.getDate()
  }

  function parseDate(str) {
    if (!str) return null
    var m = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/)
    if (m) return sod(new Date(+m[1], +m[2]-1, +m[3]))
    var m2 = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/)
    if (m2) return sod(new Date(+m2[3], +m2[1]-1, +m2[2]))
    var d = new Date(str)
    return isNaN(d) ? null : sod(d)
  }

  // Position popup below anchor (position:fixed — viewport coords only, no scroll)
  function positionPopup(popup, anchor) {
    var r  = anchor.getBoundingClientRect()
    var vH = win.innerHeight
    var vW = win.innerWidth
    var pH = popup.offsetHeight || 320
    var pW = popup.offsetWidth  || 300

    // Vertical — flip up if not enough room below
    if (vH - r.bottom < pH + 8 && r.top > vH - r.bottom) {
      popup.style.top = Math.max(4, r.top - pH - 4) + 'px'
    } else {
      popup.style.top = (r.bottom + 4) + 'px'
    }

    // Horizontal — clamp to viewport
    popup.style.left = Math.max(4, Math.min(r.left, vW - pW - 4)) + 'px'
  }

  // ── Date Picker ───────────────────────────────────────────────────────────────

  function createDate(input, opts) {
    opts = opts || {}
    if (dateReg.has(input)) return dateReg.get(input)

    var dateFmt    = opts.format    || input.getAttribute('data-st-format')    || 'YYYY-MM-DD'
    var weekStart  = +(opts.weekStart != null ? opts.weekStart : (input.getAttribute('data-st-week-start') || 0))
    var rangeMode  = opts.range     != null ? opts.range     : input.hasAttribute('data-st-range')
    var endEl      = opts.endInput  ? qs(opts.endInput) : qs(input.getAttribute('data-st-end-input'))
    var showPre    = opts.presets   != null ? !!opts.presets  : input.hasAttribute('data-st-presets')
    var customPre  = Array.isArray(opts.presets) ? opts.presets : PRESETS
    var minDate    = (opts.min || input.getAttribute('data-st-min'))  ? sod(new Date(opts.min || input.getAttribute('data-st-min'))) : null
    var maxDate    = (opts.max || input.getAttribute('data-st-max'))  ? sod(new Date(opts.max || input.getAttribute('data-st-max'))) : null
    var disableFns = buildDisableFns(opts, input)

    // State
    var today  = sod(new Date())
    var vY = today.getFullYear(), vM = today.getMonth()
    var vLayer = 'days', yBase = Math.floor(vY / 12) * 12
    var selS = null, selE = null, hover = null, phase = 'start'
    var open = false, activePreset = null

    var popup = el('div', { 'class': 'stp-popup stp-date' })
    applyTheme(popup, opts)

    // ── Format ──────────────────────────────────────────────────────────────────

    function fmt(d) {
      if (!d) return ''
      return applyDateFormat(dateFmt, d)
    }

    function disabled(d) {
      if (minDate && d < minDate) return true
      if (maxDate && d > maxDate) return true
      return disableFns.some(function(f) { return f(d) })
    }

    function inRange(d) {
      var lo = selS, hi = selE || hover
      if (!lo || !hi) return false
      var a = lo < hi ? lo : hi, b = lo < hi ? hi : lo
      return d > a && d < b
    }

    // ── Render ──────────────────────────────────────────────────────────────────

    function render() {
      popup.innerHTML = ''
      var wrap = el('div', { 'class': 'stp-inner' })

      // Presets
      if (showPre) {
        var ps = el('div', { 'class': 'stp-presets' })
        customPre.forEach(function(p, i) {
          var btn = el('button', { 'class': 'stp-preset' + (activePreset===i?' is-active':''), 'type':'button' }, [p.label])
          ;(function(preset, idx) {
            btn.addEventListener('click', function() {
              activePreset = idx
              var r = preset.fn(today)
              selS = sod(r[0]); selE = rangeMode ? sod(r[1]) : null
              vY = selS.getFullYear(); vM = selS.getMonth()
              writeInputs(); render()
            })
          })(p, i)
          ps.appendChild(btn)
        })
        wrap.appendChild(ps)
      }

      // Calendar
      var cal = el('div', { 'class': 'stp-cal' })
      if (vLayer === 'days')   renderDays(cal)
      if (vLayer === 'months') renderMonths(cal)
      if (vLayer === 'years')  renderYears(cal)
      wrap.appendChild(cal)
      popup.appendChild(wrap)

      // Footer
      var foot = el('div', { 'class': 'stp-footer' })
      var todayBtn = el('button', { 'class': 'stp-today', 'type':'button' }, ['Today'])
      todayBtn.addEventListener('click', function() {
        if (!disabled(today)) { vY=today.getFullYear(); vM=today.getMonth(); pickDay(today) }
      })
      var clearBtn = el('button', { 'class': 'stp-clear', 'type':'button' }, ['Clear'])
      clearBtn.addEventListener('click', function() {
        selS=selE=activePreset=null; phase='start'; hover=null
        input.value=''; if (endEl) endEl.value=''
        input.dispatchEvent(new Event('change',{bubbles:true}))
        emit('st:datepicker:change',{input:input,date:null,dateEnd:null,formatted:'',formattedEnd:''})
        render()
      })
      foot.appendChild(todayBtn); foot.appendChild(clearBtn)
      popup.appendChild(foot)
    }

    function renderDays(c) {
      // Header
      var prev = navBtn('‹','Previous month'); var next = navBtn('›','Next month')
      var title = el('button',{'class':'stp-title','type':'button'},[MONTHS[vM]+' '+vY])
      prev.addEventListener('click',  function(){ navM(-1) })
      next.addEventListener('click',  function(){ navM(1) })
      title.addEventListener('click', function(){ vLayer='months'; render() })
      c.appendChild(el('div',{'class':'stp-hd'},[prev,title,next]))

      // Weekday names
      var wds = el('div',{'class':'stp-wds'})
      for (var i=0;i<7;i++) wds.appendChild(el('span',{'class':'stp-wd'},[DAYS_SHORT[(i+weekStart)%7]]))
      c.appendChild(wds)

      // Day grid
      var grid = el('div',{'class':'stp-days'})
      var first = new Date(vY,vM,1).getDay()
      var blanks = (first - weekStart + 7) % 7
      var total  = new Date(vY,vM+1,0).getDate()
      var cells  = []

      for (var b=0;b<blanks;b++) grid.appendChild(el('span',{'class':'stp-day stp-blank'}))

      for (var d=1;d<=total;d++) {
        var dt = new Date(vY,vM,d)
        var cls = 'stp-day'
        if (sameDay(dt,today)) cls+=' is-today'
        if (sameDay(dt,selS))  cls+=' is-sel is-range-start'
        if (sameDay(dt,selE))  cls+=' is-sel is-range-end'
        if (rangeMode && inRange(dt)) cls+=' is-in-range'
        if (disabled(dt)) cls+=' is-off'
        var cell = el('span',{'class':cls,'tabindex':'-1'},[String(d)])
        cells.push({e:cell,d:dt})
        ;(function(date,ce){
          if (!disabled(date)) {
            ce.addEventListener('click', function(){ pickDay(date) })
            if (rangeMode) {
              ce.addEventListener('mouseenter', function(){
                if (phase==='end'&&selS){ hover=date; updateRange(cells) }
              })
            }
          }
        })(dt,cell)
        grid.appendChild(cell)
      }
      grid.addEventListener('mouseleave', function(){ hover=null; updateRange(cells) })
      c.appendChild(grid)
    }

    function renderMonths(c) {
      var prev=navBtn('‹','Prev'); var next=navBtn('›','Next')
      var title=el('button',{'class':'stp-title','type':'button'},[String(vY)])
      prev.addEventListener('click',  function(){ vY--; render() })
      next.addEventListener('click',  function(){ vY++; render() })
      title.addEventListener('click', function(){ vLayer='years'; render() })
      c.appendChild(el('div',{'class':'stp-hd'},[prev,title,next]))
      var grid=el('div',{'class':'stp-months'})
      MONTHS_SHORT.forEach(function(name,mi){
        var cls='stp-month'+(mi===today.getMonth()&&vY===today.getFullYear()?' is-today':'')
        var b=el('button',{'class':cls,'type':'button'},[name])
        ;(function(m){ b.addEventListener('click',function(){ vM=m; vLayer='days'; render() }) })(mi)
        grid.appendChild(b)
      })
      c.appendChild(grid)
    }

    function renderYears(c) {
      var prev=navBtn('‹','Prev'); var next=navBtn('›','Next')
      var lbl=el('span',{'class':'stp-title stp-title--static'},[yBase+' – '+(yBase+11)])
      prev.addEventListener('click', function(){ yBase-=12; render() })
      next.addEventListener('click', function(){ yBase+=12; render() })
      c.appendChild(el('div',{'class':'stp-hd'},[prev,lbl,next]))
      var grid=el('div',{'class':'stp-years'})
      for (var yi=0;yi<12;yi++){
        var yr=yBase+yi
        var cls='stp-year'+(yr===today.getFullYear()?' is-today':'')
        var b=el('button',{'class':cls,'type':'button'},[String(yr)])
        ;(function(y){ b.addEventListener('click',function(){ vY=y; vLayer='months'; render() }) })(yr)
        grid.appendChild(b)
      }
      c.appendChild(grid)
    }

    function updateRange(cells) {
      cells.forEach(function(c){ c.e.classList.toggle('is-in-range', rangeMode && inRange(c.d)) })
    }

    function navM(dir) {
      vM+=dir
      if (vM>11){vM=0;vY++} else if (vM<0){vM=11;vY--}
      render()
    }

    function navBtn(char, label) {
      return el('button',{'class':'stp-nav','type':'button','aria-label':label},[char])
    }

    // ── Pick / apply ─────────────────────────────────────────────────────────────

    function pickDay(date) {
      activePreset = null
      if (!rangeMode) {
        selS = date; writeInputs()
        closePopup(); return
      }
      if (phase==='start'||(selS&&selE)) {
        selS=date; selE=null; phase='end'; hover=null; render()
      } else {
        if (date<selS){selE=selS;selS=date}else{selE=date}
        phase='start'; writeInputs(); closePopup()
      }
    }

    function writeInputs() {
      input.value = selS ? fmt(selS) : ''
      if (endEl) endEl.value = selE ? fmt(selE) : ''
      input.dispatchEvent(new Event('change',{bubbles:true}))
      emit('st:datepicker:change',{
        input:input, date:selS?new Date(selS):null, dateEnd:selE?new Date(selE):null,
        formatted:fmt(selS), formattedEnd:fmt(selE),
      })
    }

    // ── Open / close ─────────────────────────────────────────────────────────────

    function openPopup() {
      if (open) return
      open = true
      var ex = parseDate(input.value)
      if (ex) { selS=ex; vY=ex.getFullYear(); vM=ex.getMonth() }
      else    { vY=today.getFullYear(); vM=today.getMonth() }
      vLayer = 'days'
      render()
      doc.body.appendChild(popup)
      positionPopup(popup, input)
      input.setAttribute('aria-expanded','true')
      emit('st:datepicker:open',{input:input})
      setTimeout(function(){ doc.addEventListener('click',outside,true) }, 0)
    }

    function closePopup() {
      if (!open) return
      open=false; hover=null
      if (popup.parentNode) popup.parentNode.removeChild(popup)
      input.setAttribute('aria-expanded','false')
      doc.removeEventListener('click',outside,true)
      emit('st:datepicker:close',{input:input})
    }

    function outside(e) {
      var targets = [popup, input]; if (endEl) targets.push(endEl)
      if (!targets.some(function(t){ return t===e.target||t.contains(e.target) })) closePopup()
    }

    // ── Wire inputs ───────────────────────────────────────────────────────────────

    function wire(inp, isEnd) {
      inp.setAttribute('autocomplete','off')
      inp.setAttribute('aria-haspopup','dialog')
      inp.setAttribute('aria-expanded','false')
      inp.addEventListener('click',function(){ if(isEnd) phase='end'; open?closePopup():openPopup() })
      inp.addEventListener('keydown',function(e){ if(e.key==='Escape') closePopup() })
    }
    wire(input, false)
    if (endEl) wire(endEl, true)

    var api = {
      open:    openPopup,
      close:   closePopup,
      setDate: function(v) { var d=parseDate(v); if(d){selS=d;vY=d.getFullYear();vM=d.getMonth();writeInputs()} },
      getDate: function() { return selS?new Date(selS):null },
      getRange:function() { return {start:selS?new Date(selS):null,end:selE?new Date(selE):null} },
      destroy: function() {
        [input,endEl].forEach(function(e){ if(!e)return; e.removeAttribute('aria-expanded'); e.removeAttribute('aria-haspopup'); e.removeAttribute('autocomplete') })
        if (popup.parentNode) popup.parentNode.removeChild(popup)
        dateReg.delete(input)
      },
    }
    dateReg.set(input, api)
    return api
  }

  // ── Time Picker ───────────────────────────────────────────────────────────────

  function createTime(input, opts) {
    opts = opts || {}
    if (timeReg.has(input)) return timeReg.get(input)

    var use24h   = opts.hour24      === true || input.getAttribute('data-st-hour24') === 'true'
    var step     = +(opts.step || input.getAttribute('data-st-step') || 5)
    var showSecs = opts.showSeconds === true || input.hasAttribute('data-st-show-seconds')

    var selH=null, selM=0, selS2=0, selP='AM', open=false
    var popup = el('div',{'class':'stp-popup stp-time'})
    applyTheme(popup, opts)

    function h24(){ if(selH===null)return null; if(use24h)return selH; return selP==='AM'?(selH===12?0:selH):(selH===12?12:selH+12) }

    function fmtTime(){
      var h4=h24(); if(h4===null)return ''
      var h=pad(use24h?h4:(selH||12)), m=pad(selM), s=pad(selS2)
      return (use24h?h+':'+m:h+':'+m+' '+selP)+(showSecs?':'+s:'')
    }

    function render(){
      popup.innerHTML=''
      var cols=el('div',{'class':'stp-tcols'})

      function col(lbl,items,isSel,onPick){
        var w=el('div',{'class':'stp-tcol-wrap'})
        if(lbl) w.appendChild(el('div',{'class':'stp-tcol-lbl'},[lbl]))
        var c=el('div',{'class':'stp-tcol'})
        items.forEach(function(item){
          var s=isSel(item.v)
          var it=el('div',{'class':'stp-titem'+(s?' is-sel':''),'data-v':String(item.v)},[item.l])
          ;(function(v){ it.addEventListener('click',function(){ onPick(v); render(); apply() }) })(item.v)
          c.appendChild(it)
        })
        w.appendChild(c)
        setTimeout(function(){ var s=c.querySelector('.is-sel'); if(s) c.scrollTop=s.offsetTop-c.offsetHeight/2+s.offsetHeight/2 },0)
        return w
      }

      var hours=[], hs=use24h?0:1, he=use24h?23:12
      for(var h=hs;h<=he;h++) hours.push({v:h,l:pad(h)})
      cols.appendChild(col('Hour',hours,function(v){return selH===v},function(v){selH=v}))

      var mins=[]
      for(var m=0;m<60;m+=step) mins.push({v:m,l:pad(m)})
      cols.appendChild(col('Min',mins,function(v){return selM===v},function(v){selM=v}))

      if(showSecs){
        var secs=[]
        for(var s=0;s<60;s+=step) secs.push({v:s,l:pad(s)})
        cols.appendChild(col('Sec',secs,function(v){return selS2===v},function(v){selS2=v}))
      }

      if(!use24h) cols.appendChild(col('',
        [{v:'AM',l:'AM'},{v:'PM',l:'PM'}],
        function(v){return selP===v},
        function(v){selP=v}
      ))

      popup.appendChild(cols)

      var foot=el('div',{'class':'stp-footer'})
      var btn=el('button',{'class':'stp-apply','type':'button'},['Set time'])
      btn.addEventListener('click',function(){ if(selH===null) selH=use24h?0:12; apply(); closePopup() })
      foot.appendChild(btn)
      popup.appendChild(foot)
    }

    function apply(){
      var v=fmtTime(); if(!v)return
      input.value=v
      input.dispatchEvent(new Event('change',{bubbles:true}))
      var d=h24()
      emit('st:timepicker:change',{input:input,value:v,hour:d,minute:selM,second:selS2,period:use24h?null:selP})
    }

    function openPopup(){
      if(open)return; open=true
      render()
      doc.body.appendChild(popup)
      positionPopup(popup,input)
      input.setAttribute('aria-expanded','true')
      emit('st:timepicker:open',{input:input})
      setTimeout(function(){ doc.addEventListener('click',outside,true) },0)
    }

    function closePopup(){
      if(!open)return; open=false
      if(popup.parentNode) popup.parentNode.removeChild(popup)
      input.setAttribute('aria-expanded','false')
      doc.removeEventListener('click',outside,true)
      emit('st:timepicker:close',{input:input})
    }

    function outside(e){ if(!popup.contains(e.target)&&e.target!==input) closePopup() }

    input.setAttribute('autocomplete','off'); input.setAttribute('aria-haspopup','dialog'); input.setAttribute('aria-expanded','false')
    input.addEventListener('click',function(){ open?closePopup():openPopup() })
    input.addEventListener('keydown',function(e){ if(e.key==='Escape') closePopup() })

    var api={
      open:openPopup, close:closePopup,
      setTime:function(h,m,s){
        if(use24h){selH=Math.max(0,Math.min(23,h))}else{selP=h>=12?'PM':'AM';selH=h%12||12}
        selM=Math.max(0,Math.min(59,m||0)); selS2=Math.max(0,Math.min(59,s||0)); apply()
      },
      getTime:function(){return{hour:h24(),minute:selM,second:selS2,formatted:fmtTime()}},
      destroy:function(){
        input.removeAttribute('aria-expanded'); input.removeAttribute('aria-haspopup'); input.removeAttribute('autocomplete')
        if(popup.parentNode) popup.parentNode.removeChild(popup); timeReg.delete(input)
      },
    }
    timeReg.set(input,api)
    return api
  }

  // ── DateTime Picker ───────────────────────────────────────────────────────────

  function createDatetime(input, opts) {
    opts = opts || {}
    if (dtReg.has(input)) return dtReg.get(input)

    var fullFmt   = opts.format || input.getAttribute('data-st-format') || 'YYYY-MM-DD HH:mm'
    var parts     = fullFmt.split(' ')
    var dateFmt   = parts[0] || 'YYYY-MM-DD'
    var timeFmtS  = parts.slice(1).join(' ') || 'HH:mm'
    var use24h    = opts.hour24===true || input.getAttribute('data-st-hour24')==='true' || timeFmtS.indexOf('HH')>=0
    var step      = +(opts.step || input.getAttribute('data-st-step') || 5)
    var showSecs  = opts.showSeconds===true || input.hasAttribute('data-st-show-seconds')
    var weekStart = +(opts.weekStart!=null?opts.weekStart:(input.getAttribute('data-st-week-start')||0))
    var minDate   = (opts.min||input.getAttribute('data-st-min'))?sod(new Date(opts.min||input.getAttribute('data-st-min'))):null
    var maxDate   = (opts.max||input.getAttribute('data-st-max'))?sod(new Date(opts.max||input.getAttribute('data-st-max'))):null
    var disableFns= buildDisableFns(opts, input)

    // State — date part
    var today=sod(new Date()), vY=today.getFullYear(), vM=today.getMonth()
    var vLayer='days', yBase=Math.floor(vY/12)*12
    var selDate=null
    // State — time part
    var selH=null, selMin=0, selSec=0, selP='AM'
    var open=false

    var popup=el('div',{'class':'stp-popup stp-dt'})
    applyTheme(popup, opts)

    // ── Formats ───────────────────────────────────────────────────────────────────

    function fmtD(d){
      if(!d)return ''
      return applyDateFormat(dateFmt, d)
    }
    function h24(){ if(selH===null)return null; if(use24h)return selH; return selP==='AM'?(selH===12?0:selH):(selH===12?12:selH+12) }
    function fmtT(){
      var h4=h24(); if(h4===null)return ''
      var h=pad(use24h?h4:(selH||12)), m=pad(selMin), s=pad(selSec)
      return (use24h?h+':'+m:h+':'+m+' '+selP)+(showSecs?':'+s:'')
    }
    function fmtVal(){
      var d=fmtD(selDate), t=fmtT()
      return d&&t?d+' '+t:(d||t)
    }
    function disabled(d){ if(minDate&&d<minDate)return true; if(maxDate&&d>maxDate)return true; return disableFns.some(function(f){return f(d)}) }

    // ── Render ────────────────────────────────────────────────────────────────────

    function render(){
      popup.innerHTML=''
      var body=el('div',{'class':'stp-dt-body'})

      // Calendar side
      var cal=el('div',{'class':'stp-dt-cal'})
      renderDays(cal)
      body.appendChild(cal)

      // Divider
      body.appendChild(el('div',{'class':'stp-dt-divider'}))

      // Time side
      var ts=el('div',{'class':'stp-dt-time'})
      ts.appendChild(el('div',{'class':'stp-dt-time-lbl'},['Time']))
      renderTime(ts)
      body.appendChild(ts)

      popup.appendChild(body)

      // Footer
      var foot=el('div',{'class':'stp-footer'})
      var applyBtn=el('button',{'class':'stp-apply','type':'button'},['Apply'])
      applyBtn.addEventListener('click',function(){ if(selH===null)selH=use24h?0:12; apply(); closePopup() })
      var clearBtn=el('button',{'class':'stp-clear','type':'button'},['Clear'])
      clearBtn.addEventListener('click',function(){
        selDate=null;selH=null;selMin=selSec=0;selP='AM'
        input.value=''; input.dispatchEvent(new Event('change',{bubbles:true}))
        emit('st:datetimepicker:change',{input:input,value:'',date:null})
        render()
      })
      foot.appendChild(clearBtn); foot.appendChild(applyBtn)
      popup.appendChild(foot)
    }

    function renderDays(c){
      var prev=nb('‹','Prev'); var next=nb('›','Next')
      var title=el('button',{'class':'stp-title','type':'button'},[MONTHS[vM]+' '+vY])
      prev.addEventListener('click',  function(){ navM(-1) })
      next.addEventListener('click',  function(){ navM(1) })
      title.addEventListener('click', function(){ vLayer='months'; render() })
      c.appendChild(el('div',{'class':'stp-hd'},[prev,title,next]))
      var wds=el('div',{'class':'stp-wds'})
      for(var i=0;i<7;i++) wds.appendChild(el('span',{'class':'stp-wd'},[DAYS_SHORT[(i+weekStart)%7]]))
      c.appendChild(wds)
      var grid=el('div',{'class':'stp-days'})
      var first=new Date(vY,vM,1).getDay(), blanks=(first-weekStart+7)%7, total=new Date(vY,vM+1,0).getDate()
      for(var b=0;b<blanks;b++) grid.appendChild(el('span',{'class':'stp-day stp-blank'}))
      for(var d=1;d<=total;d++){
        var dt=new Date(vY,vM,d)
        var cls='stp-day'+(sameDay(dt,today)?' is-today':'')+(sameDay(dt,selDate)?' is-sel':'')+(disabled(dt)?' is-off':'')
        var cell=el('span',{'class':cls},[String(d)])
        ;(function(date,ce){ if(!disabled(date)) ce.addEventListener('click',function(){ selDate=date; render() }) })(dt,cell)
        grid.appendChild(cell)
      }
      c.appendChild(grid)
    }

    function renderTime(c){
      var cols=el('div',{'class':'stp-tcols'})
      function tcol(lbl,items,isSel,onPick){
        var w=el('div',{'class':'stp-tcol-wrap'})
        if(lbl) w.appendChild(el('div',{'class':'stp-tcol-lbl'},[lbl]))
        var col=el('div',{'class':'stp-tcol'})
        items.forEach(function(item){
          var s=isSel(item.v)
          var it=el('div',{'class':'stp-titem'+(s?' is-sel':''),'data-v':String(item.v)},[item.l])
          ;(function(v){ it.addEventListener('click',function(){ onPick(v); render() }) })(item.v)
          col.appendChild(it)
        })
        w.appendChild(col)
        setTimeout(function(){ var s=col.querySelector('.is-sel'); if(s) col.scrollTop=s.offsetTop-col.offsetHeight/2+s.offsetHeight/2 },0)
        return w
      }
      var hours=[],hs=use24h?0:1,he=use24h?23:12
      for(var h=hs;h<=he;h++) hours.push({v:h,l:pad(h)})
      cols.appendChild(tcol('Hour',hours,function(v){return selH===v},function(v){selH=v}))
      var mins=[]
      for(var m=0;m<60;m+=step) mins.push({v:m,l:pad(m)})
      cols.appendChild(tcol('Min',mins,function(v){return selMin===v},function(v){selMin=v}))
      if(showSecs){
        var secs=[]
        for(var s=0;s<60;s+=step) secs.push({v:s,l:pad(s)})
        cols.appendChild(tcol('Sec',secs,function(v){return selSec===v},function(v){selSec=v}))
      }
      if(!use24h) cols.appendChild(tcol('',
        [{v:'AM',l:'AM'},{v:'PM',l:'PM'}],
        function(v){return selP===v},function(v){selP=v}
      ))
      c.appendChild(cols)
    }

    function navM(dir){ vM+=dir; if(vM>11){vM=0;vY++}else if(vM<0){vM=11;vY--}; render() }
    function nb(ch,lbl){ return el('button',{'class':'stp-nav','type':'button','aria-label':lbl},[ch]) }

    function apply(){
      var v=fmtVal(); input.value=v
      input.dispatchEvent(new Event('change',{bubbles:true}))
      emit('st:datetimepicker:change',{input:input,value:v,date:selDate?new Date(selDate):null,hour:h24(),minute:selMin})
    }

    function openPopup(){
      if(open)return; open=true
      var ex=parseDate(input.value)
      if(ex){selDate=ex;vY=ex.getFullYear();vM=ex.getMonth()}
      else  {vY=today.getFullYear();vM=today.getMonth()}
      vLayer='days'
      render()
      doc.body.appendChild(popup)
      positionPopup(popup,input)
      input.setAttribute('aria-expanded','true')
      emit('st:datetimepicker:open',{input:input})
      setTimeout(function(){ doc.addEventListener('click',outside,true) },0)
    }

    function closePopup(){
      if(!open)return; open=false
      if(popup.parentNode) popup.parentNode.removeChild(popup)
      input.setAttribute('aria-expanded','false')
      doc.removeEventListener('click',outside,true)
      emit('st:datetimepicker:close',{input:input})
    }

    function outside(e){ if(!popup.contains(e.target)&&e.target!==input) closePopup() }

    input.setAttribute('autocomplete','off'); input.setAttribute('aria-haspopup','dialog'); input.setAttribute('aria-expanded','false')
    input.addEventListener('click',function(){ open?closePopup():openPopup() })
    input.addEventListener('keydown',function(e){ if(e.key==='Escape') closePopup() })

    var api={
      open:openPopup, close:closePopup,
      setDate:function(v){ var d=parseDate(v); if(d){selDate=d;vY=d.getFullYear();vM=d.getMonth();apply()} },
      getDate:function(){ return selDate?new Date(selDate):null },
      destroy:function(){
        input.removeAttribute('aria-expanded'); input.removeAttribute('aria-haspopup'); input.removeAttribute('autocomplete')
        if(popup.parentNode) popup.parentNode.removeChild(popup); dtReg.delete(input)
      },
    }
    dtReg.set(input,api)
    return api
  }

  // ── Shared helpers ────────────────────────────────────────────────────────────

  function pad(n) { return String(n).padStart(2,'0') }

  var MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  var MONTH_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December']

  function applyDateFormat(dateFmt, d) {
    return dateFmt.replace(/YYYY|MMMM|MMM|MM|DD/g, function (token) {
      switch (token) {
        case 'YYYY': return d.getFullYear()
        case 'MMMM': return MONTH_LONG[d.getMonth()]
        case 'MMM':  return MONTH_SHORT[d.getMonth()]
        case 'MM':   return pad(d.getMonth()+1)
        case 'DD':   return pad(d.getDate())
      }
    })
  }

  function buildDisableFns(opts, input) {
    var fns = []
    var ddAttr = input.getAttribute('data-st-disabled-days')
    if (ddAttr) {
      var arr = ddAttr.split(',').map(Number)
      fns.push(function(d){ return arr.indexOf(d.getDay())>=0 })
    }
    ;(opts.disable||[]).forEach(function(d){
      if (typeof d==='function') fns.push(d)
      else { var t=sod(new Date(d)).getTime(); fns.push(function(dt){return sod(dt).getTime()===t}) }
    })
    return fns
  }

  // ── Auto-init ─────────────────────────────────────────────────────────────────

  function autoInit() {
    if (typeof doc.querySelectorAll !== 'function') return
    doc.querySelectorAll('[data-st-datepicker]').forEach(function(e){ createDate(e) })
    doc.querySelectorAll('[data-st-timepicker]').forEach(function(e){ createTime(e) })
    doc.querySelectorAll('[data-st-datetimepicker]').forEach(function(e){ createDatetime(e) })
  }

  if (typeof doc.readyState === 'string') {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoInit)
    else autoInit()
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  return {
    date:     function(sel, opts) { var e=qs(sel); return e?createDate(e,opts):null },
    time:     function(sel, opts) { var e=qs(sel); return e?createTime(e,opts):null },
    datetime: function(sel, opts) { var e=qs(sel); return e?createDatetime(e,opts):null },
    destroy:  function(sel) {
      var e=qs(sel); if(!e) return
      ;[dateReg,timeReg,dtReg].forEach(function(r){ if(r.has(e)) r.get(e).destroy() })
    },
  }
}))
