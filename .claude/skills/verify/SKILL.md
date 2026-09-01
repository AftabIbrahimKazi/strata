---
name: verify
description: Build Strata and observe the emitted CSS in real headless Chrome — the only way to verify utilities, variants and states actually apply.
---

# Verifying Strata

Strata emits CSS. Its surface is **a browser rendering that CSS**, not the
registry. `lookup('hover:bg-primary')` returning a string proves the generator
ran; it does not prove the rule applies, wins the cascade, or fires in the right
state. Drive a browser.

## Build

```bash
node bin/strata.js --build          # writes dist/strata.output.css
```

`examples/**/*.html` is in the content globs, so any class you add to an example
is emitted on the next build. **A fixture outside those globs will not be
scanned** — its classes silently won't exist in the CSS, which looks exactly
like a broken feature. For an ad-hoc fixture, give it its own tiny project:

```bash
mkdir -p /tmp/fx/src && cd /tmp/fx
printf '@strata base;\n@strata components;\n@strata utilities;\n' > strata.css
printf 'module.exports={content:["./src/**/*.html"],input:"./strata.css",output:"./out.css"}\n' > strata.config.js
# put markup in src/, then:
node <repo>/bin/strata.js --build
```

## Drive a browser

Chrome is at `/c/Program Files/Google/Chrome/Application/chrome.exe`. There is
no Playwright or Puppeteer, and no `ws` — but Node 24 has a global `WebSocket`,
so CDP works with no dependencies.

```bash
chrome.exe --headless=new --disable-gpu --remote-debugging-port=9222 \
  --user-data-dir=<tmp>/chrome-profile --no-first-run --window-size=1400,1000 about:blank &
```

A minimal CDP client (connect, navigate, evaluate, force pseudo-state) is worth
keeping in your scratchpad; `Runtime.evaluate` + `getComputedStyle` is the whole
verification vocabulary.

## Traps that cost real time

- **`CSS.forcePseudoState` does not move `getComputedStyle`** for rules inside a
  media query — and `hover:` rules all are, because of the `@media (hover: hover)`
  gate. It produces confident false failures. **Dispatch real input instead:**
  `Input.dispatchMouseEvent` (`mouseMoved`, then `mousePressed`/`mouseReleased`
  for `:active`), `Input.dispatchKeyEvent` for Tab.
- **The default headless viewport is short.** `scrollIntoView` + centre-point
  clicks silently miss elements further down a long page. Set
  `Emulation.setDeviceMetricsOverride` to 1400x1000 first.
- **`Emulation.setEmulatedMedia` does not honour the `hover` feature** here —
  `matchMedia('(hover: hover)')` stays true. You cannot verify the touch-device
  hover gate this way. `prefers-reduced-motion`, `print` and viewport width all
  emulate correctly.
- **`document.styleSheets[].cssRules` throws** for a `file://` stylesheet on a
  `file://` page. Use `CSS.getMatchedStylesForNode` to ask which rules matched,
  with their `media` and `layer` — that is the authoritative answer when a rule
  looks like it should apply and doesn't.
- **Computed colour comes back as `color(srgb …)`** when the value went through
  `color-mix` (every `bg-*`/`text-*`/`border-*` colour does, for the opacity
  utilities). Match on the alpha component, not an `rgb()` string.
- **A released transition reads as `rgba(r, g, b, 0)`**, not `rgba(0, 0, 0, 0)`.
  Test transparency by alpha, not string equality.

## Check an example page does not defeat itself

An example's own `<style>` block is **unlayered**, so it beats every Strata
layer regardless of specificity. Demo scaffolding that sets `background`,
`text-align`, `display` or the `border` shorthand will silently neutralise the
very utility the row is demonstrating — the page renders correctly and proves
nothing. This has happened twice.

Cross-check with jsdom + postcss: for every element carrying a variant class,
compare the properties that utility sets against the properties any matching
demo rule declares. Both example pages currently pass.

## What to actually drive

- A state utility → get the element into that state with real input, read
  `getComputedStyle` before and after.
- A layout utility → compare `getBoundingClientRect()` ratios, not declarations.
- A breakpoint → `Emulation.setDeviceMetricsOverride` either side of the
  threshold and confirm it flips.
- The build warning → run the CLI **and** the PostCSS plugin path; they are
  separate call sites and one has been wired up without the other before.
