# Session Handover

Last updated: 2026-08-12

## Repo state (verified at time of writing)

- **All 4 branches — `main`, `dev`, `test`, `beta` — point at the identical commit**, `package.json` at `1.8.15`. Confirmed via `git rev-parse` on all four, not just "should be in sync." npm has `strata-css@1.8.15` published and live, and GitHub has a matching `v1.8.15` tag + Release marked Latest. Tags/releases/npm/all branches are fully aligned as of this writing.
- **Only 4 branches exist on GitHub: `main`, `dev`, `test`, `beta`.** No feature/fix branches — ever, not even short-lived ones. Work commits directly onto `dev`; promotion is `dev → test → beta → main` via PR. The one standing exception is a short-lived branch for something that must go straight to `main` (protected branch, PR required even for a single maintainer) — used this session for `security/nanoid-override` and `release/1.8.15`, both deleted immediately after merge. Don't generalize this into routine feature branches.
- **Important gotcha learned this session: promotion only flows one direction.** Anything committed straight to `main` (the exception above) does NOT automatically propagate back down to `dev`/`test`/`beta` — it has to be explicitly merged back down, or those branches silently drift behind `main` forever. This bit us: the nanoid fix and 1.8.15 version bump sat on `main` only, invisible from `dev`, until caught and fixed via `git merge origin/main --ff-only` on each lower branch. **Standing rule going forward: any direct-to-main commit must be merged back down to dev/test/beta in the same session, not left for later.**
- `beta` requires 1 approving review to merge, and GitHub blocks a PR's author from approving their own PR — since there's no second maintainer, promotions into `beta` need `--admin`/"merge without waiting for requirements" (bypass rules) each time. `main` requires 0 reviews but is still PR-protected — direct pushes are rejected (`GH006`).
- **Standing instruction: do not push/commit/publish without explicit go-ahead.** This session the user gave repeated explicit go-aheads per action — still confirm before each new category of action, don't treat one yes as blanket permission.
- `docs/index.html` carries a stray HTML comment (`<!-- rebuild trigger: ... -->`) left over from debugging the Pages outage below — cosmetic, harmless, could be cleaned up but not urgent, and will likely be replaced entirely once the real docs site (see Open Items) exists.
- User's local `.npmrc` had a stray malformed entry (`False=true`) causing an `Unknown user config "False"` warning on every npm command — removed. Their real auth token in the same file was left untouched (that's the correct place for it to live).

## What shipped in prior sessions (already live, see CHANGELOG.md)

1.6.13 → 1.8.14: className expression scanning, safelist implementation, glob cwd bug, extension allowlist → denylist, Dependabot fixes, scan diagnostics, npm-consumer component JS bug (components now resolve from `node_modules/@strata-packages/*` first).

GitHub/npm discoverability & SEO pass (previous session): brand mark artifact, GitHub Sponsors enabled, Discussions seeded with 6 categories + labels + starter posts, issue templates (PR #136), 31 GitHub Releases backfilled from CHANGELOG, GitHub Packages mirroring extended to all 9 `@strata-packages/*` (fixed missing `tslib` in shopmap along the way).

## What shipped this session

1. **Documentation audit** — full read-only audit (via subagent) across every README/CLAUDE.md/CHANGELOG/CONTRIBUTING/BRANCHING/ROADMAP file, root and all 8 packages, checked against `package.json`/git log and basic SEO hygiene. Fixed:
   - `README.md`: removed a stale "v1.4 — Current / v2.0 — Planned" roadmap block (contradicted both the real version and `ROADMAP.md`) — now links to `ROADMAP.md`. Fixed the `content` glob example (was missing `js,ts`). Fixed the "Creating a GitHub Release" command, which would have dumped the *entire* CHANGELOG history into every release's notes.
   - `BRANCHING.md` / `CONTRIBUTING.md`: removed references to a `feature/*` branch pipeline that hasn't been true in practice, and a documented `dev`/`test` npm dist-tag system that has no matching `publish:*` scripts.
   - `packages/offcanvas/README.md`, `packages/flipbook/README.md`: added npm/license badges and a License section to match the other 6 package READMEs.
   - Landed via PR #150/#151/#152. No npm republish needed — none of these ship in the tarball except root `README.md` (cosmetic staleness only).

2. **GitHub Pages was fully broken** — sidebar showed a red ✗. Root-caused in stages:
   - Two `pages-build-deployment` runs (2026-07-03/04) stuck `queued` for 900+ hours, leaving Pages API status at `errored`. Cancelled both.
   - A full pipeline push (PR #142/#143/#144) didn't retrigger a build — the Pages *deployment state* itself was wedged, not just the queue.
   - Reset via `DELETE` + `POST /repos/.../pages` — **mistake made here**: passed `build_type=workflow` explicitly, which switched Pages into "GitHub Actions" mode. This repo has no `actions/deploy-pages` workflow, so nothing could build — site went from `errored` to a hard `404`.
   - Fixed by having the user manually switch **Settings → Pages → Source** back to **"Deploy from a branch"** (`main` / `/docs`) — UI toggle worked where the API's `build_type` handling didn't.
   - Once in legacy mode, `POST /repos/.../pages/builds` worked immediately. Site confirmed **`status: built`, returns `200`**, live at https://aftabibrahimkazi.github.io/strata/.
   - **Lesson:** don't pass `build_type` explicitly when recreating a Pages config via API unless you've confirmed which mode was actually in use.

3. **Dependabot alert #19 (high severity) — nanoid** — `postcss` (real runtime dependency) pulled in `nanoid@3.3.16` (predictable-ID issue). Fixed via `overrides` (`nanoid: ^3.3.17`) in `package.json`, resolved to `3.3.18`, 0 vulnerabilities. Landed via `security/nanoid-override` → PR #148 → `main` directly (mirrors how Dependabot's own security PRs are handled here).
   - Needed a version bump to actually reach npm — bumped `1.8.14 → 1.8.15` (`release/1.8.15` → PR #149 → `main`), user ran `npm run publish:stable`. **Live on npm, confirmed.**
   - Publishing hit friction: npm required 2FA, account isn't TOTP-`--otp=`-based — resolved via a **Granular Access Token with "bypass 2FA"**, set through `npm config set //registry.npmjs.org/:_authToken=...`. Token still active on the user's machine — remind them to revoke if not publishing again soon.
   - **Also created the matching `v1.8.15` git tag + GitHub Release** (`gh tag` + `gh release create`) — the version bump PR alone doesn't do this automatically, easy to forget as a follow-up step.

4. **Dependency bumps (low-risk)** — postcss, cssnano, autoprefixer, vitest, three bumped to latest patch/minor across root + chart package. All 247 tests pass. Caught and reverted a real regression along the way: `npm install --workspace packages/chart three@latest` had silently rewritten chart's **peerDependency range** for `three` from permissive (`>=0.150.0`) to pinned (`^0.185.1`) — would have broken consumers on older `three` versions. Fixed before commit. Landed via PR #153/#154/#155.

5. **Branch drift caught and fixed** — see "Important gotcha" above. `dev`/`test`/`beta` had fallen behind `main` because the nanoid fix and version bump (both direct-to-main) never flowed back down. Resynced via `git merge origin/main --ff-only` on each branch; all 4 now point at the same commit.

## Security note — do not repeat

The user pasted a live npm token into chat **three separate times** this session, including after being told to revoke it. Never used by the assistant. Unconfirmed whether it was ever actually revoked — it was superseded by a different granular bypass-2FA token used for the 1.8.15 publish (also still active). **Confirm at the start of next session that both tokens have been revoked/rotated if no further publishing is planned.** (Token values deliberately omitted from this file — an earlier draft that included one verbatim was correctly rejected by GitHub's push protection.)

## Open items — not started, need the user's decision

### 1. Documentation website — newly discussed, not started

User intends to build a real docs site for Strata CSS (separate from the current `docs/index.html` placeholder). Clarified this session: **building/deploying it needs no npm coordination** — doesn't touch the published tarball, no version bump or republish required for docs work itself. The only future touchpoint is `package.json`'s `homepage` field (currently the placeholder Pages URL) — update it once the real site has a permanent home, and it can ride along with whatever the next real code release is rather than needing its own publish.

### 2. Upload the social preview image

Artifact is built; user needs to screenshot the 1280×640 frame (or use the in-page PNG export) and upload it at Settings → General → Social preview. Mark-only 512×512 transparent PNG proposed as `assets/brand/` for favicon/logo use — not committed to the repo yet.

### 3. Set the GitHub Pages website link

Pages is now actually working, but the repo's About section still has **no Website link** pointing at it. Given item 1 above, probably worth waiting until the real docs site replaces the placeholder rather than linking the placeholder now — ask the user which they'd prefer.

### 4. Socket security score — investigated fully, both real fixes DECLINED (unchanged)

Score sits at 77. Both candidate fixes (cssnano-preset-lite swap, removing chart/flipbook's CDN lazy-loader) were fully scoped and declined on the merits. **Do not re-propose either fix.**

### 5. Stale local branches

`fix/sync-pages-and-packages` — confirmed obsolete, recommended for deletion, still not done, user's call. `fix/bundle-components-from-node-modules` — also local-only, not on GitHub, left alone — ask before touching either.

### 6. Hashed CSS feature discussion — still unanswered

User asked about "hashed CSS" (filename cache-busting vs. class-name scoping like CSS Modules) several sessions ago. Never got an answer on which (or both) they actually want. Still pure discussion phase — no code until they answer.

### 7. Remaining outdated dependencies (bigger jumps, not urgent)

Low-risk patch/minor bumps were shipped this session (item 4 above). Still outstanding, needing individual scoping rather than a blanket bump: `@rollup/plugin-commonjs` 28→29, `@rollup/plugin-node-resolve` 15→16, `typescript` →7.x, `maplibre-gl` 4.7→6.3, `pmtiles` 3.2→4.5, `@types/node` →26.x (all in shopmap's tooling deps).

## Working notes for next session

- User's git/GitHub literacy is growing but still developing — confirm which mode (manual UI vs. delegated git commands) they want before assuming.
- User gets frustrated by extra branches or unrequested scope — stick strictly to the 4-branch rule; short-lived exceptions are only for protected-`main`-only changes, and **must be merged back down to dev/test/beta before the session ends** (see gotcha above).
- **Never accept credentials pasted into chat, even "temporary" ones — say so plainly and immediately, every time, no matter how many times it's dismissed.**
- When switching branches locally with uncommitted changes, stash first — git carries a dirty working tree across branches silently when there's no conflict, which caused an accidental cross-branch leak this session.
- Be careful with GitHub Pages API config — `build_type` is not safe to set explicitly without confirming the existing mode first; UI toggles are more reliable than API for this specific setting.
- After any direct-to-main commit (security fix, version bump, etc.), immediately check `git rev-list --left-right --count origin/main...origin/dev` (and test/beta) before ending the task — don't assume the pipeline stays in sync on its own.
