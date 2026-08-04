/**
 * Strata Scanner — Optimised v2
 * Cached glob results + file content cache + single pass regex
 */

'use strict'

const fs   = require('fs')
const path = require('path')
const glob = require('glob')

const ALLOWED_EXTENSIONS = new Set([
  '.html','.jsx','.tsx','.vue','.astro','.svelte','.js','.ts'
])

// Finds where a class attribute's value begins. Deliberately NOT anchored with
// \b: `wrapperClassName="..."`, `itemClassName={...}` and similar forwarded
// props have always been scanned, and consumers rely on that.
const CLASS_ATTR_PATTERN = /class(?:Name)?\s*=\s*/g

// Hard cap on how far into a single {...} value we scan. Guards against an
// unbalanced brace (or minified/generated source) walking the rest of a file.
const MAX_EXPR_LEN = 8192

// Returns the index just past the string literal starting at `i`.
// Template literals are walked including their ${...} interpolations so that
// brace counting in the caller stays correct.
function skipQuoted(text, i, end) {
  const quote = text[i]
  i++
  if (quote === '`') {
    while (i < end) {
      const c = text[i]
      if (c === '\\') { i += 2; continue }
      if (c === '$' && text[i + 1] === '{') {
        i += 2
        let depth = 1
        while (i < end && depth > 0) {
          const d = text[i]
          if (d === '"' || d === "'" || d === '`') { i = skipQuoted(text, i, end); continue }
          if (d === '{') depth++
          else if (d === '}') depth--
          i++
        }
        continue
      }
      if (c === '`') return i + 1
      i++
    }
    return i
  }
  while (i < end) {
    const c = text[i]
    if (c === '\\') { i += 2; continue }
    if (c === quote) return i + 1
    i++
  }
  return i
}

// Index of the '}' matching the '{' at `start`, or -1 if unbalanced/too long.
function findExprEnd(text, start, end) {
  const limit = Math.min(end, start + MAX_EXPR_LEN)
  let depth = 0
  let i = start
  while (i < limit) {
    const c = text[i]
    if (c === '"' || c === "'" || c === '`') { i = skipQuoted(text, i, limit); continue }
    if (c === '{') depth++
    else if (c === '}') { depth--; if (depth === 0) return i }
    i++
  }
  return -1
}

// Emits every string literal found in text[start,end) via `emit`.
// Covers plain strings, template-literal static chunks, and — by recursing —
// strings nested inside ${...} interpolations. This is what makes
// className={clsx('a', cond ? 'b' : 'c')} and `base ${x ? 'on' : 'off'}`
// visible to the scanner without hardcoding helper names like clsx/cn/cx.
function collectStrings(text, start, end, emit) {
  let i = start
  while (i < end) {
    const c = text[i]
    if (c === '"' || c === "'") {
      const quote = c
      i++
      const from = i
      while (i < end && text[i] !== quote) {
        if (text[i] === '\\') i++
        i++
      }
      emit(text.slice(from, i))
      i++
      continue
    }
    if (c === '`') {
      i++
      let chunk = i
      while (i < end && text[i] !== '`') {
        if (text[i] === '\\') { i += 2; continue }
        if (text[i] === '$' && text[i + 1] === '{') {
          emit(text.slice(chunk, i))
          const exprStart = i + 2
          let depth = 1
          i += 2
          while (i < end && depth > 0) {
            const d = text[i]
            if (d === '"' || d === "'" || d === '`') { i = skipQuoted(text, i, end); continue }
            if (d === '{') depth++
            else if (d === '}') depth--
            i++
          }
          collectStrings(text, exprStart, i - 1, emit)
          chunk = i
          continue
        }
        i++
      }
      emit(text.slice(chunk, i))
      i++
      continue
    }
    i++
  }
}

// File content cache — keyed by path, stores { mtime, classes }
const fileCache = new Map()

// Glob result cache — keyed by pattern, stores { mtime, files }
const globCache = new Map()

function getFiles(contentGlobs) {
  const allFiles = []
  for (let g = 0; g < contentGlobs.length; g++) {
    const pattern = contentGlobs[g]
    const cached  = globCache.get(pattern)

    // Glob results rarely change — cache for 500ms
    if (cached && (Date.now() - cached.time) < 500) {
      cached.files.forEach(f => allFiles.push(f))
      continue
    }

    const files = glob.sync(pattern, { nodir: true })
      .filter(f => path.extname(f).toLowerCase() !== '.css')

    globCache.set(pattern, { files, time: Date.now() })
    files.forEach(f => allFiles.push(f))
  }
  return allFiles
}

function extractClassesFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) return null

  let mtime
  try { mtime = fs.statSync(filePath).mtimeMs }
  catch { return null }

  const cached = fileCache.get(filePath)
  if (cached && cached.mtime === mtime) return cached.classes

  let content
  try { content = fs.readFileSync(filePath, 'utf8') }
  catch { return null }

  const classes = new Set()
  const emit = (str) => {
    if (!str) return
    const parts = str.split(/\s+/)
    for (let i = 0; i < parts.length; i++) {
      const t = parts[i].trim()
      if (t) classes.add(t)
    }
  }

  const n = content.length
  CLASS_ATTR_PATTERN.lastIndex = 0
  let match

  while ((match = CLASS_ATTR_PATTERN.exec(content)) !== null) {
    const i = match.index + match[0].length
    if (i >= n) break
    const c = content[i]

    // class="a b c" / class='a b c' / class=`a b c`
    if (c === '"' || c === "'" || c === '`') {
      const close = skipQuoted(content, i, n)
      collectStrings(content, i, close, emit)
      CLASS_ATTR_PATTERN.lastIndex = close
      continue
    }

    // className={...} — any expression, not just a bare string literal
    if (c === '{') {
      const close = findExprEnd(content, i, n)
      if (close === -1) continue
      collectStrings(content, i + 1, close, emit)
      CLASS_ATTR_PATTERN.lastIndex = close + 1
      continue
    }
  }

  fileCache.set(filePath, { mtime, classes })
  return classes
}

function scanFiles(contentGlobs) {
  const allClasses = new Set()
  const files = getFiles(contentGlobs)

  for (let i = 0; i < files.length; i++) {
    const classes = extractClassesFromFile(files[i])
    if (classes) classes.forEach(cls => allClasses.add(cls))
  }

  return allClasses
}

function getWatchFiles(contentGlobs) {
  return getFiles(contentGlobs)
}

function clearFileCache(filePath) {
  if (filePath) {
    fileCache.delete(filePath)
    globCache.clear()   // a specific file change may mean add/delete — re-glob
  } else {
    fileCache.clear()
    // Full invalidate only clears content cache, not glob results.
    // Which files exist hasn't changed — only their content did.
    // Preserving globCache avoids an expensive filesystem scan every build.
  }
}

module.exports = { scanFiles, extractClassesFromFile, getWatchFiles, clearFileCache }
