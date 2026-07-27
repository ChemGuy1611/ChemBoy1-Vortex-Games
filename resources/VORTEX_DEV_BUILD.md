# Building Vortex From Source

How to get a clone of `Nexus-Mods/Vortex` from freshly-cloned to running, on Windows, and how to
verify a change to the app before opening a pull request. The repo layout those commands operate on
is described in `VORTEX_APP.md`.

Everything below was carried out on a Windows 11 clone of the `master` line pinned to
Node `24.17.0` / pnpm `11.10.0`. Version pins move — always read the current
`package.json` and `pnpm-workspace.yaml` rather than trusting the numbers quoted here.

---

## 1. Native build prerequisites

Vortex depends on several native Node modules that are compiled locally during install
(`winapi-bindings`, `leveldown`, `xxhash-addon`, `drivelist`, `@parcel/watcher`,
`@nexusmods/fomod-installer-native`). Without a working C++ toolchain the install fails partway
through the rebuild step.

| Tool | Notes |
| --- | --- |
| **Visual Studio 2022 Build Tools** | Workload "Desktop development with C++", plus the ATL, MFC, and Windows 11 SDK individual components. The default workload alone is not enough for `node-gyp`. Use the 2022 toolset, not a newer one. |
| **Python 3.12+** | Needed by `node-gyp`. On 3.12+ also run `python -m pip install --upgrade setuptools`. |
| **CMake** | Used by some native build steps. |
| **.NET 9 SDK** | Used by the FOMOD installer components. |
| **Git** | Clone with `--recurse-submodules`. |

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

The root `package.json` pins an **exact** Node version in `engines` and `devEngines`, and
`pnpm-workspace.yaml` sets `engineStrict: true`. A different Node version — even a newer patch of
the same major — is rejected at install time, so match the pin exactly.

Any version manager works. With **nvm for Windows**:

```powershell
nvm install 24.17.0
nvm use 24.17.0
node -v          # must print the pinned version
```

The repo's `docs/install-instructions/shared.md` recommends Volta instead. Note that page currently
tells you to install `node@22`, which contradicts the `engines` pin and will fail `engineStrict` —
install the version `package.json` actually asks for.

pnpm is pinned by the `packageManager` field and is installed through Corepack, which ships with
Node:

```powershell
corepack enable pnpm
pnpm -v          # must match the packageManager pin
```

In a non-interactive shell, set `COREPACK_ENABLE_DOWNLOAD_PROMPT=0` so Corepack fetches the pinned
pnpm without waiting on a confirmation prompt.

---

## 3. Installing dependencies

```powershell
pnpm install
```

Roughly five minutes on a cold store, producing a multi-gigabyte `node_modules`. Three lifecycle
scripts run as part of it:

| Hook | What it does |
| --- | --- |
| root `preinstall` | `scripts/create-env-file.mjs` writes `.local.env` with `NX_PARALLEL=<cpu core count>` |
| root `prepare` | `husky` installs the git hooks (pre-commit runs `oxfmt` on staged files) |
| `src/main` `postinstall` | `postinstall.mjs` rebuilds the native modules listed above against Electron |

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

`start` depends on `build`, so nx builds whatever is stale before launching. `CONTRIBUTE.md` and the
VS Code debugging notes still refer to `pnpm run build:all`; that script no longer exists — use
`pnpm run build`.

Packaging (`pnpm run package`, or `package:nosign` without code signing) does a production build and
then runs electron-builder.

### Which user data the dev build uses

A dev run does not touch the installed app's data directory. Electron derives `userData` from the
app name, and in dev that comes from `src/main/package.json` — the scoped package name `@vortex/main`
— so the dev instance stores state under `%APPDATA%\@vortex\main`, while an installed Vortex uses
`%APPDATA%\Vortex`. Nothing calls `app.setName`, and `productName` is only set for packaged builds.

To pin the location explicitly, pass the `--user-data` flag (declared in `src/main/src/cli.ts`):

```powershell
pnpm -F @vortex/main exec electron . --user-data "C:\vortex-dev-data"
```

`Application.ts` sets that path as the base for the state database, `vortex.log`, the `temp`
directory, and therefore the defaults for staging and download folders — a completely separate
profile. A fresh directory starts at the first-run setup wizard with no games managed; copying an
existing `%APPDATA%\Vortex` into it first gives realistic data to test against without risking the
original.

The E2E suite isolates differently: with `VORTEX_E2E=1` set, `main.ts` redirects `userData` and
`appData` to whatever `ELECTRON_USERDATA` and `ELECTRON_APPDATA` point at, so parallel test workers
never collide.

Note that `--shared` is not an isolation flag — it selects the ProgramData multi-user location. If
the installed Vortex runs in multi-user mode, the dev instance does not inherit it: `Application.ts`
reads the `multiUser` flag from the *per-user* database, and a dev run's per-user database is its
own fresh one, so `%ProgramData%\vortex` is left alone.

Whatever the data directory, avoid deploying the *same game* from two running instances; they
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

| Command | Effect |
| --- | --- |
| `pnpm run typecheck` | `tsc` across every project |
| `pnpm run lint` / `lint:verbose` | ESLint across every project (`--quiet` hides warnings) |
| `pnpm run test` | vitest unit + integration, excluding the Playwright E2E package |
| `pnpm run e2e` | Playwright E2E (`@vortex/e2e`), also `:headed`, `:debug`, `:report` |
| `pnpm oxfmt --check <paths>` | Formatting check; drop `--check` to rewrite. `pnpm run format` does the whole tree |

Unit tests are colocated with the code as `src/**/*.test.ts(x)` and run under vitest, so a change to
a renderer utility can usually be covered by a test file placed next to it.

---

## 6. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `Unsupported engine` at install | Active Node does not match the exact `engines` pin; `engineStrict: true` makes this fatal |
| `pnpm` not found | Corepack not enabled, or the shim was created for a different Node install — re-run `corepack enable pnpm` under the pinned Node |
| Editor floods with `Cannot find module 'react'` / `Cannot find namespace 'JSX'` | Dependencies were never installed (or were installed for a different Node); run `pnpm install` |
| `node-gyp` failures mentioning MSVC, ATL, MFC, or the Windows SDK | Build Tools workload incomplete — add the individual components listed in section 1 |
| A stale target keeps passing after an edit | nx served it from cache; the inputs list in `nx.json` decides invalidation. `pnpm nx reset` clears the cache |

---

## See also

`VORTEX_APP.md` (repo layout, process model, persistence, and where each subsystem lives) ·
`VORTEX_CODESTYLE.md` (the conventions the code these commands check is written to) ·
`VORTEX_AGENT_GUIDES.md` (the repo's own contributor/assistant instruction files) ·
`BOOTSTRAP.md` (the separate, much lighter environment needed for the extension-authoring scripts) ·
`VORTEX_2_MIGRATION.md` (what changed for extension authors between the 1.16 and 2.x app lines).
