# Vortex Repo & App Architecture

How the Vortex application and its monorepo are put together, for orientation when reading or searching the `Vortex` source tree. This is the **app/repo** view — the extension-facing API surface is covered separately by the `vortex-api` type declarations (`node_modules/vortex-api/lib/api.d.ts`) and the authoring docs in this folder. Crosslinks to those are noted where relevant.

**Repo:** `c:\Game_Tools\0 GitHub Repos\Vortex` (read-only mirror of `Nexus-Mods/Vortex`).
**Version line (audited 2026-07-14):** v2.3.0 (latest tag; the local checkout's HEAD is on an integration branch that does not contain the tag commit). Default branch is `master`.

## Top-level layout

| Path | Role |
| --- | --- |
| `src/` | The Electron app itself, split by process (see Process Model) |
| `packages/` | Internal workspace packages (the published `vortex-api` lives here, plus PE-parsing and test helpers) |
| `extensions/` | Bundled feature + game extensions shipped inside Vortex |
| `docs/` | Architecture, debugging, release, and i18n docs |
| `scripts/` | Workspace build/automation scripts (env file, dependency report, query-type codegen, rolldown for extensions) |
| `tools/` | One-off build/icon/sourcemap helpers |
| `locales/` | Translations (`translation-strings.txt` is the extracted source string list at repo root) |
| `assets/`, `icons/` | Static bundled assets |
| `etc/` | Generated reference (`vortex.api.md`, `Dependency Report.md`) |
| `playwright/` | E2E specs (older location; the `@vortex/e2e` package under `packages/e2e/` is the current runner) |
| `AGENTS*.md` | Short agent-facing guides (see AGENTS docs below) |

## Monorepo & build system

Vortex is an **nx + pnpm-workspace** monorepo.

- **Package manager:** pnpm `11.5.1`, Node `24.15.0` (pinned in `package.json` `engines`/`devEngines`/`volta`).
- **Task runner:** [nx](https://nx.dev) (`nx.json`). `neverConnectToCloud: true`, analytics off, default base branch `master`. Targets are cached: `build`, `typecheck`, `lint*` cache; `test*` does not. `build`/`typecheck`/`lint` all `dependsOn: ["^build"]` so dependency packages build first.
- **Dependency versions are centralised** in the pnpm **catalog** (`pnpm-workspace.yaml`). Almost every `devDependency` in the root `package.json` is `"catalog:"`. When checking a dependency version, read the catalog, not the individual `package.json`.
- **Bundlers:**
  - `rolldown` (`rolldown.base.mjs`) is the primary bundler. `scripts/extensions-rolldown.mjs` bundles the bundled extensions.
  - `tsdown` is used by some packages (e.g. `vortex-api`).
  - `webpack` is still present (legacy paths / some extensions); `ts-loader`, `terser-webpack-plugin`, `webpack-node-externals` remain in devDeps.
- **Lint/format:** `oxlint` + `oxfmt` (Oxc toolchain) are the fast primary tools (`oxlint.base.config.json`, `.oxfmtrc.json`). ESLint is still configured (`eslint.config.base.mjs`, custom rules in `eslint-rules/`) for rules Oxc doesn't cover.
- **Type checking:** layered `tsconfig.base.json` -> `tsconfig.strict.json` / `tsconfig.node.json`; per-project `tsconfig*.json`. `ts-to-zod` (`ts-to-zod.config.mjs`) generates Zod schemas from TS types.
- **Tests:** `vitest` (`vitest.base.config.ts`), tests colocated as `src/**/*.test.ts`. Playwright for E2E.

### Common commands (run from repo root)

| Command | Effect |
| --- | --- |
| `pnpm run start` | Launch dev app (`nx run @vortex/main:start`) |
| `pnpm run build` | `nx run-many -t build lint typecheck` + dependency-report assets |
| `pnpm run build:all` | Full build used before `start` / F5 debugging (per CONTRIBUTE.md) |
| `pnpm run package` / `package:nosign` | Production build + Electron package (signed / unsigned) |
| `pnpm run api` | Build the `vortex-api` package only |
| `pnpm run test` | Run all unit + integration tests except `@vortex/e2e` |
| `pnpm run e2e[:headed/:debug/:report]` | Playwright E2E |
| `pnpm run lint` / `format` / `format:check` | oxlint / oxfmt |
| `pnpm run generate:query-types` | Regenerate typed query bindings (see Persistence) |

`scripts/create-env-file.mjs` runs on `preinstall` to seed `.env` from `.env.example`.

## Process model (Electron)

The app under `src/` is split by Electron process plus shared and query layers:

| Dir | Process | Responsibility |
| --- | --- | --- |
| `src/main/src/` | Main | App startup, windows, IPC, downloads, telemetry, extension loading, persistence |
| `src/renderer/src/` | Renderer | React UI, Redux store, core extensions, controls/views |
| `src/preload/src/` | Preload | Context-bridge between renderer and main (`index.ts`) |
| `src/shared/src/` | Both | Shared APIs, types, constants, error (de)serialization, telemetry, IPC contracts |
| `src/queries/` | Main DB | SQL for the query layer (`select/*.sql`, `setup/tables.sql`) |
| `src/stylesheets/` | Renderer | Shared Sass / Tailwind inputs |

### Main process

- Entry `src/main/src/main.ts` -> constructs `Application` (`Application.ts`). Top of `main.ts` also answers `get-app-info` IPC for forked child processes and handles `VORTEX_E2E=1` userData/appData redirection for test isolation.
- `Application.ts` orchestrates startup: `setupAppEvents`, `regularStart` / `regularStartInner`, splash (`SplashScreen.ts`), main window (`MainWindow.ts`), persistence (`setupPersistence`), migration (`migrateIfNecessary`), install-type / admin checks. Private fields use the `m` prefix (`mLevelPersistors`, `mMainWindow`, …).
- IPC: `ipc.ts` / `ipcHandlers.ts`. Downloads live under `src/main/src/downloading/`. Telemetry under `src/main/src/telemetry/`. Feature flags under `src/main/src/unleash/` (Unleash client + IPC).
- Main-side extensions: `src/main/src/extensions/` (`autoupdater.ts`, `updater.ts`, `nexusIntegration.ts`).

### Renderer process

- Entry `src/renderer/src/renderer.tsx`. Sets up `requireRemap` first (must be `require`, not hoisted `import`), early error handlers (`window.api.diag.fatal`), then mounts React.
- `ExtensionManager.ts` / `ExtensionProvider.ts` load and expose extensions to the UI.
- Redux: `actions/`, `reducers/`, `store/` (`store.ts`, `reducers.ts`, `ReduxWatcher.ts`, `persistDiffMiddleware.ts`, `stateDiff.ts`, `hydration.ts`). `selectors.ts` and `hooks/` for reads. `controls/` (reusable components), `views/` (pages), `ui/`, `util/`.
- `IPCDownloadAdapter.ts` bridges renderer download UI to the main-process download manager.

### Shared

`src/shared/src/` holds cross-process contracts: `api/` (`cli`, `download`, `errors`, `flags`, `ipc`, `preload`, `state`, `telemetry`), `constants.ts`, `errors.ts` + `error-serialization.ts` (errors must survive IPC), `Debouncer.ts`, `chunking.ts`, `telemetry/`, `types/`. Imported as `@vortex/shared`.

## Persistence & state (2.x query layer)

Vortex 2.x has a notable persistence/query architecture under `src/main/src/store/`:

- **`LevelPersist.ts`** — LevelDB-backed Redux persistor (the long-standing state store). Supports `setItem`/`removeItem`/`bulkSetItem`/`bulkRemoveItem`. `VORTEX_TRACE_DB_WRITES=1` emits per-write breadcrumb logging; a `level_pivot slow Write` warning fires when a write exceeds `SLOW_WRITE_THRESHOLD_MS` (250 ms) even without the env var.
- **`Database.ts` + `DuckDBSingleton.ts`** — a DuckDB-backed database used by the typed query system.
- **Query system** — `QueryRegistry.ts`, `QueryWatcher.ts`, `QueryInvalidator.ts`, `queryParser.ts`, `flattenState.ts`, plus `generated/`. SQL lives in `src/queries/` (`select/profiles.sql`, `setup/tables.sql`). `pnpm run generate:query-types` (`scripts/generate-query-types.ts`) produces typed bindings from the SQL.
- **IPC persistence bridge** — `ReduxPersistorIPC.ts`, `persistenceIPC.ts`, `mainPersistence.ts`, `SubPersistor.ts` move state between processes.
- Renderer side mirrors with `store/persistDiffMiddleware.ts` (diff-based persistence) and `stateDiff.ts`.

For the data *shapes* exposed to extensions (`IState`, profiles, mods), see the declarations in `node_modules/vortex-api/lib/api.d.ts`. For state helper functions (`getSafe`/`setSafe`/`batchDispatch`), see `STATE_HELPERS.md`.

## Extension system — two layers

Vortex has **two** extension directories. Do not confuse them.

1. **Core extensions** — `src/renderer/src/extensions/`. These are first-party feature modules compiled into the renderer (not separately packaged). ~50 of them, e.g.:
   - Mod pipeline: `mod_management`, `download_management`, `installer_fomod_native` / `installer_fomod_ipc` / `installer_fomod_shared` / `installer_nested_fomod`, `installer_dotnet`, `mod_load_order`, `file_based_loadorder`.
   - Deployment methods: `hardlink_activator`, `symlink_activator` (+ `_elevate`), `move_activator`, `null_activator`.
   - Platform/integration: `nexus_integration`, `browse_nexus`, `gamemode_management`, `gameversion_management`, `profile_management`, `category_management`, `collections_integration`, `updater`, `health_check`, `recovery`.
   - UI/dashlets: `dashboard`, `*_dashlet` (announcement, firststeps, news, starter, mod_spotlights, onboarding), `settings_*`.
   - Note: `extensions/collections/` phased-install logic actually lives at `src/renderer/src/extensions/mod_management/InstallManager.ts` (see Collections below) — the `AGENTS-COLLECTIONS.md` path `src/extensions/...` is stale.

2. **Bundled extensions** — `extensions/` at repo root. Separately-bundled extensions shipped with the app (rolldown via `scripts/extensions-rolldown.mjs`). Includes:
   - Gamebryo/Bethesda stack: `gamebryo-plugin-management`, `gamebryo-archive-*`, `gamebryo-bsa-support`, `gamebryo-savegame-management`, etc.
   - Game-store integrations: `gamestore-gog`, `gamestore-origin`, `gamestore-uplay`, `gamestore-xbox`, `gameinfo-steam`.
   - Modtypes: `modtype-bepinex`, `modtype-dazip`, `modtype-dinput`, `modtype-enb`, `modtype-gedosato`, `modtype-umm`.
   - Tooling: `collections`, `mod-dependency-manager`, `fnis-integration`, `script-extender-installer`, `nmm-import-tool`, `mo-import`, `meta-editor`, `quickbms-support`, `mtframework-arc-support`, and more.
   - **`extensions/games/`** — 86 first-party `game-*` extensions (one folder per game). These are the in-tree equivalents of the third-party extensions in `ChemBoy1-Vortex-Games`.

A reference scaffold for new extensions lives at `samples/sample-extension/` (per AGENTS-DIRECTORIES). Extension authoring against the published API: see `REGISTER_GAME.md` and the `vortex-api` type declarations.

### Collections & phased install

Collections install in **phases**; each phase must complete and deploy before the next starts (Phase 0 = framework mods like SMAPI, Phase 1+ = content). Core logic + invariants live in `InstallManager.ts` (`mInstallPhaseState`, `ensurePhaseState`, `markPhaseDownloadsFinished`, `maybeAdvancePhase`, `pollPhaseSettlement`, `startPendingForPhase`). Rule of thumb when touching it: never bypass phase gating, check both `active === 0` and `pending === 0` before deploying, keep `isDeploying` accurate. Tests: `__tests__/PhasedInstaller.test.ts`. See `COLLECTIONS_FEATURE.md` for the registration API.

## How Vortex works (runtime flow)

This is the practical orchestration that happens inside the app at runtime. The *contracts* extensions implement (`IGame`, `TestSupported`/`InstallFunc`, `IDeploymentMethod`, manifest shapes) are covered by the authoring docs in this folder — pointers inline. What follows is how the app drives them. Almost all of this lives in two core extensions: `gamemode_management/` and `mod_management/` (under `src/renderer/src/extensions/`).

> **Each runtime subsystem now has its own deep-dive doc** (this section is the summary). Per-topic
> full docs: `VORTEX_GAME_LIFECYCLE.md` · `VORTEX_MOD_INSTALL.md` · `VORTEX_DEPLOYMENT.md` ·
> `VORTEX_PROFILES.md` · `VORTEX_LOAD_ORDER.md` · `VORTEX_EVENT_BUS.md` · `VORTEX_DOWNLOAD_MGMT.md`
> · `VORTEX_NEXUS_INTEGRATION.md` · `VORTEX_EXTENSION_LOADING.md` · `NOTIFICATIONS_DIALOGS.md`
> (Runtime model section).

### 1. Game lifecycle

- **Known games registry.** Every `context.registerGame(...)` (from a bundled or third-party extension) adds an `IGame` to `GameModeManager`'s `mKnownGames`. Game stores (`gamestore-steam`/`gog`/`xbox`/...) register as `IGameStore` in `mKnownGameStores`. (`gamemode_management/GameModeManager.ts`, registration contract: `REGISTER_GAME.md`.)
- **Discovery** — finding where a game is installed. Three paths in `gamemode_management/util/discovery.ts`:
  - `quickDiscovery` — asks each game's store/`queryPath` + each registered game store; fast, runs on startup. Calls back `onDiscoveredGame` -> writes an `IDiscoveryResult` into state.
  - `searchDiscovery` — full filesystem walk of chosen drives (user-triggered "Scan" when quick discovery misses).
  - `quickDiscoveryTools` / `discoverRelativeTools` — locate tools/script extenders relative to the game.
  - `suggestStagingPath` picks the default mod staging folder for a freshly discovered game.
- **Activating a game** (managing it) — `GameModeManager.setGameMode(old, new, profileId)` -> `setupGameMode()` runs the game's `setup()` (creates staging dir via `fs.ensureDirWritableAsync`, etc.), then the app emits **`gamemode-activated`** with the game id. This is the signal nearly every feature waits on (deploy validators, load-order pages, plugin management all hook it). `requiresLauncher` resolution happens here too (see `REQUIRES_LAUNCHER.md`).
- **Discovery results vs known games:** `mKnownGames` = what *can* be managed; `state.settings.gameMode.discovered` = what was *found on disk*. A game is manageable only when discovered + valid (`isValidGame`).

### 2. Mod install pipeline

Driven by `mod_management/InstallManager.ts` (large file; phased-install invariants in `mInstallPhaseState`).

1. **Trigger** — an archive lands (download finished, drag-drop, or collection). The app emits **`start-install`** (archive path) or calls `InstallManager.install(...)` directly. `installDependencies` / `installRecommendations` handle collection/dependency trees.
2. **Game id** — `util/queryGameId.ts` decides which game the archive belongs to (download metadata, active game, or user prompt).
3. **Pick an installer** — `InstallManager.installInner` runs registered installers in **priority order** (lower number first). Each installer is a `{ priority, testSupported, install }` triple added via `context.registerInstaller` / `addInstaller`. First `testSupported` returning `{ supported: true }` wins. FOMOD (`installer_fomod_*`) is the high-priority fallback for `ModuleConfig.xml`; the generic `basicInstaller` (`util/basicInstaller.ts`) is the catch-all. (Contract: `INSTALLER_SYSTEM.md`, `FOMOD_INSTALLER.md`.)
4. **Run install** — the chosen `install()` returns `IInstallResult` = a list of `IInstruction`s (copy, mkdir, generatefile, iniedit, setmodtype, attribute, rule, submodule, enableallplugins, …). `InstallManager`'s instruction-collector class buckets them by type.
5. **Stage** — the archive is extracted and instructions applied into the **staging folder** (`util/getInstallPath.ts`, `stagingDirectory.ts`) under a per-mod `installationPath` folder. Variant mods append `+variant` to the folder name. The mod is now *installed* (in state) but **not yet on disk in the game** — that's deployment.
6. **Modtype** — `setmodtype` instructions / modtype extensions (`modtype-*`) route a mod's files to a destination other than the game's data dir (e.g. BepInEx, ENB). Each modtype supplies its own target path.
7. **Collections** install in phases (Phase 0 framework -> Phase 1+ content); each phase must deploy before the next (`COLLECTIONS_FEATURE.md`, AGENTS-COLLECTIONS).

`simulate()` is a dry-run that produces instructions without committing — used for previews and conflict detection.

### 3. Deployment (staging -> game)

Deployment is what makes staged mods actually present in the game folder. Methods are pluggable **activators**.

- **Activator registry** — `util/deploymentMethods.ts`: `registerDeploymentMethod(activator)` adds an `IDeploymentMethod`; `getSupportedActivators` filters by `isSupported(state, gameId, modType)`; `getCurrentActivator` / `getSelectedActivator` pick the one in use. Sorted by `priority` (lower = preferred).
- **Built-in activators** (each `extensions/<name>/index.ts`, all but null extend `LinkingDeployment` / `LinkingActivator`):
  - `hardlink_activator` (priority 5) — hard links staging files into the game dir (same volume required). Default when supported.
  - `symlink_activator` (+ `symlink_activator_elevate` for permission elevation) — symbolic links.
  - `move_activator` — moves files (cross-volume, no link support).
  - `null_activator` — no-op (for games that read mods from the staging folder directly).
- **Deploy sequence** — `modActivation.ts` `deployMods()`:
  1. `ensureWritable` + `getNormalizeFunc` on the destination.
  2. `method.prepare(dest, clean, lastActivation, normalize)`.
  3. For each enabled mod: `method.activate(modPath, mod.installationPath, subDir(mod), skipFiles)`. `fileOverrides` add to `skipFiles` so a higher-priority mod's file wins (conflict resolution).
  4. Activate the **merged** folder (`MERGED_PATH[.typeId]`) holding `registerMerge` outputs (see `REGISTER_MERGE.md`).
  5. `method.finalize(...)` -> writes the **deployment manifest** (list of `IDeployedFile`) and reports progress.
- **Event flow** around deploy (wired in `mod_management/index.ts`):
  - `will-deploy` (emitAndAwait) -> handlers may adjust state before files move.
  - actual deploy -> `did-deploy` (emitAndAwait) + `mods-did-deploy`.
  - `deploy-single-mod`, `purge-mods`, `purge-mods-in-path`, `await-activation` for targeted ops.
- **Deployment is triggered** by `mods-enabled` / `mod-enabled` events (debounced), on `gamemode-activated`, and manually. The manifest lets Vortex know what *it* put there so it can purge/redeploy and detect **external changes** (`util/externalChanges.ts`). Manifest shape + caching: `DEPLOYMENT_MANIFEST.md`.
- **Purge** (`util/deploy.ts` `purgeMods` / `purgeModsInPath`) removes everything Vortex deployed, restoring the game folder, using the manifest. Always purge-before-redeploy when switching activators or profiles.

### 4. Profiles

- A **profile** is a named per-game set of enabled mods + their state (`profile_management/`). Mod enablement is **per profile**, not global — switching profiles changes which mods deploy.
- `profile_management/sync.ts`: `syncToProfile` / `syncFromProfile` reconcile the profile's mod-enabled map with current mods.
- Switching profiles emits `profile-will-change` -> (purge) -> `profile-did-change` -> (redeploy). `mod-enabled` / `mods-enabled` on the active profile schedule a deploy.
- Profiles also own **load order** and (for Gamebryo) plugin enablement, so a profile fully captures a playthrough's setup.

### 5. Load order

- **File-based load order (FBLO)** — `file_based_loadorder/` is the modern generic system: extensions register via `registerLoadOrder`, items render with a drag-and-drop list, order persists per profile and is serialized to a game file (e.g. `mods.txt`). `mod_load_order/` is the older renderer-page variant. (Contracts: `LOAD_ORDER_REGISTRATION.md`, `LOAD_ORDER_ITEM_RENDERER.md`.)
- **Gamebryo plugins** — Bethesda games use a separate plugin (`.esp`/`.esl`) load-order system in the `gamebryo-plugin-management` bundled extension (LOOT sorting, `plugins.txt`). Distinct from FBLO. (`GAMEBRYO_PLUGIN_SYSTEM.md`.)
- Collections capture and restore load order (`file_based_loadorder/collections/`, `genCollectionLoadOrder`).

### 6. Event bus — the glue

Vortex features are loosely coupled through the event bus (`api.events.on` / `api.emitAndAwait` / `api.onAsync`). The end-to-end happy path:

```text
download-finished
  -> start-install -> InstallManager.install -> (extract + instructions) -> staged
  -> mod state added; user enables -> mod-enabled / mods-enabled
  -> (debounced) will-deploy -> deployMods (activator) -> did-deploy / mods-did-deploy
gamemode-activated  -> validators, LO pages, plugin mgmt, redeploy check
profile-will-change -> purge -> profile-did-change -> redeploy
```

Full event catalog + signatures: `EVENTS.md`. `registerTest`/health checks fire on `gamemode-activated` to validate the activator, staging folder, and pending transfers. Event-bus **mechanism** (enqueue, will-/did-, deferred `once`): `VORTEX_EVENT_BUS.md`.

### 7. Download management

Vortex's built-in download manager (not the requirements auto-downloader). The transfer runs in the **main** process (`src/main/src/downloading/` — `DownloadManager`, chunked + `Range`-resume, `PQueue` concurrency, retry); the renderer `download_management` core ext owns Redux state (`persistent.downloads.files`), protocol handlers (`http`/`https`; `nxm` from nexus), and the speed throttle; `IPCDownloadAdapter` bridges them. State machine: `init -> started -> paused -> finalizing -> finished` (`failed`/`redirect`). Flow: URL → protocol resolve → enqueue → chunked download → `download-finished` → `start-install-download`. Full doc: `VORTEX_DOWNLOAD_MGMT.md`.

### 8. Nexus integration

`nexus_integration` core ext. OAuth (primary) + SSO login, credentials in `confidential.account.nexus.OAuthCredentials`; login completes via an `nxm://…oauth` callback. `NXMUrl` parses `nxm://` links (types `mod`/`collection`/`oauth`/`premium`) and the `nxm` protocol resolves them to time-limited download URLs. Mod version checks (`checkModVersion` on `gamemode-activated`), endorsements, categories, feedback are wired as events. Two clients (v1 nexus-node + v3). Full doc: `VORTEX_NEXUS_INTEGRATION.md`.

### 9. Extension loading & init

`ExtensionManager` discovers core (compiled-in), bundled-plugin, and dynamic/user extensions, loads each `init(context)`. The `context` is a **recording Proxy** — `register*`/`once` calls are buffered, not executed. After all inits run, the manager replays them (`apply`), attaches persistors, then runs every `once`/`onceMain` in series (`doOnce`). Failures are isolated per extension. Full doc: `VORTEX_EXTENSION_LOADING.md`.

### 10. Notifications & dialogs

Notifications are session-state entries deduped by `id` (re-send updates in place); `GlobalNotifications` mirrors important ones to OS-native notifications. `showDialog` is a thunk returning a `Promise<IDialogResult>` resolved (via `DialogCallbacks`) when the user picks an action — modal, one at a time. Full doc: `NOTIFICATIONS_DIALOGS.md` (Runtime model section).

## Internal packages (`packages/`)

| Package | npm name | Role |
| --- | --- | --- |
| `vortex-api` | `@nexusmods/vortex-api` | The published extension-facing API (build with `pnpm run api`) |
| `adaptor-api` | `@nexusmods/adaptor-api` | Adaptor API surface |
| `adaptors` | — | Adaptor implementations |
| `nexus-api-v3` | `@vortex/nexus-api-v3` | Nexus Mods v3 API client |
| `exe-version` | `exe-version` | Read version info from Windows PE executables (pure TS) |
| `icon-extract` | `icon-extract` | Extract icons from Windows PE executables (pure TS) |
| `pe-resources` | `pe-resources` | Shared PE resource-section parser (backs `exe-version` + `icon-extract`) |
| `extension-test-mocks` | `@vortex/extension-test-mocks` | Mocks for testing extensions |
| `game-extension-test` | `@vortex/game-extension-test` | Test harness for game extensions |
| `e2e` | `@vortex/e2e` | Playwright E2E runner |

> The `AGENTS-DIRECTORIES.md` "Packages" section lists `paths`, `paths-node`, `game-extension-helpers`, `install-entries` — those do **not** exist in the current tree; use the table above.

## Testing

- **Unit/integration:** vitest, colocated `*.test.ts`. Run a single file with `pnpm run test -- <path>`. Extension tests that import `vortex-api` need a local `vitest.config.ts` alias to `__mocks__/vortex-api.ts`, mocking only the used exports (see `AGENTS-TESTING.md`).
- **E2E:** Playwright via `@vortex/e2e` (`pnpm run e2e`). `VORTEX_E2E=1` plus `ELECTRON_USERDATA`/`ELECTRON_APPDATA` isolate each worker's data. Setup conventions in `Vortex/AGENTS-TESTING.md` and the playwright README.

## Release & branching

- **`master` is home** — main development line. Each version stabilises on its own branch (`v2.0`, `v2.1`, …) cut from master; alpha/beta/stable all live on that branch. Tags are semver (`v2.0.0-beta.1`, `v2.0.0`, patch `v2.0.1`). No separate hotfix branches — hotfixes go on the release branch. (`docs/branching-and-release-strategy.md`, `docs/cherry-pick-workflow.md`.)
- **Cadence:** 2-week beta cycle — beta cut from master on a Monday, promoted to stable 2 weeks later. Three update channels: Stable (default), Beta, No-auto-update. Nightly unpacked artifacts on GitHub Actions (`nightly.yml`), not pushed via update channel. (`RELEASES.md`.)
- **API for extension devs:** `@nexusmods/vortex-api` published to NPM with every beta + stable (first stable `2.2.0`, 2026-06-30). NPM is now the only distribution channel — the standalone `Nexus-Mods/vortex-api` GitHub repo was archived on 2026-07-14 and its sync workflows removed (PR #23679). Breaking changes get a ~2-release / 4-week deprecation window where possible; affected authors notified. (`RELEASES.md`, `packages/vortex-api/docs/MIGRATION.md` — see `VORTEX_2_MIGRATION.md`.)
- **Release tooling:** `docs/publishing-releases.md`, `scripts/publish-release-to-nexus/`, `docs/packaging/`, `docker/`, `flatpak/` (Linux).

## Code style highlights (`CODESTYLE.md`)

- Airbnb baseline. Soft 100 / hard 150 char lines; soft 25-line functions.
- ES6 `async`/`await`, **no Bluebird** (`.catch(Type, fn)` and `Promise.map` are banned).
- Naming: `I`-prefixed interfaces, `m`-prefixed private members, PascalCase types/enums/components, `UPPER_SNAKE_CASE` exported consts.
- All front-end text localizable + static; dynamic error-message parts go in quotes so error-report grouping ignores them.
- Files primarily containing a class/component are UpperCamelCase; free-function files are lowerCamelCase.

## AGENTS docs in-repo (quick map)

| File | Use |
| --- | --- |
| `AGENTS.md` | Entry: use `pnpm run`; run build/test/lint/format after changes |
| `AGENTS-DIRECTORIES.md` | Navigation map (note stale Packages section) |
| `AGENTS-TESTING.md` | vitest + mock-alias conventions |
| `AGENTS-DEBUGGING.md` | F5 debug both processes; `VORTEX_TRACE_DB_WRITES` |
| `AGENTS-COLLECTIONS.md` | Phased install (note stale `src/extensions/...` path) |
| `CONTRIBUTE.md` / `CODESTYLE.md` | Setup + code standards |

## See also (extension-API docs)

`node_modules/vortex-api/lib/api.d.ts` (the full typed API surface) · `VORTEX_2_MIGRATION.md` (1.16->2.0 + NPM package) · `REGISTER_GAME.md` · `INSTALLER_SYSTEM.md` · `COLLECTIONS_FEATURE.md` · `EVENTS.md` · `STATE_HELPERS.md` · `UNDERUSED_API_FUNCTIONS.md`.
