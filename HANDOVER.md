# Session Handover

Last updated: 2026-09-02 (end of session)

## Read this first

**Nothing is pushed.** `dev` is **28 commits ahead of `main`** and 26 ahead of
`origin/dev`, all local. The instruction was explicit: do the documentation and
release preparation, then **stop before pushing**. Push, branch sync, tags,
GitHub releases and npm publish are the next session's first task, and were
deliberately left undone.

**Versions are bumped but unpublished:**

| Package | was | now | npm still serves |
|---|---|---|---|
| `strata-css` | 1.8.17 | **1.9.0** | 1.8.17 |
| `@strata-packages/cursorfx` | 0.2.0 | **0.2.1** | 0.2.0 |
| `@strata-packages/chart` | 1.1.2 | **1.1.3** | 1.1.2 |

`strata-css` gets a FEATURE bump for four `feat:` commits; the other two are
fixes only. Per CONTRIBUTING.md neither number resets mid-era, so BUGFIX simply
does not advance on a feature release.

**PR [#276](https://github.com/AftabIbrahimKazi/strata/pull/276) is still open**
(beta to main, cursorfx 0.2.0) and needs approval — GitHub forbids self-approval.

## The header bleed — SOLVED, and the old diagnosis was wrong

The bug that opened both sessions: during a LineWave run, scrolled page content
showed through the header band, then cleared when the wave settled.

**The previous handover's diagnosis was refuted.** It blamed `will-change` on the
wave element and proposed `isolation: isolate` on the header as the next lever.
Removing `will-change` could never have worked — **an animated transform is
composited whether or not the hint is present**, so the promotion it was blamed
for happens anyway. That is why the bug survived the "fix".

**Why it kept measuring clean:** `Page.captureScreenshot` forces a fresh raster
and therefore *hides* compositing artefacts. Every measurement taken with it
reported an intact header. `Page.startScreencast` delivers actual composited
frames and is the correct instrument. This is now recorded in
`.claude/skills/verify/SKILL.md`.

**The real mechanism:** the wave animates transform, opacity and a drop-shadow,
so Chrome composites it for the length of each run. It sat inside an element that
is `position: sticky` **and** carries its own transform (the show/hide translate).
Promoting a child there can leave the ancestor rasterised at bounds that do not
cover its own background.

**The fix that shipped:** the WaveRule was removed from the header entirely
(`d97a62d`). The header falls back to the `.navbar` component's own
`border-bottom`, which is what the wave replaced — and since LineWave is designed
to be indistinguishable from a border at rest, the header looks the same. An
earlier commit (`126094e`) promoted the header with `will-change: transform`
instead; that was sound but was a permanent workaround carried for one decorative
line, and removal was chosen. Every other WaveRule (Footer, DocsPrevNext, package
pages) sits on a static container and is untouched.

## What shipped this session

### strata-css 1.9.0

- **Lightning CSS is the default minifier**, cssnano the fallback, then
  unminified — a fixed cascade, never "whichever is smaller". Two new config
  keys, `minifier` and `targets`. The order is fixed because the two engines are
  not interchangeable on the *author's* CSS: given `.legacy { *zoom: 1 }`
  Lightning throws, or with `errorRecovery` drops the declaration, while cssnano
  preserves it. A recovered parse error is treated as a **failure**, because the
  smaller output is smaller precisely by deleting something of the author's.
- `strata init` recommends `lightningcss` and writes a `strata:minify` script.

### @strata-packages/cursorfx 0.2.1

- **Targets may carry `pointer-events: none`.** The engine hit-tested with
  `elementFromPoint`, which skips such elements, so a hit zone wide enough to
  point at had to stay hit-testable and therefore swallowed clicks. Now matched
  on geometry — but **only when the normal hit-test found nothing**, so it adds
  matches and never changes one.
- **LineWave ignored every theme token.** `line-wave.css` declared each knob's
  default on `[data-st-cfx-wave]` itself, and a property set on an element
  shadows the same property inherited from an ancestor — so an author's
  `:root { --st-cfx-wave-color }` could never reach it. Defaults now live in
  `var()` fallbacks at all 48 use sites. Reveal always did this correctly; the
  LineWave test asserted a *declaration* rather than a fallback, so the test
  written to catch this bug was pinning it in place.

### @strata-packages/chart 1.1.3

- **A top-level `class StrataChart` shadowed the public global.** The documented
  standalone entry point threw `TypeError: StrataChart.create is not a function`.
  Renamed to `ChartInstance`. Bundle users were unaffected because they reach it
  as `Strata.Chart`, a property access — which is why it survived earlier audits.

### Documentation and SEO

- README documents variants, aspect-ratio and the minifier cascade — none of
  which it mentioned at all — plus refreshed benchmarks.
- CHANGELOG cut to 1.9.0, split sections merged, chart fix recorded.
- **All nine package READMEs** got a docs-site deep link, an ecosystem
  cross-link table and (for flipbook, shopmap) an install command. Only one of
  nine previously linked to the docs site.
- **Docs site gained `/utilities/variants` and `/utilities/aspect-ratio`** —
  data-only additions to `content/utilities.json`, which drives the route,
  metadata, canonical, sidebar, sitemap and the safelist. All 60 classes listed
  were verified against the registry first.

## Benchmarks — re-measured

Same machine, same Node v24.12.0, same fixtures, same 100-run IQR methodology as
the 2026-08-04 run, so the comparison is like for like:

| Scenario | 2026-08-04 | now |
|---|---|---|
| Small (20 classes) | 1.80 ms | **0.39 ms** |
| Medium (105 classes) | 2.00 ms | **0.64 ms** |
| Large (487 classes) | 2.89 ms | **1.24 ms** |

## Start here next session

1. **Push and release.** `dev` to `test` to `beta` to `main`, tag `v1.9.0`,
   GitHub releases, then `npm publish` for strata-css, cursorfx and chart.
   PR #276 needs approval first.
2. **Two local-only states will break on `npm install`** in the docs site: the
   fixed `cursorfx.js` and `line-wave.css` were copied into its `node_modules`
   by hand. Its `package.json` now asks for `^0.2.1` and `^1.9.0`, so publishing
   resolves this permanently — until then, a docs-site build must use the repo's
   own `bin/strata.js`.
3. **Tomorrow's stated task:** update the portfolio site with these features.
   Explicitly deferred from today.

## Open — carried forward

- **`--st-light` / `--st-dark` are inconsistent across themes.** Under
  `[data-st-theme="dark"]`, `--st-light` stays `#f8f9fa` while `--st-dark`
  becomes `#adb5bd`, so both are light surfaces and `bg-light` + `text-dark` is
  about 1.9:1. `dim` inverts `--st-light` instead. Needs a decision, not more
  investigation.
- **`reg()` silently overwrites.** `text-white` and `text-black` are registered
  twice with different values; the later call wins. Harmless today, cheap to warn.
- **chart.js leaks four more top-level names** into global lexical scope
  (`SceneManager`, `ChartViewTransition`, `InteractionManager`, plus consts).
  None shadow a public API, so nothing is broken — but a consumer with their own
  top-level `class SceneManager` gets a hard `SyntaxError`. Fixing means moving
  everything inside the IIFE.
- **The docs site's `styles/strata.components.js` is tracked but is a build
  output** whose contents depend on where the build ran. It probably belongs in
  `.gitignore`; it has been reverted by hand several times.
- **The hover gate is unverified on real touch hardware.** Chrome's
  `Emulation.setEmulatedMedia` does not honour the `hover` feature. Needs a phone.
- **`CursorMorph` still interpolates in JS** — the last preset doing per-frame
  style writes.
- Search Console / Bing verification (needs the account owner).

## Standing decisions — do not re-litigate

- **No `letter-spacing` utility, and no `lh-[…]` arbitrary form.** Both cascade
  into sibling and descendant alignment; damage lands far from where it was
  written. Line-height ships a closed named scale as the guardrail.
- **Variants are classes, not data attributes.** `data-st-hover="a b"` measured
  better but has dead zones — Shopify theme-editor class fields and Liquid
  filters like `link_to` accept a class string and nothing else.
- **Additive only.** A scanner or registry change may add matches; it may never
  reinterpret or remove an existing token.
- **Compression never decides correctness.** The minifier cascade is fixed
  order, not smallest-wins, for exactly this reason.
- "If something can be handled via CSS, rely on CSS — it costs less than JS."

## Verification

Read `.claude/skills/verify/SKILL.md` first. Traps that cost real time:
`captureScreenshot` hides compositing artefacts (use `startScreencast`);
`CSS.forcePseudoState` does not move `getComputedStyle` for rules inside a media
query, and every `hover:` rule is one; the default headless viewport is short; a
fixture outside the content globs is never scanned.

Suites at the end of this session, all green: **verify 413**, scanner 60,
**cursorfx 167**, components-bundle 16, dependency-tracking 12.
