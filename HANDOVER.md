# Session Handover

Last updated: 2026-08-12

## Repo state (verified at time of writing)

- `main` / `beta` / `test` / `dev` — all in sync, `package.json` at `1.8.15`. npm has `strata-css@1.8.15` published and live.
- **Only 4 branches exist on GitHub: `main`, `dev`, `test`, `beta`.** No feature/fix branches — ever, not even short-lived ones. Work commits directly onto `dev`; promotion is `dev → test → beta → main` via PR. The one standing exception is a short-lived branch for something that must go straight to `main` (protected branch, PR required even for a single maintainer) — used twice this session (`security/nanoid-override`, `release/1.8.15`), deleted immediately after merge. Don't generalize this into routine feature branches.
- `beta` requires 1 approving review to merge, and GitHub blocks a PR's author from approving their own PR — since there's no second maintainer, promotions into `beta` need `--admin`/"merge without waiting for requirements" (bypass rules) each time. `main` requires 0 reviews but is still PR-protected — direct pushes are rejected (`GH006`).
- **Standing instruction: do not push/commit/publish without explicit go-ahead.** This session the user gave repeated explicit go-aheads per action ("ok", "do it yourself") — still confirm before each new category of action, don't treat one yes as blanket permission.
- `docs/index.html` now carries a stray HTML comment (`<!-- rebuild trigger: ... -->`) left over from debugging the Pages outage below — cosmetic, harmless, could be cleaned up but not urgent.

## What shipped in prior sessions (already live, see CHANGELOG.md)

1.6.13 → 1.8.14: className expression scanning, safelist implementation, glob cwd bug, extension allowlist → denylist, Dependabot fixes, scan diagnostics, npm-consumer component JS bug (components now resolve from `node_modules/@strata-packages/*` first).

GitHub/npm discoverability & SEO pass (previous session): brand mark artifact, GitHub Sponsors enabled, Discussions seeded with 6 categories + labels + starter posts, issue templates (PR #136), 31 GitHub Releases backfilled from CHANGELOG, GitHub Packages mirroring extended to all 9 `@strata-packages/*` (fixed missing `tslib` in shopmap along the way).

## What shipped this session

1. **Documentation audit** — ran a full read-only audit (via subagent) across every README/CLAUDE.md/CHANGELOG/CONTRIBUTING/BRANCHING/ROADMAP file in the repo, root and all 8 packages, checking factual accuracy against `package.json`/git log and basic SEO hygiene. Findings and fixes:
   - `README.md`: removed a stale "v1.4 — Current / v2.0 — Planned" roadmap block that contradicted both the real version (was 1.8.14 at the time) and the dedicated `ROADMAP.md` — now just links to `ROADMAP.md`. Fixed the `content` glob example (was missing `js,ts`). Fixed the "Creating a GitHub Release" command, which would have dumped the *entire* CHANGELOG history into every release's notes via `--notes-file CHANGELOG.md`.
   - `BRANCHING.md` / `CONTRIBUTING.md`: both documented a `feature/*` branch pipeline that hasn't been true in practice for a while (see 4-branch rule above), and `CONTRIBUTING.md` additionally promised `dev`/`test` npm dist-tags (`--tag dev`, `--tag test`) that have no matching `publish:*` scripts in `package.json` — only `publish:stable` and `publish:beta` exist. Both docs corrected to match reality.
   - `packages/offcanvas/README.md`, `packages/flipbook/README.md`: added npm/license badges and a License section to match the other 6 package READMEs (chart, forms, modal, skeleton-loader, picker, shopmap already had them).
   - Landed via PR #150/#151/#152 through the full pipeline. **No npm republish needed or done** — none of these files ship in the `strata-css` tarball except root `README.md`, and that's cosmetic staleness only (no code changed).

2. **GitHub Pages was fully broken** — sidebar showed the `github-pages` deployment with a red ✗. Root-caused in stages:
   - Two `pages-build-deployment` Action runs (from 2026-07-03/04) were stuck `queued` for 900+ hours, leaving the Pages API status at `errored`. Cancelled both via API.
   - A push through the full pipeline (PR #142/#143/#144) didn't retrigger a build — turned out the underlying Pages *deployment state* itself was wedged, not just the queue.
   - Reset via `DELETE` + `POST /repos/.../pages` — **mistake made here**: the recreate call explicitly passed `build_type=workflow`, which switched Pages from the working "Deploy from a branch" (legacy) mode into "GitHub Actions" mode. This repo has no `actions/deploy-pages` workflow, so nothing could ever build in that mode — site went from `errored` to a hard `404`.
   - Fixed properly by having the user manually switch **Settings → Pages → Source** from "GitHub Actions" back to **"Deploy from a branch"** (`main` / `/docs`) — the API can set `source` but apparently can't reliably force `build_type` back to `legacy`; the UI toggle did it correctly (confirmed via `gh api repos/.../pages` afterward: `build_type: "legacy"`).
   - Once in legacy mode, `POST /repos/.../pages/builds` (the rebuild endpoint, which had 403'd earlier under `workflow` mode) worked immediately. Site is now **`status: built`, returns `200`**, confirmed live at https://aftabibrahimkazi.github.io/strata/.
   - **Lesson for next time:** don't pass `build_type` explicitly when recreating a Pages config via API unless you've confirmed which mode was actually in use — the API's reporting of `build_type` on the existing config isn't reliable enough to infer it silently.

3. **Dependabot alert #19 (high severity) — nanoid** — `postcss` (a real runtime dependency, not dev-only) pulled in `nanoid@3.3.16`, which has a predictable-ID-generation issue. Not a direct dependency, so fixed via an `overrides` entry (`nanoid: ^3.3.17`) in `package.json`, regenerated `package-lock.json` (resolved to `3.3.18`), `npm audit` now reports 0 vulnerabilities. Landed via short-lived branch `security/nanoid-override` → PR #148 → `main` directly (mirrors how Dependabot's own security PRs have always been handled in this repo — see `project_dependabot_targeting` memory).
   - **This needed a version bump to actually reach npm** — a `fix:` commit doesn't self-publish. Bumped `1.8.14 → 1.8.15` (`release/1.8.15` branch → PR #149 → `main`), then the user ran `npm run publish:stable` themselves. **`strata-css@1.8.15` is now live on npm** with the fix. Confirmed via `npm view strata-css version`.
   - Publishing hit real friction worth remembering: npm required 2FA (`E403`), and the account's 2FA method wasn't classic TOTP `--otp=` codes — resolved by generating a **Granular Access Token with "bypass 2FA" enabled**, set via `npm config set //registry.npmjs.org/:_authToken=...`. That token is still active on the user's machine as of this writing — remind them to revoke it if they don't plan to publish again soon.

## Security note — do not repeat

The user pasted a live npm token into chat **three separate times** during this session, including after being told to revoke it. It was never used by the assistant, but as far as this session's evidence shows, **it may never have actually been revoked** — it was superseded by a different (granular, bypass-2FA) token that was used successfully for the 1.8.15 publish, but the original one's status is unconfirmed. Flag this at the start of next session: confirm both the originally-pasted token and the granular token used for publishing have been revoked/rotated if no further publishing is planned. (The token value itself is deliberately omitted from this file — GitHub's push protection correctly rejected an earlier draft that included it verbatim.)

## Open items — not started, need the user's decision

### 1. Upload the social preview image

Artifact is built; user needs to screenshot the 1280×640 frame (or use the in-page PNG export) and upload it at Settings → General → Social preview. Mark-only 512×512 transparent PNG proposed as `assets/brand/` for favicon/logo use — not committed to the repo yet.

### 2. Set the GitHub Pages website link

Now that Pages is actually working (see above), the repo's About section still has **no Website link** pointing at it — quick, now-unblocked SEO win. User previously said they're planning a real docs site "anyway" — worth asking whether to link the current placeholder page now or wait.

### 3. Socket security score — investigated fully, both real fixes DECLINED (unchanged)

Score sits at 77. Both candidate fixes (cssnano-preset-lite swap, removing chart/flipbook's CDN lazy-loader) were fully scoped and declined on the merits. **Do not re-propose either fix.**

### 4. Stale local branches

`fix/sync-pages-and-packages` — confirmed obsolete, recommended for deletion, still not done, user's call. `fix/bundle-components-from-node-modules` — also local-only, not on GitHub, left alone — ask before touching either.

### 5. Hashed CSS feature discussion — still unanswered

User asked about "hashed CSS" (filename cache-busting vs. class-name scoping like CSS Modules) several sessions ago. Never got an answer on which (or both) they actually want. Still pure discussion phase — no code until they answer.

### 6. npm/config hygiene noticed but not investigated

Every `npm` command on the user's machine prints `npm warn Unknown user config "False"` — a malformed `.npmrc` entry somewhere (likely a stray boolean-as-string). Flagged to the user, not yet tracked down. Also `npm outdated` shows several packages behind (postcss, cssnano, autoprefixer, vitest — low-risk patch/minor bumps; rollup plugins, typescript, maplibre-gl, pmtiles in shopmap — bigger major-version jumps, not urgent). Not actioned this session.

## Working notes for next session

- User's git/GitHub literacy is growing but still developing — confirm which mode (manual UI vs. delegated git commands) they want before assuming.
- User gets frustrated by extra branches or unrequested scope — stick strictly to the 4-branch rule; the two short-lived exceptions this session were both for protected-`main`-only changes, not general-purpose feature work.
- **Never accept credentials pasted into chat, even "temporary" ones — say so plainly and immediately, every time, no matter how many times it's dismissed.** This session needed three separate refusals before the message landed for a different token via a different route.
- When switching branches locally with uncommitted changes, stash first — this session accidentally carried doc-audit edits from `dev` onto `main` via a plain `git checkout` twice, because the working tree was dirty and git carries non-conflicting changes across branches silently.
- Be careful with GitHub Pages API config — `build_type` is not safe to set explicitly without confirming the existing mode first; UI toggles are more reliable than API for this specific setting.
