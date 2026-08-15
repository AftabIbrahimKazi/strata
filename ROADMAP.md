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

### Flipbook: richer animation and native rendering

**Status:** Reserved in API — accepted but ignored (`renderer: '3d'`)
**Value:** The current flipbook covers the basics well but isn't top-notch yet. Coming versions aim for noticeably better animation quality and more native rendering options, starting with a true geometric page bend via Three.js/WebGL (`renderer: '3d'`) replacing the CSS cylindrical-shading illusion — public API stays identical.
