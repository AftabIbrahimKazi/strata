---
name: 3d-web-integration
description: Wire a three.js scene into a web page correctly — CSS stacking as a page backdrop, Next.js SSR/dynamic-import rules, scroll-driven state, cleanup. Trigger when mounting a 3D canvas in a React/Next.js page, making it a fixed background, or debugging why page content or the canvas layers wrong.
---

# 3D Web Integration

A correct three.js scene can still be invisible, block clicks, or crash the build — because the *page* around it is wrong, not the 3D code. This is where 3D bugs stop being 3D bugs and become ordinary web bugs that happen to involve a canvas.

## Part 1 — What not to do (symptom → rule)

| Symptom | Rule you broke |
|---|---|
| A fixed, low-z-index 3D canvas is supposed to show through page sections with no explicit background, but doesn't — solid color where the canvas should be | The section's "opaque" look was never really its own background — it was relying on `<body>`'s background being propagated to the page's outermost canvas paint (this happens whenever `<html>` has no explicit background declared). That propagated paint sits **even below** a `z-index: -1` fixed element. Any section that must visibly cover a background 3D layer needs its **own** explicit background class — don't rely on inherited/propagated body color. |
| `next/dynamic(..., { ssr: false })` throws or is rejected | In current Next.js, `ssr: false` is only valid inside a Client Component (`"use client"`) — it can't be called from a Server Component's `dynamic()`. Move the dynamic import into a small client wrapper component. |
| The 3D canvas intercepts clicks meant for page content, or vice versa | Stacking order and pointer events weren't both considered. A `position: fixed` element always creates a stacking context; ordering among same-z-index fixed/positioned siblings follows DOM order — put the backdrop canvas first in markup and give real content plain `z-index: auto`/no special z-index, rather than fighting it with `pointer-events` hacks. |
| Scroll-driven camera state (progress 0→1) is jumpy, or breaks when the page layout changes | Progress computed from a magic number (a hardcoded pixel scroll range) instead of measuring the actual scroll-track element's `getBoundingClientRect()` against `window.innerHeight` each frame/scroll event. Always derive scroll progress from real, current layout, never a constant. |
| Memory grows / GPU context warnings after navigating away and back to a page with a 3D scene | Missing cleanup in the component's unmount path — every `WebGLRenderer`, added light/mesh's geometry+material, and any compositor/PMREM render targets must be explicitly `.dispose()`d; removing the DOM canvas node alone doesn't free GPU resources. |
| A theme-observing scene doesn't react when a user toggles UI theme via a settings button (only works when set via URL/localStorage on load) | Only read the theme attribute once, at mount. Use a `MutationObserver` on the attribute (and a `matchMedia` listener for system-preference fallback) so runtime toggles are caught, not just the initial value. |

**Exception:** a genuinely standalone 3D demo page (no surrounding site chrome to layer against) doesn't need the backdrop-stacking discipline — those rules are specifically for "3D scene behind real page content."

## Part 2 — Secret sauce

- **Fixed backdrop pattern:**
  ```jsx
  <div className="position-fixed inset-0 z-n1" aria-hidden="true">{/* canvas mounts here */}</div>
  <div ref={trackRef} className="position-relative h-[220vh]"> {/* scroll-distance spacer, drives progress */}
    <div className="position-sticky sticky-top vh-100"> {/* pinned foreground content */}</div>
  </div>
  ```
  Keep the scroll-track spacer and the fixed backdrop as siblings — the backdrop doesn't need to be inside the spacer to stay pinned; `position: fixed` already ignores ancestor scroll.
- **Scroll progress, measured not guessed:**
  ```js
  const rect = trackRef.current.getBoundingClientRect();
  const total = rect.height - window.innerHeight;
  const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
  ```
- **Text over a variable-brightness 3D backdrop needs its own scrim**, not a fixed light/dark text color — a backdrop that ranges from bright day to black night will make a single hardcoded text color unreadable at one end no matter which you pick.
- **Give every section that must cover the backdrop an explicit background class**, even one that visually matches the page's default — don't assume "no background set" means "opaque page color," see Part 1.

## Verify

Per `3d-scene-verification`: confirm the canvas's `getBoundingClientRect()` is byte-identical before and after scrolling (proves it's really fixed, not just visually appearing so at one scroll position), and screenshot every section below the hero to confirm the backdrop is actually covered where it should be.
