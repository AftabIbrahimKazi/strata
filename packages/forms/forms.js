/**
 * Strata Forms
 * Version: 1.0.0
 *
 * Three interactive form controls:
 *   - Custom Select  (styled <select> replacement)
 *   - Date Picker    (calendar popup)
 *   - Time Picker    (hour / minute / AM-PM columns)
 *
 * Usage (standalone):
 *   <script src="forms.js"></script>
 *   StrataForms.select('#mySelect')
 *   StrataForms.datepicker('#myDate')
 *   StrataForms.timepicker('#myTime')
 *
 * Usage (with Strata):
 *   Included in strata.components.js — available as Strata.Forms.*
 *   Do not load this file separately when using Strata.
 *
 * Declarative (auto-init on DOMContentLoaded):
 *   <select data-st-select>
 *   <input  data-st-datepicker>
 *   <input  data-st-timepicker>
 *
 * Events fired on document:
 *   st:select:open      st:select:close      st:select:change
 *   st:datepicker:open  st:datepicker:close  st:datepicker:change
 *   st:timepicker:open  st:timepicker:close  st:timepicker:change
 *
 * UMD — works as a browser global, CommonJS module, or AMD module.
 * When Strata is present on the page, registers as Strata.Forms.
 * Otherwise registers as StrataForms.
 */

;(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory)
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory()
  } else {
    if (root.Strata) {
      root.Strata.Forms = factory()
    } else {
      root.StrataForms = factory()
    }
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict'

  var doc = typeof document !== 'undefined' ? document : {}
  var win = typeof window  !== 'undefined' ? window  : {}

  // ─── Shared helpers ─────────────────────────────────────────────────────────

  function emit(name, detail) {
    doc.dispatchEvent(new CustomEvent(name, { detail: detail, bubbles: true }))
  }

  function resolveEl(selector) {
    if (!selector) return null
    if (selector instanceof Element) return selector
    if (typeof selector === 'string') return doc.querySelector(selector)
    return null
  }

  function makeEl(tag, attrs, children) {
    var el = doc.createElement(tag)
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') el.className = attrs[k]
        else el.setAttribute(k, attrs[k])
      })
    }
    if (children) {
      children.forEach(function (c) {
        if (c == null) return
        el.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c)
      })
    }
    return el
  }

  function positionBelow(popup, anchor) {
    var rect    = anchor.getBoundingClientRect()
    var scrollY = win.pageYOffset || doc.documentElement.scrollTop || 0
    var scrollX = win.pageXOffset || doc.documentElement.scrollLeft || 0
    var spaceBelow = win.innerHeight - rect.bottom
    var popH    = popup.offsetHeight || 280

    if (spaceBelow < popH && rect.top > spaceBelow) {
      popup.style.top  = (rect.top  + scrollY - popH - 4) + 'px'
      popup.classList.add('st-pop-up')
    } else {
      popup.style.top  = (rect.bottom + scrollY + 4) + 'px'
      popup.classList.remove('st-pop-up')
    }
    // Clamp left so popup never overflows viewport
    var left = rect.left + scrollX
    var maxLeft = win.innerWidth - (popup.offsetWidth || 280) - 8
    popup.style.left = Math.max(8, Math.min(left, maxLeft)) + 'px'
  }

  // ─── Custom Select ──────────────────────────────────────────────────────────

  var selectRegistry = new Map()

  function createSelect(nativeEl, options) {
    options = options || {}
    if (selectRegistry.has(nativeEl)) return selectRegistry.get(nativeEl)

    var placeholder  = options.placeholder
                    || nativeEl.getAttribute('data-st-placeholder')
                    || 'Select…'
    var autoWidth    = options.autoWidth != null
                    ? options.autoWidth
                    : nativeEl.hasAttribute('data-st-auto-width')
    var maxWidth     = options.maxWidth != null
                    ? parseInt(options.maxWidth, 10)
                    : nativeEl.getAttribute('data-st-max-width')
                      ? parseInt(nativeEl.getAttribute('data-st-max-width'), 10)
                      : null
    var opts         = Array.from(nativeEl.options)
    var selectedIdx  = nativeEl.selectedIndex >= 0 ? nativeEl.selectedIndex : 0
    var isOpen       = false
    var disabled     = nativeEl.disabled

    var isRequired = nativeEl.hasAttribute('required')

    // Hide native select but keep it in the DOM for form submission.
    // tabindex="-1" prevents the browser from scrolling to/focusing it
    // during constraint validation — we handle that on the trigger instead.
    nativeEl.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;tabindex:-1;'
    nativeEl.setAttribute('tabindex', '-1')

    // Build DOM
    var valueSpan = makeEl('span', { 'class': 'st-select-value' })
    var arrowSpan = makeEl('span', { 'class': 'st-select-arrow', 'aria-hidden': 'true' })
    var trigger   = makeEl('button', {
      'class':           'st-select-trigger',
      'type':            'button',
      'role':            'combobox',
      'aria-haspopup':   'listbox',
      'aria-expanded':   'false',
      'aria-disabled':   disabled ? 'true' : 'false',
      'aria-required':   isRequired ? 'true' : 'false',
    }, [valueSpan, arrowSpan])

    var listbox = makeEl('ul', {
      'class': 'st-select-listbox',
      'role':  'listbox',
    })
    var wrapper = makeEl('div', { 'class': 'st-select' + (disabled ? ' is-disabled' : '') })

    if (nativeEl.id) {
      trigger.id               = nativeEl.id + '-trigger'
      trigger.setAttribute('aria-controls', nativeEl.id + '-listbox')
      listbox.id = nativeEl.id + '-listbox'
    }

    function updateDisplay() {
      var opt = opts[selectedIdx]
      var hasVal = opt && opt.value !== ''
      valueSpan.textContent = hasVal ? opt.text : placeholder
      valueSpan.classList.toggle('st-select-placeholder', !hasVal)
      trigger.setAttribute('aria-activedescendant',
        hasVal && listbox.children[selectedIdx]
          ? listbox.children[selectedIdx].id || ''
          : '')
    }

    function renderListbox() {
      listbox.innerHTML = ''
      opts.forEach(function (opt, i) {
        var li = makeEl('li', {
          'class':       'st-select-option' + (i === selectedIdx ? ' is-selected' : ''),
          'role':        'option',
          'data-value':  opt.value,
          'aria-selected': i === selectedIdx ? 'true' : 'false',
          'id':          (nativeEl.id || 'st-sel') + '-opt-' + i,
        }, [opt.text])
        li.addEventListener('click', function () { pick(i) })
        listbox.appendChild(li)
      })
    }

    function pick(idx) {
      selectedIdx            = idx
      nativeEl.selectedIndex = idx
      nativeEl.dispatchEvent(new Event('change', { bubbles: true }))
      // Clear any validation error state
      trigger.classList.remove('is-invalid')
      trigger.removeAttribute('aria-invalid')
      updateDisplay()
      renderListbox()
      close()
      emit('st:select:change', {
        select: nativeEl,
        value:  opts[idx] ? opts[idx].value : '',
        text:   opts[idx] ? opts[idx].text  : '',
        index:  idx,
      })
    }

    function open() {
      if (isOpen || disabled) return
      isOpen = true
      renderListbox()
      wrapper.appendChild(listbox)
      wrapper.classList.add('is-open')
      trigger.setAttribute('aria-expanded', 'true')
      positionListbox()
      emit('st:select:open', { select: nativeEl })
      setTimeout(function () { doc.addEventListener('click', outsideClick, true) }, 0)
    }

    function close() {
      if (!isOpen) return
      isOpen = false
      wrapper.classList.remove('is-open')
      trigger.setAttribute('aria-expanded', 'false')
      if (listbox.parentNode) listbox.parentNode.removeChild(listbox)
      doc.removeEventListener('click', outsideClick, true)
      emit('st:select:close', { select: nativeEl })
    }

    function positionListbox() {
      var wRect      = wrapper.getBoundingClientRect()
      var viewportW  = win.innerWidth  || doc.documentElement.clientWidth
      var viewportH  = win.innerHeight || doc.documentElement.clientHeight

      // ── Vertical: dropup if not enough space below ──────────────
      var lbH = listbox.offsetHeight || 200
      if (viewportH - wRect.bottom < lbH && wRect.top > lbH) {
        wrapper.classList.add('st-select-dropup')
      } else {
        wrapper.classList.remove('st-select-dropup')
      }

      if (!autoWidth) return   // default: CSS width:100% handles it

      // ── Auto-width: measure natural content width ────────────────
      // 1. Let listbox size to its content
      listbox.style.width     = 'max-content'
      listbox.style.minWidth  = wRect.width + 'px'   // never narrower than trigger
      listbox.style.left      = '0'
      listbox.style.right     = 'auto'

      var naturalW  = listbox.scrollWidth
      var triggerW  = wRect.width
      var desiredW  = Math.max(triggerW, naturalW)

      // 2. Apply maxWidth cap if set
      if (maxWidth) desiredW = Math.min(desiredW, maxWidth)

      // 3. Viewport edge detection
      var spaceRight = viewportW - wRect.left - 8   // room to the right of trigger
      var spaceLeft  = wRect.right - 8              // room to the left of trigger

      if (desiredW <= spaceRight) {
        // Fits left-aligned — normal case
        listbox.style.width = desiredW + 'px'
        listbox.style.left  = '0'
        listbox.style.right = 'auto'
      } else if (desiredW <= spaceLeft) {
        // Doesn't fit right, but fits left-aligned to right edge of trigger
        listbox.style.width = desiredW + 'px'
        listbox.style.left  = 'auto'
        listbox.style.right = '0'
      } else {
        // Doesn't fit either way — use largest available side
        if (spaceRight >= spaceLeft) {
          listbox.style.width = spaceRight + 'px'
          listbox.style.left  = '0'
          listbox.style.right = 'auto'
        } else {
          listbox.style.width = spaceLeft + 'px'
          listbox.style.left  = 'auto'
          listbox.style.right = '0'
        }
      }
    }

    function outsideClick(e) {
      if (!wrapper.contains(e.target)) close()
    }

    // Required validation — intercept browser's default invalid behaviour
    // so the tooltip and focus land on the visible trigger, not the hidden native.
    if (isRequired) {
      nativeEl.addEventListener('invalid', function (e) {
        e.preventDefault()                          // stop browser tooltip on hidden element
        trigger.classList.add('is-invalid')
        trigger.setAttribute('aria-invalid', 'true')
        trigger.focus()
      })
    }

    // Keyboard
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        isOpen ? pick(Math.min(selectedIdx + 1, opts.length - 1)) : open()
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        isOpen ? pick(Math.max(selectedIdx - 1, 0)) : open()
      }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isOpen ? close() : open() }
      if (e.key === 'Escape') close()
    })

    trigger.addEventListener('click', function (e) {
      e.stopPropagation()
      isOpen ? close() : open()
    })

    wrapper.appendChild(trigger)
    nativeEl.parentNode.insertBefore(wrapper, nativeEl.nextSibling)
    updateDisplay()

    var api = {
      open:     open,
      close:    close,
      setValue: function (val) {
        var idx = opts.findIndex(function (o) { return o.value === val })
        if (idx >= 0) pick(idx)
      },
      getValue: function () { return opts[selectedIdx] ? opts[selectedIdx].value : '' },
      destroy:  function () {
        wrapper.remove()
        nativeEl.style.cssText = ''
        selectRegistry.delete(nativeEl)
      },
    }

    selectRegistry.set(nativeEl, api)
    return api
  }

  // ─── Date Picker ────────────────────────────────────────────────────────────

  var dpRegistry = new Map()

  var MONTHS   = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December']
  var DAYS_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa']

  function createDatepicker(input, options) {
    options = options || {}
    if (dpRegistry.has(input)) return dpRegistry.get(input)

    var fmt      = options.format || input.getAttribute('data-st-format') || 'YYYY-MM-DD'
    var minDateS = options.min    || input.getAttribute('data-st-min')
    var maxDateS = options.max    || input.getAttribute('data-st-max')
    var minDate  = minDateS ? startOfDay(new Date(minDateS)) : null
    var maxDate  = maxDateS ? startOfDay(new Date(maxDateS)) : null

    var today       = startOfDay(new Date())
    var viewYear    = today.getFullYear()
    var viewMonth   = today.getMonth()
    var selectedDay = null   // Date | null
    var isOpen      = false

    var popup = makeEl('div', {
      'class':      'st-datepicker-popup',
      'role':       'dialog',
      'aria-modal': 'true',
      'aria-label': 'Date picker',
    })

    function startOfDay(d) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    }

    function fmtDate(d) {
      var Y = d.getFullYear()
      var M = String(d.getMonth() + 1).padStart(2, '0')
      var D = String(d.getDate()).padStart(2, '0')
      return fmt.replace('YYYY', Y).replace('MM', M).replace('DD', D)
    }

    function sameDay(a, b) {
      return a && b &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth()    === b.getMonth()    &&
        a.getDate()     === b.getDate()
    }

    function isOutOfRange(d) {
      return (minDate && d < minDate) || (maxDate && d > maxDate)
    }

    function render() {
      popup.innerHTML = ''

      // Header row
      var prevBtn = makeEl('button', {
        'class': 'st-dp-nav st-dp-prev', 'type': 'button', 'aria-label': 'Previous month',
      }, ['‹'])
      var nextBtn = makeEl('button', {
        'class': 'st-dp-nav st-dp-next', 'type': 'button', 'aria-label': 'Next month',
      }, ['›'])
      var title = makeEl('span', { 'class': 'st-dp-title' },
        [MONTHS[viewMonth] + ' ' + viewYear])
      var header = makeEl('div', { 'class': 'st-dp-header' }, [prevBtn, title, nextBtn])

      prevBtn.addEventListener('click', function () { navigate(-1) })
      nextBtn.addEventListener('click', function () { navigate(1) })
      popup.appendChild(header)

      // Day-name row
      var dayRow = makeEl('div', { 'class': 'st-dp-day-names' })
      DAYS_SHORT.forEach(function (d) {
        dayRow.appendChild(makeEl('span', { 'class': 'st-dp-day-name' }, [d]))
      })
      popup.appendChild(dayRow)

      // Grid
      var grid = makeEl('div', { 'class': 'st-dp-grid', 'role': 'grid' })
      var firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
      var daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate()

      // Leading blank cells
      for (var b = 0; b < firstWeekday; b++) {
        grid.appendChild(makeEl('div', { 'class': 'st-dp-cell st-dp-blank' }))
      }

      // Day cells
      for (var d = 1; d <= daysInMonth; d++) {
        var cellDate = new Date(viewYear, viewMonth, d)
        var classes  = 'st-dp-cell'
        if (sameDay(cellDate, today))        classes += ' is-today'
        if (sameDay(cellDate, selectedDay))  classes += ' is-selected'
        if (isOutOfRange(cellDate))          classes += ' is-disabled'

        var cell = makeEl('div', {
          'class':       classes,
          'role':        'gridcell',
          'aria-label':  cellDate.toLocaleDateString(),
          'aria-selected': sameDay(cellDate, selectedDay) ? 'true' : 'false',
          'tabindex':    sameDay(cellDate, selectedDay) ? '0' : '-1',
        }, [String(d)]);

        ;(function (date) {
          cell.addEventListener('click', function () {
            if (!isOutOfRange(date)) selectDay(date)
          })
        }(cellDate))

        grid.appendChild(cell)
      }

      popup.appendChild(grid)

      // Today shortcut
      var footer = makeEl('div', { 'class': 'st-dp-footer' })
      var todayBtn = makeEl('button', { 'class': 'st-dp-today', 'type': 'button' }, ['Today'])
      todayBtn.addEventListener('click', function () {
        if (!isOutOfRange(today)) {
          viewYear  = today.getFullYear()
          viewMonth = today.getMonth()
          selectDay(today)
        }
      })
      var clearBtn = makeEl('button', { 'class': 'st-dp-clear', 'type': 'button' }, ['Clear'])
      clearBtn.addEventListener('click', function () {
        selectedDay  = null
        input.value  = ''
        input.dispatchEvent(new Event('change', { bubbles: true }))
        emit('st:datepicker:change', { input: input, date: null, formatted: '' })
        render()
      })
      footer.appendChild(todayBtn)
      footer.appendChild(clearBtn)
      popup.appendChild(footer)
    }

    function navigate(dir) {
      viewMonth += dir
      if (viewMonth > 11) { viewMonth = 0; viewYear++ }
      if (viewMonth < 0)  { viewMonth = 11; viewYear-- }
      render()
    }

    function selectDay(date) {
      selectedDay  = date
      input.value  = fmtDate(date)
      input.dispatchEvent(new Event('change', { bubbles: true }))
      emit('st:datepicker:change', { input: input, date: date, formatted: input.value })
      close()
    }

    function open() {
      if (isOpen) return
      isOpen = true

      // Sync view to existing input value
      var existing = parseDate(input.value)
      if (existing) {
        selectedDay = existing
        viewYear    = existing.getFullYear()
        viewMonth   = existing.getMonth()
      }

      render()
      doc.body.appendChild(popup)
      positionBelow(popup, input)
      // Trigger reflow so transition plays
      void popup.offsetHeight
      popup.classList.add('is-open')
      input.setAttribute('aria-expanded', 'true')
      emit('st:datepicker:open', { input: input })
      setTimeout(function () { doc.addEventListener('click', outsideClick, true) }, 0)
    }

    function close() {
      if (!isOpen) return
      isOpen = false
      popup.classList.remove('is-open')
      input.setAttribute('aria-expanded', 'false')
      doc.removeEventListener('click', outsideClick, true)
      emit('st:datepicker:close', { input: input })
      var p = popup
      setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p) }, 200)
    }

    function parseDate(str) {
      if (!str) return null
      var d = new Date(str)
      return isNaN(d.getTime()) ? null : startOfDay(d)
    }

    function outsideClick(e) {
      if (!popup.contains(e.target) && e.target !== input) close()
    }

    input.setAttribute('autocomplete', 'off')
    input.setAttribute('aria-expanded', 'false')
    input.setAttribute('aria-haspopup', 'dialog')
    input.addEventListener('click', function () { isOpen ? close() : open() })
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close()
      if ((e.key === 'Enter' || e.key === ' ') && !isOpen) { e.preventDefault(); open() }
    })

    var api = {
      open:    open,
      close:   close,
      setDate: function (val) {
        var d = new Date(val)
        if (!isNaN(d.getTime())) selectDay(startOfDay(d))
      },
      getDate: function () { return selectedDay ? new Date(selectedDay) : null },
      destroy: function () {
        input.removeAttribute('aria-expanded')
        input.removeAttribute('aria-haspopup')
        input.removeAttribute('autocomplete')
        if (popup.parentNode) popup.parentNode.removeChild(popup)
        dpRegistry.delete(input)
      },
    }

    dpRegistry.set(input, api)
    return api
  }

  // ─── Time Picker ────────────────────────────────────────────────────────────

  var tpRegistry = new Map()

  function createTimepicker(input, options) {
    options = options || {}
    if (tpRegistry.has(input)) return tpRegistry.get(input)

    var use24h  = options.hour24 === true
               || input.getAttribute('data-st-hour24') === 'true'
               || false
    var step    = parseInt(options.step || input.getAttribute('data-st-step') || '5', 10)

    // Display state
    // displayHour: 1-12 (12h mode) or 0-23 (24h mode)
    var displayHour = null
    var selMin      = 0
    var selPeriod   = 'AM'   // only used in 12h mode
    var isOpen      = false

    var popup = makeEl('div', {
      'class':      'st-timepicker-popup',
      'role':       'dialog',
      'aria-modal': 'true',
      'aria-label': 'Time picker',
    })

    function getActual24Hour() {
      if (displayHour === null) return null
      if (use24h) return displayHour
      if (selPeriod === 'AM') return displayHour === 12 ? 0 : displayHour
      return displayHour === 12 ? 12 : displayHour + 12
    }

    function formatTime() {
      var h24 = getActual24Hour()
      if (h24 === null) return ''
      var m   = String(selMin).padStart(2, '0')
      if (use24h) return String(h24).padStart(2, '0') + ':' + m
      var h12 = displayHour === null ? 12 : displayHour
      return h12 + ':' + m + ' ' + selPeriod
    }

    function applyValue() {
      var formatted = formatTime()
      if (!formatted) return
      input.value = formatted
      input.dispatchEvent(new Event('change', { bubbles: true }))
      emit('st:timepicker:change', {
        input:    input,
        value:    formatted,
        hour:     getActual24Hour(),
        minute:   selMin,
        period:   use24h ? null : selPeriod,
      })
    }

    function buildColumn(label, items, getSelectedFn, onClickFn) {
      var wrap = makeEl('div', { 'class': 'st-tp-col-wrap' })
      var lbl  = makeEl('div', { 'class': 'st-tp-col-label' }, [label])
      var col  = makeEl('div', { 'class': 'st-tp-col', 'role': 'listbox', 'aria-label': label })

      items.forEach(function (item) {
        var isSel = getSelectedFn(item.value)
        var li    = makeEl('div', {
          'class':       'st-tp-item' + (isSel ? ' is-selected' : ''),
          'role':        'option',
          'aria-selected': isSel ? 'true' : 'false',
          'data-value':  String(item.value),
        }, [item.label])
        li.addEventListener('click', function () { onClickFn(item.value) })
        col.appendChild(li)
      })

      wrap.appendChild(lbl)
      wrap.appendChild(col)
      return wrap
    }

    function render() {
      popup.innerHTML = ''

      var cols = makeEl('div', { 'class': 'st-tp-cols' })

      // Hours column
      var hours = []
      var hourStart = use24h ? 0 : 1
      var hourEnd   = use24h ? 23 : 12
      for (var h = hourStart; h <= hourEnd; h++) {
        hours.push({ value: h, label: String(h).padStart(2, '0') })
      }

      var hourCol = buildColumn('Hour', hours,
        function (v) { return displayHour === v },
        function (v) {
          displayHour = v
          renderAndApply()
        }
      )
      cols.appendChild(hourCol)

      // Minutes column
      var mins = []
      for (var m = 0; m < 60; m += step) {
        mins.push({ value: m, label: String(m).padStart(2, '0') })
      }

      var minCol = buildColumn('Min', mins,
        function (v) { return selMin === v },
        function (v) {
          selMin = v
          renderAndApply()
        }
      )
      cols.appendChild(minCol)

      // AM/PM column (12h only)
      if (!use24h) {
        var periods = [{ value: 'AM', label: 'AM' }, { value: 'PM', label: 'PM' }]
        var periodCol = buildColumn('', periods,
          function (v) { return selPeriod === v },
          function (v) {
            selPeriod = v
            renderAndApply()
          }
        )
        cols.appendChild(periodCol)
      }

      popup.appendChild(cols)

      // Confirm button
      var footer    = makeEl('div', { 'class': 'st-tp-footer' })
      var confirmBtn = makeEl('button', { 'class': 'st-tp-confirm', 'type': 'button' }, ['Set time'])
      confirmBtn.addEventListener('click', function () {
        if (displayHour === null) displayHour = use24h ? 0 : 12
        applyValue()
        close()
      })
      footer.appendChild(confirmBtn)
      popup.appendChild(footer)

      // Scroll selected items into view
      setTimeout(function () {
        popup.querySelectorAll('.st-tp-item.is-selected').forEach(function (el) {
          el.parentNode.scrollTop = el.offsetTop - el.parentNode.offsetHeight / 2
        })
      }, 0)
    }

    function renderAndApply() {
      render()
      applyValue()
    }

    function open() {
      if (isOpen) return
      isOpen = true
      render()
      doc.body.appendChild(popup)
      positionBelow(popup, input)
      void popup.offsetHeight
      popup.classList.add('is-open')
      input.setAttribute('aria-expanded', 'true')
      emit('st:timepicker:open', { input: input })
      setTimeout(function () { doc.addEventListener('click', outsideClick, true) }, 0)
    }

    function close() {
      if (!isOpen) return
      isOpen = false
      popup.classList.remove('is-open')
      input.setAttribute('aria-expanded', 'false')
      doc.removeEventListener('click', outsideClick, true)
      emit('st:timepicker:close', { input: input })
      var p = popup
      setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p) }, 200)
    }

    function outsideClick(e) {
      if (!popup.contains(e.target) && e.target !== input) close()
    }

    input.setAttribute('autocomplete', 'off')
    input.setAttribute('aria-expanded', 'false')
    input.setAttribute('aria-haspopup', 'dialog')
    input.addEventListener('click', function () { isOpen ? close() : open() })
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close()
      if ((e.key === 'Enter' || e.key === ' ') && !isOpen) { e.preventDefault(); open() }
    })

    var api = {
      open:    open,
      close:   close,
      setTime: function (h, m) {
        if (use24h) {
          displayHour = Math.max(0, Math.min(23, h))
        } else {
          selPeriod   = h >= 12 ? 'PM' : 'AM'
          displayHour = h % 12 || 12
        }
        selMin = Math.max(0, Math.min(59, m))
        applyValue()
      },
      getTime: function () {
        return { hour: getActual24Hour(), minute: selMin, formatted: formatTime() }
      },
      destroy: function () {
        input.removeAttribute('aria-expanded')
        input.removeAttribute('aria-haspopup')
        input.removeAttribute('autocomplete')
        if (popup.parentNode) popup.parentNode.removeChild(popup)
        tpRegistry.delete(input)
      },
    }

    tpRegistry.set(input, api)
    return api
  }

  // ─── Auto-init ──────────────────────────────────────────────────────────────

  function autoInit() {
    if (typeof doc.querySelectorAll !== 'function') return
    doc.querySelectorAll('select[data-st-select]').forEach(function (el) {
      createSelect(el)
    })
    doc.querySelectorAll('[data-st-datepicker]').forEach(function (el) {
      createDatepicker(el)
    })
    doc.querySelectorAll('[data-st-timepicker]').forEach(function (el) {
      createTimepicker(el)
    })
  }

  if (typeof doc.readyState === 'string') {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', autoInit)
    } else {
      autoInit()
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  return {
    select: function (selector, options) {
      var el = resolveEl(selector)
      return el ? createSelect(el, options) : null
    },
    datepicker: function (selector, options) {
      var el = resolveEl(selector)
      return el ? createDatepicker(el, options) : null
    },
    timepicker: function (selector, options) {
      var el = resolveEl(selector)
      return el ? createTimepicker(el, options) : null
    },
    destroy: function (selector) {
      var target = resolveEl(selector)
      if (!target) return
      ;[selectRegistry, dpRegistry, tpRegistry].forEach(function (reg) {
        if (reg.has(target)) reg.get(target).destroy()
      })
    },
  }
}))
