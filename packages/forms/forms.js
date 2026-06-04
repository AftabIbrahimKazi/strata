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

  // positionBelow — for position:fixed popups appended to <body>.
  // getBoundingClientRect() returns viewport coords, so NO scroll offset needed.
  function positionBelow(popup, anchor) {
    var rect       = anchor.getBoundingClientRect()
    var viewportH  = win.innerHeight || doc.documentElement.clientHeight
    var viewportW  = win.innerWidth  || doc.documentElement.clientWidth
    var popH       = popup.offsetHeight || 300
    var popW       = popup.offsetWidth  || 280
    var spaceBelow = viewportH - rect.bottom
    var spaceAbove = rect.top

    // Flip up if not enough room below
    if (spaceBelow < popH + 8 && spaceAbove > spaceBelow) {
      popup.style.top = Math.max(8, rect.top - popH - 4) + 'px'
      popup.classList.add('st-pop-up')
    } else {
      popup.style.top = (rect.bottom + 4) + 'px'
      popup.classList.remove('st-pop-up')
    }

    // Clamp left so popup never overflows right edge
    var left = rect.left
    popup.style.left = Math.max(8, Math.min(left, viewportW - popW - 8)) + 'px'
  }

  // ─── Custom Select ──────────────────────────────────────────────────────────

  var selectRegistry = new Map()

  function createSelect(nativeEl, options) {
    options = options || {}
    if (selectRegistry.has(nativeEl)) return selectRegistry.get(nativeEl)

    // ── Config ──────────────────────────────────────────────────────
    var placeholder   = options.placeholder  || nativeEl.getAttribute('data-st-placeholder') || 'Select…'
    var multiSelect   = options.multiSelect  != null ? options.multiSelect  : (nativeEl.multiple || nativeEl.hasAttribute('data-st-multi'))
    var searchable    = options.searchable   != null ? options.searchable   : nativeEl.hasAttribute('data-st-searchable')
    var clearable     = options.clearable    != null ? options.clearable    : nativeEl.hasAttribute('data-st-clearable')
    var creatable     = options.creatable    != null ? options.creatable    : nativeEl.hasAttribute('data-st-creatable')
    var maxItems      = options.maxItems     != null ? parseInt(options.maxItems, 10)
                      : nativeEl.getAttribute('data-st-max-items') ? parseInt(nativeEl.getAttribute('data-st-max-items'), 10) : null
    var autoWidth     = options.autoWidth    != null ? options.autoWidth    : nativeEl.hasAttribute('data-st-auto-width')
    var maxWidth      = options.maxWidth     != null ? parseInt(options.maxWidth, 10)
                      : nativeEl.getAttribute('data-st-max-width') ? parseInt(nativeEl.getAttribute('data-st-max-width'), 10) : null
    var loadOptions      = options.loadOptions       || null
    var renderOption     = options.renderOption      || null
    var renderValue      = options.renderValue       || null
    var maxDisplay       = options.maxDisplay        != null ? parseInt(options.maxDisplay, 10)
                         : nativeEl.getAttribute('data-st-max-display') ? parseInt(nativeEl.getAttribute('data-st-max-display'), 10) : null
    var checkboxes       = options.checkboxes        != null ? options.checkboxes       : nativeEl.hasAttribute('data-st-checkboxes')
    var checkboxDisplay  = options.checkboxDisplay   || nativeEl.getAttribute('data-st-checkbox-display') || 'chips'
    var selectAll        = options.selectAll         != null ? options.selectAll        : (checkboxes && !nativeEl.hasAttribute('data-st-no-select-all'))
    var isRequired       = nativeEl.hasAttribute('required')
    var disabled         = nativeEl.disabled

    // checkboxes implies multiSelect
    if (checkboxes && !multiSelect) multiSelect = true

    // If multiSelect forced via option but native isn't multiple, upgrade it
    if (multiSelect && !nativeEl.multiple) nativeEl.multiple = true

    // ── State ───────────────────────────────────────────────────────
    var opts          = []      // [{value, text, el, data, groupLabel, disabled}]
    var selectedSet   = new Set()  // flat indices of selected opts
    var searchQuery   = ''
    var isOpen        = false
    var isLoading     = false
    var debounceTimer = null

    function buildOpts() {
      opts = []
      Array.from(nativeEl.children).forEach(function (child) {
        if (child.tagName === 'OPTGROUP') {
          Array.from(child.children).forEach(function (opt) {
            if (opt.tagName === 'OPTION') opts.push({ value: opt.value, text: opt.text, el: opt, data: opt.dataset, groupLabel: child.label, disabled: opt.disabled })
          })
        } else if (child.tagName === 'OPTION') {
          opts.push({ value: child.value, text: child.text, el: child, data: child.dataset, groupLabel: null, disabled: child.disabled })
        }
      })
      // Sync initial selectedSet from native
      selectedSet = new Set()
      opts.forEach(function (o, i) { if (o.el.selected) selectedSet.add(i) })
    }

    buildOpts()

    // ── Hide native ─────────────────────────────────────────────────
    nativeEl.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;'
    nativeEl.setAttribute('tabindex', '-1')

    // ── Build trigger ───────────────────────────────────────────────
    // Multi uses a <div> (can contain interactive children like chip × buttons)
    // Single uses a <button>
    var trigger
    var chipsWrap   // multi only
    var searchInput // searchable

    var arrowSpan = makeEl('span', { 'class': 'st-select-arrow', 'aria-hidden': 'true' })
    var controls  = makeEl('div',  { 'class': 'st-select-controls' })

    if (clearable) {
      var clearBtn = makeEl('button', { 'class': 'st-select-clear', 'type': 'button', 'aria-label': 'Clear selection' }, ['×'])
      clearBtn.addEventListener('click', function (e) { e.stopPropagation(); clearAll() })
      controls.appendChild(clearBtn)
    }
    controls.appendChild(arrowSpan)

    if (multiSelect) {
      chipsWrap = makeEl('div', { 'class': 'st-chips' })
      trigger   = makeEl('div', {
        'class':         'st-select-trigger st-select-multi',
        'tabindex':      disabled ? '-1' : '0',
        'role':          'combobox',
        'aria-haspopup': 'listbox',
        'aria-expanded': 'false',
        'aria-required': isRequired ? 'true' : 'false',
        'aria-disabled': disabled  ? 'true' : 'false',
        'aria-multiselectable': 'true',
      })
      // Search is always in the dropdown (not inline) — keeps trigger height stable
      trigger.appendChild(chipsWrap)
      trigger.appendChild(controls)
    } else {
      var valueSpan = makeEl('span', { 'class': 'st-select-value' })
      trigger = makeEl('button', {
        'class':         'st-select-trigger',
        'type':          'button',
        'role':          'combobox',
        'aria-haspopup': 'listbox',
        'aria-expanded': 'false',
        'aria-required': isRequired ? 'true' : 'false',
        'aria-disabled': disabled  ? 'true' : 'false',
      }, [valueSpan, controls])
    }

    var listbox = makeEl('ul', { 'class': 'st-select-listbox', 'role': 'listbox' })
    var wrapper = makeEl('div', { 'class': 'st-select' + (disabled ? ' is-disabled' : '') + (multiSelect ? ' st-select--multi' : '') })

    if (nativeEl.id) {
      trigger.id = nativeEl.id + '-trigger'
      trigger.setAttribute('aria-controls', nativeEl.id + '-listbox')
      listbox.id = nativeEl.id + '-listbox'
    }

    // ── Render helpers ──────────────────────────────────────────────

    function getOptContent(opt, forValue) {
      var fn = forValue ? renderValue : renderOption
      if (fn) {
        var s = makeEl('span')
        s.innerHTML = fn(opt.el)
        return s
      }
      return doc.createTextNode(opt.text)
    }

    function filteredOpts() {
      if (!searchQuery) return opts.map(function (o, i) { return { opt: o, idx: i } })
      var q = searchQuery.toLowerCase()
      return opts.reduce(function (acc, o, i) {
        if (o.text.toLowerCase().indexOf(q) >= 0) acc.push({ opt: o, idx: i })
        return acc
      }, [])
    }

    function renderListbox() {
      listbox.innerHTML = ''

      // Search row — always inside the dropdown for both single and multi
      if (searchable) {
        var searchWrap = makeEl('li', { 'class': 'st-search-wrap' })
        var sInput = makeEl('input', {
          'class':        'st-select-search',
          'type':         'text',
          'placeholder':  'Search…',
          'autocomplete': 'off',
          'value':        searchQuery,
        })
        sInput.addEventListener('input', function () { searchQuery = this.value; renderListbox() })
        sInput.addEventListener('keydown', onSearchKey)
        searchWrap.appendChild(sInput)
        listbox.appendChild(searchWrap)
        setTimeout(function () { sInput.focus() }, 0)
      }

      // Loading state
      if (isLoading) {
        listbox.appendChild(makeEl('li', { 'class': 'st-select-loading' }, ['Loading…']))
        return
      }

      var visible   = filteredOpts()
      var lastGroup = undefined

      // ── Select All header (checkboxes mode, no active search) ────
      if (checkboxes && selectAll && !searchQuery) {
        var selectableOpts  = opts.filter(function (o) { return o.value !== '' && !o.disabled })
        var selectableIdxs  = selectableOpts.map(function (o) { return opts.indexOf(o) })
        var allSelected     = selectableIdxs.length > 0 && selectableIdxs.every(function (i) { return selectedSet.has(i) })
        var someSelected    = selectableIdxs.some(function (i) { return selectedSet.has(i) })

        var saLi  = makeEl('li', { 'class': 'st-select-option st-select-all' + (allSelected ? ' is-selected' : '') })
        var saCb  = makeEl('span', { 'class': 'st-checkbox' + (allSelected ? ' is-checked' : '') + (someSelected && !allSelected ? ' is-indeterminate' : '') })
        var saLbl = makeEl('span', {}, [allSelected ? 'Deselect all' : 'Select all'])
        saLi.appendChild(saCb)
        saLi.appendChild(saLbl)
        saLi.addEventListener('click', function (e) {
          e.stopPropagation()
          if (allSelected) {
            selectableIdxs.forEach(function (i) { selectedSet.delete(i) })
          } else {
            selectableIdxs.forEach(function (i) {
              if (!maxItems || selectedSet.size < maxItems) selectedSet.add(i)
            })
          }
          syncNative(); clearError(); updateDisplay(); renderListbox()
          emitChange()
        })
        listbox.appendChild(saLi)
        listbox.appendChild(makeEl('li', { 'class': 'st-select-divider', 'aria-hidden': 'true' }))
      }

      visible.forEach(function (item) {
        var opt = item.opt, idx = item.idx

        // Group header — with group-level checkbox in checkboxes mode
        if (opt.groupLabel !== lastGroup) {
          lastGroup = opt.groupLabel
          if (opt.groupLabel) {
            var groupOpts = opts.reduce(function (acc, o, i) {
              if (o.groupLabel === opt.groupLabel && o.value !== '' && !o.disabled) acc.push(i)
              return acc
            }, [])
            var groupAll  = groupOpts.every(function (i) { return selectedSet.has(i) })
            var groupSome = groupOpts.some(function (i) { return selectedSet.has(i) })

            var glLi = makeEl('li', { 'class': 'st-select-group-label', 'aria-disabled': !checkboxes ? 'true' : 'false' })

            if (checkboxes) {
              var gCb = makeEl('span', { 'class': 'st-checkbox' + (groupAll ? ' is-checked' : '') + (groupSome && !groupAll ? ' is-indeterminate' : '') })
              glLi.appendChild(gCb)
              glLi.addEventListener('click', function (e) {
                e.stopPropagation()
                if (groupAll) {
                  groupOpts.forEach(function (i) { selectedSet.delete(i) })
                } else {
                  groupOpts.forEach(function (i) {
                    if (!maxItems || selectedSet.size < maxItems) selectedSet.add(i)
                  })
                }
                syncNative(); clearError(); updateDisplay(); renderListbox()
                emitChange()
              })
            }
            glLi.appendChild(doc.createTextNode(opt.groupLabel))
            listbox.appendChild(glLi)
          }
        }

        var isSel   = selectedSet.has(idx)
        var isMaxed = multiSelect && maxItems && selectedSet.size >= maxItems && !isSel
        var cls     = 'st-select-option'
          + (isSel ? ' is-selected' : '')
          + (opt.disabled || isMaxed ? ' is-disabled' : '')

        var li = makeEl('li', {
          'class':         cls,
          'role':          'option',
          'data-value':    opt.value,
          'aria-selected': isSel ? 'true' : 'false',
          'id':            (nativeEl.id || 'st-sel') + '-opt-' + idx,
        })

        // Checkbox UI
        if (checkboxes) {
          li.appendChild(makeEl('span', { 'class': 'st-checkbox' + (isSel ? ' is-checked' : '') }))
        }

        li.appendChild(getOptContent(opt, false))

        if (!(opt.disabled || isMaxed)) {
          li.addEventListener('click', function (e) {
            e.stopPropagation()
            if (multiSelect) {
              toggleMulti(idx)
              // Checkboxes mode: keep dropdown open — re-render only
              if (checkboxes) return
            } else {
              pick(idx)
            }
          })
        }
        listbox.appendChild(li)
      })

      // No results
      if (visible.length === 0 && !isLoading) {
        if (creatable && searchQuery) {
          var createLi = makeEl('li', { 'class': 'st-select-create' }, ['Add "' + searchQuery + '"'])
          createLi.addEventListener('click', function () { createOption(searchQuery) })
          listbox.appendChild(createLi)
        } else {
          listbox.appendChild(makeEl('li', { 'class': 'st-select-no-results' }, ['No results']))
        }
      }
    }

    // ── Update trigger display ──────────────────────────────────────

    function updateDisplay() {
      if (multiSelect) {
        // Rebuild chips — clear all first
        chipsWrap.innerHTML = ''

        var selArr      = Array.from(selectedSet)
        var totalOpts   = opts.filter(function (o) { return o.value !== '' }).length

        if (checkboxes && checkboxDisplay === 'count') {
          // "3 of 6 selected" or placeholder
          chipsWrap.innerHTML = ''
          if (selArr.length === 0) {
            chipsWrap.appendChild(makeEl('span', { 'class': 'st-select-placeholder' }, [placeholder]))
          } else if (selArr.length === totalOpts) {
            chipsWrap.appendChild(makeEl('span', { 'class': 'st-cb-summary' }, ['All selected']))
          } else {
            chipsWrap.appendChild(makeEl('span', { 'class': 'st-cb-summary' }, [selArr.length + ' of ' + totalOpts + ' selected']))
          }
        } else if (checkboxes && checkboxDisplay === 'list') {
          // "Hair, Nails, Facial" or placeholder
          chipsWrap.innerHTML = ''
          if (selArr.length === 0) {
            chipsWrap.appendChild(makeEl('span', { 'class': 'st-select-placeholder' }, [placeholder]))
          } else {
            var names = selArr.map(function (i) { return opts[i] ? opts[i].text : '' }).filter(Boolean)
            chipsWrap.appendChild(makeEl('span', { 'class': 'st-cb-summary' }, [names.join(', ')]))
          }
        } else {
          // Default: chips mode
          var displayArr  = maxDisplay != null ? selArr.slice(0, maxDisplay) : selArr
          var hiddenCount = selArr.length - displayArr.length

          displayArr.forEach(function (idx) {
            var opt  = opts[idx]
            if (!opt) return
            var chip    = makeEl('span', { 'class': 'st-chip' })
            var content = getOptContent(opt, true)
            chip.appendChild(content)
            var rm = makeEl('button', { 'class': 'st-chip-remove', 'type': 'button', 'aria-label': 'Remove ' + opt.text }, ['×'])
            ;(function (i) { rm.addEventListener('click', function (e) { e.stopPropagation(); toggleMulti(i) }) })(idx)
            chip.appendChild(rm)
            chipsWrap.appendChild(chip)
          })

          if (hiddenCount > 0) {
            chipsWrap.appendChild(makeEl('span', { 'class': 'st-chip-more' }, ['+' + hiddenCount]))
          }

          if (selArr.length === 0) {
            chipsWrap.appendChild(makeEl('span', { 'class': 'st-select-placeholder' }, [placeholder]))
          }
        }

        // Show/hide clear
        wrapper.classList.toggle('has-value', selArr.length > 0)

        // Aria label for max-items feedback
        if (maxItems) {
          var remaining = maxItems - selArr.length
          trigger.setAttribute('aria-label', remaining > 0 ? remaining + ' more allowed' : 'Maximum reached')
        }
      } else {
        // Single
        var selIdx  = selectedSet.size > 0 ? Array.from(selectedSet)[0] : -1
        var selOpt  = selIdx >= 0 ? opts[selIdx] : null
        var hasVal  = selOpt && selOpt.value !== ''
        valueSpan.innerHTML = ''
        if (hasVal) {
          valueSpan.appendChild(getOptContent(selOpt, true))
          valueSpan.classList.remove('st-select-placeholder')
        } else {
          valueSpan.textContent = placeholder
          valueSpan.classList.add('st-select-placeholder')
        }
        wrapper.classList.toggle('has-value', !!hasVal)
      }
    }

    // ── Pick / toggle ───────────────────────────────────────────────

    function pick(idx) {
      selectedSet.clear()
      if (idx >= 0 && opts[idx]) selectedSet.add(idx)
      syncNative()
      clearError()
      updateDisplay()
      renderListbox()
      close()
      emitChange()
    }

    function toggleMulti(idx) {
      if (selectedSet.has(idx)) {
        selectedSet.delete(idx)
      } else {
        if (maxItems && selectedSet.size >= maxItems) return
        selectedSet.add(idx)
      }
      syncNative()
      clearError()
      updateDisplay()
      renderListbox()
      emitChange()
    }

    function clearAll() {
      selectedSet.clear()
      syncNative()
      updateDisplay()
      renderListbox()
      emitChange()
      wrapper.classList.remove('has-value')
    }

    function syncNative() {
      opts.forEach(function (o, i) { o.el.selected = selectedSet.has(i) })
      nativeEl.dispatchEvent(new Event('change', { bubbles: true }))
    }

    function emitChange() {
      var values = Array.from(selectedSet).map(function (i) { return opts[i] ? opts[i].value : '' })
      var texts  = Array.from(selectedSet).map(function (i) { return opts[i] ? opts[i].text  : '' })
      emit('st:select:change', {
        select:  nativeEl,
        value:   multiSelect ? values : (values[0] || ''),
        text:    multiSelect ? texts  : (texts[0]  || ''),
        values:  values,
      })
    }

    function clearError() {
      trigger.classList.remove('is-invalid')
      trigger.removeAttribute('aria-invalid')
    }

    // ── Creatable ───────────────────────────────────────────────────

    function createOption(text) {
      var opt = new Option(text, text)
      nativeEl.add(opt)
      buildOpts()
      var newIdx = opts.length - 1
      multiSelect ? toggleMulti(newIdx) : pick(newIdx)
      if (searchInput) { searchInput.value = ''; searchQuery = '' }
      if (!multiSelect) close()
    }

    // ── Async ───────────────────────────────────────────────────────

    function loadAsync(query) {
      if (!loadOptions) return
      isLoading = true
      renderListbox()
      loadOptions(query, function (items) {
        isLoading = false
        while (nativeEl.options.length) nativeEl.remove(0)
        items.forEach(function (item) {
          var o = new Option(item.text, item.value)
          if (item.data) Object.keys(item.data).forEach(function (k) { o.dataset[k] = item.data[k] })
          nativeEl.add(o)
        })
        buildOpts()
        renderListbox()
      })
    }

    // ── Open / close ────────────────────────────────────────────────

    function open() {
      if (isOpen || disabled) return
      isOpen = true
      searchQuery = ''
      if (loadOptions) loadAsync('')
      else renderListbox()
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
      searchQuery = ''
      wrapper.classList.remove('is-open')
      trigger.setAttribute('aria-expanded', 'false')
      if (listbox.parentNode) listbox.parentNode.removeChild(listbox)
      doc.removeEventListener('click', outsideClick, true)
      emit('st:select:close', { select: nativeEl })
    }

    // ── Position ─────────────────────────────────────────────────────

    function positionListbox() {
      var wRect     = wrapper.getBoundingClientRect()
      var viewportW = win.innerWidth  || doc.documentElement.clientWidth
      var viewportH = win.innerHeight || doc.documentElement.clientHeight
      var lbH       = listbox.offsetHeight || 200

      if (viewportH - wRect.bottom < lbH && wRect.top > lbH) {
        wrapper.classList.add('st-select-dropup')
      } else {
        wrapper.classList.remove('st-select-dropup')
      }

      if (!autoWidth) return

      listbox.style.width    = 'max-content'
      listbox.style.minWidth = wRect.width + 'px'
      listbox.style.left     = '0'
      listbox.style.right    = 'auto'

      var naturalW   = listbox.scrollWidth
      var desiredW   = Math.max(wRect.width, naturalW)
      if (maxWidth) desiredW = Math.min(desiredW, maxWidth)

      var spaceRight = viewportW - wRect.left - 8
      var spaceLeft  = wRect.right - 8

      if (desiredW <= spaceRight) {
        listbox.style.width = desiredW + 'px'; listbox.style.left = '0'; listbox.style.right = 'auto'
      } else if (desiredW <= spaceLeft) {
        listbox.style.width = desiredW + 'px'; listbox.style.left = 'auto'; listbox.style.right = '0'
      } else if (spaceRight >= spaceLeft) {
        listbox.style.width = spaceRight + 'px'; listbox.style.left = '0'; listbox.style.right = 'auto'
      } else {
        listbox.style.width = spaceLeft + 'px'; listbox.style.left = 'auto'; listbox.style.right = '0'
      }
    }

    function outsideClick(e) {
      if (!wrapper.contains(e.target)) close()
    }

    // ── Keyboard ────────────────────────────────────────────────────

    function onSearchKey(e) {
      if (e.key === 'Escape') close()
      if (e.key === 'Enter') {
        e.preventDefault()
        var vis = filteredOpts()
        if (vis.length === 1) { multiSelect ? toggleMulti(vis[0].idx) : pick(vis[0].idx) }
        else if (vis.length === 0 && creatable && searchQuery) createOption(searchQuery)
      }
      if (e.key === 'Backspace' && !e.target.value && multiSelect && selectedSet.size > 0) {
        var last = Array.from(selectedSet).pop()
        if (last != null) toggleMulti(last)
      }
    }

    trigger.addEventListener('keydown', function (e) {
      if (multiSelect) {
        if (e.key === 'Escape') close()
        if ((e.key === 'Enter' || e.key === ' ') && !searchable) { e.preventDefault(); isOpen ? close() : open() }
        return
      }
      if (e.key === 'ArrowDown') { e.preventDefault(); isOpen ? null : open() }
      if (e.key === 'ArrowUp')   { e.preventDefault(); isOpen ? null : open() }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isOpen ? close() : open() }
      if (e.key === 'Escape') close()
    })

    trigger.addEventListener('click', function (e) {
      if (e.target.classList.contains('st-chip-remove')) return
      if (e.target.classList.contains('st-select-clear'))  return
      e.stopPropagation()
      isOpen ? close() : open()
    })

    // ── Required validation ─────────────────────────────────────────

    if (isRequired) {
      nativeEl.addEventListener('invalid', function (e) {
        e.preventDefault()
        trigger.classList.add('is-invalid')
        trigger.setAttribute('aria-invalid', 'true')
        trigger.focus()
      })
    }

    // ── Init ────────────────────────────────────────────────────────

    wrapper.appendChild(trigger)
    nativeEl.parentNode.insertBefore(wrapper, nativeEl.nextSibling)
    updateDisplay()

    // ── Public API ──────────────────────────────────────────────────

    var api = {
      open:  open,
      close: close,

      setValue: function (val) {
        var idx = opts.findIndex(function (o) { return o.value === val })
        if (idx >= 0) pick(idx)
      },
      setValues: function (vals) {
        selectedSet.clear()
        vals.forEach(function (v) {
          var idx = opts.findIndex(function (o) { return o.value === v })
          if (idx >= 0) selectedSet.add(idx)
        })
        syncNative(); updateDisplay(); renderListbox()
      },
      getValue:  function () {
        var idxs = Array.from(selectedSet)
        return multiSelect
          ? idxs.map(function (i) { return opts[i] ? opts[i].value : '' })
          : (opts[idxs[0]] ? opts[idxs[0]].value : '')
      },
      clear:   clearAll,
      destroy: function () {
        wrapper.remove()
        nativeEl.style.cssText = ''
        nativeEl.removeAttribute('tabindex')
        if (multiSelect) nativeEl.multiple = false
        selectRegistry.delete(nativeEl)
      },
    }

    selectRegistry.set(nativeEl, api)
    return api
  }

  // ─── Unified Picker (date / time / datetime) ────────────────────────────────
  // One popup, three modes. Clean rebuild — no nested instances, no inline hacks.

  var dpRegistry = new Map()
  var tpRegistry = new Map()
  var dtRegistry = new Map()

  var MONTHS       = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December']
  var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun',
                      'Jul','Aug','Sep','Oct','Nov','Dec']
  var DAYS_SHORT   = ['Su','Mo','Tu','We','Th','Fr','Sa']


  // ─── Shared date helpers ────────────────────────────────────────────────────

  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }

  function sameDay(a, b) {
    return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
  }

  function parseDate(str) {
    if (!str) return null
    var m1 = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/)
    if (m1) return startOfDay(new Date(+m1[1], +m1[2]-1, +m1[3]))
    var m2 = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/)
    if (m2) return startOfDay(new Date(+m2[3], +m2[1]-1, +m2[2]))
    var d = new Date(str)
    return isNaN(d.getTime()) ? null : startOfDay(d)
  }

  var DEFAULT_PRESETS = [
    { label: 'Today',        range: function(t) { return [t, t] } },
    { label: 'Yesterday',    range: function(t) { var d=new Date(t); d.setDate(d.getDate()-1); return [d,d] } },
    { label: 'Last 7 days',  range: function(t) { var d=new Date(t); d.setDate(d.getDate()-6); return [d,t] } },
    { label: 'Last 30 days', range: function(t) { var d=new Date(t); d.setDate(d.getDate()-29); return [d,t] } },
    { label: 'This month',   range: function(t) { return [new Date(t.getFullYear(),t.getMonth(),1), new Date(t.getFullYear(),t.getMonth()+1,0)] } },
    { label: 'Last month',   range: function(t) { return [new Date(t.getFullYear(),t.getMonth()-1,1), new Date(t.getFullYear(),t.getMonth(),0)] } },
  ]

  // ─── Unified Picker ─────────────────────────────────────────────────────────
  // One function, three modes: date / time / datetime.
  // One popup, positioned below input. Clean, no nested instances.

  function createPicker(input, options) {
    options = options || {}

    var mode     = options.mode || 'date'
    var showDate = mode !== 'time'
    var showTime = mode !== 'date'

    // Format
    var fullFmt   = options.format || input.getAttribute('data-st-format')
                  || (mode==='time' ? 'HH:mm' : mode==='datetime' ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD')
    var fmtParts  = fullFmt.split(' ')
    var dateFmt   = showDate ? fmtParts[0] : ''
    var timeFmtStr= showTime ? (fmtParts.slice(1).join(' ') || 'HH:mm') : ''

    // Date config
    var weekStart  = parseInt(options.weekStart || input.getAttribute('data-st-week-start') || 0, 10)
    var rangeMode  = options.range  != null ? options.range  : input.hasAttribute('data-st-range')
    var endInputEl = options.endInput
                   ? resolveEl(options.endInput)
                   : input.getAttribute('data-st-end-input')
                     ? resolveEl(input.getAttribute('data-st-end-input'))
                     : null
    var showPresets  = options.presets != null && options.presets !== false
                     ? true : input.hasAttribute('data-st-presets')
    var presetList   = Array.isArray(options.presets) ? options.presets : DEFAULT_PRESETS
    var minDate      = (options.min || input.getAttribute('data-st-min'))
                     ? startOfDay(new Date(options.min || input.getAttribute('data-st-min'))) : null
    var maxDate      = (options.max || input.getAttribute('data-st-max'))
                     ? startOfDay(new Date(options.max || input.getAttribute('data-st-max'))) : null
    var disableFns   = []
    var ddAttr = input.getAttribute('data-st-disabled-days')
    if (ddAttr) {
      var ddArr = ddAttr.split(',').map(Number)
      disableFns.push(function(d) { return ddArr.indexOf(d.getDay()) >= 0 })
    }
    ;(options.disable || []).forEach(function(d) {
      if (typeof d === 'function') {
        disableFns.push(d)
      } else {
        var t = startOfDay(new Date(d)).getTime()
        disableFns.push(function(dt) { return startOfDay(dt).getTime() === t })
      }
    })

    // Time config
    var use24h   = options.hour24      === true
                 || input.getAttribute('data-st-hour24') === 'true'
                 || (timeFmtStr && timeFmtStr.indexOf('HH') >= 0)
    var tStep    = parseInt(options.step || input.getAttribute('data-st-step') || 5, 10)
    var showSecs = options.showSeconds === true || input.hasAttribute('data-st-show-seconds')

    // ── State ───────────────────────────────────────────────────────────────────
    var today      = startOfDay(new Date())
    var viewYear   = today.getFullYear()
    var viewMonth  = today.getMonth()
    var viewLayer  = 'days'
    var yearBase   = Math.floor(today.getFullYear() / 12) * 12
    var selDate    = null
    var selEnd     = null
    var hoverDate  = null
    var rangePhase = 'start'
    var selHour    = null
    var selMin     = 0
    var selSec     = 0
    var selPeriod  = 'AM'
    var isOpen     = false
    var activePreset = null

    // ── Format helpers ──────────────────────────────────────────────────────────

    function fmtDate(d) {
      if (!d) return ''
      var Y = d.getFullYear()
      var M = String(d.getMonth() + 1).padStart(2, '0')
      var D = String(d.getDate()).padStart(2, '0')
      return dateFmt.replace('YYYY', Y).replace('MM', M).replace('DD', D)
    }

    function getH24() {
      if (selHour === null) return null
      if (use24h) return selHour
      if (selPeriod === 'AM') return selHour === 12 ? 0 : selHour
      return selHour === 12 ? 12 : selHour + 12
    }

    function fmtTime() {
      var h24 = getH24()
      if (h24 === null) return ''
      var h = String(use24h ? h24 : (selHour || 12)).padStart(2, '0')
      var m = String(selMin).padStart(2, '0')
      var s = String(selSec).padStart(2, '0')
      var base = h + ':' + m + (showSecs ? ':' + s : '')
      return use24h ? base : base + ' ' + selPeriod
    }

    function fmtValue() {
      var d = showDate && selDate ? fmtDate(selDate) : ''
      var t = showTime ? fmtTime() : ''
      if (mode === 'date')     return d
      if (mode === 'time')     return t
      return d && t ? d + ' ' + t : d || t
    }

    function isDisabled(d) {
      if (minDate && d < minDate) return true
      if (maxDate && d > maxDate) return true
      return disableFns.some(function(fn) { return fn(d) })
    }

    function isInRange(d) {
      var s = selDate, e = selEnd || hoverDate
      if (!s || !e) return false
      var lo = s < e ? s : e, hi = s < e ? e : s
      return d > lo && d < hi
    }

    // ── Popup ───────────────────────────────────────────────────────────────────

    var popup = makeEl('div', {
      'class':      'st-picker',
      'role':       'dialog',
      'aria-modal': 'true',
      'aria-label': mode + ' picker',
    })

    function render() {
      popup.innerHTML = ''

      var body = makeEl('div', { 'class': 'st-picker-body' })

      // Presets sidebar
      if (showPresets && showDate) {
        var psEl = makeEl('div', { 'class': 'st-picker-presets' })
        presetList.forEach(function(p, pi) {
          var btn = makeEl('button', {
            'class': 'st-picker-preset' + (activePreset === pi ? ' is-active' : ''),
            'type':  'button',
          }, [p.label])
          ;(function(preset, idx) {
            btn.addEventListener('click', function() {
              activePreset = idx
              var r = preset.range(today)
              selDate = startOfDay(r[0])
              selEnd  = rangeMode ? startOfDay(r[1]) : null
              viewYear = selDate.getFullYear()
              viewMonth = selDate.getMonth()
              if (endInputEl && selEnd) endInputEl.value = fmtDate(selEnd)
              apply(); render()
            })
          })(p, pi)
          psEl.appendChild(btn)
        })
        body.appendChild(psEl)
      }

      // Calendar
      if (showDate) {
        var calEl = makeEl('div', { 'class': 'st-picker-cal' })
        renderCal(calEl)
        body.appendChild(calEl)
      }

      // Time
      if (showTime) {
        var timeEl = makeEl('div', { 'class': 'st-picker-time' + (showDate ? ' st-picker-time--beside' : '') })
        if (showDate) timeEl.appendChild(makeEl('div', { 'class': 'st-picker-time-lbl' }, ['Time']))
        renderTime(timeEl)
        body.appendChild(timeEl)
      }

      popup.appendChild(body)

      // Footer
      var footer = makeEl('div', { 'class': 'st-picker-footer' })

      if (showDate) {
        var todayBtn = makeEl('button', { 'class': 'st-picker-today', 'type': 'button' }, ['Today'])
        todayBtn.addEventListener('click', function() {
          if (!isDisabled(today)) {
            viewYear  = today.getFullYear()
            viewMonth = today.getMonth()
            onDateClick(today)
            render()
          }
        })
        footer.appendChild(todayBtn)
      }

      var clearBtn = makeEl('button', { 'class': 'st-picker-clear', 'type': 'button' }, ['Clear'])
      clearBtn.addEventListener('click', function() {
        selDate = selEnd = activePreset = null
        selHour = null; selMin = selSec = 0; selPeriod = 'AM'
        rangePhase = 'start'
        input.value = ''
        if (endInputEl) endInputEl.value = ''
        input.dispatchEvent(new Event('change', { bubbles: true }))
        emitChange()
        render()
      })
      footer.appendChild(clearBtn)

      if (mode === 'datetime') {
        var applyBtn = makeEl('button', { 'class': 'st-picker-apply', 'type': 'button' }, ['Apply'])
        applyBtn.addEventListener('click', function() {
          if (selHour === null) selHour = use24h ? 0 : 12
          apply()
          if (!rangeMode) close()
        })
        footer.appendChild(applyBtn)
      }

      popup.appendChild(footer)
    }

    // ── Calendar views ──────────────────────────────────────────────────────────

    function renderCal(container) {
      container.innerHTML = ''
      if (viewLayer === 'days')   renderDays(container)
      if (viewLayer === 'months') renderMonths(container)
      if (viewLayer === 'years')  renderYears(container)
    }

    function renderDays(container) {
      var prev  = makeEl('button', { 'class': 'st-picker-nav', 'type': 'button', 'aria-label': 'Previous month' }, ['‹'])
      var next  = makeEl('button', { 'class': 'st-picker-nav', 'type': 'button', 'aria-label': 'Next month'     }, ['›'])
      var title = makeEl('button', { 'class': 'st-picker-title', 'type': 'button' },
        [MONTHS[viewMonth] + ' ' + viewYear])
      prev.addEventListener('click',  function() { navMonth(-1) })
      next.addEventListener('click',  function() { navMonth(1) })
      title.addEventListener('click', function() { viewLayer = 'months'; render() })
      container.appendChild(makeEl('div', { 'class': 'st-picker-hd' }, [prev, title, next]))

      var wd = makeEl('div', { 'class': 'st-picker-weekdays' })
      for (var di = 0; di < 7; di++) {
        wd.appendChild(makeEl('span', { 'class': 'st-picker-wdname' }, [DAYS_SHORT[(di + weekStart) % 7]]))
      }
      container.appendChild(wd)

      var grid     = makeEl('div', { 'class': 'st-picker-days' })
      var firstDay = new Date(viewYear, viewMonth, 1).getDay()
      var blanks   = (firstDay - weekStart + 7) % 7
      var total    = new Date(viewYear, viewMonth + 1, 0).getDate()
      var cells    = []

      for (var b = 0; b < blanks; b++) {
        grid.appendChild(makeEl('span', { 'class': 'st-picker-day st-picker-day--blank' }))
      }

      for (var d = 1; d <= total; d++) {
        var dt  = new Date(viewYear, viewMonth, d)
        var cls = 'st-picker-day'
        if (sameDay(dt, today))   cls += ' is-today'
        if (sameDay(dt, selDate)) cls += ' is-sel is-range-start'
        if (sameDay(dt, selEnd))  cls += ' is-sel is-range-end'
        if (rangeMode && isInRange(dt)) cls += ' is-in-range'
        if (isDisabled(dt))       cls += ' is-off'

        var cell = makeEl('span', {
          'class':    cls,
          'tabindex': sameDay(dt, selDate) ? '0' : '-1',
          'role':     'button',
          'aria-label': dt.toLocaleDateString(),
        }, [String(d)])

        cells.push({ el: cell, date: dt })

        ;(function(date, el) {
          if (!isDisabled(date)) {
            el.addEventListener('click', function() { onDateClick(date) })
            if (rangeMode) {
              el.addEventListener('mouseenter', function() {
                if (rangePhase === 'end' && selDate) {
                  hoverDate = date
                  updateRangeClasses(cells)
                }
              })
            }
          }
        })(dt, cell)

        grid.appendChild(cell)
      }

      grid.addEventListener('mouseleave', function() {
        hoverDate = null
        updateRangeClasses(cells)
      })

      container.appendChild(grid)
    }

    function renderMonths(container) {
      var prev  = makeEl('button', { 'class': 'st-picker-nav', 'type': 'button' }, ['‹'])
      var next  = makeEl('button', { 'class': 'st-picker-nav', 'type': 'button' }, ['›'])
      var title = makeEl('button', { 'class': 'st-picker-title', 'type': 'button' }, [String(viewYear)])
      prev.addEventListener('click',  function() { viewYear--; render() })
      next.addEventListener('click',  function() { viewYear++; render() })
      title.addEventListener('click', function() { viewLayer = 'years'; render() })
      container.appendChild(makeEl('div', { 'class': 'st-picker-hd' }, [prev, title, next]))

      var grid = makeEl('div', { 'class': 'st-picker-months' })
      MONTHS_SHORT.forEach(function(name, mi) {
        var isCur = mi === today.getMonth() && viewYear === today.getFullYear()
        var cell  = makeEl('button', {
          'class': 'st-picker-month' + (isCur ? ' is-today' : ''),
          'type': 'button',
        }, [name])
        ;(function(m) { cell.addEventListener('click', function() { viewMonth = m; viewLayer = 'days'; render() }) })(mi)
        grid.appendChild(cell)
      })
      container.appendChild(grid)
    }

    function renderYears(container) {
      var prev  = makeEl('button', { 'class': 'st-picker-nav', 'type': 'button' }, ['‹'])
      var next  = makeEl('button', { 'class': 'st-picker-nav', 'type': 'button' }, ['›'])
      var title = makeEl('span',   { 'class': 'st-picker-title st-picker-title--static' },
        [yearBase + ' – ' + (yearBase + 11)])
      prev.addEventListener('click', function() { yearBase -= 12; render() })
      next.addEventListener('click', function() { yearBase += 12; render() })
      container.appendChild(makeEl('div', { 'class': 'st-picker-hd' }, [prev, title, next]))

      var grid = makeEl('div', { 'class': 'st-picker-years' })
      for (var yi = 0; yi < 12; yi++) {
        var yr   = yearBase + yi
        var cell = makeEl('button', {
          'class': 'st-picker-year' + (yr === today.getFullYear() ? ' is-today' : ''),
          'type':  'button',
        }, [String(yr)])
        ;(function(y) { cell.addEventListener('click', function() { viewYear = y; viewLayer = 'months'; render() }) })(yr)
        grid.appendChild(cell)
      }
      container.appendChild(grid)
    }

    function updateRangeClasses(cells) {
      cells.forEach(function(c) {
        c.el.classList.toggle('is-in-range', rangeMode && isInRange(c.date))
      })
    }

    // ── Time render ─────────────────────────────────────────────────────────────

    function renderTime(container) {
      var cols = makeEl('div', { 'class': 'st-picker-tcols' })

      function makeCol(lbl, items, isSelFn, onPick) {
        var wrap = makeEl('div', { 'class': 'st-picker-tcol-wrap' })
        if (lbl) wrap.appendChild(makeEl('div', { 'class': 'st-picker-tcol-lbl' }, [lbl]))
        var col = makeEl('div', { 'class': 'st-picker-tcol' })
        items.forEach(function(item) {
          var isSel = isSelFn(item.v)
          var el = makeEl('div', {
            'class':       'st-picker-titem' + (isSel ? ' is-sel' : ''),
            'data-v':      String(item.v),
          }, [item.l])
          ;(function(v) {
            el.addEventListener('click', function() { onPick(v); render() })
          })(item.v)
          col.appendChild(el)
        })
        wrap.appendChild(col)
        setTimeout(function() {
          var sel = col.querySelector('.is-sel')
          if (sel) col.scrollTop = sel.offsetTop - col.offsetHeight / 2 + sel.offsetHeight / 2
        }, 0)
        return wrap
      }

      // Hours
      var hours = [], hs = use24h ? 0 : 1, he = use24h ? 23 : 12
      for (var h = hs; h <= he; h++) hours.push({ v: h, l: String(h).padStart(2, '0') })
      cols.appendChild(makeCol('Hour', hours,
        function(v) { return selHour === v },
        function(v) { selHour = v }
      ))

      // Minutes
      var mins = []
      for (var mi = 0; mi < 60; mi += tStep) mins.push({ v: mi, l: String(mi).padStart(2, '0') })
      cols.appendChild(makeCol('Min', mins,
        function(v) { return selMin === v },
        function(v) { selMin = v }
      ))

      // Seconds
      if (showSecs) {
        var secs = []
        for (var si = 0; si < 60; si += tStep) secs.push({ v: si, l: String(si).padStart(2, '0') })
        cols.appendChild(makeCol('Sec', secs,
          function(v) { return selSec === v },
          function(v) { selSec = v }
        ))
      }

      // AM/PM
      if (!use24h) {
        cols.appendChild(makeCol('', [{ v: 'AM', l: 'AM' }, { v: 'PM', l: 'PM' }],
          function(v) { return selPeriod === v },
          function(v) { selPeriod = v }
        ))
      }

      container.appendChild(cols)
    }

    // ── Selection ───────────────────────────────────────────────────────────────

    function onDateClick(date) {
      activePreset = null
      if (!rangeMode) {
        selDate = date
        viewYear  = date.getFullYear()
        viewMonth = date.getMonth()
        if (mode !== 'datetime') { apply(); close() }
        else render()
        return
      }
      if (rangePhase === 'start' || (selDate && selEnd)) {
        selDate = date; selEnd = null; rangePhase = 'end'; hoverDate = null; render()
      } else {
        if (date < selDate) { selEnd = selDate; selDate = date } else { selEnd = date }
        rangePhase = 'start'
        apply(); render()
      }
    }

    function apply() {
      var val = fmtValue()
      input.value = val
      if (endInputEl && selEnd) endInputEl.value = fmtDate(selEnd)
      input.dispatchEvent(new Event('change', { bubbles: true }))
      emitChange()
    }

    function emitChange() {
      var evtBase = mode === 'datetime' ? 'st:datetimepicker:change'
                  : mode === 'time'     ? 'st:timepicker:change'
                  :                       'st:datepicker:change'
      emit(evtBase, {
        input:        input,
        value:        fmtValue(),
        date:         selDate ? new Date(selDate) : null,
        dateEnd:      selEnd  ? new Date(selEnd)  : null,
        formatted:    fmtDate(selDate),
        formattedEnd: fmtDate(selEnd),
        hour:         getH24(),
        minute:       selMin,
        second:       selSec,
      })
    }

    function navMonth(dir) {
      viewMonth += dir
      if (viewMonth > 11) { viewMonth = 0; viewYear++ }
      if (viewMonth < 0)  { viewMonth = 11; viewYear-- }
      emit('st:datepicker:monthChange', { input: input, year: viewYear, month: viewMonth })
      render()
    }

    // ── Open / close ────────────────────────────────────────────────────────────

    function open() {
      if (isOpen) return
      isOpen = true
      var existing = parseDate(input.value)
      if (existing && showDate) {
        selDate = existing
        viewYear  = existing.getFullYear()
        viewMonth = existing.getMonth()
      }
      render()
      doc.body.appendChild(popup)
      positionBelow(popup, input)
      input.setAttribute('aria-expanded', 'true')
      emit('st:' + mode + 'picker:open', { input: input })
      setTimeout(function() { doc.addEventListener('click', outsideClick, true) }, 0)
    }

    function close() {
      if (!isOpen) return
      isOpen = false
      hoverDate = null
      if (popup.parentNode) popup.parentNode.removeChild(popup)
      input.setAttribute('aria-expanded', 'false')
      doc.removeEventListener('click', outsideClick, true)
      emit('st:' + mode + 'picker:close', { input: input })
    }

    function outsideClick(e) {
      var anchors = [popup, input]
      if (endInputEl) anchors.push(endInputEl)
      if (!anchors.some(function(el) { return el === e.target || el.contains(e.target) })) close()
    }

    // ── Input wiring ─────────────────────────────────────────────────────────────

    function wireInput(el, isEnd) {
      el.setAttribute('autocomplete', 'off')
      el.setAttribute('aria-haspopup', 'dialog')
      el.setAttribute('aria-expanded', 'false')
      el.addEventListener('click', function() {
        if (isEnd) rangePhase = 'end'
        isOpen ? close() : open()
      })
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') close()
        if ((e.key === 'Enter' || e.key === ' ') && !isOpen) { e.preventDefault(); open() }
      })
    }

    wireInput(input, false)
    if (endInputEl) wireInput(endInputEl, true)

    // ── Public API ───────────────────────────────────────────────────────────────

    var reg = mode === 'datetime' ? dtRegistry : mode === 'time' ? tpRegistry : dpRegistry
    var api = {
      open:  open,
      close: close,
      setDate: function(val) {
        var d = parseDate(val)
        if (d) { selDate = d; viewYear = d.getFullYear(); viewMonth = d.getMonth(); apply() }
      },
      getDate:  function() { return selDate ? new Date(selDate) : null },
      setTime:  function(h, m, s) {
        if (use24h) { selHour = Math.max(0, Math.min(23, h)) }
        else { selPeriod = h >= 12 ? 'PM' : 'AM'; selHour = h % 12 || 12 }
        selMin = Math.max(0, Math.min(59, m || 0))
        selSec = Math.max(0, Math.min(59, s || 0))
        apply()
      },
      getTime:  function() { return { hour: getH24(), minute: selMin, second: selSec, formatted: fmtTime() } },
      getRange: function() { return { start: selDate ? new Date(selDate) : null, end: selEnd ? new Date(selEnd) : null } },
      destroy:  function() {
        ;[input, endInputEl].forEach(function(el) {
          if (!el) return
          el.removeAttribute('aria-expanded')
          el.removeAttribute('aria-haspopup')
          el.removeAttribute('autocomplete')
        })
        if (popup.parentNode) popup.parentNode.removeChild(popup)
        reg.delete(input)
      },
    }

    reg.set(input, api)
    return api
  }

  // ── Thin wrappers ───────────────────────────────────────────────────────────

  function createDatepicker(input, options) {
    if (dpRegistry.has(input)) return dpRegistry.get(input)
    return createPicker(input, Object.assign({}, options || {}, { mode: 'date' }))
  }

  function createTimepicker(input, options) {
    if (tpRegistry.has(input)) return tpRegistry.get(input)
    return createPicker(input, Object.assign({}, options || {}, { mode: 'time' }))
  }

  function createDatetimepicker(input, options) {
    if (dtRegistry.has(input)) return dtRegistry.get(input)
    return createPicker(input, Object.assign({}, options || {}, { mode: 'datetime' }))
  }


  // ─── Auto-init ──────────────────────────────────────────────────────────────

  // All data-st-* attributes that should trigger select auto-init
  var SELECT_INIT_SELECTOR = [
    'select[data-st-select]',
    'select[data-st-multi]',
    'select[data-st-checkboxes]',
    'select[data-st-searchable]',
    'select[data-st-clearable]',
    'select[data-st-creatable]',
    'select[data-st-auto-width]',
  ].join(',')

  function autoInit() {
    if (typeof doc.querySelectorAll !== 'function') return
    // Deduplicate — a select may have multiple matching attributes
    var seen = new Set()
    doc.querySelectorAll(SELECT_INIT_SELECTOR).forEach(function (el) {
      if (!seen.has(el)) { seen.add(el); createSelect(el) }
    })
    doc.querySelectorAll('[data-st-datepicker]').forEach(function (el) { createDatepicker(el) })
    doc.querySelectorAll('[data-st-timepicker]').forEach(function (el) { createTimepicker(el) })
    doc.querySelectorAll('[data-st-datetimepicker]').forEach(function (el) { createDatetimepicker(el) })
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
    datetimepicker: function (selector, options) {
      var el = resolveEl(selector)
      return el ? createDatetimepicker(el, options) : null
    },
    destroy: function (selector) {
      var target = resolveEl(selector)
      if (!target) return
      ;[selectRegistry, dpRegistry, tpRegistry, dtRegistry].forEach(function (reg) {
        if (reg.has(target)) reg.get(target).destroy()
      })
    },
  }
}))
