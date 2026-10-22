# Vortex Repo Agent Guides

The Vortex repo ships instructions for coding assistants (`AGENTS.md`), an indexed `docs/` tree
that holds all project and coding documentation, and a small library of packaged skills under
`.claude/`. This is an inventory of what each part covers and what it actually asserts.

Treat these as the maintainers' stated expectations for contributed code. The pull-request side
(size limits, what a PR description must say, the AI-assisted contribution policy) is collected in
`VORTEX_CONTRIBUTING.md`; the code conventions in `VORTEX_CODESTYLE.md`.

---

## How the guidance is split

In August 2026 the five topic files `AGENTS-DIRECTORIES.md`, `AGENTS-TESTING.md`,
`AGENTS-FRONTEND.md`, `AGENTS-DEBUGGING.md` and `AGENTS-COLLECTIONS.md` were deleted and their
content moved into `docs/`. Anything that still cites those file names is out of date.

The split is now deliberate and documented in `docs/writing-documentation.md`:

- **`docs/`** holds everything about the code: architecture, subsystem deep dives, conventions,
  workflows and runbooks, written for humans and agents alike. `docs/README.md` is the index; every
  new doc gets a line there.
- **`AGENTS.md`** covers only how to _operate_ in the repo as an agent: verification, committing,
  tool use, MCP servers, and a routing list of which doc to read for a task. It says outright that
  it duplicates nothing from `docs/`.
- `CLAUDE.md` at the repo root is the single line `@AGENTS.md`, so both entry points resolve to the
  same content.

---

## What `AGENTS.md` asserts

### Verification

- `pnpm run verify` from the repo root is the check: `format`, then `build` (which is
  `nx run-many -t build lint typecheck` plus the dependency report), then `test`.
- `verify` **excludes the E2E suite**. Passing it says nothing about E2E, so a report should name
  which suite ran. E2E runs only when asked.
- **Never run `verify` while a dev session is live.** Its build step writes production output into
  `src/main/build`, the directory the running dev app loads from. That clobbers the CSS
  `tailwind:watch` owns and replaces the HMR renderer bundle, leaving broken styles and dead hot
  reload until dev is restarted. With dev running, use `pnpm run typecheck`, `pnpm run lint`,
  `pnpm run format` and single-file tests instead, and save `verify` for the end.
- One test file: `pnpm exec vitest run <file>` from inside the project directory that owns it
  (`cd src/renderer` first). `pnpm run test` is an nx run across all projects and cannot be scoped.
- Formatting, import order and Tailwind class order belong to `oxfmt` and `oxlint` — never
  hand-fix them.

### Committing and tools

- Don't commit, push or open a PR unless asked; leave changes in the working tree. Branch first if
  on `master`.
- Anything committed under `scripts/` must be cross-platform Node.
- Never run the signed `pnpm package` locally — signing secrets are CI-only.
- **chrome-devtools MCP** attaches to a running Vortex on `127.0.0.1:9222` (start with
  `pnpm run dev` or the VS Code "Debug Electron" profile). Prefer it over temporary logging, which
  tends to get committed by accident.
- **Linear MCP:** don't create or transition issues unless asked.

### Game IDs are branded types

`src/shared/src/types/ids.ts` defines branded types for identifiers that often hold the same string
but mean different things:

| Type              | Meaning                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| `GameId`          | Numeric Nexus Mods game id (e.g. `1303`)                                                                             |
| `GameDomain`      | Nexus domain slug (e.g. `stardewvalley`)                                                                             |
| `VortexGameId`    | Vortex's internal game id: the extension's game id, or the domain for extension-less games (`skyrimvr` vs `skyrimspecialedition`) |
| `VortexModId`     | Key of `persistent.mods[gameId]` — not the Nexus mod id                                                              |
| `VortexProfileId` | Key of `persistent.profiles`                                                                                         |

The rules: don't accept or produce a raw `string`/`number` where a brand applies; brand at the
boundary where the data genuinely is that kind; never cast across brands
(`GameDomain(someVortexGameId)`). A type error comparing two brands is intentional — it means "find
the real join", not "cast it". If a join is missing, add it next to the existing helpers rather than
writing an ad-hoc lookup over the games list.

---

## The `docs/` routing list

`AGENTS.md` maps tasks to docs; `docs/README.md` is the full index.

| Working on                     | Read                                                                 |
| ------------------------------ | -------------------------------------------------------------------- |
| Finding your way around        | `docs/repo-layout.md` (directory map + "Start here" table)           |
| Renderer, React, UI            | `docs/frontend.md`                                                   |
| Redux state, reducers, actions | `docs/state.md`                                                      |
| Tests                          | `docs/testing.md` (+ `packages/e2e/E2E-BEST-PRACTICES.md` for E2E)   |
| Debugging, logs                | `docs/DEBUGGING-GUIDE.md`                                            |
| Collections, phased install    | `docs/mod-management/collections.md`                                 |
| External Changes dialog        | `docs/mod-management/EXTERNAL-CHANGES.md`                            |
| Errors and telemetry           | `docs/error-reporting/` (README is the index)                        |
| Analytics events               | `docs/analytics.md`                                                  |
| Converting a legacy page       | `docs/design-system/page-migration.md`                               |
| Translations                   | `docs/I18N_MIGRATION_GUIDE.md`                                       |
| Installers, packaging          | `docs/packaging/windows.md`                                          |
| Auto-updater                   | `docs/updater.md`, `updater-testing.md`, `updater-rehearsal.md`      |
| Writing docs                   | `docs/writing-documentation.md`                                      |
| Code style                     | `CODESTYLE.md` (root)                                                |

`docs/investigation/` (VS Code, Obsidian) describes other products as prior art, not Vortex.

### Writing docs for the repo

`docs/writing-documentation.md` sets the conventions a docs PR is reviewed against: kebab-case
lowercase names that name the topic (`frontend.md`, not `frontend-guide.md`; older SHOUTY names are
grandfathered, don't rename them in passing); `# Title` then one or two sentences on what question
the doc answers; repo-root source paths in backticks; a `## Key Files` section; ASCII flow diagrams;
uppercase admonitions (`> [!NOTE]` — lowercase silently degrades); audience-neutral tone with no
"read this when…" preambles; state the _why_ behind non-obvious rules; link, never duplicate. The
pre-commit hook runs `oxfmt` over markdown too, so tables get reflowed.

---

## Collections: the phase-engine invariants

`docs/mod-management/collections.md` is the authority; the header comment on
`mInstallPhaseState` in `src/renderer/src/extensions/mod_management/InstallManager.ts` documents the
structure in detail. The rules when modifying phase logic:

- Never bypass phase gating, even for optional or recommended mods. Optionals map to the trailing
  `OPTIONAL_PHASE` via `rulePhase` and install through the same engine — there is no separate
  optional round.
- An optional un-ignored _after_ the initial gather is not in that pass, so the completion poll
  re-drives it: `driveSelectedOptionals` (each `pollAllPhasesComplete` tick) downloads or imports
  it, then `handleDownloadFinished` queues the install at `OPTIONAL_PHASE`. The dialog's "Install
  optional mods" (`InstallDriver.installRecommended`) clears `ignored` and re-runs the normal
  `install-dependencies` pass; it does not use `installRecommendationsImpl`.
- Phase-set backfill iterates the collection's real phases (`collectionRulePhases` via
  `InstallPhaseTracker`), never the integer range `0..phase`, which would enumerate the
  `OPTIONAL_PHASE` sentinel.
- Check **both** `active === 0` and `pending === 0` before deploying; always set `isDeploying`
  during deployment and clear it afterwards; call `startPendingForPhase()` once deployment finishes.

Tests: `InstallManager.optionalPhaseGate.test.ts`, `InstallManager.optionals.test.ts`,
`util/InstallPhaseTracker.test.ts`, `util/rulePhase.test.ts`, all under
`src/renderer/src/extensions/mod_management/`.

---

## Packaged skills

Under `.claude/skills/`, each a self-contained workflow:

| Skill       | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `changelog` | Drafts the next root `CHANGELOG.md` entry (Keep a Changelog, Added / Changed / Fixed) from PRs merged since a starting tag, which it always asks for. Pulls titles and bodies with `gh`, dedupes, and silently drops internal CI/build/packaging, lint/format, test-only, internal cleanup, telemetry/Mixpanel, docs-only and routine dependency PRs (major Electron/Node bumps stay). Writes only after review. Also the `/changelog [version] [date]` command |
| `e2e-test`  | Writes a Playwright spec from a description or a Linear issue id: confirm scope, read `E2E-BEST-PRACTICES.md` + existing POMs/helpers, draft with `llmBreakpoint` calls, walk the live app over Chrome DevTools in the inspector loop, then strip breakpoints and re-run headless. Snapshots, never screenshots, unless asked                                                                                                                                        |
| `watch-log` | Thin router over six on-demand mode files (`modes/`: live, investigate, persistence, correlate, trace, collection-install) plus shared chunks (`shared/`: sessions, lifecycle, persistence, multi-file, gamebryo, edge-cases). Rotation- and session-aware. Interviews the user before running when the request has no mode trigger and no concrete target. `drift-check/check.py` asserts every log marker the skill greps for still exists in the source  |

A merged PR's changelog visibility follows the `changelog` exclusions: a fix described only in
terms of telemetry or tests will not reach the release notes, so a user-facing PR should describe
its effect in user-facing terms.

---

## Remaining stale claims

Verified against the current tree:

| Claim                                                    | Where                                | Reality                                                    |
| -------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------- |
| `pnpm nx run @vortex/e2e:dev:isolated`                   | `packages/e2e/E2E-BEST-PRACTICES.md` | The script is `dev:explore`                                |
| `pnpm nx run @vortex/e2e:ui`                             | `packages/e2e/E2E-BEST-PRACTICES.md` | The script is `e2e:ui`                                     |
| One Electron instance per worker, shared within a file   | `packages/e2e/README.md`             | One instance and one temp user-data dir per test           |
| `e2e:debug` / `e2e:report` root scripts                  | root `package.json`                  | Target scripts that `packages/e2e/package.json` lacks      |
| React `version: "16"` in the `react-x` settings          | `src/renderer/eslint.config.mjs`     | The runtime is React 18.3.1 on the legacy root             |

---

## See also

`VORTEX_CONTRIBUTING.md` (PR policy and the change-type doc router) · `VORTEX_CODESTYLE.md` (the
conventions these guides encode) · `VORTEX_DEV_BUILD.md` (running the build, verify and dev
commands) · `VORTEX_TESTING.md` (both test layers in depth) · `VORTEX_APP.md` (repo layout in depth)
· `VORTEX_MOD_INSTALL.md` (the install pipeline the collections rules constrain) ·
`VORTEX_DEPLOYMENT.md` (deployment and the External Changes dialog).
