# Changelog

All notable changes to Strata CSS will be documented here.

## [Unreleased]

### Fixed

- **Breakpoint-scoped arbitrary values silently generated nothing.** `w-[40%]` worked; `w-md-[40%]` matched no pattern, emitted no CSS and raised no error. Each family is registered twice — once with a breakpoint segment, once without — and roughly half of them had only ever been given the plain twin: `w` `h` `max-w` `min-w` `max-h` `min-h` `fs` `fw` `opacity` `z` `top` `bottom` `left` `right` `inset` `cursor` `duration` `transition` `object-position` `text` and `bg`. Both twins are now generated from one declaration per family, so a family cannot be half-registered.
- **`start-[…]` / `end-[…]` did not exist.** The named scale (`start-0`, `start-50`) had no arbitrary form, so `start-[33%]` was a silent no-op — which had left the vertical dividers in `examples/cursorfx-line-wave.html` at `left: auto`. Found by the new build warning below, not by hand.

### Added

- **A utility that resolves to zero declarations now warns at build time**, on the CLI and as a PostCSS warning so it surfaces through bundlers too. Scoped to class names using arbitrary bracket syntax: a bracket is an unambiguous statement of intent, whereas warning on every unmatched class name would bury the signal under every BEM block and third-party class on the page.

  ```
  [Strata] ⚠  2 class(es) with arbitrary values matched no utility and emitted nothing:
              nope-[12px], lh-[1.15]. Check the prefix is a real utility and the
              breakpoint segment is one of sm|md|lg|xl|xxl.
  ```

- `examples/arbitrary-responsive-test.html` — visual confirmation of the above, including two deliberately unresolvable classes so the build prints the warning on this repo's own example pass.

## [1.8.17] — 2026-08-16

### Fixed
- **`package.json`'s `homepage` field pointed at a dead URL.** Still referenced `https://aftabibrahimkazi.github.io/strata`, the old GitHub Pages address from before the docs site moved to Vercel — that URL now returns a genuine 404 (confirmed via a live fetch), so anyone following the "homepage" link from the npm package page landed on a dead page. Updated to the current docs site URL.

## [1.8.16] — 2026-08-16

### Fixed
- **`shadow-sm` and `shadow-lg` silently stopped applying their own shadow strength.** The responsive shadow registration built class names as `shadow-${breakpoint}` for every entry in the breakpoint list (`sm`, `md`, `lg`, `xl`, `xxl`). Since `sm` and `lg` are also the named shadow scale's own suffixes, that produced class names identical to the base `shadow-sm`/`shadow-lg` classes — and because registration is last-write-wins, the responsive loop (which runs later) silently overwrote both with "default-strength shadow, active from that breakpoint up" instead. `shadow-sm`, `shadow`, and `shadow-lg` rendered as the exact same shadow. The documented `shadow-{bp}-{variant}` responsive pattern (`shadow-md-sm`, `shadow-lg-lg`, …) was unaffected and still correct. Fixed by dropping the undocumented bare `shadow-${bp}` registration entirely.

## [1.8.15] — 2026-08-12

### Fixed
- **Dependabot alert (high severity): nanoid transitive dependency.** `postcss` pulled in `nanoid@3.3.16`, which has a predictable-ID generation issue on non-secure entropy sources. Pinned to `>=3.3.17` via npm `overrides`, since `nanoid` is not a direct dependency of `strata-css`.

## [1.8.14] — 2026-08-05

### Fixed
- **npm consumers received no component JavaScript at all.** `bin/strata.js` sourced component JS exclusively from this monorepo's `packages/` directory, which is not in `package.json`'s `files` allowlist and therefore never ships. Consumers installing from npm got a `strata.components.js` containing nothing but the init stub — **259 bytes, with no Modal, Offcanvas, Skeleton or Chart** — while the same build inside the monorepo produced 43.9 KB with all four. The failure was completely silent: an `if (fs.existsSync(p))` guard skipped each missing file, and the build reported `✓ Built`. Verified by packing the tarball and installing it into a clean project.

  Components are now resolved from the consuming project's `node_modules/@strata-packages/*` first, falling back to the monorepo directory for local development. Consumer-first is also the correct precedence — a package the user explicitly installed should win — and the two agree inside this repo, since npm workspaces symlink `node_modules/@strata-packages/*` to `packages/*`.

  This is a **behaviour change for consumers**: install the component packages you use (`npm i @strata-packages/modal @strata-packages/offcanvas @strata-packages/skeleton-loader @strata-packages/chart`). Only their JavaScript was ever affected — component **CSS** has always been emitted correctly by the registry.

### Added
- **Missing components are now reported instead of silently omitted.** Any component that cannot be resolved produces a build warning naming it, the exact `npm i` command to fix it, and a note that CSS is unaffected. `--verbose` additionally lists the components that were bundled.

### Docs
- Documented how component JS reaches a build, and corrected the contradiction between `CLAUDE.md` (which said component scripts must not be loaded separately) and what `strata init` scaffolds.

### Tests
- `test/components-bundle.js` — drives the real CLI against a simulated npm-consumer layout, including an npm-style install of Strata itself with no `packages/` sibling, so the monorepo fallback cannot mask a missing component. Covers full install, no install, and partial install. All 16 assertions verified to fail (11 of 16) against the pre-fix CLI.

---

## [1.7.14] — 2026-08-05

### Added
- **Scan diagnostics.** Every scanner bug in this project's history has failed *open*: files matched but were skipped, globs resolved against the wrong directory, class shapes went unrecognised. In each case the build succeeded, the config looked correct, and the CSS was quietly wrong — which is why several survived for years. The scanner now reports what it actually did:
  - `strata --build --verbose` (or `-v`) prints `scanned N/M matched file(s), K skipped, C class name(s) found` along with the globs and the directory they resolved against.
  - **A scan that produces nothing now warns by default, with no opt-in.** Zero files matched, or files matched but no classes found, is reported on the CLI and as a real PostCSS warning — so consumers building through webpack, Turbopack, Vite or esbuild see it too, not just CLI users. The message names both the globs and the directory they were resolved against, which is precisely the information that made the 1.6.14 `cwd` bug invisible.
  - New exports `getScanStats()` and `getScanWarnings()` from `src/scanner/scanner.js` for tooling.

### Security
- **`brace-expansion` 5.0.8 → 5.0.9** — high-severity DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation. Reaches consumers transitively through `glob`, a runtime dependency.
- **`undici` 7.28.0 → 7.29.0** — resolves five advisories (one high, four moderate): cross-user information disclosure and parse-time crash via degenerate private cache directives, CRLF injection via blob-like body `type`, cache-control whitespace disclosure, cookie attribute injection, and response desynchronisation via the retry interceptor. Dev-only dependency; not shipped to consumers.
- `npm audit` now reports 0 vulnerabilities.

### Fixed
- The lockfile's recorded package version was stale at `1.4.10`; it now tracks the real version.

---

## [1.6.14] — 2026-08-05

### Fixed
- **Relative `content` globs resolved against the wrong directory, producing an empty stylesheet.** `scanFiles()` passed patterns to `glob.sync()` without a `cwd`, so a glob like `./src/**/*.jsx` always resolved against `process.cwd()` rather than the Strata project root. Whenever a build ran from a different directory — monorepo package builds, bundlers invoked from a parent directory — **zero files matched and the output contained no utility CSS at all**, with no error. The config itself was located correctly (it is resolved from `opts.cwd`), which made the setup look entirely correct. Globs now resolve against `opts.cwd`, and matched paths are absolute so cache keys, PostCSS dependency messages and watcher paths stay consistent regardless of where the build runs.
- **Files matched by a `content` glob were silently discarded unless their extension was one of eight.** The scanner gated on an allowlist (`.html .jsx .tsx .vue .astro .svelte .js .ts`); anything else matched by the glob was read and thrown away with no warning. This silently broke every non-JS ecosystem — `.php` and `.blade.php` (Laravel, WordPress), `.mdx`/`.md` (Next.js, Astro content), `.erb` (Rails), `.hbs`, `.twig` — and even `.mjs`/`.cjs`. A Laravel project pointing `content` at `./resources/**/*.blade.php` received an empty stylesheet and no diagnostic. The allowlist is replaced by a denylist of binary/media formats: the content glob is the filter, so a file you explicitly asked for is now always scanned. `.svg` is deliberately scanned, as SVG markup can carry class attributes.

### Tests
- 12 new assertions in `test/scanner.js` covering both bugs — `.php`, `.blade.php`, `.mdx`, `.md`, `.erb`, `.hbs`, `.twig`, `.mjs`, `.cjs`, `.svg` are scanned while `.png` is skipped, and a build run from a directory other than the project root resolves its relative globs correctly and emits non-empty CSS. All 12 verified to fail against 1.6.13 and pass with the fix.
- Differential run over 195 repository files confirms zero tokens lost versus the 1.6.13 scanner.

---

## [1.6.13] — 2026-08-04

### Fixed
- **Classes used only inside `className={...}` expressions never generated CSS.** The scanner matched exactly two shapes — `className="literal"` and `className={"literal"}` — because its regex required a quote immediately after `{`. Every other form was invisible: `clsx()`, `cn()`, `classnames()`, ternaries, arrays, template literals. A class used only in one of those produced no CSS, with no error and no warning; it appeared to work only when the same class happened to also exist as a plain literal elsewhere in the tree. The scanner now walks the whole braced expression and treats every string literal inside it as a class candidate — including template-literal static chunks and strings nested in `${...}` interpolations — without hardcoding helper names, so `clsx`/`cn`/`cx`/`classnames` and any other wrapper work identically. Present since 1.0.0.
- **`element.className = '...'` assignments were skipped.** The attribute pattern required `=` with no surrounding whitespace, so runtime assignments like `backdrop.className = 'modal-backdrop'` were missed — including in Strata's own modal and offcanvas packages, whose backdrop classes were silently absent from generated CSS.
- **An edited `strata.config.js` never took effect without a process restart.** `loadConfig()` used bare `require()`, which memoises for the lifetime of the process, so new `content` globs or `safelist` entries were silently ignored in dev servers and watch sessions. The module cache is now busted on change, keyed on mtime + size, and cleared outright by `invalidate()`. Three `cachedConfig*` variables had been declared for this since 1.0.0 but never used.

### Added
- **`safelist` in `strata.config.js` now actually works.** It had been documented as the escape hatch for dynamic class construction since 1.0.0 but was never implemented — following the documentation produced a silent no-op. Entries may contain several space-separated class names and go through the normal registry lookup, so arbitrary values and responsive variants are supported. Applied inside `generate()`, the single choke point shared by the PostCSS plugin and the CLI build path.
- **`npm test`** — the repository had three test files and no way to run them. Now runs the full suite (287 assertions) and exits non-zero on failure.

### Tests
- `test/scanner.js` — new suite locking in every className shape the scanner must understand, each asserted via a class that appears in that shape *and nowhere else* in the fixture, so an unsupported shape cannot be masked by an incidental occurrence elsewhere. Verified to fail (15 of 22) against the pre-fix scanner. Covers safelist, config reload, unbalanced braces, and escaped quotes.
- Repaired two assertions in `test/verify.js` that had been failing since 1.4.4 — they asserted `offcanvas-start` and `body.modal-open`, both intentionally replaced (by `data-st-side` and the `:has()` scroll lock respectively) without the tests being updated. A permanently red suite is why the scanner bug went unnoticed for so long.

---

## [1.5.13] — 2026-08-03

### Fixed
- **PostCSS plugin never registered scanned content files as build dependencies.** The `Once(root, { result })` hook scans the consuming app's source tree via `scanFiles(contentGlobs)` to discover utility classes, but never told the caller (via `result.messages.push({ type: 'dependency', ... })`) that its output depends on those files. Bundlers (webpack, Turbopack, esbuild) use that message to know when to invalidate a cached build; without it, a bundler could validly decide "the CSS file's own bytes are unchanged, config is unchanged → reuse cached output" even after a `.tsx` file added a new utility class — causing classes to intermittently go missing on incremental/cached builds (e.g. Vercel's "Restored build cache from previous deployment") despite a clean rebuild producing correct output. Every scanned content file, plus `strata.config.js`/`.cjs` itself, is now pushed as a `dependency` message with an absolute path.
- **`strata.build()`'s warm-build cache ignored `inputCSSPath`.** The module-level `cachedCSS`/`dirty` cache returned the previous build's output unconditionally on any warm call, regardless of which `inputCSSPath` was requested — so building two different input files in the same process (or the same file at two different paths) could serve one input's stale compiled CSS for the other. The cache is now keyed by the resolved input path.

### Tests
- `test/dependency-tracking.js` — new fixture-based regression test: asserts scanned files and the config file are registered as PostCSS dependencies, that an incremental change to a source file (not the CSS entry) is picked up on rebuild, and that `build()` with a different `inputCSSPath` never returns another input's cached output. Verified to fail without the fix and pass with it.

---

## [1.5.12] — 2026-08-03

### Fixed
- **`ml-` / `mr-` / `pl-` / `pr-` silently produced no CSS.** The spacing arbitrary-value regex accepts the suffix set `[trblxyes]` — the union of physical naming (`t r b l`, as used by Tailwind and Bootstrap 4) and logical-style naming (`x y e s`, as used by Bootstrap 5) — but `SPACING_PROPS` defined only the latter plus `t`/`b`. A matched-but-undefined suffix made the pattern function return `null`, so `pl-[10px]`, `ml-3`, `pr-sm-[1rem]` and friends compiled cleanly and emitted nothing: no CSS, no warning, no way for a consumer to notice. This affected 24 arbitrary shapes (4 prefixes × unconditional + 5 breakpoints) plus every named and breakpoint-named variant of the same four prefixes. `ml`/`mr`/`pl`/`pr` are now plain aliases of `ms`/`me`/`ps`/`pe` — which are themselves physical (`left`/`right`), so the spellings are exactly equivalent and no RTL behaviour differs. Purely additive; existing spellings unchanged.

### Tests
- Regression coverage for the above in `test/verify.js`, including a guard asserting that **every** suffix the arbitrary regex accepts resolves — so adding a suffix to the char class without a matching `SPACING_PROPS` entry now fails the suite instead of shipping another silent no-op.

---

## [1.5.11] — 2026-07-27

### Added
- **Responsive-arbitrary spacing** — `{m|mt|mb|ms|me|mx|my|p|pt|pb|ps|pe|px|py}-{bp}-[value]` (e.g. `px-sm-[var(--space-40)]`), mirroring the existing `gap-{bp}-[...]` pattern.
- **`border-x` / `border-y`** — new combined-side border utilities (previously only `border-top/end/bottom/start` existed), plus their `-0` removal variants.
- **Responsive border sides** — `border-{top|end|bottom|start|x|y}-{bp}` (named) and `-{bp}-0` (removal), plus `border-{side}-[value]` and `border-{side}-{bp}-[value]` arbitrary forms.
- **Responsive border shorthand + shadow arbitrary** — `border-{bp}-[value]` and `shadow-{bp}-[value]`.
- **Border-radius corner-pairs, responsive** — `rounded-{top|end|bottom|start}-{bp}` (named) and their arbitrary + responsive-arbitrary forms.
- **`rounded-[value]` / `rounded-{bp}-[value]`** — full-corner border-radius arbitrary value, previously missing entirely (the named `0-5`/`pill`/`circle` scale already had breakpoint support).
- **Outline, responsive + arbitrary** — `outline-{bp}-none`, `outline-{bp}-{color}`, `outline-{bp}-{1-5}`, and new `outline-[value]` / `outline-{bp}-[value]` arbitrary forms (the outline family previously had no breakpoint variants and no arbitrary form at all).
- **Gutter arbitrary values** — `g-[value]` / `gx-[value]` / `gy-[value]` and their responsive forms, for gutter values outside the fixed `0-5` scale.
- **Responsive-arbitrary grid-template** — `gtc-{bp}-[value]` / `gtr-{bp}-[value]` (unconditional arbitrary already existed).

---

## [1.4.11] — 2026-07-04

### Changed
- Republished to sync the npm package's `README.md` (shipped in the tarball) with fixes landed in the repo: missing packages (`offcanvas`, `flipbook`, `shopmap`) added to the package tables, stale `v1.0.0` roadmap/release references corrected, and `packages/chart/README.md` updated to match its lazy-loaded Three.js behavior. No functional/code changes.

---

## [1.4.10] — 2026-07-04

### Changed
- **`strata init` no longer executes shell commands** — package installs (`concurrently`, selected component packages) are now printed as copy-paste commands at the end of setup instead of being run via `child_process.execSync`. The CLI contains no shell access at all, closing the last Socket.dev supply-chain flag in strata's own code.

---

## [1.4.9] — 2026-07-04

### Changed
- **`autoprefixer` and `cssnano` are now optional peer dependencies** — previously hard dependencies, they installed for every consumer while being needed only for `--minify` (cssnano) or not at all by strata itself (autoprefixer was only referenced in the `init` scaffold template). Installs are lighter and supply-chain surface is roughly halved. `--minify` without cssnano now exits with a clear install hint; `strata init` only wires autoprefixer into the generated PostCSS config when the host project has it installed.

---

## [1.4.8] — 2026-07-04

### Security
- **Chart tooltip XSS fixed** — tooltip label/value were interpolated into `innerHTML`; now rendered via `textContent`. Applies to the bundled chart component (`@strata-packages/chart` 1.1.2).

### Performance
- **Bracket pre-filter in `lookup()`** — class names without `[` skip the entire 40-pattern arbitrary regex loop. Custom project classes (the majority of scanned tokens) now resolve to null in one string scan instead of 40 regex matches.

---

## [1.4.7] — 2026-07-04

### Fixed
- **`escapeClass` now escapes all non-identifier characters** — replaced the whitelist of 11 chained `.replace()` calls with a single comprehensive regex `/[^\w-]/g`. Any character that is not `a-z A-Z 0-9 _ -` is now escaped, including previously unhandled characters such as `@`, `{`, `}`, `*`, `+`, `~`, `\`, and whitespace. Resolves CodeQL finding js/incomplete-sanitization.

---

## [1.4.6] — 2026-07-04

### Fixed
- **`resultCache` cleared on `invalidate()`** — the registry's result cache is now flushed whenever `invalidate()` is called. Previously, any class cached as `null` (e.g. after a registry update or a fixed typo) would remain null for the entire dev server lifetime, silently producing no CSS on subsequent builds.

---

## [1.4.5] — 2026-06-30

### Added
- **Responsive arbitrary gap** — `gap-{bp}-[...]`, `row-gap-{bp}-[...]`, `col-gap-{bp}-[...]` now supported: `gap-sm-[var(--space)]`, `gap-md-[1rem_2rem]`, `row-gap-lg-[var(--space)]`, `col-gap-xl-[2rem]`

---

## [1.4.4] — 2026-06-28

### Fixed
- **Modal scroll lock via CSS `:has()`** — `body.modal-open` rule replaced with `body:has(.modal[aria-hidden="false"]) { overflow: hidden; scrollbar-gutter: stable; }`. No JS body class manipulation required.
- **Modal static shake uses `[data-st-shake="true"]`** — `.modal.modal-static .modal-dialog` selector replaced with `.modal[data-st-shake="true"] .modal-dialog`. Consistent with the attribute-value state pattern used across all components.

---

## [1.4.3] — 2026-06-27

### Fixed
- **`card` now has `height: 100%`** — cards in a flex row or grid now stretch to equal height regardless of content length. Previously cards shrank to their content, producing mismatched heights across a row.

---

## [1.4.2] — 2026-06-26

### Fixed
- **`escapeClass` now escapes `%`** — arbitrary classes with percentage values (e.g. `top-[50%]`, `w-[33%]`, `left-[10%]`) were producing invalid CSS selectors. The `%` was unescaped in the selector, causing the browser to silently ignore the rule entirely. Added `.replace(/%/g, '\\%')` to the escape chain.

---

## [1.4.1] — 2026-06-26

### Fixed
- **`fixed-top`, `fixed-bottom`, `sticky-top`, `sticky-bottom` and all `sticky-{bp}-*` variants moved from `'utilities'` to `'components'` layer** — their bundled `z-index` was impossible to override with a utility-layer `z-[n]` class because both landed in the same layer and source order always favoured the composite class. Moving to `'components'` means any `z-[n]` or `z-*` utility now wins unconditionally.

---

## [1.4.0] — 2026-06-26

### Added
- **Positional offset named scale** — `top-0/50/100`, `bottom-0/50/100`, `start-0/50/100` (maps to `left`), `end-0/50/100` (maps to `right`), `inset-0`
- **Positional offset arbitrary** — `top-[...]`, `bottom-[...]`, `left-[...]`, `right-[...]`, `inset-[...]` (inset supports underscore-to-space for multi-value shorthand)
- **`object-position-[...]` arbitrary** — `object-position-[center_top]`, `object-position-[var(--pos)]`, etc. Completes `object-fit` coverage.
- **`gtc-[...]` arbitrary** — `grid-template-columns`: `gtc-[260px_1fr]`, `gtc-[repeat(3,1fr)]`, `gtc-[var(--cols)]`
- **`gtr-[...]` arbitrary** — `grid-template-rows`: `gtr-[auto_1fr_auto]`

---

## [1.3.1] — 2026-06-26

### Fixed
- **`ps-[...]` and `ms-[...]` arbitrary values now work** — spacing regex character class was missing `s`, so `ps` (padding-start/left) and `ms` (margin-start/left) arbitrary classes silently produced no CSS. `pe-[...]` and `me-[...]` were unaffected.

---

## [1.3.0] — 2026-06-26

### Fixed
- **`rounded-pill` layer corrected** — was registered as `'components'`, causing it to be silently overridden by any `btn-*` or `btn-outline-*` class. Moved to `'utilities'` layer, consistent with every other `rounded-*` class.
- **Spacing arbitrary underscore replacement** — `p-[10px_20px]` now correctly emits `padding: 10px 20px`. Previously underscores were passed through literally, producing invalid CSS.
- **`bg-[...]` uses `background` shorthand** — was hardcoded to `background-color`, which rejects gradient values. Shorthand works for both solid colors and gradients.

### Added
- **`fs-[...]` arbitrary** — dedicated font-size arbitrary prefix. Resolves the `text-[var(--token)]` ambiguity: `fs-[var(--my-size)]`, `fs-[clamp(1rem,2vw,2rem)]` always emit `font-size`.
- **`gap-[...]` arbitrary** — token-based and custom gap values: `gap-[var(--space)]`, `gap-[1rem_2rem]`. Underscore-to-space replacement supported.
- **`row-gap-[...]` and `col-gap-[...]` arbitrary** — per-axis gap control.
- **`fw-[...]` arbitrary** — token-based and custom font-weight: `fw-[var(--heading-weight)]`, `fw-[350]`.

---

## [1.2.7] — 2026-06-15

### Fixed
- **Components bundle (`dist/strata.components.js`) now creates the `Strata` namespace.** Each component's UMD wrapper attaches to `Strata.*` only `if (root.Strata)` exists, but the bundle never initialised it — so every component fell back to its own global (`StrataChart`, `StrataModal`, …) and `window.Strata` was never defined, breaking all `Strata.Chart.create(...)` / `Strata.Modal.open(...)` usage (e.g. blank charts in `examples/chart.html`). The bundle banner (`bin/strata.js`) now initialises `Strata` before the wrappers run.

---

## [1.2.6] — 2026-06-05

### Docs
- Versioning rules clarified and expanded in `CONTRIBUTING.md`
- All package `CLAUDE.md` files updated with complete API references
- `README.md` files added to `@strata-packages/picker` and `@strata-packages/forms`
- `CHANGELOG.md` files added to `@strata-packages/picker` and `@strata-packages/forms`
- Root `README.md` updated: version badge, forms/picker added to standalone packages table

---

## [1.2.5] — 2026-06-04

### Added — `@strata-packages/picker`
- `theme` option — per-instance inline CSS variable overrides (primary, bg, text, radius, shadow, cellSize, fontSize)
- `className` option — extra class on popup for targeted CSS overrides

---

## [1.2.4] — 2026-06-03

### Added
- `@strata-packages/picker` — new standalone package: date, time, and datetime picker
  - Zero dependencies, works standalone or as `Strata.Picker` with Strata CSS
  - Declarative init via `data-st-datepicker`, `data-st-timepicker`, `data-st-datetimepicker`
  - Date range selection with two-input mode and range highlight
  - Preset shortcuts (built-in and custom)
  - Month/year grid navigation
  - `--stp-*` CSS variable system; auto-inherits `--st-*` tokens when Strata CSS is present

### Fixed
- Picker popup now appends to `<body>` with no CSS opacity transition — appears immediately on open
- `position: fixed` popup no longer adds scroll offset to viewport coordinates
- Picker rewritten as unified `createPicker` — date / time / datetime all working correctly

---

## [1.2.3] — 2026-06-02

### Fixed
- `@strata-packages/forms` auto-init now recognises all `data-st-*` select attributes at DOMContentLoaded

---

## [1.2.2] — 2026-06-01

### Added — `@strata-packages/forms`
- Checkbox select mode: dropdown stays open while ticking, Select All row, group-level checkboxes, `checkboxDisplay`: `chips` / `count` / `list`
- `maxDisplay` — fixed-height chip trigger with `+N` overflow badge
- Search input always rendered inside the dropdown (not above it)

---

## [1.2.1] — 2026-05-30

### Fixed
- `@strata-packages/forms` backend-friendly `required` validation — triggers visible error state on custom trigger

---

## [1.2.0] — 2026-05-28

### Added — `@strata-packages/forms`
- New standalone package: fully accessible custom select replacement
- Multi-select with chips, `maxItems`, searchable, clearable, grouped `<optgroup>`, creatable, avatar/custom render, async `loadOptions`, auto-width with viewport edge detection
- Native `<select>` stays in DOM — form submission works with any backend
- Declarative init via `data-st-select` and `data-st-*` option attributes

---

## [1.1.0] — 2026-05-20

### Added
- Transition CSS variables: `--st-duration-theme`, `--st-easing-theme` — all hardcoded transition values replaced
- Sizing utilities: `max-w-{xs/sm/md/lg/xl/xxl/full/none}`, `min-w-{0/full/screen}`, `max-h-{full/screen/none}`, `min-h-{0/full/screen}`
- Arbitrary sizing: `max-w-[440px]`, `min-h-[300px]`, `max-h-[500px]`, `min-w-[200px]`
- Responsive variants added to 15 utility groups: `flex-{bp}`, `fw-{bp}`, `fst-{bp}`, `text-{bp}-{transform}`, `rounded-{bp}`, `shadow-{bp}`, `w-{bp}`, `h-{bp}`, `opacity-{bp}`, `overflow-{bp}`, `position-{bp}`, `cursor-{bp}`, `lh-{bp}`, `visible-{bp}`, `invisible-{bp}`
- Component CSS variable tokens: all hardcoded color values replaced with local CSS variables on `.badge`, `.btn-*`, `.btn-outline-*`, `.nav-pills .active`, `.list-group-item.active`, `.page-item.active`, `.dropdown-item.active`, `.progress-bar`, `.tooltip-inner`, `.navbar-dark`, `.card-img-overlay`, `.carousel-*`, `.table-dark`
- List utilities: `list-unstyled`, `list-inline`, `list-inline-item`, `list-disc`, `list-decimal`, `list-circle`, `list-square`, `list-none`, `list-lower-alpha`, `list-upper-alpha`, `list-lower-roman`, `list-upper-roman`, `list-inside`, `list-outside`, `list-spaced`
- Outline utilities: `outline-none`, `outline-{color}`, `outline-{1-5}`
- Label component: `.label` and `.label-{color}` aliases to `.badge` / `.badge-{color}` for Bootstrap 3 compatibility

### Fixed
- `text-[15px]` → `font-size: 15px` (length unit correctly detected)
- `text-[#f00]` → `color: #f00` (color value correctly detected)
- `#`, `(`, `)`, `,` in arbitrary values now correctly escaped in CSS class selectors

---

## [1.0.0] — 2026-05-10

### Components
- `btn-primary`, `btn-secondary`, `btn-success`, `btn-danger`, `btn-warning`, `btn-info`, `btn-light`, `btn-dark` — full semantic button set with hover, focus, and active states baked in
- `card`, `card-header`, `card-body`, `card-footer` — composable card component
- `container`, `row`, `col-*` — Bootstrap-compatible responsive grid across all six breakpoints
- `modal` — dialog component with `data-st-toggle`, `data-st-dismiss`, and `data-st-backdrop` attribute API
- `navbar`, `navbar-brand`, `navbar-nav` — navigation bar component
- Skeleton loader — animated loading placeholder with `Strata.skeleton` JavaScript API

### Utilities
- Spacing: `mt-*`, `mb-*`, `ms-*`, `me-*`, `pt-*`, `pb-*`, `px-*`, `py-*`, `mx-auto`, `my-*`
- Display: `d-flex`, `d-none`, `d-block`, `d-grid`, `d-inline`, `d-inline-flex`, `d-inline-block`
- Colors: `text-*`, `bg-*` — all semantic colors (primary, secondary, success, danger, warning, info, light, dark, muted)
- Sizing: `w-25`, `w-50`, `w-75`, `w-100`, `h-25`, `h-50`, `h-75`, `h-100`, `mw-100`, `mh-100`
- Flexbox: `justify-content-*`, `align-items-*`, `align-self-*`, `flex-wrap`, `flex-nowrap`, `flex-grow-*`, `flex-shrink-*`
- Position: `position-static`, `position-relative`, `position-absolute`, `position-fixed`, `position-sticky`
- Overflow: `overflow-auto`, `overflow-hidden`, `overflow-scroll`, `overflow-visible`
- Opacity: `opacity-0`, `opacity-25`, `opacity-50`, `opacity-75`, `opacity-100`
- Visibility: `visible`, `invisible`
- Z-index: `z-0` through `z-3`
- Cursor: `cursor-pointer`, `cursor-default`, `cursor-not-allowed`, `cursor-wait`
- Shadows: `shadow-none`, `shadow-sm`, `shadow`, `shadow-lg`
- Transitions: `transition`, `transition-fast`, `transition-slow`, `transition-none`
- Easing: `ease-in`, `ease-out`, `ease-in-out`, `ease-linear`
- Arbitrary values: `mt-[24px]`, `bg-[#ff0000]`, `w-[347px]`, `transition-[background-color_0.3s_ease]`
- Important variants: `!mt-0`, `!d-none`, `!p-0`
- Breakpoint variants on all utilities: `col-md-6`, `d-lg-none`, `mt-xl-4`, `px-xxl-5`

### Theming
- Three built-in themes: `light` (default), `dark`, `dim` — applied via `data-st-theme` on `<html>`
- Automatic system preference detection via `prefers-color-scheme` — no configuration needed
- Unlimited custom themes via CSS custom properties: `[data-st-theme="brand"] { --st-primary: #7c3aed }`
- All `--st-*` custom properties fully overridable in `:root` or any selector
- Smooth theme transitions — all elements animate when the theme attribute changes

### State Management
- `data-st-visible="true|false"` — fade + translateY transition for show/hide
- `data-st-collapsed="true|false"` — smooth `max-height` expand/collapse
- `data-st-loading="true|false"` — opacity reduction + pointer-events disabled
- `data-st-disabled="true|false"` — opacity reduction + `cursor: not-allowed`
- `data-st-theme="light|dark|dim|custom"` — live theme switching

### Build System
- PostCSS plugin with O(1) class registry — 1065 pre-computed entries, zero linear scanning
- Multi-layer caching: dirty flag, file mtime, glob hash, config hash, output string cache
- CSS `@layer` hierarchy: `st-base` → `st-components` → `st-utilities` — breakpoint order guaranteed, HTML class order irrelevant
- Bootstrap-style breakpoints: xs (0px), sm (576px), md (768px), lg (992px), xl (1200px), xxl (1400px)
- Custom breakpoints via `strata.config.js` `theme.breakpoints`
- `prefers-reduced-motion` respected automatically — no configuration needed
- CLI: `strata init` (scaffold), `strata --watch` (development), `strata --build` (production), `strata --minify` (minified production)

### Performance (vs Tailwind CSS 3 in watch mode)
- Cold build: 1.89ms avg vs 7.21ms — 3.8× faster
- Warm rebuild: 0.14ms avg vs 2.70ms — 19× faster
- Warm p95: 0.23ms vs 6.12ms — 26× faster

Reproduce via `npm run benchmark`.
