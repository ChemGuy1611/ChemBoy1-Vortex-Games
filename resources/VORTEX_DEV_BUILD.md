# Building Vortex From Source

How to get a clone of `Nexus-Mods/Vortex` from freshly-cloned to running, on Windows, and how to
verify a change to the app before opening a pull request. The repo layout those commands operate on
is described in `VORTEX_APP.md`.

Everything below was checked against a Windows 11 clone of the `master` line pinned to
Node `24.20.0` / pnpm `11.10.0`. Version pins move — always read the current
`package.json` and `pnpm-workspace.yaml` rather than trusting the numbers quoted here.

---

## 1. Native build prerequisites

Vortex depends on several native Node modules that are compiled locally during install
(`winapi-bindings`, `leveldown`, `xxhash-addon`, `drivelist`, `@parcel/watcher`,
`@nexusmods/fomod-installer-native`). Without a working C++ toolchain the install fails partway
through the rebuild step.

| Tool                               | Notes                                                                                                                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Visual Studio 2022 Build Tools** | Workload "Desktop development with C++", plus the ATL, MFC, and Windows 11 SDK individual components. The default workload alone is not enough for `node-gyp`. Use the 2022 toolset, not a newer one. |
| **Python 3.12+**                   | Needed by `node-gyp`. On 3.12+ also run `python -m pip install --upgrade setuptools`.                                                                                                                 |
| **CMake**                          | Used by some native build steps.                                                                                                                                                                      |
| **.NET 9 SDK**                     | Used by the FOMOD installer components.                                                                                                                                                               |
| **Git**                            | Clone with `--recurse-submodules`.                                                                                                                                                                    |

Verify with:

```powershell
git --version
python --version
cmake --version
dotnet --list-sdks
```

The repo's own guides live at `docs/install-instructions/windows.md` (prerequisites) and
`docs/install-instructions/shared.md` (bootstrap), with Linux equivalents alongside them.

---

## 2. Node and pnpm

**pnpm is the only tool to install by hand.** The repo pins both its pnpm and its Node versions and
fetches them itself, so no version manager, Corepack, or global Node is needed:

```powershell
winget install -e --id pnpm.pnpm      # or: iwr https://get.pnpm.io/install.ps1 -UseBasicParsing | iex
pnpm --version                        # any version; it only bootstraps
```

On `pnpm install`, pnpm reads `packageManager` from `package.json` and switches itself to that exact
version, then downloads the Node runtime declared in `devEngines.runtime` (`onFail: "download"`).
Repo scripts resolve `node` from `node_modules/.bin` first, so whatever Node is on `PATH` does not
matter and does not conflict. Check the version the repo actually runs with:

```powershell
pnpm exec node --version     # the pinned runtime, not necessarily the one on PATH
pnpm nx --version            # nx is a dev dependency; never install it globally
```

`pnpm-workspace.yaml` still sets `engineStrict: true`, and `engines.node` is an exact version, so
anything that bypasses pnpm's managed runtime with a different Node is rejected at install. An older
nvm or Corepack setup keeps working only while it matches the pin exactly; the repo's guides dropped
both (and Volta) in favour of the pnpm-managed runtime.

---

## 3. Installing dependencies

```powershell
pnpm install
```

Roughly five minutes on a cold store, producing a multi-gigabyte `node_modules`. Three lifecycle
scripts run as part of it:

| Hook                     | What it does                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------- |
| root `preinstall`        | `scripts/create-env-file.mjs` writes `.local.env` with `NX_PARALLEL=<cpu core count>` |
| root `prepare`           | `husky` installs the git hooks (pre-commit runs `oxfmt` on staged files)              |
| `src/main` `postinstall` | `postinstall.mjs` rebuilds the native modules listed above against Electron           |

Expected noise during the rebuild:

- `warning C4834: discarding return value…` from `winapi-bindings` — upstream warning, harmless.
- `Attempting to build a module with a space in the path` — printed once per native module when the
  clone lives under a path containing spaces. The build still succeeds, but the repo's own guide
  recommends cloning to a short, space-free path such as `C:\v` to sidestep both this and Windows
  path-length limits.

Only packages listed under `allowBuilds` in `pnpm-workspace.yaml` are permitted to run build
scripts; a new native dependency has to be added there or pnpm will skip its build.

---

## 4. Building and running

```powershell
pnpm run build     # nx run-many -t build lint typecheck, then the dependency-report assets
pnpm run start     # nx run @vortex/main:start -> electron .
```

`start` depends on `build`, so nx builds whatever is stale before launching. Run `pnpm run build`
before VS Code **F5** ("Debug Electron", a compound of main and renderer debuggers on port `9222`)
so source maps are current.

### Hot reload: `pnpm run dev`

For renderer work, `pnpm run dev` replaces the build/start cycle with watch builds and hot module
replacement:

- `.tsx` component edits hot-swap in place (react-refresh), keeping React and Redux state.
- Edits that can't be hot-applied — reducers, utilities, an extension's `index.ts` init code —
  trigger a clean window reload automatically.
- Tailwind class changes rebuild `tailwind-v4.css` and swap the stylesheet without a reload.
- **Not covered:** main process (`src/main`), preload and `@vortex/shared` changes need `dev`
  restarted; the separately bundled extensions in `extensions/` and `extensions/games/` need an app
  relaunch.

Console lines prefixed `[vortex-hmr]` report applied updates and fallback reloads. Hot-swapped code
can leave line breakpoints stale until the next full reload (Ctrl+R). DevTools works as usual
(`START_DEVTOOLS=true`, or `pnpm run dev --inspect=9229`), and a dev session exposes remote
debugging on `127.0.0.1:9222`.

> [!WARNING]
> Do not run `pnpm run verify` or `pnpm run build` while `dev` is running. The build writes
> production output into `src/main/build`, the directory the dev app loads from; it overwrites the
> CSS the Tailwind watcher owns and replaces the HMR renderer bundle, leaving broken styles and dead
> hot reload until `dev` is restarted. While `dev` runs, use `pnpm run typecheck`, `pnpm run lint`,
> `pnpm run format` and single-file tests.

### Diagnostic environment variables

Set in `.env` or the launching shell (`docs/DEBUGGING-GUIDE.md` owns the full list):

| Variable                                  | Effect                                                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `VORTEX_TRACE_DB_WRITES=1`                | `level_pivot Write enter`/`exit` breadcrumbs per persistence write; an enter with no exit is a hung write |
| `VORTEX_ENABLE_LOGGING=1`                 | File logging in a build that isn't `NODE_ENV=development`                                           |
| `START_DEVTOOLS=true`                     | Open DevTools on launch                                                                             |
| `DEBUG_REACT_RENDERS=true`                | Stop focus/blur from updating state, so inspecting renders doesn't cause renders                    |
| `HIGHLIGHT_I18N=true`                     | Uppercase every translated string and prefix it `TT:`, exposing hardcoded text                      |
| `VORTEX_DEV_UPDATER=1`, `VORTEX_UPDATER_REPO` | The updater does nothing from source unless set; the repo override points it at e.g. Vortex-Staging |
| `VORTEX_E2E=1`, `VORTEX_E2E_HEADLESS=1`   | Set only by the Playwright harness                                                                  |

Even without `VORTEX_TRACE_DB_WRITES`, a single persistence write over 250 ms logs a
`level_pivot slow Write` warning. In the DevTools console, `window.store.getState()` exposes the
whole Redux state.

Packaging (`pnpm run package`, or `package:nosign` without code signing) does a production build and
then runs electron-builder.

### Which user data the dev build uses

A dev run does not touch the installed app's data directory. Electron derives `userData` from the
app name, and in dev that comes from `src/main/package.json` — the scoped package name `@vortex/main`
— so the dev instance stores state under `%APPDATA%\@vortex\main`, while an installed Vortex uses
`%APPDATA%\Vortex`. Nothing calls `app.setName`, and `productName` is only set for packaged builds.

To pin the location explicitly, pass the `--user-data` flag (declared in `src/main/src/cli.ts`):

```powershell
pnpm -F @vortex/main exec electron . --user-data "$env:LOCALAPPDATA\vortex-dev-data"
```

`Application.ts` sets that path as the base for the state database, `vortex.log`, the `temp`
directory, and therefore the defaults for staging and download folders — a completely separate
profile. A fresh directory starts at the first-run setup wizard with no games managed; copying an
existing `%APPDATA%\Vortex` into it first gives realistic data to test against without risking the
original.

What follows from that default location when checking a dev run:

| What               | Dev build                                                     | Installed Vortex                                                                   |
| ------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Log                | `%APPDATA%\@vortex\main\vortex.log`                           | `%APPDATA%\Vortex\vortex.log` (multi-user mode: `%ProgramData%\vortex\vortex.log`) |
| User extensions    | `%APPDATA%\@vortex\main\plugins`                              | `%APPDATA%\Vortex\plugins` (multi-user mode: `%ProgramData%\vortex\plugins`)       |
| Bundled extensions | `src\main\build\bundledPlugins\<name>\index.cjs` in the clone | inside the app's resources                                                         |

- A game extension copied into the installed app's plugins folder is **not** loaded by the dev
  build. Copy it into `%APPDATA%\@vortex\main\plugins` as well to test it there
  (`python deploy_to_vortex.py <id> --dev` does this from the extensions repo).
- The bundled extensions are copied from each `extensions/<name>/dist` at build time. Searching
  `bundledPlugins\<name>\index.cjs` for a string from the change is a quick way to confirm the
  build you ran actually contains it.
- Log timestamps are UTC, and the error level is written `[ERRO]` (next to `[WARN]`, `[INFO]`,
  `[DEBG]`), so a search for `[ERROR]` finds nothing. Each run ends with a `clean application end`
  line, which makes a good boundary when cutting the latest run out of the file.
- A dev run's log is noisy even when nothing is wrong: one `failed to use game support plugin ...
  Game entry not found` per bundled game that is not installed, and `extensions ignored for using
  unsupported api` for a few bundled store extensions.

The E2E suite isolates differently: with `VORTEX_E2E=1` set, `main.ts` redirects `userData` and
`appData` to whatever `ELECTRON_USERDATA` and `ELECTRON_APPDATA` point at, so parallel test workers
never collide.

Note that `--shared` is not an isolation flag — it selects the ProgramData multi-user location. If
the installed Vortex runs in multi-user mode, the dev instance does not inherit it: `Application.ts`
reads the `multiUser` flag from the _per-user_ database, and a dev run's per-user database is its
own fresh one, so `%ProgramData%\vortex` is left alone.

Whatever the data directory, avoid deploying the _same game_ from two running instances; they
share the game folder and its deployment manifest even when their app data is separate.

---

## 5. Verifying a change

The whole-repo scripts are the slow path. During iteration, run the single project you touched. Task
names come from each workspace package's `package.json`; project names are the package names
(`@vortex/renderer`, `@vortex/main`, `@vortex/shared`, `@vortex/preload`, and the entries under
`packages/` and `extensions/`).

```powershell
pnpm nx run @vortex/renderer:typecheck
pnpm nx run @vortex/renderer:lint
pnpm nx run @vortex/renderer:test
```

`build`, `typecheck`, and `lint*` all declare `dependsOn: ["^build"]`, so the first run of any of
them builds every workspace dependency of that project first — expect the first invocation to be
several minutes and later ones to be near-instant from the nx cache (`test*` is not cached).

Repo-wide equivalents:

| Command                          | Effect                                                                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run verify`                | The pre-PR gate: `format`, then `build` (build + lint + typecheck), then `test`. Excludes E2E. Never while `dev` is running                                                              |
| `pnpm run typecheck`             | `tsc` across every project                                                                                                                                                               |
| `pnpm run lint` / `lint:verbose` | ESLint across every project (`--quiet` hides warnings)                                                                                                                                   |
| `pnpm run test`                  | vitest unit + integration, excluding the Playwright E2E package                                                                                                                          |
| `pnpm run e2e`                   | Playwright E2E (`@vortex/e2e`); the variants are `pnpm -F @vortex/e2e run e2e:headed` and `run e2e:ui` — the root `e2e:debug` and `e2e:report` scripts name nx targets that do not exist |
| `pnpm oxfmt --check <paths>`     | Formatting check; drop `--check` to rewrite. `pnpm run format` does the whole tree                                                                                                       |

Unit tests are colocated with the code as `src/**/*.test.ts(x)` and run under vitest, so a change to
a renderer utility can usually be covered by a test file placed next to it.

A pull request is expected to arrive with tests for the change and with evidence that they were run.
`pnpm run verify` covers formatting, lint, typecheck, build and the vitest layers, which is what CI
checks; the Playwright suite is **not** a PR
gate — `e2e.yml` only triggers on PRs that touch `packages/e2e/**` — so a change to a UI flow has to be
exercised locally with `pnpm run e2e`. Writing tests for either layer is covered in `VORTEX_TESTING.md`.

---

## 6. Troubleshooting

| Symptom                                                                         | Cause / fix                                                                                                                      |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `Unsupported engine` at install                                                 | Something bypassed pnpm's managed runtime with a Node that doesn't match the exact pin; run through `pnpm`, check `pnpm exec node --version` |
| `pnpm` not found                                                                | Install it (`winget install -e --id pnpm.pnpm`) and reopen the terminal; Corepack is no longer part of the setup |
| Broken styles / dead HMR in a `dev` session                                     | A `build` or `verify` ran while `dev` was live and overwrote `src/main/build`; restart `pnpm run dev`                           |
| Editor floods with `Cannot find module 'react'` / `Cannot find namespace 'JSX'` | Dependencies were never installed (or were installed for a different Node); run `pnpm install`                                   |
| `node-gyp` failures mentioning MSVC, ATL, MFC, or the Windows SDK               | Build Tools workload incomplete — add the individual components listed in section 1                                              |
| A stale target keeps passing after an edit                                      | nx served it from cache; the inputs list in `nx.json` decides invalidation. `pnpm nx reset` clears the cache                     |

---

## See also

`VORTEX_CONTRIBUTING.md` (PR policy, CI gates, what to run before opening) ·
`VORTEX_APP.md` (repo layout, process model, persistence, and where each subsystem lives) ·
`VORTEX_TESTING.md` (both test layers in depth: what a PR has to ship, and how to write vitest and
Playwright tests for this app) ·
`VORTEX_CODESTYLE.md` (the conventions the code these commands check is written to) ·
`OXFMT.md` (the formatter behind `pnpm run format` and the pre-commit hook) ·
`VORTEX_AGENT_GUIDES.md` (the repo's own contributor/assistant instruction files) ·
`BOOTSTRAP.md` (the separate, much lighter environment needed for the extension-authoring scripts) ·
`VORTEX_2_MIGRATION.md` (what changed for extension authors between the 1.16 and 2.x app lines).
