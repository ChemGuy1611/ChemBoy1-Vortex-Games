# Vortex State Tree and Selectors

Where the Redux state a game extension reads actually lives, and the `selectors.*` functions that read it.

Source: `src/renderer/src/types/IState.ts` (shapes), `src/renderer/src/util/selectors.ts` (the `selectors` barrel, re-exporting `download_management`, `profile_management`, `mod_management`, `gamemode_management` and a few UI selectors). Read state with `api.getState()` (same as `api.store.getState()`).

---

## Root slices

| Slice          | Lifetime                                             | Holds                                                                                   |
| -------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `settings`     | Saved across restarts (`VORTEX_DATABASES.md`)        | User choices: discovered games, active profile, install/download paths, deploy method   |
| `persistent`   | Saved across restarts                                | Data: profiles, mods, downloads, load orders, deployment flags, categories              |
| `session`      | In memory, reset every start                         | Runtime: known games, running activities, conflicts, notifications, dialogs             |
| `app`          | Saved                                                | Vortex version, instance id, extension enable state, applied migrations                 |
| `user`, `confidential` | Saved                                        | Account and login data; not for game extensions                                         |

Every slice is extended by extensions through `registerReducer` (`SETTINGS_REDUCER.md`), so the paths below are the ones core and its bundled extensions guarantee, not the full tree.

---

## Paths a game extension reads

| Path                                                     | Shape                                                   | Selector                                                     |
| -------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| `settings.gameMode.discovered[gameId]`                   | `IDiscoveryResult` (`path`, `store`, `tools`, …)        | `discoveryByGame(state, gameId)`, `currentGameDiscovery`     |
| `session.gameMode.known`                                 | `IGameStored[]` (every registered game, serialized)     | `knownGames`, `gameById(state, gameId)`, `currentGame`       |
| `settings.profiles.activeProfileId`                      | profile id                                              | `activeProfileId`, `activeProfile`                           |
| `settings.profiles.lastActiveProfile[gameId]`            | profile id                                              | `lastActiveProfileForGame(state, gameId)`                    |
| `persistent.profiles[profileId]`                         | `IProfile` (`gameId`, `name`, `modState`, `features`, `lastActivated`) | `profileById(state, id)`, `gameProfiles` (active game only) |
| `persistent.profiles[id].modState[modId]`                | `{ enabled, enabledTime }`                              | none                                                         |
| `persistent.mods[gameId][modId]`                         | `IMod` (`id`, `state`, `type`, `installationPath`, `attributes`, `rules`, `fileOverrides`, `enabledINITweaks`) | `modsForGame(state, gameId)`, `getMod(state, gameId, modId)` |
| `persistent.loadOrder[profileId]`                        | game's load order (`VORTEX_LOAD_ORDER.md`)              | none                                                         |
| `persistent.downloads.files[dlId]`                       | `IDownload` (`state`, `game[]`, `localPath`, `modInfo`, `fileMD5`, …) | `downloadsForGame(state, gameId)`, `getDownloadByIds` |
| `settings.mods.installPath[gameId]`                      | **pattern** with `{USERDATA}`, `{GAME}`, `{USERNAME}`; may be unset | `installPathForGame(state, gameId)` (resolved)   |
| `settings.downloads.path`                                | pattern, same placeholders                              | `downloadPathForGame(state, gameId)` (resolved)              |
| `settings.mods.activator[gameId]`                        | deployment method id the user picked (may be unset)     | `activatorForGame(state, gameId)`; `util.getCurrentActivator` resolves the effective one |
| `persistent.deployment.needToDeploy[gameId]`             | boolean                                                 | `needToDeployForGame(state, gameId)`                         |
| `persistent.deployment.purged[gameId]`                   | `true` after a completed purge, `false` after the next deploy | `purged(state)` (active game only)                     |
| `settings.automation`                                    | `{ deploy, install, enable, start, minimized }` booleans | none                                                        |
| `settings.interface.primaryTool[gameId]`                 | tool id used by the dashboard's Play button             | none (`GAME_LAUNCHING.md` "Tool records and the actions that change them") |
| `session.base.activity[group]`                           | ids of running activities per group; group `mods` holds `deployment`, `purging`, `installing`, `deployment_pending`, `conflicts`; dependency installs run as `installing_dependencies` | none |
| `session.dependencies.conflicts`                         | `{ [modId]: IConflict[] }` (`MOD_CONFLICTS.md`)         | none                                                         |
| `settings.notifications.suppress[notificationId]`        | `true` when the user chose "never show again"           | none                                                         |

`settings.automation.deploy` is the "Deploy mods when enabled" toggle: when it is off, enabling a mod only sets `needToDeploy`. An extension that requires deployment for its own work (writing a load order file, for example) should check `needToDeployForGame` rather than assume a deploy followed.

---

## Selector reference

Selectors without a `gameId` parameter read the **active** game, which is derived from the active profile (`activeGameId` = `activeProfile(state).gameId`), so they return `undefined` while no game is managed.

| Selector                                         | Returns                                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `activeGameId(state)`                            | Active profile's game id, or `undefined`                                                      |
| `activeProfile(state)` / `activeProfileId`       | Active `IProfile` / its id                                                                    |
| `nextProfileId(state)`                           | Profile id being switched to during a profile change                                          |
| `profileById(state, profileId)`                  | `IProfile`; `undefined` for an undefined id                                                   |
| `lastActiveProfileForGame(state, gameId)`        | Last profile id used for that game; **`undefined` if the game was never activated** in Vortex |
| `lastActiveProfiles(state)`                      | The whole `{ [gameId]: profileId }` map                                                       |
| `gameProfiles(state)`                            | Profiles of the active game                                                                   |
| `enabledModCountForProfile(state, profileId)`    | Count of enabled mods whose state is `installed`                                              |
| `knownGames(state)` / `gameById(state, gameId)`  | Registered games as `IGameStored` (functions serialized away); use `util.getGame(id)` for the live `IGame` |
| `currentGame(state)`                             | `IGameStored` of the active game                                                              |
| `discovered(state)` / `discoveryByGame(state, id)` / `currentGameDiscovery(state)` | Discovery results                                           |
| `gameName(state, gameId)`                        | Display name from discovery, else from the known games list                                   |
| `installPath(state)` / `installPathForGame(state, gameId)` | Resolved staging folder                                             |
| `modPathsForGame(state, gameId)`                 | `game.getModPaths(discovery.path)`, or `undefined` if undiscovered (`MOD_TYPES.md`)           |
| `modsForGame(state, gameId)` / `modsForActiveGame(state)` | `{ [modId]: IMod }`, `{}` when none                                                  |
| `getMod(state, gameId, modId)`                   | One `IMod`; a **number** `modId` is matched against `attributes.modId` (Nexus id) instead     |
| `getModInstallPath(state, gameId, modId)`        | Absolute staging folder of one mod                                                            |
| `modNameByStagingFolder(state, gameId)`          | `Map` of staging folder name to display name                                                  |
| `currentActivator(state)` / `activatorForGame(state, gameId)` | User-selected method id; `activatorForGame` **throws** for an undefined `gameId`  |
| `needToDeploy(state)` / `needToDeployForGame(state, gameId)` | Pending-deployment flag                                                            |
| `purged(state)`, `purgesRunning(state)`, `purgeForGame(state, gameId)` | Purge state and running purges                                           |
| `downloadPath(state)` / `downloadPathForGame(state, gameId?)` | Resolved download folder                                                          |
| `downloadsForGame(state, gameId)`                | **Finished** downloads assigned to the game                                                   |
| `downloadsForActiveGame(state)`                  | Returns a **selector function**, not the downloads; call `downloadsForGame(state, activeGameId(state))` instead |
| `activeDownloads(state)` / `queueClearingDownloads(state)` | Downloads in `started`/`finalizing` / `started`/`paused`/`init`                     |
| `getDownloadByIds(state, { gameId, modId, fileId })` | Download matching Nexus ids                                                               |
| `mainPage(state)`, `secondaryPage(state)`, `notifications(state)` | UI state                                                                     |

Nexus, analytics, telemetry and collection-session selectors are also in the barrel; they are not useful to a game extension.

---

## Gotchas

- **Raw path patterns.** `settings.mods.installPath[gameId]` and `settings.downloads.path` hold patterns like `{USERDATA}\{GAME}\mods`, and an unset install path means the default `{USERDATA}\{GAME}\mods`. Always go through `installPathForGame` / `downloadPathForGame`.
- **`lastActiveProfileForGame` can be `undefined`.** Repo code calls it in event handlers that can fire for a game the user has never activated (a download for that game, startup checks). Guard before `profileById`.
- **Stored games carry no functions.** `knownGames` / `gameById` / `currentGame` give `IGameStored`, whose `executable` is a string and which lacks `queryModPath`, `getModPaths`, `setup` and so on.
- **Session is empty at `main()` time.** Read state inside `context.once`, event handlers or `setup`, never during registration.
- **Cached selectors key on their argument.** `profileById`, `gameById`, `discoveryByGame`, `installPathForGame` and the other `(state, id)` selectors are memoized per id; they are cheap to call repeatedly, but do not mutate what they return.

---

## See also

`STATE_HELPERS.md` (reading and patching state safely, `batchDispatch`). `SETTINGS_REDUCER.md` (adding your own slice with `registerReducer`). `VORTEX_DATABASES.md` (how `settings`/`persistent` are stored on disk). `VORTEX_PROFILES.md` (profile switching and `modState`). `VORTEX_LOAD_ORDER.md` (`persistent.loadOrder`). `VORTEX_DEPLOYMENT.md` (`needToDeploy`, `purged`, activators). `MOD_CONFLICTS.md` (`session.dependencies`). `GAME_LAUNCHING.md` (tool state and the primary tool).
