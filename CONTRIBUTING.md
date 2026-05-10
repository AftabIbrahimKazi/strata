# Contributing to Strata CSS

Thank you for your interest in contributing. Strata is open source and welcomes contributions of all kinds — bug fixes, new components, utility classes, documentation improvements, or performance work.

---

## Before You Start

Read the [design document](STRATA-DESIGN-DOCUMENT.md) before making any architectural changes. It is the single source of truth for Strata's design decisions and core philosophy. Any contribution that conflicts with the core principles will not be merged.

---

## Core Principles — Non-Negotiable

These principles must be respected in every contribution:

- No `!important` anywhere in framework generated CSS
- No inline CSS
- No inline scripting
- Custom CSS must remain fully compatible and always win via `@layer`
- Scanner never reads CSS files — only HTML, JSX, TSX, Vue, Astro, Svelte
- State management via `data-st-*` attributes only

---

## Project Structure

```
strata/
  src/
    index.js          — PostCSS plugin entry point
    scanner/
      scanner.js      — File scanner (never reads CSS)
    registry/
      registry.js     — O(1) class registry (pre-computed Map)
      breakpoints.js  — Breakpoint definitions and media query helpers
    generator/
      generator.js    — CSS string generator
    layers/
      base.js         — CSS variables, normalize, theme system, transitions
  bin/
    strata.js         — CLI
  tests/
    src/              — Test HTML files
    strata.config.js  — Test configuration
    strata.css        — Test entry point
  README.md
  CONTRIBUTING.md
  CHANGELOG.md
  LICENSE
```

---

## Adding a New Component

1. Open `src/registry/registry.js`
2. Add pre-computed entries to `EXACT_MAP` using the `reg()` helper:

```js
reg('btn-primary', 'components', `.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 0.75rem;
  background-color: var(--st-primary);
  color: #ffffff;
  border-radius: var(--st-border-radius);
  cursor: pointer;
  transition-property: color, background-color, border-color, box-shadow;
  transition-duration: var(--st-duration, 200ms);
  transition-timing-function: var(--st-easing, cubic-bezier(0.4, 0, 0.2, 1));
}

.btn-primary:hover {
  background-color: var(--st-primary-hover);
}

.btn-primary:focus-visible {
  box-shadow: var(--st-focus-ring);
}

.btn-primary:active {
  transform: scale(0.98);
}`)
```

3. Components must:
   - Use `--st-` CSS variables for all colours, spacing, radius
   - Include hover, focus-visible and active states
   - Include transition via `var(--st-duration)` and `var(--st-easing)`
   - Never use `!important`

---

## Adding a New Utility

For utilities with fixed values add to the pre-computed section:

```js
// Simple fixed utility
reg('text-nowrap', 'utilities', '.text-nowrap { white-space: nowrap; }')

// Utility with scale values
;['sm','md','lg'].forEach(size => {
  const map = { sm: '0.875rem', md: '1rem', lg: '1.25rem' }
  reg(`font-${size}`, 'utilities', `.font-${size} { font-size: ${map[size]}; }`)
})
```

For utilities that support arbitrary values add to `ARBITRARY_PATTERNS`:

```js
{
  re: /^(!?)font-size-\[(.+)\]$/,
  fn: (m) => {
    const i = m[1] ? ' !important' : ''
    return { layer: 'utilities', css: `.${escapeClass(m[0])} { font-size: ${m[2]}${i}; }` }
  }
}
```

---

## Adding to the Base Layer

The base layer (`src/layers/base.js`) contains CSS variables, normalize styles, theme definitions, and transition defaults. Add to it carefully — everything here ships on every project that uses Strata.

Rules for base layer contributions:
- CSS variables must follow the `--st-` prefix
- New theme variables must be defined in all three themes: light, dark, dim
- No component-specific styles in the base layer
- No `!important`

---

## Running Tests

```bash
npm run build
```

Check that the output CSS is generated correctly and contains the classes you expect.

---

## Performance Rules

Strata is performance-critical. Every change to the build pipeline must maintain or improve speed.

- New pre-computed entries in `EXACT_MAP` are always faster than adding regex patterns
- Avoid adding to `ARBITRARY_PATTERNS` unless arbitrary values are genuinely needed
- Never add synchronous file I/O outside the scanner
- The dirty flag and output cache must remain intact

---

## Pull Request Guidelines

- One feature or fix per PR
- Update `CHANGELOG.md` with your changes under a new version heading
- Update `README.md` if you are adding new classes or features
- Add an example to `examples/index.html` for any new component or utility
- Run `npm run build` and confirm it succeeds before submitting

---

## Code Style

- Single quotes for strings
- 2 space indentation
- Comments above each logical section
- Function names are descriptive verbs — `scanFiles`, `loadConfig`, `generateAST`

---

## Reporting Bugs

Open an issue with:
- What you expected to happen
- What actually happened
- The class name or CSS that caused the issue
- Your `strata.config.js`
- Node.js version

---

## Questions

Open a GitHub Discussion for questions about architecture or design decisions before starting significant work. This avoids building something that conflicts with the framework's direction.
