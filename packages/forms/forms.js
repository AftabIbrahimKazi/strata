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

  // ─── Date / Time Picker ─────────────────────────────────────────────────────

  var dpRegistry = new Map()
  var tpRegistry = new Map()
  var dtRegistry = new Map()

  var MONTHS      = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']
  var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun',
                      'Jul','Aug','Sep','Oct','Nov','Dec']
  var DAYS_SHORT  = ['Su','Mo','Tu','We','Th','Fr','Sa']

  var DEFAULT_PRESETS = [
    { label: 'Today',        range: function(t) { return [t, t] } },
    { label: 'Yesterday',    range: function(t) { var d=new Date(t); d.setDate(d.getDate()-1); return [d,d] } },
    { label: 'Last 7 days',  range: function(t) { var d=new Date(t); d.setDate(d.getDate()-6); return [d,t] } },
    { label: 'Last 30 days', range: function(t) { var d=new Date(t); d.setDate(d.getDate()-29); return [d,t] } },
    { label: 'This month',   range: function(t) { return [new Date(t.getFullYear(),t.getMonth(),1), new Date(t.getFullYear(),t.getMonth()+1,0)] } },
    { label: 'Last month',   range: function(t) { return [new Date(t.getFullYear(),t.getMonth()-1,1), new Date(t.getFullYear(),t.getMonth(),0)] } },
  ]

  // ── Shared date helpers ──────────────────────────────────────────────────────

  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }

  function sameDay(a, b) {
    return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
  }

  function parseDate(str) {
    if (!str) return null
    // Try ISO first, then native parse
    var iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (iso) return startOfDay(new Date(+iso[1], +iso[2]-1, +iso[3]))
    var d = new Date(str)
    return isNaN(d.getTime()) ? null : startOfDay(d)
  }

  function createDatepicker(input, options) {
    options = options || {}
    if (dpRegistry.has(input)) return dpRegistry.get(input)

    // ── Config ────────────────────────────────────────────────────────────────
    var fmt        = options.format    || input.getAttribute('data-st-format')    || 'YYYY-MM-DD'
    var weekStart  = parseInt(options.weekStart || input.getAttribute('data-st-week-start') || 0, 10)
    var rangeMode  = options.range     != null ? options.range     : input.hasAttribute('data-st-range')
    var endInputEl = options.endInput  ? resolveEl(options.endInput)
                   : input.getAttribute('data-st-end-input') ? resolveEl(input.getAttribute('data-st-end-input')) : null
    var inlineMode = options.inline    != null ? options.inline    : input.hasAttribute('data-st-inline')
    var showPresets= options.presets   != null && options.presets !== false
                   ? true : input.hasAttribute('data-st-presets')
    var customPresets = Array.isArray(options.presets) ? options.presets : null
    var minDateS   = options.min  || input.getAttribute('data-st-min')
    var maxDateS   = options.max  || input.getAttribute('data-st-max')
    var minDate    = minDateS ? startOfDay(new Date(minDateS)) : null
    var maxDate    = maxDateS ? startOfDay(new Date(maxDateS)) : null

    // disable: array of date strings or functions
    var disableFns = []
    var ddays = input.getAttribute('data-st-disabled-days')
    if (ddays) {
      var ddArr = ddays.split(',').map(Number)
      disableFns.push(function(d) { return ddArr.indexOf(d.getDay()) >= 0 })
    }
    ;(options.disable || []).forEach(function(d) {
      if (typeof d === 'function') { disableFns.push(d) }
      else { var t = startOfDay(new Date(d)).getTime(); disableFns.push(function(dt) { return startOfDay(dt).getTime() === t }) }
    })

    // ── State ─────────────────────────────────────────────────────────────────
    var today         = startOfDay(new Date())
    var viewYear      = today.getFullYear()
    var viewMonth     = today.getMonth()
    var viewMode      = 'days'   // 'days' | 'months' | 'years'
    var yearPageStart = Math.floor(today.getFullYear() / 12) * 12
    var selectedStart = null
    var selectedEnd   = null
    var hoverDate     = null
    var rangePhase    = 'start'  // 'start' | 'end' — which end we're picking
    var isOpen        = false
    var activePreset  = null

    // ── Format helpers ────────────────────────────────────────────────────────

    function fmtDate(d) {
      var Y = d.getFullYear()
      var M = String(d.getMonth() + 1).padStart(2, '0')
      var D = String(d.getDate()).padStart(2, '0')
      return fmt.replace('YYYY', Y).replace('MM', M).replace('DD', D)
    }

    function isDisabled(d) {
      if (minDate && d < minDate) return true
      if (maxDate && d > maxDate) return true
      return disableFns.some(function(fn) { return fn(d) })
    }

    function isInRange(d) {
      var s = selectedStart, e = selectedEnd || hoverDate
      if (!s || !e) return false
      var lo = s < e ? s : e, hi = s < e ? e : s
      return d > lo && d < hi
    }

    // ── Popup ─────────────────────────────────────────────────────────────────

    var popup = makeEl('div', { 'class': 'st-datepicker-popup', 'role': 'dialog', 'aria-modal': 'true', 'aria-label': 'Date picker' })
    var calWrap = makeEl('div', { 'class': 'st-dp-cal' })
    popup.appendChild(calWrap)

    // ── Render ────────────────────────────────────────────────────────────────

    function render() {
      // Presets sidebar
      var existingPresets = popup.querySelector('.st-dp-presets')
      if (existingPresets) popup.removeChild(existingPresets)

      if (showPresets) {
        var presetList = customPresets || DEFAULT_PRESETS
        var presetsEl  = makeEl('div', { 'class': 'st-dp-presets' })
        presetList.forEach(function(p, pi) {
          var btn = makeEl('button', {
            'class': 'st-dp-preset' + (activePreset === pi ? ' is-active' : ''),
            'type':  'button',
          }, [p.label])
          btn.addEventListener('click', function() {
            var range = p.range(today)
            activePreset  = pi
            selectedStart = startOfDay(range[0])
            selectedEnd   = rangeMode ? startOfDay(range[1]) : null
            if (!rangeMode) {
              applyDate(selectedStart)
            } else {
              applyRange(selectedStart, selectedEnd)
            }
            viewYear  = selectedStart.getFullYear()
            viewMonth = selectedStart.getMonth()
            renderCal()
            if (presetsEl.parentNode) {
              presetsEl.querySelectorAll('.st-dp-preset').forEach(function(b, i) {
                b.classList.toggle('is-active', i === pi)
              })
            }
          })
          presetsEl.appendChild(btn)
        })
        popup.insertBefore(presetsEl, calWrap)
      }

      renderCal()
    }

    function renderCal() {
      calWrap.innerHTML = ''
      if (viewMode === 'days')   renderDays()
      if (viewMode === 'months') renderMonths()
      if (viewMode === 'years')  renderYears()
    }

    function renderDays() {
      // Header
      var prevBtn = makeEl('button', { 'class': 'st-dp-nav', 'type': 'button', 'aria-label': 'Previous month' }, ['‹'])
      var nextBtn = makeEl('button', { 'class': 'st-dp-nav', 'type': 'button', 'aria-label': 'Next month'     }, ['›'])
      var titleBtn = makeEl('button', { 'class': 'st-dp-title', 'type': 'button', 'aria-label': 'Select month and year' },
        [MONTHS[viewMonth] + ' ' + viewYear])
      var header = makeEl('div', { 'class': 'st-dp-header' }, [prevBtn, titleBtn, nextBtn])
      prevBtn.addEventListener('click',  function() { navigate(-1) })
      nextBtn.addEventListener('click',  function() { navigate(1) })
      titleBtn.addEventListener('click', function() { viewMode = 'months'; renderCal() })
      calWrap.appendChild(header)

      // Day-name row (respects weekStart)
      var dayRow = makeEl('div', { 'class': 'st-dp-day-names' })
      for (var di = 0; di < 7; di++) {
        dayRow.appendChild(makeEl('span', { 'class': 'st-dp-day-name' }, [DAYS_SHORT[(di + weekStart) % 7]]))
      }
      calWrap.appendChild(dayRow)

      // Grid
      var grid        = makeEl('div', { 'class': 'st-dp-grid', 'role': 'grid' })
      var firstDay    = new Date(viewYear, viewMonth, 1).getDay()
      var leadBlanks  = (firstDay - weekStart + 7) % 7
      var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
      var cells       = []

      for (var b = 0; b < leadBlanks; b++) {
        grid.appendChild(makeEl('div', { 'class': 'st-dp-cell st-dp-blank' }))
      }

      for (var d = 1; d <= daysInMonth; d++) {
        var cellDate = new Date(viewYear, viewMonth, d)
        var cls = 'st-dp-cell'
        if (sameDay(cellDate, today))         cls += ' is-today'
        if (sameDay(cellDate, selectedStart)) cls += ' is-selected is-range-start'
        if (sameDay(cellDate, selectedEnd))   cls += ' is-selected is-range-end'
        if (rangeMode && isInRange(cellDate)) cls += ' is-in-range'
        if (isDisabled(cellDate))             cls += ' is-disabled'

        var cell = makeEl('div', { 'class': cls, 'role': 'gridcell', 'data-ts': cellDate.getTime() }, [String(d)])
        cells.push({ el: cell, date: cellDate })

        ;(function(date, cellEl) {
          if (!isDisabled(date)) {
            cellEl.addEventListener('click', function() { onDayClick(date) })
            if (rangeMode) {
              cellEl.addEventListener('mouseenter', function() {
                if (rangePhase === 'end' && selectedStart) {
                  hoverDate = date
                  updateRangeHighlight(cells)
                }
              })
            }
          }
        })(cellDate, cell)

        grid.appendChild(cell)
      }

      grid.addEventListener('mouseleave', function() { hoverDate = null; updateRangeHighlight(cells) })
      calWrap.appendChild(grid)

      // Footer
      var footer   = makeEl('div', { 'class': 'st-dp-footer' })
      var todayBtn = makeEl('button', { 'class': 'st-dp-today', 'type': 'button' }, ['Today'])
      todayBtn.addEventListener('click', function() {
        if (!isDisabled(today)) { viewYear = today.getFullYear(); viewMonth = today.getMonth(); onDayClick(today) }
      })
      var clearBtn = makeEl('button', { 'class': 'st-dp-clear', 'type': 'button' }, ['Clear'])
      clearBtn.addEventListener('click', function() {
        selectedStart = selectedEnd = null; activePreset = null; rangePhase = 'start'
        input.value = ''; if (endInputEl) endInputEl.value = ''
        input.dispatchEvent(new Event('change', { bubbles: true }))
        emit('st:datepicker:change', { input: input, date: null, dateEnd: null, formatted: '', formattedEnd: '' })
        renderCal()
      })
      footer.appendChild(todayBtn)
      footer.appendChild(clearBtn)
      calWrap.appendChild(footer)
    }

    function renderMonths() {
      var prevBtn  = makeEl('button', { 'class': 'st-dp-nav', 'type': 'button', 'aria-label': 'Previous year' }, ['‹'])
      var nextBtn  = makeEl('button', { 'class': 'st-dp-nav', 'type': 'button', 'aria-label': 'Next year'     }, ['›'])
      var titleBtn = makeEl('button', { 'class': 'st-dp-title', 'type': 'button' }, [String(viewYear)])
      var header   = makeEl('div', { 'class': 'st-dp-header' }, [prevBtn, titleBtn, nextBtn])
      prevBtn.addEventListener('click',  function() { viewYear--; renderCal() })
      nextBtn.addEventListener('click',  function() { viewYear++; renderCal() })
      titleBtn.addEventListener('click', function() { viewMode = 'years'; renderCal() })
      calWrap.appendChild(header)

      var grid = makeEl('div', { 'class': 'st-dp-month-grid' })
      MONTHS_SHORT.forEach(function(name, mi) {
        var isCur = mi === viewMonth && viewYear === today.getFullYear()
        var cell  = makeEl('button', { 'class': 'st-dp-month-cell' + (isCur ? ' is-today' : ''), 'type': 'button' }, [name])
        cell.addEventListener('click', function() { viewMonth = mi; viewMode = 'days'; renderCal() })
        grid.appendChild(cell)
      })
      calWrap.appendChild(grid)
    }

    function renderYears() {
      var prevBtn  = makeEl('button', { 'class': 'st-dp-nav', 'type': 'button', 'aria-label': 'Previous years' }, ['‹'])
      var nextBtn  = makeEl('button', { 'class': 'st-dp-nav', 'type': 'button', 'aria-label': 'Next years'     }, ['›'])
      var titleEl  = makeEl('span', { 'class': 'st-dp-title st-dp-title--static' }, [yearPageStart + ' – ' + (yearPageStart + 11)])
      var header   = makeEl('div', { 'class': 'st-dp-header' }, [prevBtn, titleEl, nextBtn])
      prevBtn.addEventListener('click', function() { yearPageStart -= 12; renderCal() })
      nextBtn.addEventListener('click', function() { yearPageStart += 12; renderCal() })
      calWrap.appendChild(header)

      var grid = makeEl('div', { 'class': 'st-dp-year-grid' })
      for (var yi = 0; yi < 12; yi++) {
        var yr    = yearPageStart + yi
        var isCur = yr === today.getFullYear()
        var cell  = makeEl('button', { 'class': 'st-dp-year-cell' + (isCur ? ' is-today' : ''), 'type': 'button' }, [String(yr)])
        ;(function(y) { cell.addEventListener('click', function() { viewYear = y; viewMode = 'months'; renderCal() }) })(yr)
        grid.appendChild(cell)
      }
      calWrap.appendChild(grid)
    }

    function updateRangeHighlight(cells) {
      cells.forEach(function(c) {
        var inRange = rangeMode && isInRange(c.date)
        c.el.classList.toggle('is-in-range', inRange)
        c.el.classList.toggle('is-range-hover', !!(rangeMode && hoverDate && !selectedEnd && inRange))
      })
    }

    // ── Selection logic ───────────────────────────────────────────────────────

    function onDayClick(date) {
      activePreset = null
      if (!rangeMode) {
        selectedStart = date
        applyDate(date)
        if (!inlineMode) close()
        return
      }
      // Range mode
      if (rangePhase === 'start' || (selectedStart && selectedEnd)) {
        selectedStart = date; selectedEnd = null; rangePhase = 'end'
        renderCal()
      } else {
        // Ensure start ≤ end
        if (date < selectedStart) { selectedEnd = selectedStart; selectedStart = date }
        else { selectedEnd = date }
        rangePhase = 'start'
        applyRange(selectedStart, selectedEnd)
        if (!inlineMode) close()
      }
    }

    function applyDate(date) {
      input.value = fmtDate(date)
      input.dispatchEvent(new Event('change', { bubbles: true }))
      emit('st:datepicker:change', { input: input, date: date, formatted: input.value })
    }

    function applyRange(start, end) {
      input.value   = start ? fmtDate(start) : ''
      if (endInputEl) endInputEl.value = end ? fmtDate(end) : ''
      input.dispatchEvent(new Event('change', { bubbles: true }))
      emit('st:datepicker:change', {
        input: input, date: start, dateEnd: end,
        formatted: input.value, formattedEnd: endInputEl ? endInputEl.value : '',
      })
    }

    // ── Navigate ──────────────────────────────────────────────────────────────

    function navigate(dir) {
      viewMonth += dir
      if (viewMonth > 11) { viewMonth = 0; viewYear++ }
      if (viewMonth < 0)  { viewMonth = 11; viewYear-- }
      emit('st:datepicker:monthChange', { input: input, year: viewYear, month: viewMonth })
      renderCal()
    }

    // ── Open / close ──────────────────────────────────────────────────────────

    function open() {
      if (inlineMode || isOpen) return
      isOpen = true
      var existing = parseDate(input.value)
      if (existing) { selectedStart = existing; viewYear = existing.getFullYear(); viewMonth = existing.getMonth() }
      render()
      doc.body.appendChild(popup)
      positionBelow(popup, input)
      void popup.offsetHeight
      popup.classList.add('is-open')
      input.setAttribute('aria-expanded', 'true')
      emit('st:datepicker:open', { input: input })
      setTimeout(function() { doc.addEventListener('click', outsideClick, true) }, 0)
    }

    function close() {
      if (inlineMode || !isOpen) return
      isOpen = false
      hoverDate = null
      popup.classList.remove('is-open')
      input.setAttribute('aria-expanded', 'false')
      doc.removeEventListener('click', outsideClick, true)
      emit('st:datepicker:close', { input: input })
      var p = popup
      setTimeout(function() { if (p.parentNode) p.parentNode.removeChild(p) }, 200)
    }

    function outsideClick(e) {
      var targets = [popup, input]
      if (endInputEl) targets.push(endInputEl)
      if (!targets.some(function(t) { return t.contains(e.target) || t === e.target })) close()
    }

    // ── Keyboard ──────────────────────────────────────────────────────────────

    function setupInput(el, isEnd) {
      el.setAttribute('autocomplete', 'off')
      el.setAttribute('aria-haspopup', 'dialog')
      el.setAttribute('aria-expanded', 'false')
      el.addEventListener('click', function() {
        if (isEnd) { rangePhase = 'end'; if (selectedStart) { viewYear = selectedStart.getFullYear(); viewMonth = selectedStart.getMonth() } }
        isOpen ? close() : open()
      })
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') close()
        if ((e.key === 'Enter' || e.key === ' ') && !isOpen) { e.preventDefault(); open() }
        if (isOpen && viewMode === 'days') {
          var cur = isEnd ? selectedEnd : selectedStart
          if (!cur) return
          var next = new Date(cur)
          if (e.key === 'ArrowRight') { e.preventDefault(); next.setDate(next.getDate() + 1) }
          if (e.key === 'ArrowLeft')  { e.preventDefault(); next.setDate(next.getDate() - 1) }
          if (e.key === 'ArrowDown')  { e.preventDefault(); next.setDate(next.getDate() + 7) }
          if (e.key === 'ArrowUp')    { e.preventDefault(); next.setDate(next.getDate() - 7) }
          if (next !== cur && !isDisabled(startOfDay(next))) {
            if (next.getMonth() !== viewMonth) { viewYear = next.getFullYear(); viewMonth = next.getMonth() }
            onDayClick(startOfDay(next))
          }
          if (e.key === 'Enter') { e.preventDefault(); onDayClick(cur); if (!inlineMode) close() }
        }
      })
    }

    setupInput(input, false)
    if (endInputEl) setupInput(endInputEl, true)

    // Inline mode — render immediately into a wrapper after input
    if (inlineMode) {
      popup.classList.add('is-inline')
      render()
      input.parentNode.insertBefore(popup, input.nextSibling)
    }

    var api = {
      open:  open,
      close: close,
      setDate: function(val, isEnd) {
        var d = parseDate(val)
        if (!d) return
        if (isEnd) { selectedEnd = d } else { selectedStart = d }
        if (inlineMode) renderCal(); else if (isOpen) renderCal()
        applyRange(selectedStart, selectedEnd)
      },
      getDate:  function() { return selectedStart ? new Date(selectedStart) : null },
      getRange: function() { return { start: selectedStart ? new Date(selectedStart) : null, end: selectedEnd ? new Date(selectedEnd) : null } },
      destroy:  function() {
        ;[input, endInputEl].forEach(function(el) {
          if (!el) return
          el.removeAttribute('aria-expanded'); el.removeAttribute('aria-haspopup'); el.removeAttribute('autocomplete')
        })
        if (popup.parentNode) popup.parentNode.removeChild(popup)
        dpRegistry.delete(input)
      },
    }

    dpRegistry.set(input, api)
    return api
  }

  // ── Shared time-picker renderer (used by both timepicker and datetimepicker) ─

  function buildTimePart(opts, onConfirm) {
    // opts: { use24h, step, showSeconds, container, showConfirm }
    var use24h      = opts.use24h      || false
    var step        = opts.step        || 5
    var showSeconds = opts.showSeconds || false
    var container   = opts.container   || makeEl('div', {})

    var displayHour = null
    var selMin      = 0
    var selSec      = 0
    var selPeriod   = 'AM'

    function getActual24Hour() {
      if (displayHour === null) return null
      if (use24h) return displayHour
      if (selPeriod === 'AM') return displayHour === 12 ? 0 : displayHour
      return displayHour === 12 ? 12 : displayHour + 12
    }

    function formatTime() {
      var h24 = getActual24Hour()
      if (h24 === null) return ''
      var h = String(use24h ? h24 : (displayHour || 12)).padStart(2, '0')
      var m = String(selMin).padStart(2, '0')
      var s = String(selSec).padStart(2, '0')
      var base = h + ':' + m + (showSeconds ? ':' + s : '')
      return use24h ? base : base + ' ' + selPeriod
    }

    function buildCol(label, items, isSelFn, onClickFn) {
      var wrap = makeEl('div', { 'class': 'st-tp-col-wrap' })
      var lbl  = makeEl('div', { 'class': 'st-tp-col-label' }, [label])
      var col  = makeEl('div', { 'class': 'st-tp-col', 'role': 'listbox', 'aria-label': label })
      items.forEach(function(item) {
        var isSel = isSelFn(item.value)
        var li = makeEl('div', {
          'class':       'st-tp-item' + (isSel ? ' is-selected' : ''),
          'role':        'option',
          'aria-selected': isSel ? 'true' : 'false',
          'data-value':  String(item.value),
        }, [item.label])
        ;(function(v) { li.addEventListener('click', function() { onClickFn(v); render() }) })(item.value)
        col.appendChild(li)
      })
      wrap.appendChild(lbl); wrap.appendChild(col)
      return wrap
    }

    function render() {
      container.innerHTML = ''
      var cols = makeEl('div', { 'class': 'st-tp-cols' })

      // Hours
      var hours = [], hs = use24h ? 0 : 1, he = use24h ? 23 : 12
      for (var h = hs; h <= he; h++) hours.push({ value: h, label: String(h).padStart(2,'0') })
      cols.appendChild(buildCol('Hour', hours,
        function(v) { return displayHour === v },
        function(v) { displayHour = v }
      ))

      // Minutes
      var mins = []
      for (var mi = 0; mi < 60; mi += step) mins.push({ value: mi, label: String(mi).padStart(2,'0') })
      cols.appendChild(buildCol('Min', mins,
        function(v) { return selMin === v },
        function(v) { selMin = v }
      ))

      // Seconds
      if (showSeconds) {
        var secs = []
        for (var si = 0; si < 60; si += step) secs.push({ value: si, label: String(si).padStart(2,'0') })
        cols.appendChild(buildCol('Sec', secs,
          function(v) { return selSec === v },
          function(v) { selSec = v }
        ))
      }

      // AM/PM
      if (!use24h) {
        cols.appendChild(buildCol('', [{ value:'AM', label:'AM' }, { value:'PM', label:'PM' }],
          function(v) { return selPeriod === v },
          function(v) { selPeriod = v }
        ))
      }

      container.appendChild(cols)

      if (opts.showConfirm !== false) {
        var footer = makeEl('div', { 'class': 'st-tp-footer' })
        var btn = makeEl('button', { 'class': 'st-tp-confirm', 'type': 'button' }, ['Set time'])
        btn.addEventListener('click', function() {
          if (displayHour === null) displayHour = use24h ? 0 : 12
          if (onConfirm) onConfirm(formatTime(), getActual24Hour(), selMin, selSec, selPeriod)
        })
        footer.appendChild(btn)
        container.appendChild(footer)
      }

      // Scroll selected items into view
      setTimeout(function() {
        container.querySelectorAll('.st-tp-item.is-selected').forEach(function(el) {
          el.parentNode.scrollTop = el.offsetTop - el.parentNode.offsetHeight / 2
        })
      }, 0)
    }

    render()

    return {
      el:        container,
      getTime:   formatTime,
      setTime:   function(h, m, s) {
        if (use24h) { displayHour = Math.max(0, Math.min(23, h)) }
        else { selPeriod = h >= 12 ? 'PM' : 'AM'; displayHour = h % 12 || 12 }
        selMin = Math.max(0, Math.min(59, m || 0))
        selSec = Math.max(0, Math.min(59, s || 0))
        render()
      },
      getDetail: function() { return { hour: getActual24Hour(), minute: selMin, second: selSec, period: use24h ? null : selPeriod } }
    }
  }

  function createTimepicker(input, options) {
    options = options || {}
    if (tpRegistry.has(input)) return tpRegistry.get(input)

    var use24h      = options.hour24      === true || input.getAttribute('data-st-hour24') === 'true'
    var step        = parseInt(options.step || input.getAttribute('data-st-step') || '5', 10)
    var showSeconds = options.showSeconds === true || input.hasAttribute('data-st-show-seconds')
    var isOpen      = false
    var timePart    = null

    var popup = makeEl('div', { 'class': 'st-timepicker-popup', 'role': 'dialog', 'aria-modal': 'true', 'aria-label': 'Time picker' })

    function open() {
      if (isOpen) return
      isOpen = true
      popup.innerHTML = ''
      timePart = buildTimePart({
        use24h: use24h, step: step, showSeconds: showSeconds, showConfirm: true,
      }, function(formatted) {
        input.value = formatted
        input.dispatchEvent(new Event('change', { bubbles: true }))
        var d = timePart.getDetail()
        emit('st:timepicker:change', { input: input, value: formatted, hour: d.hour, minute: d.minute, second: d.second, period: d.period })
        close()
      })
      popup.appendChild(timePart.el)
      doc.body.appendChild(popup)
      positionBelow(popup, input)
      void popup.offsetHeight
      popup.classList.add('is-open')
      input.setAttribute('aria-expanded', 'true')
      emit('st:timepicker:open', { input: input })
      setTimeout(function() { doc.addEventListener('click', outsideClick, true) }, 0)
    }

    function close() {
      if (!isOpen) return
      isOpen = false
      popup.classList.remove('is-open')
      input.setAttribute('aria-expanded', 'false')
      doc.removeEventListener('click', outsideClick, true)
      emit('st:timepicker:close', { input: input })
      var p = popup
      setTimeout(function() { if (p.parentNode) p.parentNode.removeChild(p) }, 200)
    }

    function outsideClick(e) {
      if (!popup.contains(e.target) && e.target !== input) close()
    }

    input.setAttribute('autocomplete', 'off')
    input.setAttribute('aria-haspopup', 'dialog')
    input.setAttribute('aria-expanded', 'false')
    input.addEventListener('click', function() { isOpen ? close() : open() })
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') close()
      if ((e.key === 'Enter' || e.key === ' ') && !isOpen) { e.preventDefault(); open() }
    })

    var api = {
      open:  open,
      close: close,
      setTime: function(h, m, s) { if (timePart) timePart.setTime(h, m, s) },
      getTime: function() { return timePart ? { formatted: timePart.getTime(), ...timePart.getDetail() } : {} },
      destroy: function() {
        input.removeAttribute('aria-expanded'); input.removeAttribute('aria-haspopup'); input.removeAttribute('autocomplete')
        if (popup.parentNode) popup.parentNode.removeChild(popup)
        tpRegistry.delete(input)
      },
    }

    tpRegistry.set(input, api)
    return api
  }

  // ─── Datetime Picker ────────────────────────────────────────────────────────

  function createDatetimepicker(input, options) {
    options = options || {}
    if (dtRegistry.has(input)) return dtRegistry.get(input)

    // Split format into date and time parts (split on first space before time tokens)
    var fullFmt  = options.format || input.getAttribute('data-st-format') || 'YYYY-MM-DD HH:mm'
    var parts    = fullFmt.split(' ')
    var dateFmt  = parts[0]  || 'YYYY-MM-DD'
    var timeFmt  = parts.slice(1).join(' ') || 'HH:mm'
    var use24h   = options.hour24      === true || input.getAttribute('data-st-hour24') === 'true' || timeFmt.indexOf('HH') >= 0
    var step     = parseInt(options.step || input.getAttribute('data-st-step') || '5', 10)
    var showSecs = options.showSeconds === true || input.hasAttribute('data-st-show-seconds') || timeFmt.indexOf('ss') >= 0
    var isOpen   = false
    var timePart = null

    // Build a combined popup: calendar section + time section side by side
    var popup    = makeEl('div', { 'class': 'st-datetimepicker-popup', 'role': 'dialog', 'aria-modal': 'true', 'aria-label': 'Date and time picker' })
    var calSection  = makeEl('div', { 'class': 'st-dtp-cal' })
    var timeSection = makeEl('div', { 'class': 'st-dtp-time' })
    popup.appendChild(calSection)
    popup.appendChild(timeSection)

    // Inline date picker rendering inside calSection
    var dpOpts = Object.assign({}, options, { format: dateFmt, inline: true })
    var dpInput = makeEl('input', { 'type': 'hidden', 'value': '' })
    doc.body.appendChild(dpInput)  // needs to be in DOM for dpRegistry
    var dpApi = createDatepicker(dpInput, dpOpts)
    calSection.appendChild(dpApi._popup || dpInput.nextSibling)
    // Swap the popup into our section
    if (dpInput.nextSibling) calSection.appendChild(dpInput.nextSibling)

    function buildTime() {
      timeSection.innerHTML = ''
      var lbl = makeEl('div', { 'class': 'st-dtp-time-label' }, ['Time'])
      timeSection.appendChild(lbl)
      timePart = buildTimePart({
        use24h: use24h, step: step, showSeconds: showSecs, showConfirm: false,
      }, null)
      timeSection.appendChild(timePart.el)

      var footer = makeEl('div', { 'class': 'st-tp-footer' })
      var applyBtn = makeEl('button', { 'class': 'st-tp-confirm', 'type': 'button' }, ['Apply'])
      applyBtn.addEventListener('click', function() {
        var dateVal = dpInput.value || ''
        var timeVal = timePart.getTime()
        if (dateVal && timeVal) {
          input.value = dateVal + ' ' + timeVal
          input.dispatchEvent(new Event('change', { bubbles: true }))
          var d = timePart.getDetail()
          emit('st:datetimepicker:change', { input: input, value: input.value, date: dpApi.getDate(), hour: d.hour, minute: d.minute })
          close()
        }
      })
      footer.appendChild(applyBtn)
      timeSection.appendChild(footer)
    }

    // Wire dpInput changes to re-render time section
    dpInput.addEventListener('change', function() { buildTime() })

    function open() {
      if (isOpen) return
      isOpen = true
      buildTime()
      doc.body.appendChild(popup)
      positionBelow(popup, input)
      void popup.offsetHeight
      popup.classList.add('is-open')
      input.setAttribute('aria-expanded', 'true')
      emit('st:datetimepicker:open', { input: input })
      setTimeout(function() { doc.addEventListener('click', outsideClick, true) }, 0)
    }

    function close() {
      if (!isOpen) return
      isOpen = false
      popup.classList.remove('is-open')
      input.setAttribute('aria-expanded', 'false')
      doc.removeEventListener('click', outsideClick, true)
      emit('st:datetimepicker:close', { input: input })
      var p = popup
      setTimeout(function() { if (p.parentNode) p.parentNode.removeChild(p) }, 200)
    }

    function outsideClick(e) {
      if (!popup.contains(e.target) && e.target !== input) close()
    }

    input.setAttribute('autocomplete', 'off')
    input.setAttribute('aria-haspopup', 'dialog')
    input.setAttribute('aria-expanded', 'false')
    input.addEventListener('click', function() { isOpen ? close() : open() })
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') close()
      if ((e.key === 'Enter' || e.key === ' ') && !isOpen) { e.preventDefault(); open() }
    })

    var api = {
      open: open, close: close,
      destroy: function() {
        input.removeAttribute('aria-expanded'); input.removeAttribute('aria-haspopup'); input.removeAttribute('autocomplete')
        dpApi.destroy(); if (dpInput.parentNode) dpInput.parentNode.removeChild(dpInput)
        if (popup.parentNode) popup.parentNode.removeChild(popup)
        dtRegistry.delete(input)
      }
    }

    dtRegistry.set(input, api)
    return api
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
