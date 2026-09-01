# Session Handover

Last updated: 2026-09-01 (end of session)

## Read this first

**Nothing is pushed.** Everything below is committed on local `dev` only — 10
commits ahead of `origin/dev`. The user's instruction was explicit: **do not
push, do not merge.** One new feature is pending and will be started in a fresh
session before any of this goes out.

**PR [#276](https://github.com/AftabIbrahimKazi/strata/pull/276) is open and
unmerged** (beta → main, cursorfx 0.2.0). It needs the user's approval — GitHub
forbids self-approval. `main` still carries cursorfx 0.1.1 while **npm already
serves 0.2.0**, so the branch lags the registry.

## Repo state

```
10 commits on dev, unpushed:
  fix(registry)  arbitrary breakpoint twins + zero-declaration warning
  docs(example)  breakpoint labels outside the bars
  feat(registry) aspect-* utilities, .ratio on aspect-ratio
  fix(scanner)   class: params + capital-C forwarded props
  feat(registry) variant system
  docs(example)  variants example rebuilt on one row pattern
  fix(example)   demo stylesheet no longer defeats its own utilities
  fix(example)   background variant paired with a text colour
  fix(example)   peer trigger made a real sibling
  + this session's leftovers (see below)
```

Suites: **413 assertions in `verify`**, scanner 60, components-bundle,
dependency-tracking, cursorfx 166 — all green. Output re-parsed with PostCSS
(969 rules) and driven in real headless Chrome.

---

## What shipped this session

### strata-css

1. **Breakpoint twins for every arbitrary family.** `w-[40%]` worked and
   `w-md-[40%]` silently emitted nothing; ~21 families had only the plain twin.
   Both are now generated from one `arbFamily()` declaration so a family cannot
   be half-registered.
2. **Zero-declaration build warning**, on the CLI *and* through PostCSS. Scoped
   to bracket syntax and variant colons — warning on every unmatched class would
   bury the signal under every BEM block on the page. It found `start-[33%]` in a
   shipped example within a minute of existing.
3. **`start-[…]` / `end-[…]`** added (named scale existed, arbitrary twin didn't).
4. **`aspect-*` utilities** + `.ratio` rebuilt on the real property, with the
   fill rule scoped to replaced elements so embeds still fill and overlays stop
   being stretched into ellipses.
5. **Scanner reads `class:` as well as `class=`**, and is case-insensitive.
   Two silent gaps: Liquid filter params (`link_to`, `image_tag`) and
   capital-C forwarded props (`wrapperClassName`) — the latter pre-existing, with
   a comment above it claiming the opposite.
6. **Variant system** — 45 states, 9 pseudo-elements, `group-*`/`peer-*`.
7. **`calc()`/`clamp()`/`min()`/`max()` in arbitrary values**, with underscores
   inside `var(--custom_prop)` protected.
8. **`bg-opacity-*` / `text-opacity-*` / `border-opacity-*` now actually work.**
   They set variables nothing read. Cost: +3,432 raw, **+163 gzipped**.

### cursorfx

- **LineWave `will-change` removed** — see [The header bleed](#the-header-bleed--fixed-not-confirmed).

---

## The header bleed — fixed, NOT confirmed

The bug the user opened the session with: during a LineWave run, the header band
showed page content through it. First seen on docs pages, later on the landing
page too.

**Diagnosis:** `[data-st-cfx-wave] > i` carried `will-change: transform, opacity`.
Promoting a layer inside a sticky, *already transformed* ancestor (`.navbar
.sticky-top` plus `.header-autohide`'s permanent transform) makes that ancestor
re-rasterise at bounds that don't cover its own background. The envelope
keyframe's `drop-shadow` expands the ink bounds further, and the element
deliberately overhangs its parent by half its 24px height.

**Fix:** the hint is removed. It bought nothing — `transform` and `opacity` are
composited regardless.

**⚠️ Unconfirmed.** I verified LineWave still animates correctly afterwards
(attribute flips, envelope + travel run, settles to `scaleY(0)`, `will-change:
auto`). I did **not** reproduce the artifact itself, because it needs the docs
site running and a paint-flashing pass. **Ask the user to confirm on the real
site before considering it closed.** If it persists, the next lever is the
header rather than the preset: give `.header-autohide` `isolation: isolate` so
it rasterises as one opaque layer.

---

## Two claims from the old handover that turned out to be WRONG

Do not act on these; they were investigated and refuted.

- **flipbook `spreads` reassignment is not a bug.** `spreads` is a closure `var`;
  every reader dereferences it at call time, and the only external access is
  `getSpreadCount()`, which reads `spreads.length` when called. The array is
  never handed out, so nothing can hold a stale reference.
- **`pointer-events` is not missing.** `pe-none` and `pe-auto` are registered and
  generate. The gaps doc row has been struck through with a correction.

---

## Open — needs the user's decision, not more investigation

- **`--st-light` / `--st-dark` are inconsistent across themes.** Under
  `[data-st-theme="dark"]`, `--st-light` stays `#f8f9fa` while `--st-dark`
  becomes `#adb5bd` — so both are light surfaces and `bg-light` + `text-dark` is
  about 1.9:1. `dim` inverts `--st-light` instead. Three readings (intentional
  Bootstrap-style fixed greys / a dark-theme oversight / both should adapt), each
  a visible change for anyone using those classes. **The user must pick.**
- **The hover gate is unverified on real touch hardware.** The rule carries
  `media=(hover: hover)` (confirmed via `CSS.getMatchedStylesForNode`), but
  Chrome's `Emulation.setEmulatedMedia` does not honour the `hover` feature, so
  suppression on a genuine touch device is untested. Needs a phone.

## Open — carried forward, untouched

- `strata-css` **1.8.18 unpublished** for the `button { color: inherit }` fix
  (`395e2ef` is on main but not in the published 1.8.17 tarball).
- The docs site was **never rebuilt** after the scanner change. Its scanned class
  list is byte-identical to baseline, but `npm run build` was not run.
- **`reg()` silently overwrites.** `text-white` and `text-black` are registered
  twice with different values and the later call wins. Harmless today, but it is
  a footgun — a duplicate-name warning would be cheap.
- Component reference pages never got the depth audit utilities/packages got.
- Search Console / Bing verification (needs the user's account).
- **`CursorMorph` still interpolates in JS** — the last preset doing per-frame
  style writes. LineWave is the worked example for converting it.

---

## Standing decisions — do not re-litigate

- **No `letter-spacing` utility, and no `lh-[…]` arbitrary form.** Deliberate:
  both cascade into sibling and descendant alignment, and an arbitrary value
  causes damage far from where it was written. Line-height ships a closed named
  scale (`lh-1/sm/base/lg` + breakpoints) as the guardrail. The benchmark's 52
  letter-spacing usages are evidence about one page, not a reason to reverse it.
- **Variants are classes, not data attributes.** `data-st-hover="a b"` measured
  better (constant atomic CSS, ~12% less gzipped HTML at six utilities per state)
  but has dead zones: Shopify theme-editor class fields and Liquid filters like
  `link_to` accept a class string and nothing else. `hover:[a b c]` is impossible
  anywhere — the HTML parser splits `class` on whitespace before CSS is consulted.
- **Additive only.** A scanner or registry change may add matches; it may never
  reinterpret or remove an existing token. This is why per-family underscore
  behaviour was preserved in the arbitrary-value work.
- The four-axis behaviour vocabulary must not reach ordinary users.
- "If something can be handled via CSS, rely on CSS — it costs less than JS."

---

## Verification — read `.claude/skills/verify/SKILL.md` first

New this session. Strata's surface is a browser rendering the emitted CSS, and
the registry returning a string proves nothing. The skill captures the CDP
harness (Chrome is installed; Node 24's global `WebSocket` means no deps needed)
and the traps that cost real time:

- `CSS.forcePseudoState` does **not** move `getComputedStyle` for rules inside a
  media query — and every `hover:` rule is. It produces confident false
  failures. Dispatch real input instead.
- The default headless viewport is short; centre-point clicks miss elements
  further down the page. Override device metrics to 1400x1000 first.
- A fixture outside the content globs is never scanned, which looks exactly like
  a broken feature.
- An example's own `<style>` block is unlayered and will silently defeat the
  utilities it demonstrates. This happened twice this session.

---

## Start here next session

1. **The pending new feature** — the user has one in mind and will name it.
   Nothing is to be pushed before it lands.
2. Ask whether the header bleed is actually gone on the docs site.
3. Get a decision on `--st-light` / `--st-dark`.
4. Then, when the user says so: push `dev`, and get PR #276 approved and merged.
