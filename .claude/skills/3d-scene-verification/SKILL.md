---
name: 3d-scene-verification
description: Prove a 3D/WebGL scene actually looks right by driving a real browser and looking at real pixels — not by reasoning about the code. Trigger after any change to a three.js scene's lighting, camera, post-processing, assets, or web integration, before reporting it as done.
---

# 3D Scene Verification

Every other 3D skill in this set is a list of things that go wrong invisibly to the code but not to the eye. A three.js scene's real surface is **pixels a browser actually painted**, not the values you set. This skill is why the other five are trustworthy — every rule in them was confirmed broken, then confirmed fixed, this way.

## Part 1 — What not to do

| Symptom | Rule you broke |
|---|---|
| "It should work" reported without a screenshot | Reasoning about three.js state (uniforms, camera position, scene graph) proves the *code ran*, not that the *render looks right*. A scene can have correct-looking values and a broken/blank/wrong-looking frame — always render and look. |
| A blank/broken-looking screenshot taken right after navigation is reported as a bug | Large GLBs and a first environment bake genuinely take 10–20s cold (dev server compile + multi-MB parse + PMREM render). Wait long enough before judging — re-check with a longer wait before concluding something is actually broken. |
| A theme/state change is verified by directly setting an attribute (`setAttribute('data-theme', ...)`), never by clicking the real UI control | This proves the *rendering* reacts to state, not that the *toggle* correctly reaches that state. Both need checking — dispatch real `Input.dispatchMouseEvent` clicks on the actual control at least once. |
| Console output only checked for `type: 'error'` | Real breakage sometimes only shows as a warning (a WebGL shader compile warning, a deprecation notice masking a real problem) or an uncaught exception with no console.error call at all. Capture `Runtime.consoleAPICalled` (all types) and `Runtime.exceptionThrown` both. |
| A verification browser process is torn down with a broad `taskkill /IM chrome.exe` (or equivalent kill-by-name) | This kills **every** Chrome process on the machine, including the user's real browser windows and unsaved tabs. Always close the specific headless instance you launched — track its PID, or send `Browser.close` over its own CDP WebSocket connection. Never kill by process name. |
| A library is declared broken and abandoned because an effect looked wrong "regardless of the parameters" | Bisecting *within* one library only ever proves that library didn't produce the frame you wanted — never that the library is at fault. Before writing off a dependency, **reproduce the same symptom with a second, independent implementation of the same thing** (the stock/reference implementation is usually one import away). If both fail identically, the bug is in your parameters, units or colour space, and swapping libraries would have cost a rewrite and fixed nothing. This is not hypothetical: a project abandoned its own post-processing package over a "washes the frame into flat haze regardless of pass parameters" verdict that turned out to be an HDR threshold units mistake reproducible in every implementation — the rewrite onto the "known-good" library reproduced the identical haze on the first run. Record such a verdict as "these settings, on this scene, look wrong", and re-test it before it hardens into a standing decision. |
| Scripted scroll + screenshot shows two states blended together, or overlay state that contradicts the scroll position | The page has `scroll-behavior: smooth`, so `window.scrollTo(x, y)` *animates* — a scripted "scroll then wait then shoot" lands mid-flight, and on a long scroll track the animation outlasts a generous settle. Every screenshot and DOM probe then captures a transition frame, which reads exactly like a real cross-fade/state bug and sends you debugging code that was fine. Always scroll with `window.scrollTo({ top, behavior: 'instant' })` in verification, and confirm the landing position (`getBoundingClientRect().top`) rather than assuming the scroll took. |
| A texture/material problem is tuned repeatedly without ever isolating the term you're tuning | Procedural material graphs stack many contributions, and a term that contributes *nothing* looks identical to one that's merely too weak — so tuning it produces no change and you conclude it needs more, forever. Cut the graph down to the single suspect term (that channel alone into base colour, no bump, no mixes), render, and look. One isolation render answers "is this term reaching the surface at all", which no amount of parameter tuning can. Bounded-vs-unbounded is the usual culprit when a term *does* arrive but swamps everything: fractal/multifractal generators are typically unbounded, so clamp before using one as a 0–1 modulator. |
| A fixed/backdrop element's position is "verified" by eyeballing a screenshot | Eyeballing can't distinguish "looks the same because nothing moved" from "looks the same because it's coincidentally identical right now." Measure: `getBoundingClientRect()` before and after the state change (scroll, resize, theme), and diff the numbers. |

## Part 2 — Secret sauce (the actual workflow)

This project has no Playwright/Puppeteer — Chrome + raw CDP over Node's built-in `WebSocket` is enough:

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --headless=new --disable-gpu --remote-debugging-port=9222 \
  --user-data-dir=<scratch>/chrome-profile --no-first-run --window-size=1400,1000 about:blank &
```

Minimal CDP client: connect to `webSocketDebuggerUrl` from `GET :9222/json/list`, send `{id, method, params}` over the WebSocket, resolve on the matching `id` in the response. `Runtime.evaluate` (with `returnByValue: true`) + `Page.captureScreenshot` + `Input.dispatchMouseEvent` cover nearly everything needed.

- **Debug hooks are temporary.** A `window.__heroDebug = {...}` assignment to inspect internal state (mesh counts, bounding boxes, uniform values) is legitimate and fast — but remove it once the finding is confirmed, before calling the work done. Leaving debug globals in shipped code is a real regression, not a style nit.
- **Check both ends of any animated range**, not just the resting/default state (ties to `3d-camera-framing`) — a bug at `progress=1` is invisible if you only ever screenshot `progress=0`.
- **Clear `localStorage` + re-navigate (not just remove an attribute) when testing a "fresh load" state** — a mounted React component's state was already set from whatever was in storage at mount time; clearing storage afterward doesn't retroactively fix already-read state.
- **Shut down verification browsers precisely:**
  ```js
  // Preferred: over the browser's own CDP connection
  fetch('http://localhost:9222/json/version').then(r => r.json()).then(({webSocketDebuggerUrl}) => {
    const ws = new WebSocket(webSocketDebuggerUrl);
    ws.onopen = () => ws.send(JSON.stringify({id: 1, method: 'Browser.close'}));
  });
  ```
  Confirm it actually closed (`curl -o /dev/null -w "%{http_code}" :9222/json/version` should fail/refuse) rather than assuming the close call worked.

## When this skill is "done"

Never report a 3D change as complete on code review alone. Minimum bar: one screenshot per meaningful state (each theme, each end of an animated range, before/after a fix), zero unexplained console messages, and — if a prior bug is being re-verified — the specific symptom that was reported is visibly absent, not just "no errors."
