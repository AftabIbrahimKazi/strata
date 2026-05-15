# Branching Strategy

## Branch Structure
main   ← stable, npm @latest, sacred — no direct commits
beta   ← early access, npm @beta
test   ← internal QA and release candidate verification
dev    ← active development and feature integration

## Flow
feature/* → dev → test → beta → main

## Branch Rules
- Never commit directly to main, beta, or test
- All work starts as a feature branch cut from dev
- Feature branches are named: feature/, fix/, docs/, chore/
- Feature branches are deleted after merging

## npm Publishing
- Merging to main → run npm run publish:stable
- Merging to beta → run npm run publish:beta

## Version Naming
- Stable: 1.0.0, 1.1.0, 2.0.0
- Beta:   1.1.0-beta.1, 1.1.0-beta.2
