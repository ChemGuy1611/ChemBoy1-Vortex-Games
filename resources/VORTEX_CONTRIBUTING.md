# Contributing to the Vortex App

How to shape a pull request to the Vortex application repo (Nexus-Mods/Vortex) so it can be reviewed
and merged: the size and content policy, where a fix lands, what CI checks, and the conventions a
reviewer will hold each kind of change to. This doc routes into the repo's own `docs/` rather than
copying it; the code conventions themselves are in `VORTEX_CODESTYLE.md`.

---

## The pull-request policy

From `CONTRIBUTING.md`:

- **Small PRs only, for now.** The maintainers are mid foundational rework with little review
  capacity. A PR they can review without a conversation first is under about **400 changed lines**
  across **10 files or fewer**, ignoring lockfiles, generated files and mass renames. The cost they
  care about is blast radius, not line count: a 500-line self-contained fix with tests is fine, a
  200-line change touching six extensions is not.
- Bigger than that, or spanning several extensions → open a feature request or ask on Discord
  **before writing it**, and wait for agreement on the approach.
- **One logical change per PR.** If the description needs the word "and", it is probably two PRs.
- **Link the issue** it fixes, and **say what you tested and on which platform**.
- **Run `pnpm run verify`** before opening (format, lint, typecheck, build, tests).
- PRs that conflict with planned work, don't fit the architecture, or are too big get closed —
  explicitly not a judgement on the code.

### AI-assisted contributions

Any tooling is allowed, with one requirement: **you are the author and must understand every line.**
You can explain why the change is written the way it is, you have run it, and you have read the
diff. "That's what the model produced" is not an answer to a review question. Large
machine-generated PRs are closed without detailed review, and the size rule applies regardless of
how the code was written.

A practical way to meet that bar is to keep a private walkthrough of the change next to the PR: one
section per file in the diff, explaining each new or changed function, type and branch (what it
does, why it is written that way rather than the obvious alternative, which callers and state it
touches, which edge cases it handles), anything removed and where its behaviour went, and what each
test asserts. It doubles as the answer sheet for review questions, and it stays out of the PR
description, where reviewers already have the diff.

---

## Before you open it

| Check | How |
| --- | --- |
| Formatting, imports, Tailwind order | `pnpm run format` (the pre-commit hook runs `oxfmt` anyway; running it first makes the hook a no-op) |
| Full gate | `pnpm run verify` — but never while a `pnpm run dev` session is live (see `VORTEX_DEV_BUILD.md`) |
| Tests for the change | Colocated vitest at the lowest layer that can see it; a bug fix gets a test that fails without the fix |
| UI flow touched | `pnpm run e2e` locally — CI does not run E2E on a normal PR, so a green check proves nothing there |
| Public API touched | `pnpm run api`, commit the regenerated `etc/vortex.api.md`, give each new export a one-line TSDoc, and note it under `[Unreleased]` in `packages/vortex-api/CHANGELOG.md` |
| Description | Problem, change, linked issue, what was tested and on which platform |

---

## What CI checks on a PR

| Workflow | Runs on | Gate? |
| --- | --- | --- |
| `main.yml` | PRs to `master`, `release/*`, `integration/*`, `task/laz-*`, `fix/laz-*` | Yes — build + unit/integration tests, Windows and Linux; path-filtered so docs-only changes skip |
| `format.yml` | PRs to `master` and the same integration branches | Yes — formatting must already be clean |
| `e2e.yml` | Only when `packages/e2e/**` changes, otherwise scheduled | No — `continue-on-error` throughout |
| `pr-maintenance.yml` | Pushes to `master`, PR synchronize, daily | Labels PRs that conflict with `master`; stale bot |
| `lint-metrics.yml` | Daily | No — collects `lint:strict` numbers |

---

## Where a fix lands

From `docs/branching-and-release-strategy.md` and `docs/cherry-pick-workflow.md`:

- **`master` is home.** Each release gets a branch cut from it (`v2.0`, `v2.1` …) where its alphas,
  betas, stable and hotfixes live; tags are semver (`v2.0.0-beta.1`, `v2.0.1`).
- A bug in both a release branch and `master` is fixed in both: on the most relevant branch first,
  then cherry-picked. A bug only on one branch is fixed only there. Hotfixes for a shipped stable go
  on its release branch; there are no separate hotfix branches.
- Once a version is stable and the next branch is cut, the old branch only takes critical fixes
  (crash, data loss, security).
- Cherry-picks are automated: a `pick:<branch>` label on a PR merged into a `v2*` branch opens a PR
  against that branch, as a draft when it conflicts. External contributors normally target
  `master` and leave labels to the maintainers.

**Reaching users.** Betas are cut from `master` on a two-week cycle, then promoted to stable, so a
merged change typically reaches users in two to four weeks. Each cycle bumps the minor version.

### Breaking the extension API

From `RELEASES.md`. Extensions cannot declare a minimum Vortex version and update themselves
automatically, so any migration must work on old and new Vortex at once.

- Deprecate first, remove no earlier than **two minor releases** later (deprecate in x.y, remove in
  x.y+2). Patch releases don't count.
- Before deprecating, **the replacement must already work in the current stable**, and the
  published extensions must have been scanned for callers so their authors can be contacted.
- The removal has to merge before that release's beta cut.
- Changes that cannot be deprecated (React upgrades) ship in one release with direct notice to
  affected authors when they land on `master`.

---

## Change-type router

Which repo doc a reviewer will hold the change to, and the rule from it that most often bites.

| Change | Read | Rule that bites |
| --- | --- | --- |
| Any renderer/UI | `docs/frontend.md` | React 18 on the legacy root: no `createRoot`, concurrency or `StrictMode`; no new class components |
| Redux state | `docs/state.md` | New reducers use `actionsToReducerSpec`; the `storeHelper` path helpers are deprecated |
| A page | `docs/design-system/page-migration.md` | `newLayout: true` and the page renders its own `Page` / `PageHeader` / `PageScroll` |
| User-visible text | `docs/I18N_MIGRATION_GUIDE.md` | Namespaced keys; never derive identity from a translated string |
| Error handling | `docs/error-reporting/non-critical-errors.md` | Quote dynamic parts of messages; `showError` decides what gets reported |
| Usage tracking | `docs/analytics.md` | A typed tracker per extension; send ids, never names |
| Game, mod or profile ids | `AGENTS.md` "Game IDs" | Branded types; never cast across brands |
| Collections install | `docs/mod-management/collections.md` | Never bypass phase gating |
| Deploy / external changes | `docs/mod-management/EXTERNAL-CHANGES.md` | Staging is the source of truth for automated resolution |
| Tests | `docs/testing.md` | Select by role or `data-testid`, never by text |
| Documentation | `docs/writing-documentation.md` | Project docs go in `docs/` with an index line, never in `AGENTS.md` |

### Renderer state

- **Hives.** `session` is for state that should not survive a restart. Which hives persist to
  LevelDB is `CORE_HIVES` in `src/renderer/src/store/persistDiffMiddleware.ts` (`app`, `settings`,
  `persistent`, `confidential`, `user`); extensions can add hives at hydration.
- **Writing a reducer.** `actionsToReducerSpec` from `src/renderer/src/reducers/builder.ts` types each
  handler's `payload` from its action creator instead of asserting it. `src/renderer/src/reducers/app.ts`
  is the model.
- **Registering.** Core reducers mount in `buildReducerTree` (`src/renderer/src/reducers/index.ts`);
  extensions call `registerReducer` first thing in `init`, because anything registered against
  state that doesn't exist yet fails in ways that are hard to trace.
- **Verifiers** run against _hydrated_ state, guarding against a persisted value whose shape changed
  between versions. A verifier's `description` is shown to the user when data is dropped — write it
  as a sentence about the data.
- **Old reducers.** Every path helper in `src/renderer/src/util/storeHelper.ts` except `currentGame`
  is deprecated (`getSafe`, `setSafe` and friends). In an old reducer full of them, don't match the
  file: new code uses the new style, and converting the parts you touch is welcome.

### Error handling

- `showError()` (`src/renderer/src/util/message.ts`) is the single entry point for user-visible
  non-critical errors. Its `shouldAllowReport()` suppresses the report when the caller passes
  `allowReport: false` or `warning: true`, the error is a `ThirdPartyError` or `UserCanceled`, the
  code is a transient network error (`ETIMEDOUT`, `ECONNREFUSED`, `ECONNABORTED`, `ENETUNREACH`),
  Vortex is outdated, or the user ignored an earlier terminal error. Even then, nothing is sent
  unless analytics is enabled.
- Reports are grouped by a fingerprint of message and stack, which is why every dynamic part of a
  message (path, URL, id) goes **inside quotes** — otherwise each occurrence files a new report.
- Wrap a higher-level async operation in `withTrackedActivity()`
  (`src/renderer/src/util/errorHandling.ts`) instead of calling `showError` directly; pass
  `{ root: true }` for a top-level user-initiated operation so it starts its own trace.
- `setErrorContext(key, value)` adds ambient context (active game, mod being installed) to every
  error span as `context.<key>`.

### Analytics

- Give each extension its own tracker: a React-free factory `createXTracker(api)` returning one typed
  method per event, emitting on the `analytics-track-mixpanel-event` bus. Health Check is the model
  (`src/renderer/src/extensions/health_check/hooks/healthCheckTracker.ts`). Consent and queueing are
  the analytics extension's job, not the tracker's.
- Send ids, never names: `mod_uid` and `game_id` resolve to names through Mixpanel lookup tables, so
  a rename doesn't split a report. Don't add `game_name`, `mod_name` or a game-scoped `mod_id`
  alongside them, and don't repeat super properties (`game_id`, `profile_id`, `user_type`,
  `app_version` …).
- Drop `undefined` properties before emitting. Shared scope for many events comes from a React
  context rather than every call site.

### Translations

- New strings use `namespace:section.key` with `{ isNamespaceKey: true }`, camelCase keys, in
  `locales/en/<namespace>.json`; a new namespace must also be added to the `ns` array in
  `src/renderer/src/util/i18n.ts`. Feature strings never go in `common`.
- Existing code also uses older `section::key` and `common:::key` forms. When touching existing
  strings, match the surrounding namespace instead of converting as a drive-by.
- Translated text stays static: interpolate with `{{ placeholders }}` and never build a key by
  concatenation. `HIGHLIGHT_I18N=true` prefixes every translated string with `TT:` so untranslated
  hardcoded text stands out.

### Pages and tabs

- `newLayout: true` in `registerMainPage` options (or in `builtInPages.ts` for a core page) makes
  `MainPageContainer` skip the legacy chrome; the component then renders
  `<Page active pageId scrollable={false}>` with a `PageHeader` (title, subtitle, pictogram, actions
  as children) and a `PageScroll`.
- Tabs come from `@/ui/components/tabs/`: a controlled `TabProvider`, with identity in an explicit
  `panelId` separate from the translatable `name`. A persisted or deep-linked tab key must be a
  stable, language-independent value.
- Pictograms are 200×200 SVGs in `assets/pictograms/`; the filename must match its
  `IPictogramName` entry.

### Testing helpers

`@vortex/shared/filesystem` exports `InMemoryFS`, `InMemoryFSBuilder` and the fault-injecting
`ChaosFS`, mirroring the node backend so tests run against the same `FileSystem` surface production
uses. In main-process tests swap the singleton with `setFileSystem` / `resetFileSystem`; in renderer
tests, `installInMemoryFS` replaces `window.api.fs`.

---

## See also

`VORTEX_CODESTYLE.md` (code conventions and the tools that enforce them) · `VORTEX_TESTING.md` (both
test layers and what a PR ships) · `VORTEX_DEV_BUILD.md` (setup, `verify`, `dev` and debugging) ·
`VORTEX_AGENT_GUIDES.md` (`AGENTS.md`, the `docs/` tree and packaged skills) · `VORTEX_APP.md` (repo
layout and process model) · `VORTEX_DEPLOYMENT.md` (deployment and the External Changes dialog) ·
`VORTEX_2_MIGRATION.md` (extension-facing API changes) · `ERROR_CLASSES.md` (the error types
`showError` filters on).
