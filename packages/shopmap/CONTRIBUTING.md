# Contributing

## Setup

```bash
git clone https://github.com/AftabIbrahimKazi/strata.git
cd strata/packages/shopmap
npm install
npm run dev
```

## Tests

```bash
npm test
```

All tests must pass before opening a PR.

## Build

```bash
npm run build
```

Confirm `dist/shopmap.esm.js`, `dist/shopmap.cjs.js`, `dist/shopmap.umd.js`, `dist/shopmap.d.ts`, and `dist/cli/index.js` are all produced.

## Guidelines

- All new dependencies must be MIT licensed and approved before adding.
- No `!important` in CSS.
- No inline styles on user-facing elements — use scoped CSS injected via `<style>` tag.
- State changes use `data-*` attribute value changes, never adding or removing attributes.
- CSS tokens follow the `--map-*` → `--st-*` → `--bs-*` → default cascade.
- Write tests for any new public API.

## Branch pipeline

Same as the rest of the strata repo: feature → dev → test → beta → main. Never PR directly to main.
