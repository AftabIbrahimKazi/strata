# Contributing to Strata CSS

Thank you for your interest in contributing. Strata is open source and welcomes contributions of all kinds — bug fixes, new components, utility classes, documentation improvements, or performance work.

---

## Versioning Rules

Strata uses a modified semantic versioning scheme: `MAJOR.FEATURE.BUGFIX`

### What each number means

```
1 . 2 . 6
│   │   └── Cumulative bugs fixed since this MAJOR era began
│   └─────── Cumulative feature releases since this MAJOR era began
└─────────── Design era — changes only on fundamental redesign
```

### MAJOR — era change (resets FEATURE and BUGFIX to 0)

Bumped only when something changes that **requires every user to manually update their codebase**. Examples:
- CSS layer structure renamed or reordered
- Core design tokens renamed (e.g. `--st-primary` → `--st-brand`)
- Scanner or build API breaking changes
- Class naming convention changed

When MAJOR bumps, all packages (`@strata-css/forms`, `@strata-css/picker` etc.) also release a new MAJOR build even if their own code is unchanged — the MAJOR bump is the compatibility contract.

A `MIGRATION.md` file is **required** before any MAJOR release ships. No migration doc = no MAJOR bump.

### FEATURE — new capabilities (never resets within a MAJOR era)

Bumped once per release that ships new functionality:
- New utility classes or component classes
- New options on existing APIs
- New packages (`@strata-css/picker` etc.)
- New CSS variables or tokens

Never resets between FEATURE releases in the same era. `1.5.x` means 5 feature releases have shipped in era 1.

### BUGFIX — cumulative quality count (never resets within a MAJOR era)

Bumped once per bug fixed. Never resets mid-era.

`1.3.6` means: era 1, 3 feature releases, 6 total bugs fixed. The BUGFIX number tells you the quality history at a glance.

### Examples

```
1.0.0   Initial release of era 1
1.1.0   First feature set shipped (BUGFIX stays at 0)
1.1.1   Bug fixed (total bugs this era: 1)
1.1.2   Another bug fixed (total: 2)
1.2.2   New features shipped (FEATURE → 2, BUGFIX stays at 2)
1.2.3   Bug fixed (total: 3)
1.3.3   More features (FEATURE → 3, BUGFIX stays at 3)
2.0.0   Major redesign — both counters reset
2.1.0   First features in era 2
```

---

## Pre-release Tags

Pre-releases are tied to branches in the pipeline.

| Branch | Version format | npm tag | GitHub label |
|---|---|---|---|
| `dev` | `1.2.3-dev.1` | `--tag dev` | Pre-release |
| `test` | `1.2.3-test.1` | `--tag test` | Pre-release |
| `beta` | `1.2.3-beta.1` | `--tag beta` | Pre-release |
| `main` | `1.2.3` | `--tag latest` | Latest release |

Users install specific stages:
```bash
npm install strata-css          # stable (latest)
npm install strata-css@beta     # beta
npm install strata-css@dev      # dev
```

---

## Package Versioning Policy

Each package (`@strata-css/forms`, `@strata-css/picker` etc.) versions **independently** between MAJOR releases:

```
strata-css          1.1.0  →  1.2.0  →  1.3.6
@strata-css/forms   1.0.0  →  1.1.3  →  (unchanged)
@strata-css/picker  1.0.0  →           →  1.1.0
```

Packages only move when they have their own changes. They do **not** bump just because core bumped a FEATURE or BUGFIX version.

**Exception — MAJOR bumps:** When `strata-css` releases `2.0.0`, every package releases a `2.0.0` build (even if unchanged) to update the peer dependency range:

```json
"peerDependencies": {
  "strata-css": ">=1.0.0 <2.0.0"
}
```

This range is the compatibility contract — any `1.x.x` package works with any `1.x.x` core.

---

## Branch Pipeline

All code flows through branches in order. **Never push directly to `main`.**

```
feature/fix branch → dev → test → beta → main
```

### Rules

1. All work starts on a feature or fix branch off `dev`
2. PR into `dev` — build must pass
3. Merge `dev` → `test` — run build verify
4. Merge `test` → `beta` — final check before release
5. PR `beta` → `main` — requires review
6. After merge to `main`: tag the version and publish to npm

### Build check at each stage

```bash
node bin/strata.js --build
```

---

## Commit Message Format

Commit prefix drives which number bumps:

| Prefix | Version impact | Example |
|---|---|---|
| `feat:` | FEATURE++ | `feat(select): add autoWidth option` |
| `fix:` | BUGFIX++ | `fix(picker): correct scroll offset` |
| `docs:` | none | `docs: update CONTRIBUTING.md` |
| `refactor:` | none | `refactor(registry): simplify spacing loop` |
| `test:` | none | `test: add picker debug example` |
| `chore:` | none | `chore: update dependencies` |
| `BREAKING:` | MAJOR++ | `BREAKING: rename --st-primary tokens` |

---

## Publishing Checklist

Before publishing to npm:

- [ ] `package.json` version updated correctly under `MAJOR.FEATURE.BUGFIX` rules
- [ ] `CHANGELOG.md` entry written
- [ ] Build passes on all branches in pipeline order
- [ ] PR merged to `main`
- [ ] Git tag created: `git tag v1.2.3 && git push origin v1.2.3`
- [ ] `npm publish --tag latest` (stable) or `--tag beta` (pre-release)

For MAJOR releases, additionally:
- [ ] `MIGRATION.md` written and committed
- [ ] All packages have `MAJOR.0.0` builds ready
- [ ] Deprecation notice shipped in previous MINOR release
