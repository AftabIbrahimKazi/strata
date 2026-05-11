#!/usr/bin/env node

'use strict'

const fs       = require('fs')
const path     = require('path')
const chokidar = require('chokidar')
const strata   = require('../src/index')
const { getWatchFiles } = require('../src/scanner/scanner')

const args = process.argv.slice(2)
const cwd  = process.cwd()

function loadConfig(cwd) {
  const configPath    = path.resolve(cwd, 'strata.config.js')
  const configPathCjs = path.resolve(cwd, 'strata.config.cjs')

  if (fs.existsSync(configPathCjs)) {
    try { return require(configPathCjs) } catch {}
  }

  if (fs.existsSync(configPath)) {
    try { return require(configPath) } catch {}
  }

  return {}
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
  const config     = loadConfig(cwd)
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

  const config       = loadConfig(cwd)
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

// ─── ESM / framework helpers ──────────────────────────────────────────
function isESMProject(cwd) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(cwd, 'package.json'), 'utf8'))
    return pkg.type === 'module'
  } catch {
    return false
  }
}

function detectOutputPath(cwd) {
  try {
    const pkg  = JSON.parse(fs.readFileSync(path.resolve(cwd, 'package.json'), 'utf8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    if (deps['astro'])                return './public/strata.output.css'
    if (deps['laravel-vite-plugin'])  return './public/strata.output.css'
    if (deps['next'])                 return './public/strata.output.css'
    if (deps['react'])                return './public/strata.output.css'
    if (deps['vue'])                  return './public/strata.output.css'
    if (deps['@sveltejs/kit'])        return './public/strata.output.css'
  } catch {}
  return './dist/strata.output.css'
}

// ─── Framework detection ──────────────────────────────────────────────
function detectFramework(cwd) {
  try {
    const pkg  = JSON.parse(fs.readFileSync(path.resolve(cwd, 'package.json'), 'utf8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }

    if (deps['astro'])                return 'astro'
    if (deps['laravel-vite-plugin'])  return 'laravel'
    if (deps['next'])                 return 'next'
    if (deps['@sveltejs/kit'])        return 'sveltekit'
    if (deps['nuxt'])                 return 'nuxt'
    if (deps['react'] && deps['vite']) return 'react-vite'
    if (deps['vue']   && deps['vite']) return 'vue-vite'
  } catch {}
  return 'generic'
}

// ─── Script injection ─────────────────────────────────────────────────
function injectScripts(cwd, framework) {
  const pkgPath = path.resolve(cwd, 'package.json')
  const strataWatch = 'node node_modules/strata-css/bin/strata.js --watch'
  const strataBuild = 'node node_modules/strata-css/bin/strata.js --build'

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    if (!pkg.scripts) pkg.scripts = {}

    const frameworkDev = {
      'astro':      'astro dev',
      'laravel':    'vite',
      'next':       'next dev',
      'sveltekit':  'vite dev',
      'nuxt':       'nuxt dev',
      'react-vite': 'vite',
      'vue-vite':   'vite',
      'generic':    pkg.scripts.dev || 'npm start'
    }

    const frameworkBuild = {
      'astro':      'astro build',
      'laravel':    'vite build',
      'next':       'next build',
      'sveltekit':  'vite build',
      'nuxt':       'nuxt build',
      'react-vite': 'vite build',
      'vue-vite':   'vite build',
      'generic':    pkg.scripts.build || 'npm run build'
    }

    const devCmd   = frameworkDev[framework]
    const buildCmd = frameworkBuild[framework]

    const hasConcurrently = pkg.dependencies?.['concurrently'] ||
                            pkg.devDependencies?.['concurrently']

    if (hasConcurrently) {
      pkg.scripts.dev   = `concurrently "${devCmd}" "${strataWatch}"`
    } else {
      pkg.scripts.dev   = `${strataWatch} & ${devCmd}`
    }

    pkg.scripts.build = `${strataBuild} && ${buildCmd}`
    pkg.scripts['strata:watch'] = strataWatch
    pkg.scripts['strata:build'] = strataBuild

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
    return true
  } catch (e) {
    return false
  }
}

// ─── Init ─────────────────────────────────────────────────────────────
function init() {
  const isESM     = isESMProject(cwd)
  const output    = detectOutputPath(cwd)
  const framework = detectFramework(cwd)

  console.log('[Strata] Initializing project...')
  console.log(`[Strata] Detected: ${isESM ? 'ESM' : 'CommonJS'} project`)
  console.log(`[Strata] Framework: ${framework}`)

  const configFile  = isESM ? 'strata.config.cjs' : 'strata.config.js'
  const postcssFile = isESM ? 'postcss.config.cjs' : 'postcss.config.js'

  const configContent  = `module.exports = {\n  content: ["./src/**/*.{html,jsx,tsx,vue,astro,svelte,js,ts}"],\n  input:   "./strata.css",\n  output:  "${output}"\n}\n`
  const postcssContent = `module.exports = {\n  plugins: [\n    require('strata-css'),\n    require('autoprefixer')\n  ]\n}\n`
  const strataCssContent = `@strata base;\n@strata components;\n@strata utilities;\n`

  fs.writeFileSync(path.resolve(cwd, configFile),  configContent)
  fs.writeFileSync(path.resolve(cwd, postcssFile), postcssContent)
  fs.writeFileSync(path.resolve(cwd, 'strata.css'), strataCssContent)

  console.log(`[Strata] Created: ${configFile}`)
  console.log(`[Strata] Created: strata.css`)
  console.log(`[Strata] Created: ${postcssFile}`)

  const injected = injectScripts(cwd, framework)

  if (injected) {
    let hasConcurrently = false
    try {
      const pkg = JSON.parse(fs.readFileSync(path.resolve(cwd, 'package.json'), 'utf8'))
      hasConcurrently = !!(pkg.dependencies?.['concurrently'] || pkg.devDependencies?.['concurrently'])
    } catch {}

    console.log(`[Strata] Updated package.json scripts:`)
    console.log(`[Strata]   dev          → runs Strata watcher + framework dev server`)
    console.log(`[Strata]   build        → runs Strata build then framework build`)
    console.log(`[Strata]   strata:watch → node node_modules/strata-css/bin/strata.js --watch`)
    console.log(`[Strata]   strata:build → node node_modules/strata-css/bin/strata.js --build`)

    if (!hasConcurrently) {
      console.log(`[Strata]`)
      console.log(`[Strata] Tip: install concurrently for cleaner parallel dev:`)
      console.log(`[Strata]   npm install --save-dev concurrently`)
    }
  } else {
    console.log(`[Strata] Warning: could not update package.json scripts — update manually.`)
  }

  console.log(`[Strata] Done! Next steps:`)
  console.log(`[Strata]   1. Add <link rel="stylesheet" href="/strata.output.css"> to your HTML`)
  console.log(`[Strata]   2. Add data-st-theme="light" to your <html> tag`)
  console.log(`[Strata]   3. Run: npm run dev`)
}

// ─── Run ──────────────────────────────────────────────────────────────
if      (args[0] === 'init')          init()
else if (args.includes('--watch'))    watch()
else if (args.includes('--minify'))   build(true,  true)
else if (args.includes('--build'))    build(false, true)
else console.log(`
Strata CSS

  strata-css init       scaffold a new project
  strata-css --watch    development mode  (unminified, fast rebuild)
  strata-css --build    production build  (minified JS, readable CSS)
  strata-css --minify   production build  (minified CSS + JS, smallest output)
`)
