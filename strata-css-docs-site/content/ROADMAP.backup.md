# Strata CSS — Roadmap

Planned and candidate features. Not commitments — items graduate to a milestone when work starts. See [CHANGELOG.md](CHANGELOG.md) for what has shipped.

---

## Candidate Features

### Critical CSS extraction (`critical` config option)

**Status:** Idea — researched, not started
**Value:** First-paint performance on first visit. Design details (fold detection, layer integrity, CSP support) are still in the planning stage.

The browser blocks painting until all `<head>` CSS is downloaded. On a first visit the user waits for the full `strata.output.css` even though painting the above-the-fold content (header, hero) needs only a few KB of it.

**Proposed behaviour:**

1. Build extracts the rules needed for each page's above-the-fold content.
2. Those rules are inlined into a `<style>` block in that page's `<head>` — zero network wait before first paint.
3. The full stylesheet loads non-blocking in the background (`rel="preload"` swap or `media` toggle pattern).

**Design questions to resolve:**

- How is "critical" determined per page — headless render of the viewport, or a developer marker (e.g. everything above a `<!-- st:fold -->` comment)?
- Config shape: `critical: true` global vs per-page globs.
- CSP compatibility: strict policies that ban inline styles need nonce/hash support on the injected `<style>` block.
- Layer integrity: inlined rules must preserve `@layer` order so the async-loaded full sheet doesn't shift the cascade.

**Standards note:** This is the approach Lighthouse/web.dev actively recommend ("inline critical styles and defer the rest"). Inline `<style>` blocks in `<head>` are fully spec-compliant — distinct from discouraged per-element `style=""` attributes.

---

### Lazy registry construction

**Status:** Idea — profiled, deferred until a real trigger
**Value:** Cold-build startup time.

All ~4,000 `reg()` calls execute at `require()` time (~40ms — the largest cold-build phase). Options: store generator functions in the Map and build CSS strings only on first lookup, or pre-serialize the finished Map at publish time.

**Trigger to start:** registry startup crossing ~150ms, or adoption in monorepos where the plugin loads in many processes. Not worth complexity at current scale (~70ms total cold build).

---

### Native browser popup primitives (`<dialog>`, Popover API)

**Status:** Idea — not started
**Value:** Modal, popover, and offcanvas packages currently roll their own show/hide, backdrop, and focus handling via `data-st-visible`/`data-st-backdrop` and custom JS. Browsers now ship this natively (`<dialog>`/`showModal()`, `::backdrop`, and the `popover`/`popovertarget` attributes) — adopting them means less JS to ship and better default accessibility, and covers the offcanvas slide-in-drawer case just as well as centered modals. Planned as a `@strata-packages/modal`, `@strata-packages/offcanvas`, and CSS update in the near future.

---

### Editor extension (IntelliSense for Strata classes)

**Status:** Idea — not started
**Value:** A free, local-only language server (à la PHP Intelephense) giving autocomplete, hover docs, and "this class doesn't exist" diagnostics for Strata class names in any editor via LSP — plus a compact machine-readable class manifest generated from the registry so AI assistants can look up real classes instead of guessing, hallucinating less and burning fewer tokens. Runs entirely on the user's machine; no hosted backend, no cost to ship or maintain beyond build time.

### Premade components showcase page

**Status:** Idea — not started
**Value:** A dedicated site section demonstrating ready-made component compositions — real UI patterns built from Strata utilities/components — so visitors can see what's possible and start from a finished example instead of primitives.

### Drag-and-drop component library

**Status:** Idea — not started
**Value:** A companion library of premade components that drop straight into a project, saving assembly time beyond copy-pasting individual classes. Builds on the showcase page's examples.

### Premade themes

**Status:** Idea — not started
**Value:** Ready-made visual themes for Strata projects — swappable token sets beyond the built-in light/dark/dim presets.
**Note (internal — not for public site):** Planned as a paid offering. Reminder to self: do not mention monetization on the marketing site's roadmap section; this line stays out of the `**Value:**` field on purpose so the public parser never surfaces it.

### Flipbook: richer animation and native rendering

**Status:** Reserved in API — accepted but ignored (`renderer: '3d'`)
**Value:** The current flipbook covers the basics well but isn't top-notch yet. Coming versions aim for noticeably better animation quality and more native rendering options, starting with a true geometric page bend via Three.js/WebGL (`renderer: '3d'`) replacing the CSS cylindrical-shading illusion — public API stays identical.

### Modular sub-packages for large components (the CursorFX pattern)

**Status:** Closed — built, measured, reverted. No package is a candidate.
**Value:** Investigated and closed. Splitting the large packages into a core plus opt-in modules was measured on both candidates and made them bigger, not smaller — the packages stay as single files.

`@strata-packages/cursorfx` establishes the pattern: a `<name>.js` engine holding
everything shared, one folder per module holding its own JS and (only if needed)
its own CSS, and no bundle — the entry file doubles as the single file Strata's
CLI resolves per package. `@strata-packages/shopmap` already arrived at a similar
shape independently, with `providers/`, `layers/` and `themes/` as separate
directories.

**Why this was tried, and what each attempt showed.**

Splitting CursorFX's canvas presets into `origin`/`motion`/`render` behaviours
made the package **bigger**, not smaller. Measured, gzipped: a Trail-only page
went 1.4 KB → 7.5 KB, all four canvas presets 5.7 KB → 12.3 KB; comments
stripped, 11.2 KB of code became 21.2 KB.

The reason is the distinction that decides whether any of these splits is worth
doing:

- **CursorFX was decomposition plus invention.** Its presets were already small
  (~2.8 KB each) and shared only ~700 bytes. Splitting them required *building
  an abstraction* — three axes, three emission modes, per-behaviour scopes, a
  recipe assembler. The pipeline cost more than the duplication it removed. It
  was still worth shipping, but for composability, not weight.
- **`chart` and `flipbook` both looked like the opposite case — subtraction
  along seams that already existed — and both failed anyway.** chart's type
  builders sat behind a switch; flipbook's features sat behind option flags.
  Neither needed a new abstraction *in principle*. In practice the shared core
  dominated, gzip had already collapsed the repetition, and flipbook's split
  still needed enough wiring to wipe out the saving. **Looking like a clean seam
  is not the test; measuring the shipped page is.**

**The rule: split where independent chunks already exist. Never invent an
abstraction to unify them.** If a split needs a new layer to hold it together,
price that layer first — it is usually larger than the duplication it removes.

**Measured on both candidates. Both failed. The entry is closed.**

| Package | Verdict | Measured, gzipped |
|---|---|---|
| `chart` | Ruled out before building | bar-only 9,632 B → **9,044 B** (−6%, 588 bytes). |
| `flipbook` | **Built, measured, reverted** | the split made the default path **+24% bigger** (10,589 → 13,147 B). Opt-in core-only saved just 6%. |

**`flipbook` is the important result, because the split was actually built and
it passed every functional test** — 25 assertions, core-only turned pages,
modules registered, absent modules warned and degraded, CDN URLs unchanged. It
was still wrong to ship:

- **Every existing consumer would pay 2,558 bytes so an opt-in consumer could
  save 683.** Comment-stripped, the default path grew 10% in real code.
- **`drag` could not be extracted.** It is the largest optional block (7.0 KB)
  but writes core's `turning` flag in three places and reads fifteen closure
  internals including `prepareFlipForward` / `onFlipDone`. Pulling it out would
  publish the flip state machine as a module contract. Excluding it dropped the
  ceiling to ~18% before a line was written.
- **The wiring ate two-thirds of what remained.** Three UMD wrappers, a resolver,
  per-module context objects, and getters for the two values core reassigns
  (`spreads`, `currentSpread`) cost more than the code they let you drop.

**The generalisable finding, now confirmed three times** (CursorFX, chart,
flipbook): *a clean-looking seam is not evidence of a worthwhile split.* All
three had real, obvious seams. In every case the shared core dominated, gzip had
already collapsed the repetition, and the plumbing needed to hold the split
together cost more than it saved. **Measure the realistic single-feature page,
gzipped, before writing anything — and price the wiring, not just the code you
plan to remove.**

One live bug found while doing this, worth remembering if flipbook is ever
refactored: core reassigns `spreads = computeSpreads(...)` after content loads,
so anything holding the original array reference silently sees an empty list
forever.

**Ruled out:**

- `flipbook` (46 KB JS + 35 KB CSS) — split built and reverted; see above.
- `chart` (45 KB JS) — 6% saving; the four type builders are only 16% of the
  file and gzip had already collapsed them into each other. If it is ever
  revisited, the *feature* seam is the one to measure, not the type seam:
  `ChartViewTransition` (3.4 KB), `InteractionManager` (5.3 KB) and the
  grid/sprite helpers (2.6 KB) are 25% of the file and already flag-gated,
  taking a static bar chart to 6,907 B (−28%). Not approved.
- `forms` (59 KB JS) and `picker` (38 KB JS) — no compelling reason to split.
  `picker` was always weakest: `datetime` is `date` + `time` composed and
  `range` shares the calendar grid.
- `modal` (4.6 KB), `offcanvas` (4.6 KB), `skeleton-loader` (8 KB) — too small.
- `shopmap` — largest by source (~93 KB per dist build) but already has the
  `providers/` / `layers/` / `themes/` shape this entry argued for.

**Nothing is sequenced — the entry is closed.** Reopen only with new
information, not with a fresh look at how clean a seam appears.

