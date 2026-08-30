# Vortex Repo Agent Guides

The Vortex repo ships its own set of instruction files for coding assistants, plus a small library
of packaged skills. This is an inventory of what each one covers, what it actually asserts, and
which of its claims no longer match the tree — several were written before the `src/` reorganisation
and still point at paths that moved.

Treat these as the repo maintainers' stated expectations for contributed code. They complement, and
in places supersede, `CODESTYLE.md` — see `VORTEX_CODESTYLE.md`.

---

## The instruction files

`CLAUDE.md` at the repo root contains a single line, `@AGENTS.md`, so both entry points resolve to
the same content.

`AGENTS.md` is deliberately tiny: use `pnpm run` for repo commands, and after code changes run
`build`, `test`, `lint`, and `format` on the affected package. Everything else is conditional — it
routes to one of the topic files below depending on the work.

| File | Read it when | Substance |
| --- | --- | --- |
| `AGENTS-DIRECTORIES.md` | Navigating or searching the repo | Per-directory map of `src/`, `extensions/`, `packages/`, plus a "Start Here" table by task type and a list of build-output dirs to ignore |
| `AGENTS-TESTING.md` | Writing or running tests | The vitest layer only: `pnpm run test -- <path>` for one file; tests colocated as `src/**/*.test.ts`; how to alias `vortex-api` to a local `__mocks__` module in an extension's `vitest.config.ts`, mocking only the exports the test uses. It says nothing about the Playwright suite — those rules live in `packages/e2e/E2E-BEST-PRACTICES.md` and the `e2e-test` skill, and are collected in `VORTEX_TESTING.md` |
| `AGENTS-FRONTEND.md` | Any renderer/UI change | The substantial one — React 16 constraints, component/props conventions, auto-enforced prop and class ordering, Redux selector discipline, i18n rules, icon conventions, accessibility, testing. Distilled into `VORTEX_CODESTYLE.md` |
| `AGENTS-DEBUGGING.md` | Debugging a running app | VS Code F5 debugs both processes, build first; `VORTEX_TRACE_DB_WRITES=1` for per-write persistence breadcrumbs |
| `AGENTS-COLLECTIONS.md` | Touching collection install logic | Phased-installation invariants — the rules below are the valuable part |

---

## Collections: the phase-engine invariants

Collections install in phases; each phase must complete **and deploy** before the next starts (phase
0 is frameworks, later phases are content that depends on them). The rules the guide insists on when
modifying `InstallManager`:

- Never bypass phase gating, even for optional or recommended mods. Optionals map to a dedicated
  trailing `OPTIONAL_PHASE` and install through the same engine, just last — there is no separate
  optional round.
- An optional un-ignored *after* the initial gather is not in that pass, so the completion poll
  re-drives it: `driveSelectedOptionals` (called each `pollAllPhasesComplete` tick) downloads or
  imports it, then `handleDownloadFinished` queues the install at `OPTIONAL_PHASE`. The dialog's
  "Install optional mods" clears `ignored` and re-runs the normal `install-dependencies` pass.
- Phase-set backfill iterates the collection's real phases, never the integer range `0..phase` —
  the latter would enumerate the `OPTIONAL_PHASE` sentinel.
- Check **both** `active === 0` and `pending === 0` before deploying; always set `isDeploying`
  during deployment and clear it afterwards; call `startPendingForPhase()` once deployment finishes.

The guide also directs you to read the source comments on `mInstallPhaseState` for the remaining
invariants — those comments, not the guide, are the authority.

---

## Packaged skills

Under `.claude/skills/`, each a self-contained workflow:

| Skill | Purpose |
| --- | --- |
| `changelog` | Drafts the next `CHANGELOG.md` entry from PRs merged since a tag: auto-detects the release branch, pulls PR titles/bodies with `gh`, dedupes against the existing changelog, applies exclusion rules (internal CI/infra, telemetry, docs-only, minor dependency bumps), and writes only after review. Also exposed as the `/changelog` command with `[version] [date]` args |
| `e2e-test` | Scaffolds a Playwright E2E spec from a plain description or a Linear issue ID, inspecting the live app through Chrome DevTools. It drives the `llmBreakpoint` inspector loop described in `VORTEX_TESTING.md` |
| `watch-log` | Log investigation router with six modes — live tail, session/crash/error investigation, persistence integrity, log-line-to-code correlation, single lifecycle trace (download/install/collection/deploy), and a collection-install audit. Rotation- and session-aware; defaults to the dev log |

---

## Stale claims to ignore

Verified against the current tree — these paths do not exist as written:

| Claim | Where | Reality |
| --- | --- | --- |
| `src/extensions/mod_management/InstallManager.ts` | `AGENTS-COLLECTIONS.md` | Lives at `src/renderer/src/extensions/mod_management/InstallManager.ts` |
| `__tests__/PhasedInstaller.test.ts` | `AGENTS-COLLECTIONS.md` | No such file. Nearest current coverage is `src/renderer/src/extensions/mod_management/util/InstallPhaseTracker.test.ts` |
| `samples/sample-extension/` | `AGENTS-DIRECTORIES.md` | No `samples/` directory |
| `packages/paths/`, `packages/paths-node/`, `packages/game-extension-helpers/`, `packages/install-entries/` | `AGENTS-DIRECTORIES.md` | Not present. Current packages: `adaptor-api`, `adaptors`, `e2e`, `exe-version`, `extension-test-mocks`, `file-dependency-resolver`, `game-extension-test`, `icon-extract`, `nexus-api-v3`, `pe-resources`, `vortex-api` |

`AGENTS-DEBUGGING.md` additionally says to run `pnpm run build` before F5 — correct, unlike
`CONTRIBUTE.md`, which still names a `build:all` script that no longer exists.

---

## See also

`VORTEX_CODESTYLE.md` (the conventions these guides encode) · `VORTEX_DEV_BUILD.md` (running the
build/test/lint commands `AGENTS.md` asks for) · `VORTEX_TESTING.md` (what `AGENTS-TESTING.md`
leaves out: the Playwright suite, its fixtures, and what a PR has to ship) · `VORTEX_APP.md` (repo layout in depth) ·
`VORTEX_MOD_INSTALL.md` (the install pipeline the collections guide constrains).
