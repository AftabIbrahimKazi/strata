# Strata CSS — Roadmap

Planned and candidate features. Not commitments — items graduate to a milestone when work starts. See [CHANGELOG.md](CHANGELOG.md) for what has shipped.

---

## Candidate Features

### Critical CSS extraction (`critical` config option)

**Status:** Idea — researched, not started
**Value:** First-paint performance on first visit. A genuine differentiator — Tailwind has no built-in equivalent.

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

### `fs-*` named font-size scale

**Status:** Deferred (from BeautyBook findings)
**Value:** Bootstrap-parity `fs-1` through `fs-6` named classes. Arbitrary `fs-[...]` already shipped in 1.3.0.

---

### Flipbook 3D renderer (`renderer: '3d'`)

**Status:** Reserved in API — accepted but ignored
**Value:** True geometric page bend via Three.js/WebGL, replacing the CSS cylindrical-shading illusion. Public API stays identical.
