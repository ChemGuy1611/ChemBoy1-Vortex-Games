# Vortex Mod Install Pipeline (runtime)

How the app turns a downloaded archive into an **installed** mod sitting in the staging folder.
"Installed" is **not** "deployed" — deployment (staging → game folder) is a separate step covered
in `VORTEX_DEPLOYMENT.md`. The contract an installer implements (`TestSupported` / `InstallFunc` /
`IInstruction` / FOMOD `ModuleConfig.xml`) is the authoring view: see `INSTALLER_SYSTEM.md` and
`FOMOD_INSTALLER.md`.

Driver: `mod_management/InstallManager.ts` (very large — ~7k lines) in the `mod_management` core
extension.

## Trigger

An archive becomes a mod via one of:

- **`start-install`** event (archive path) — emitted after `download-finished`, drag-drop, or
  "Install from file".
- **`InstallManager.install(...)`** called directly.
- **Collections / dependencies** — `installDependencies` / `installRecommendations` walk a
  collection or dependency tree, emitting `will-install-dependencies` and installing each entry.

## 1. Determine the game id

The archive must be tied to a game. `InstallManager` resolves it from the download's reported
`downloadGameId`, runs it through `convertGameIdReverse(games, gameId)` (Nexus domain → Vortex id),
and falls back to the active profile's `gameId` (`activeProfile(state).gameId`) or a user prompt
when ambiguous. See `mod_management/util/queryGameId.ts`.

## 2. Pick an installer (priority order)

Installers are registered with **`addInstaller(id, priority, testSupported, install)`** (the
public side of `context.registerInstaller`). The list `mInstallers` is **sorted ascending by
priority — lower number = higher priority**. Selection is `getInstaller(fileList, gameId,
archivePath)`, which walks the sorted list and returns the **first** installer whose
`testSupported(...)` resolves `{ supported: true }` (it recurses to the next offset on
`false`/`undefined`; an installer returning `undefined` is logged as "Buggy installer").

- **FOMOD** (`installer_fomod_native` / `_ipc` / `_shared` / `installer_nested_fomod`) is the
  high-priority handler for archives containing `ModuleConfig.xml`.
- The generic **`basicInstaller`** (`mod_management/util/basicInstaller.ts`) is the low-priority
  catch-all that copies everything.
- A `testSupported` may also return `requiredFiles` so the manager knows which files matter.

## 3. Run the installer → instructions

The chosen `install()` returns an `IInstallResult` = a list of `IInstruction`s. `InstallManager`
sorts them into buckets via `transformInstructions(...)` → an **`InstructionGroups`** object with
one array per instruction type:

| Type | Effect |
| --- | --- |
| `copy` | Copy a file from the archive into staging |
| `mkdir` | Create an (often empty, stop-folder) directory |
| `generatefile` | Write a file from in-memory data |
| `iniedit` | Apply an INI tweak |
| `setmodtype` | Route the mod to a non-default destination (modtype) |
| `attribute` | Set a mod attribute in state |
| `rule` | Add a mod rule (dependency/conflict) |
| `submodule` | Recurse — install a nested archive as its own mod |
| `enableallplugins` | Enable all Gamebryo plugins the mod ships |
| `unsupported` / `error` | Collected for reporting |

### Override instructions

`processInstructions` first builds an `overrideMap` keyed by `source ?? type` (upper-cased) from
`result.overrideInstructions`, then rewrites matching base instructions — this lets a wrapper
adjust an installer's output. Overrides are **suppressed during collection installs**
(`installing_dependencies` activity running) to avoid compounding complexity. A `setmodtype`
override is dropped if the target modtype doesn't exist for the game.

Empty/`null` instructions are treated as "installer already reported the failure"
(`UserCanceled`); empty array → `ProcessCanceled("Empty archive or no options selected")`.

## 4. Stage the files

The archive is extracted (`extractArchive`) and the bucketed instructions are applied into the
**staging folder**: `mod_management/util/getInstallPath.ts` + `stagingDirectory.ts` give the
per-game staging root, and each mod lands in its own `installationPath` subfolder. The mod name
on disk derives from the archive name; **variant** installs append `+<variant>` to the folder
name (`util/modName.ts`). At this point the mod exists in `state.persistent.mods[gameId][modId]`
with state `installed` — but nothing is in the game folder yet.

## 5. Mod type routing

`setmodtype` instructions (or modtype auto-detection, `determineModType`, which sorts candidate
modtypes by `priority`) assign the mod a **modtype**. The modtype supplies a destination other
than the game's data dir (BepInEx, ENB, dinput, etc. — `modtype-*` extensions). Deployment later
sends that mod's files to the modtype's path.

## 6. Collections install in phases

Collection installs run **phased** (`mInstallPhaseState` in `InstallManager`): Phase 0 = framework
mods (e.g. SMAPI), Phase 1+ = content. Each phase must finish downloading **and** deploy before
the next starts. See `VORTEX_APP.md` "Collections & phased install" and `COLLECTIONS_FEATURE.md`.

## `simulate()` — dry run

`InstallManager.simulate(...)` runs the same installer selection + instruction generation **without
committing** — used for previews and conflict detection (it builds the file list, picks the
installer, and returns the instructions).

## Events (runtime)

| Event | Purpose |
| --- | --- |
| `start-install` (archivePath) | Kick off an install for a downloaded archive |
| `will-install-dependencies` (gameId, modId, isRecommended, cb) | Collection/dependency tree about to install |
| `did-install-mod` (gameId, archiveId, modId, modInfo) | A mod finished installing |
| `did-install-dependencies` / related | Dependency/collection completion |

## Gotchas

- Lower priority number wins — FOMOD sits high (small number) so it pre-empts `basicInstaller`.
- A `testSupported` that returns `undefined` is a bug and logged as such; it does **not** select
  the installer.
- Override instructions are intentionally disabled inside collection installs.
- Installed ≠ deployed. The mod is in state and staging only; enabling + deploying is what puts
  files in the game (`VORTEX_DEPLOYMENT.md`).

## See also

Runtime siblings: `VORTEX_GAME_LIFECYCLE.md`, `VORTEX_DEPLOYMENT.md`, `VORTEX_DOWNLOAD_MGMT.md`,
`VORTEX_EVENT_BUS.md`. Overview: `VORTEX_APP.md`. Authoring: `INSTALLER_SYSTEM.md`,
`FOMOD_INSTALLER.md`.
