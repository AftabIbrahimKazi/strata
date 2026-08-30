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

**Status:** Idea — candidates identified, queued behind CursorFX
**Value:** Several packages ship every feature to every consumer. A dashboard showing only bar charts still downloads pie, line and scatter geometry; a plain styled select still downloads search filtering and multi-select. Splitting each into a small core plus opt-in modules — the structure Swiper uses, and the one `@strata-packages/cursorfx` is built on — means a project ships only the parts it actually mounts.

`@strata-packages/cursorfx` establishes the pattern: a `<name>.js` engine holding
everything shared, one folder per module holding its own JS and (only if needed)
its own CSS, and no bundle — the entry file doubles as the single file Strata's
CLI resolves per package. `@strata-packages/shopmap` already arrived at a similar
shape independently, with `providers/`, `layers/` and `themes/` as separate
directories.

**Candidates, in priority order:**

| Package | Size | Seam already present |
|---|---|---|
| `chart` | 45 KB JS | `buildBarGroup` / `buildLineGroup` / `buildPieGroup` / `buildScatterGroup`, dispatched by one `buildChartGroup(type, …)` switch. Shared core is scene setup, grid lines, text sprites, token reading, tooltip. Ships no CSS, so there is no stylesheet split to design. |
| `flipbook` | 46 KB JS + 35 KB CSS | Optional features already gated on option flags — `sound`, `pagination`, `drag`, `exportable` — plus three CDN loaders (`pdfjsUrl`, `pdfLibUrl`, `pdfjsWorkerUrl`). Largest total win, and the only candidate with enough CSS for a per-module stylesheet split to matter. |
| `forms` | 59 KB JS | Largest single file in the repo. `searchable`, `multi`/`multiSelect`, `group` and `tags` are documented as distinct capabilities; the common case is a plain styled select that needs none of them. |
| `picker` | 38 KB JS | Weakest of the four. `date`/`time`/`datetime`/`month`/`year`/`range` look like modules but are more coupled — `datetime` is `date` + `time` composed, and `range` shares the calendar grid. Read the internals before committing; likely only worth a `date` + `time` core with `datetime` as composition. |

**Not candidates:** `modal` (4.5 KB), `offcanvas` (4.6 KB) and `skeleton-loader`
(8 KB) are too small and have no independent variants — splitting would add
files and import ceremony to save a few hundred bytes.

**Sequencing:** starts after CursorFX is finished. CursorFX could be restructured
freely because it is unpublished at 0.0.0; all four candidates are published, so
each split changes a public package shape. Plan to add module entry points
alongside the existing monolithic entry and keep the old one working, or take a
major version bump — decide per package before starting.
