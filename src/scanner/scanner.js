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

const CLASS_PATTERN = /class(?:Name)?=(?:["'`]([^"'`]+)["'`]|\{["'`]([^"'`]+)["'`]\})/g

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
  CLASS_PATTERN.lastIndex = 0
  let match

  while ((match = CLASS_PATTERN.exec(content)) !== null) {
    const str = match[1] || match[2]
    if (!str) continue
    const parts = str.split(/\s+/)
    for (let i = 0; i < parts.length; i++) {
      const t = parts[i].trim()
      if (t) classes.add(t)
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
