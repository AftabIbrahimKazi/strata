#!/usr/bin/env node

'use strict'

const fs       = require('fs')
const path     = require('path')
const chokidar = require('chokidar')
const strata   = require('../src/index')
const { getWatchFiles } = require('../src/scanner/scanner')

const args = process.argv.slice(2)
const cwd  = process.cwd()

function loadConfig() {
  const configPath = path.resolve(cwd, 'strata.config.js')
  try { return require(configPath) } catch { return {} }
}

// ─── JS minifier ──────────────────────────────────────────────────────
// Strips block comments (preserving /*! banners), line comments,
// and collapses unnecessary whitespace — no external dependency needed.

function minifyJS(src) {
  return src
    // preserve /*! banner */ comments, strip all other /* ... */ blocks
    .replace(/\/\*(?!!)([\s\S]*?)\*\//g, '')
    // strip // line comments (not inside strings — conservative: only at line start or after whitespace)
    .replace(/(?:^|\s)\/\/[^\n]*/gm, '')
    // collapse runs of whitespace/newlines to a single space
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
}

// ─── Build ────────────────────────────────────────────────────────────
// --watch  → unminified CSS, unminified JS  (fast rebuilds for dev)
// --build  → unminified CSS, minified JS    (production-ready JS)
// --minify → minified CSS + minified JS     (smallest possible output)

async function build(cssMinify = false, jsMinify = true) {
  const config     = loadConfig()
  const inputFile  = config.input  || path.join(cwd, 'strata.css')
  const outputFile = config.output || path.join(cwd, 'dist', 'strata.output.css')

  const start = process.hrtime.bigint()
  const css   = await strata.build(inputFile, outputFile, { cwd, sourceMap: !cssMinify })

  // CSS minification
  if (cssMinify) {
    const cssnano = require('cssnano')
    const postcss = require('postcss')
    const result  = await postcss([cssnano({ preset: 'default' })]).process(css, { from: outputFile })
    fs.writeFileSync(outputFile, result.css)
  }

  // Bundle + optionally minify JS components
  const componentsDir = path.join(__dirname, '..', 'src', 'components', 'modules')
  const jsDest        = path.join(path.dirname(outputFile), 'strata.components.js')
  if (fs.existsSync(componentsDir)) {
    const files  = fs.readdirSync(componentsDir).filter(f => f.endsWith('.js')).sort()
    const banner = `/*! Strata Components — built ${new Date().toISOString().slice(0,10)} */\n`
    const raw    = files.map(f => fs.readFileSync(path.join(componentsDir, f), 'utf8')).join('\n')
    const output = jsMinify ? banner + minifyJS(raw) : banner + raw
    fs.mkdirSync(path.dirname(jsDest), { recursive: true })
    fs.writeFileSync(jsDest, output)
  }

  const ms      = (Number(process.hrtime.bigint() - start) / 1_000_000).toFixed(2)
  const cssSize = (Buffer.byteLength(fs.readFileSync(outputFile)) / 1024).toFixed(2)
  const jsSize  = fs.existsSync(jsDest)
    ? (Buffer.byteLength(fs.readFileSync(jsDest)) / 1024).toFixed(2)
    : '0'
  console.log(`[Strata] ✓ Built → ${outputFile} (CSS ${cssSize} KB, JS ${jsSize} KB) in ${ms}ms`)
}

// ─── Watch ────────────────────────────────────────────────────────────
async function watch() {
  console.log('[Strata] Starting in watch mode...')
  await build(false, false)   // unminified for dev

  const config       = loadConfig()
  const contentGlobs = config.content || ['./src/**/*.{html,jsx,tsx,vue,astro,svelte,js,ts}']
  const inputFile    = config.input || path.join(cwd, 'strata.css')
  const watchFiles   = [inputFile, ...getWatchFiles(contentGlobs)]

  const watcher = chokidar.watch(watchFiles, { ignoreInitial: true, persistent: true })

  watcher.on('change', async (filePath) => {
    console.log(`[Strata] Changed: ${path.relative(cwd, filePath)}`)
    strata.invalidate(filePath)
    await build(false, false)
  })

  watcher.on('add', async (filePath) => {
    console.log(`[Strata] Added: ${path.relative(cwd, filePath)}`)
    strata.invalidate(filePath)
    await build(false, false)
  })

  console.log('[Strata] Watching for changes...')
}

// ─── Init ─────────────────────────────────────────────────────────────
function init() {
  console.log('[Strata] Initializing project...')

  const files = {
    'strata.config.js': `module.exports = {\n  content: ["./src/**/*.{html,jsx,tsx,vue,astro,svelte,js,ts}"],\n  input:   "./strata.css",\n  output:  "./dist/strata.output.css"\n}\n`,
    'strata.css':       `@strata base;\n@strata components;\n@strata utilities;\n`,
    'postcss.config.js':`module.exports = { plugins: [require('strata-css'), require('autoprefixer')] }\n`,
  }

  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(cwd, filename)
    if (fs.existsSync(filePath)) {
      console.log(`[Strata] Skipped (exists): ${filename}`)
    } else {
      fs.writeFileSync(filePath, content)
      console.log(`[Strata] Created: ${filename}`)
    }
  }

  fs.mkdirSync(path.join(cwd, 'dist'), { recursive: true })
  console.log('\n[Strata] Done! Run: npm run dev')
}

// ─── Run ──────────────────────────────────────────────────────────────
if      (args[0] === 'init')          init()
else if (args.includes('--watch'))    watch()
else if (args.includes('--minify'))   build(true,  true)
else if (args.includes('--build'))    build(false, true)
else console.log(`
Strata CSS

  strata init       scaffold a new project
  strata --watch    development mode  (unminified, fast rebuild)
  strata --build    production build  (minified JS, readable CSS)
  strata --minify   production build  (minified CSS + JS, smallest output)
`)
