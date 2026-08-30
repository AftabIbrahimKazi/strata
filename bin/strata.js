#!/usr/bin/env node

'use strict'

const fs       = require('fs')
const path     = require('path')
const readline = require('readline')
const chokidar = require('chokidar')
const strata   = require('../src/index')
const { getWatchFiles } = require('../src/scanner/scanner')

const args    = process.argv.slice(2)
const cwd     = process.cwd()
const verbose = args.includes('--verbose') || args.includes('-v')

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve))
}

function askYesNo(rl, question, defaultYes = true) {
  const hint = defaultYes ? '[Y/n]' : '[y/N]'
  return new Promise(resolve => {
    rl.question(`${question} ${hint} `, answer => {
      if (!answer.trim()) return resolve(defaultYes)
      resolve(answer.trim().toLowerCase().startsWith('y'))
    })
  })
}

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
    let cssnano
    try {
      cssnano = require('cssnano')
    } catch {
      console.error('[Strata] ✖  --minify requires cssnano, which is an optional dependency.')
      console.error('          Install it with: npm install -D cssnano')
      process.exit(1)
    }
    const postcss = require('postcss')
    const result  = await postcss([cssnano({ preset: 'default' })]).process(css, { from: outputFile })
    fs.writeFileSync(outputFile, result.css)
  }

  // Bundle + optionally minify JS components
  // Load order: init.js (sets data-strata) → packages (detect Strata, register accordingly)
  const componentsDir = path.join(__dirname, '..', 'src', 'components', 'modules')

  // Component sources live in their own published packages (@strata-packages/*).
  // Resolve each from the consuming project first, then fall back to this
  // monorepo's packages/ directory.
  //
  // Only the fallback existed before, and packages/ is not in this package's
  // `files` allowlist — so it never ships. Every npm consumer silently received
  // a strata.components.js containing nothing but the init stub: no Modal, no
  // Offcanvas, no Skeleton, no Chart. The monorepo build looked perfect
  // throughout, because packages/ is present here.
  //
  // Consumer-first is also the correct precedence: a package the user
  // explicitly installed should win. In this monorepo the two paths agree
  // anyway — npm workspaces symlink node_modules/@strata-packages/* to
  // packages/*, so local development resolves to the same files.
  const COMPONENTS  = ['modal', 'offcanvas', 'skeleton-loader', 'chart']
  const monorepoDir = path.join(__dirname, '..', 'packages')

  function resolveComponent(name) {
    const installed = path.join(cwd, 'node_modules', '@strata-packages', name, `${name}.js`)
    if (fs.existsSync(installed)) return installed
    const local = path.join(monorepoDir, name, `${name}.js`)
    if (fs.existsSync(local)) return local
    return null
  }

  const resolved = COMPONENTS.map(n => ({ name: n, file: resolveComponent(n) }))
  const packageFiles = resolved.filter(r => r.file).map(r => r.file)
  const missing      = resolved.filter(r => !r.file).map(r => r.name)
  const jsDest = path.join(path.dirname(outputFile), 'strata.components.js')
  if (fs.existsSync(componentsDir)) {
    const files  = fs.readdirSync(componentsDir).filter(f => f.endsWith('.js')).sort()
    // Create the shared Strata namespace BEFORE the package UMD wrappers run, so
    // each one attaches to Strata.* (their `if (root.Strata)` branch) instead of
    // falling back to a separate StrataModal/StrataChart/etc. global.
    const banner = `/*! Strata Components — built ${new Date().toISOString().slice(0,10)} */\n`
      + `;(function(g){g.Strata=g.Strata||{}})(typeof globalThis!=='undefined'?globalThis:this);\n`
    const parts  = files.map(f => fs.readFileSync(path.join(componentsDir, f), 'utf8'))
    packageFiles.forEach(p => parts.push(fs.readFileSync(p, 'utf8')))
    const raw    = parts.join('\n')
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

  // Report what the scan actually did. A build that silently produces no CSS
  // used to look identical to a healthy one; these lines make the difference
  // obvious without anyone needing to opt in.
  // Report which JS components made it into the bundle. A component that
  // cannot be resolved used to vanish without a word.
  if (verbose && packageFiles.length) {
    console.log(`[Strata]   components bundled: ${resolved.filter(r => r.file).map(r => r.name).join(', ')}`)
  }
  if (missing.length) {
    console.warn(`[Strata] ⚠  ${missing.length} JS component(s) not bundled: ${missing.join(', ')}`)
    console.warn(`[Strata]    install them to include their JS: npm i ${missing.map(n => '@strata-packages/' + n).join(' ')}`)
    console.warn(`[Strata]    (CSS for these components is always emitted — only their JS is affected)`)
  }

  const { getScanStats, getScanWarnings } = require('../src/scanner/scanner')
  const stats = getScanStats()
  if (verbose) {
    console.log(`[Strata]   scanned ${stats.scanned}/${stats.matched} matched file(s), ` +
                `${stats.skipped} skipped, ${stats.classes} class name(s) found`)
    console.log(`[Strata]   globs: ${stats.globs.join(', ')}  (relative to ${stats.cwd})`)
  }
  for (const w of getScanWarnings()) {
    console.warn(`[Strata] ⚠  ${w}`)
  }
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

// ─── Init helpers ─────────────────────────────────────────────────────

const PACKAGES = [
  { name: '@strata-packages/modal',          label: 'modal          — attribute-driven modal dialogs' },
  { name: '@strata-packages/offcanvas',      label: 'offcanvas      — slide-in drawer panels'         },
  { name: '@strata-packages/skeleton-loader',label: 'skeleton-loader — shimmer loading placeholders'  },
  { name: '@strata-packages/chart',          label: 'chart          — Three.js data visualisations'   },
]

const FRAMEWORK_DEV = {
  'astro':      'astro dev',
  'laravel':    'vite',
  'next':       'next dev',
  'sveltekit':  'vite dev',
  'nuxt':       'nuxt dev',
  'react-vite': 'vite',
  'vue-vite':   'vite',
  'generic':    'npm start'
}

const FRAMEWORK_BUILD = {
  'astro':      'astro build',
  'laravel':    'vite build',
  'next':       'next build',
  'sveltekit':  'vite build',
  'nuxt':       'nuxt build',
  'react-vite': 'vite build',
  'vue-vite':   'vite build',
  'generic':    'npm run build'
}

const FRAMEWORK_LAYOUT = {
  'astro':      'src/layouts/Layout.astro',
  'laravel':    'resources/views/layouts/app.blade.php',
  'next':       'src/app/layout.tsx',
  'sveltekit':  'src/routes/+layout.svelte',
  'nuxt':       'layouts/default.vue',
  'react-vite': 'index.html',
  'vue-vite':   'index.html',
  'generic':    'index.html'
}

function askChoice(rl, question, count, defaultChoice = 1) {
  return new Promise(resolve => {
    rl.question(`${question} [${defaultChoice}]: `, answer => {
      const n = parseInt(answer.trim(), 10)
      if (!answer.trim()) return resolve(defaultChoice)
      if (n >= 1 && n <= count) return resolve(n)
      resolve(defaultChoice)
    })
  })
}

async function askCheckbox(rl, items) {
  const selected = new Set()
  const render = () => {
    console.log('')
    items.forEach((item, i) => {
      const tick = selected.has(i) ? 'x' : ' '
      console.log(`      [${tick}] ${i + 1}  ${item.label}`)
    })
    console.log('')
  }
  render()
  while (true) {
    const answer = await ask(rl, '      Toggle number(s) or press Enter to confirm: ')
    if (!answer.trim()) break
    answer.trim().split(/[\s,]+/).forEach(token => {
      const n = parseInt(token, 10) - 1
      if (n >= 0 && n < items.length) {
        if (selected.has(n)) selected.delete(n)
        else selected.add(n)
      }
    })
    render()
  }
  return Array.from(selected).map(i => items[i])
}

function packageUsageSnippet(pkgName) {
  if (pkgName === '@strata-packages/modal') return `
  <!-- Modal usage (standalone) -->
  <link rel="stylesheet" href="node_modules/@strata-packages/modal/modal.css">
  <script src="node_modules/@strata-packages/modal/modal.js"></script>

  <button data-st-toggle="modal" data-st-target="#myModal">Open</button>
  <div class="modal" id="myModal" aria-hidden="true">
    <div class="modal-dialog"><div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Title</h5></div>
      <div class="modal-body"><p>Content here.</p></div>
      <div class="modal-footer">
        <button class="btn-secondary" data-st-dismiss="modal">Close</button>
      </div>
    </div></div>
  </div>`

  if (pkgName === '@strata-packages/offcanvas') return `
  <!-- Offcanvas usage (standalone) -->
  <link rel="stylesheet" href="node_modules/@strata-packages/offcanvas/offcanvas.css">
  <script src="node_modules/@strata-packages/offcanvas/offcanvas.js"></script>

  <button data-st-toggle="offcanvas" data-st-target="#myDrawer">Open Drawer</button>
  <div class="offcanvas offcanvas-end" id="myDrawer" aria-hidden="true">
    <div class="offcanvas-header">
      <h5 class="offcanvas-title">Drawer Title</h5>
      <button data-st-dismiss="offcanvas">&times;</button>
    </div>
    <div class="offcanvas-body"><p>Content here.</p></div>
  </div>`

  if (pkgName === '@strata-packages/skeleton-loader') return `
  <!-- Skeleton loader usage (standalone) -->
  <link rel="stylesheet" href="node_modules/@strata-packages/skeleton-loader/skeleton-loader.css">
  <script src="node_modules/@strata-packages/skeleton-loader/skeleton-loader.js"></script>

  <div class="card" data-st-skeleton="true">
    <div class="card-body"><p>Content loading...</p></div>
  </div>
  <script>
    SkeletonLoader.init()
    fetchData().then(() => SkeletonLoader.reveal())
  </script>`

  if (pkgName === '@strata-packages/chart') return `
  <!-- Chart usage (standalone, requires Three.js) -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="node_modules/@strata-packages/chart/chart.js"></script>

  <canvas id="myChart"></canvas>
  <script>
    StrataChart.create('#myChart', {
      type: 'bar',
      data: [{ label: 'Jan', value: 42 }, { label: 'Feb', value: 67 }]
    })
  </script>`

  return ''
}

function buildContentGlob(framework) {
  const base = './src/**/*.{html,jsx,tsx,vue,astro,svelte,js,ts}'
  if (framework === 'laravel') {
    return [base, './resources/views/**/*.blade.php']
  }
  return [base]
}

function scaffoldStrataCore(cwd, isESM, output, framework) {
  const configFile  = isESM ? 'strata.config.cjs' : 'strata.config.js'
  const postcssFile = isESM ? 'postcss.config.cjs' : 'postcss.config.js'
  const globs       = buildContentGlob(framework)
  const globStr     = globs.length === 1
    ? `["${globs[0]}"]`
    : `[\n    "${globs.join('",\n    "')}"\n  ]`

  const configContent    = `module.exports = {\n  content: ${globStr},\n  input:   "./strata.css",\n  output:  "${output}"\n}\n`

  // Only wire autoprefixer into the generated PostCSS config if the host
  // project has it installed — it is an optional peer, not a strata dependency.
  let hasAutoprefixer = false
  try { require.resolve('autoprefixer', { paths: [cwd] }); hasAutoprefixer = true } catch {}
  const postcssContent = hasAutoprefixer
    ? `module.exports = {\n  plugins: [\n    require('strata-css'),\n    require('autoprefixer')\n  ]\n}\n`
    : `module.exports = {\n  plugins: [\n    require('strata-css')\n    // Tip: npm install -D autoprefixer, then add require('autoprefixer') here\n  ]\n}\n`
  const strataCssContent = `@strata base;\n@strata components;\n@strata utilities;\n`

  fs.writeFileSync(path.resolve(cwd, configFile),   configContent)
  fs.writeFileSync(path.resolve(cwd, postcssFile),  postcssContent)
  fs.writeFileSync(path.resolve(cwd, 'strata.css'), strataCssContent)

  console.log(`      ✔  Created: ${configFile}`)
  console.log(`      ✔  Created: strata.css`)
  console.log(`      ✔  Created: ${postcssFile}`)

  return { configFile, postcssFile }
}

function updatePackageScripts(cwd, framework, installConcurrently) {
  const strataWatch = 'node node_modules/strata-css/bin/strata.js --watch'
  const strataBuild = 'node node_modules/strata-css/bin/strata.js --build'
  const devCmd      = FRAMEWORK_DEV[framework]   || 'npm start'
  const buildCmd    = FRAMEWORK_BUILD[framework] || 'npm run build'

  const pkgPath = path.resolve(cwd, 'package.json')
  let pkg
  try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) } catch { return }
  if (!pkg.scripts) pkg.scripts = {}

  const hasConcurrently = installConcurrently ||
                          pkg.dependencies?.['concurrently'] ||
                          pkg.devDependencies?.['concurrently']

  pkg.scripts.dev             = hasConcurrently
    ? `concurrently "${strataWatch}" "${devCmd}"`
    : `${strataWatch} & ${devCmd}`
  pkg.scripts.build           = `${strataBuild} && ${buildCmd}`
  pkg.scripts['strata:watch'] = strataWatch
  pkg.scripts['strata:build'] = strataBuild

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
  console.log('      ✔  Updated: package.json scripts')
}

function injectIntoLayout(cwd, htmlFile, outputCssPath, injectScript) {
  const htmlPath = path.resolve(cwd, htmlFile.trim())
  if (!fs.existsSync(htmlPath)) {
    console.log(`      ✗  File not found: ${htmlFile.trim()} — skipped`)
    return
  }

  let content = fs.readFileSync(htmlPath, 'utf8')
  const cssHref   = outputCssPath.replace('./', '/')
  const cssLink   = `\t\t<link rel="stylesheet" href="${cssHref}">`
  const scriptTag = `\t\t<script src="${cssHref.replace('strata.output.css', 'strata.components.js')}"></script>`
  const themeAttr = 'data-st-theme="light"'

  if (!content.includes('strata.output.css')) {
    content = content.replace('</head>', `${cssLink}\n\t</head>`)
  }
  if (injectScript && !content.includes('strata.components.js')) {
    content = content.replace('</body>', `${scriptTag}\n\t</body>`)
  }
  if (!content.includes('data-st-theme')) {
    content = content.replace('<html', `<html ${themeAttr}`)
  }

  fs.writeFileSync(htmlPath, content)
  console.log(`      ✔  Updated: ${htmlFile.trim()}`)
}

// ─── Init ─────────────────────────────────────────────────────────────
async function init() {
  const isESM     = isESMProject(cwd)
  const framework = detectFramework(cwd)
  const output    = detectOutputPath(cwd)
  // Installs are printed for the user to run, never executed —
  // the CLI deliberately avoids child_process (supply-chain surface).
  const pendingInstalls = []

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  console.log('')
  console.log(' strata   Universal installer')
  console.log('')
  console.log(`      ◼  Framework detected : ${framework}`)
  console.log(`      ◼  Project type       : ${isESM ? 'ESM' : 'CommonJS'}`)
  console.log(`      ◼  Output path        : ${output}`)
  console.log('')
  console.log('  install  What would you like to install?')
  console.log('')
  console.log('      1  Strata core only')
  console.log('      2  Strata + all packages  (modal, offcanvas, skeleton-loader, chart)')
  console.log('      3  Strata + select packages')
  console.log('      4  Single package  (no Strata core)')
  console.log('      5  Multiple packages  (no Strata core)')
  console.log('')

  const installChoice = await askChoice(rl, '      Choice', 5, 1)
  console.log('')

  const withCore     = installChoice <= 3
  const withPackages = installChoice >= 2

  // ── Determine which packages to install ──────────────────────────────
  let selectedPackages = []

  if (installChoice === 2) {
    selectedPackages = PACKAGES.slice()
  } else if (installChoice === 3) {
    console.log('  packages  Which packages? (type numbers to toggle, Enter to confirm)')
    selectedPackages = await askCheckbox(rl, PACKAGES)
  } else if (installChoice === 4) {
    console.log('  package  Which package?')
    console.log('')
    PACKAGES.forEach((p, i) => console.log(`      ${i + 1}  ${p.label}`))
    console.log('')
    const n = await askChoice(rl, '      Choice', PACKAGES.length, 1)
    selectedPackages = [PACKAGES[n - 1]]
    console.log('')
  } else if (installChoice === 5) {
    console.log('  packages  Which packages? (type numbers to toggle, Enter to confirm)')
    selectedPackages = await askCheckbox(rl, PACKAGES)
  }

  // ── Strata core setup questions ──────────────────────────────────────
  let installConcurrently = false
  let updateScripts       = false
  let htmlFile            = ''

  if (withCore) {
    installConcurrently = await askYesNo(rl,
      '  deps     Install concurrently for clean parallel dev?')

    updateScripts = await askYesNo(rl,
      '  scripts  Auto-update package.json dev and build scripts?')

    const defaultLayout = FRAMEWORK_LAYOUT[framework] || 'index.html'
    console.log('')
    console.log(`  html     Where is your main layout file?`)
    console.log(`           Default for ${framework}: ${defaultLayout}`)
    htmlFile = await ask(rl, `           Path (leave blank for default): `)
    if (!htmlFile.trim()) htmlFile = defaultLayout
    console.log('')
  }

  rl.close()

  // ── Execute: Strata core scaffold ─────────────────────────────────────
  if (withCore) {
    scaffoldStrataCore(cwd, isESM, output, framework)

    if (installConcurrently) {
      pendingInstalls.push('npm install --save-dev concurrently')
    }

    if (updateScripts) updatePackageScripts(cwd, framework, installConcurrently)
  }

  // ── Execute: install selected packages ───────────────────────────────
  if (selectedPackages.length > 0) {
    const pkgNames = selectedPackages.map(p => p.name).join(' ')
    pendingInstalls.push(`npm install ${pkgNames}`)
  }

  // ── Execute: inject into layout ──────────────────────────────────────
  if (withCore && htmlFile) {
    injectIntoLayout(cwd, htmlFile, output, withPackages && selectedPackages.length > 0)
  }

  // ── Execute: initial CSS build ───────────────────────────────────────
  if (withCore) {
    console.log('      ◼  Running initial build...')
    await build(false, false)
    console.log('      ✔  Initial build complete')
  }

  // ── Done ─────────────────────────────────────────────────────────────
  console.log('')
  console.log(' strata   Setup complete!')
  console.log('')

  if (pendingInstalls.length > 0) {
    console.log('  install  Run the following to finish setup:')
    console.log('')
    pendingInstalls.forEach(cmd => console.log(`      ${cmd}`))
    console.log('')
  }

  if (withCore) {
    console.log('  next     Run  npm run dev  to start.')
    console.log('')
  }

  if (!withCore && selectedPackages.length > 0) {
    console.log('  usage    Copy the snippets below into your project:')
    selectedPackages.forEach(p => {
      console.log('')
      console.log(`  ── ${p.name} ──`)
      console.log(packageUsageSnippet(p.name))
    })
    console.log('')
  }
}

// ─── Run ──────────────────────────────────────────────────────────────
if      (args[0] === 'init')          init().catch(console.error)
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
