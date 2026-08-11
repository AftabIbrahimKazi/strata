# Branching Strategy

Only four branches exist, ever: `main`, `beta`, `test`, `dev`. No `feature/*`, `fix/*`, or other short-lived branches — work commits directly onto `dev`.

## Branch Structure
main   ← stable, npm @latest, sacred — no direct commits
beta   ← early access, npm @beta
test   ← internal QA and release candidate verification
dev    ← active development, work committed directly here

## Flow
dev → test → beta → main

## Branch Rules

- Never commit directly to main, beta, or test — promotion happens via PR from the branch below it in the pipeline
- All work is committed directly to dev
- `beta` requires 1 approving review to merge; `main` currently requires 0

## npm Publishing

`dev` and `test` are not published to npm — they're internal integration/QA stages only.
- Merging to main → run `npm run publish:stable`
- Merging to beta → run `npm run publish:beta`

## Version Naming
- Stable: 1.0.0, 1.1.0, 2.0.0
- Beta:   1.1.0-beta.1, 1.1.0-beta.2

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full versioning scheme (`MAJOR.FEATURE.BUGFIX`) and publishing checklist.
