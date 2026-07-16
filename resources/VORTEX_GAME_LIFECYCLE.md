# Vortex Game Lifecycle (runtime)

How the Vortex app **drives** a game from "known to exist" through "discovered on disk" to
"actively managed" (`gamemode-activated`). This is the **app-runtime** view — the contract an
extension implements (`IGame`, `queryPath`, `setup`, `requiresLauncher`, tools) is covered by the
authoring docs: see `REGISTER_GAME.md`, `REQUIRES_LAUNCHER.md`, and `RUN_EXECUTABLE.md`.

Almost everything here lives in the `gamemode_management` core extension
(`Vortex/src/renderer/src/extensions/gamemode_management/`), centered on `GameModeManager.ts`.

## Two registries: "can manage" vs "found on disk"

| Concept | Where | Meaning |
| --- | --- | --- |
| Known games | `GameModeManager.mKnownGames` (`IGame[]`) | Every `context.registerGame(...)` from a bundled or third-party extension. What Vortex *could* manage. |
| Game stubs | `GameModeManager.mGameStubs` | Registered-but-not-installed game extensions (downloadable on demand). |
| Known game stores | `GameModeManager.mKnownGameStores` (`IGameStore[]`) | `Steam`, `EpicGamesLauncher`, plus `gamestore-*` extensions. Used during discovery. |
| Discovered games | `state.settings.gameMode.discovered[gameId]` (`IDiscoveryResult`) | What was actually *found on disk* — has a `path`, `store`, `tools`, `environment`. |

A game is manageable only when it is **both** a known game **and** discovered with a valid `path`
(`isValidGame`). `mKnownGames` answers "is this game supported"; `discovered` answers "do we know
where it is".

## Discovery — locating games on disk

All in `gamemode_management/util/discovery.ts`. Results are reported through an `onDiscoveredGame`
callback that writes an `IDiscoveryResult` into `state.settings.gameMode.discovered`.

- **`quickDiscovery(knownGames, discoveredGames, onDiscoveredGame, onDiscoveredTool)`** — the fast
  startup path. For each game it tries, in order: previously manually-configured paths
  (`updateManuallyConfigured`), each registered game store (`findByAppId`/store lookups), then the
  game's own `queryPath()`. Runs on startup (guarded off when `VORTEX_E2E === "1"` so tests set
  paths deterministically). Also kicks `quickDiscoveryTools` + `discoverRelativeTools` per game.
- **`searchDiscovery(searchPaths, knownGames, onDiscoveredGame, onDiscoveredTool, progressCB)`** —
  the heavy fallback: a full filesystem walk (`turbowalk`) of the chosen drives, matching each
  game's expected files. User-triggered "Scan" when quick discovery misses. Reports progress and
  is cancellable (`stopSearchDiscovery` / `cancel-discovery`).
- **`quickDiscoveryTools(gameId, supportedTools, onDiscoveredTool)`** — locate a game's tools /
  script extenders via each tool's `queryPath()`.
- **`discoverRelativeTools(game, gamePath, discoveredGames, onDiscoveredTool, normalize)`** — walk
  the game folder to find tools whose location is relative to the game.
- **`suggestStagingPath(api, gameId)`** — picks the default mod-staging folder for a freshly
  discovered game.
- **`assertToolDir(tool, testPath)`** — sanity-check a tool/game directory exists before use.

`onDiscoveredGame(gameId, undefined)` clears a discovery (game disappeared). On startup,
`removeDisappearedGames` reconciles previously-discovered games that no longer exist on disk.

## Activating a game (managing it)

Activation is **driven by the active profile**, not selected directly. The trigger is a change to
`state.settings.profiles.activeProfileId`, watched in `gamemode_management/index.ts` via
`onStateChange(['settings','profiles','activeProfileId'], ...)`. From the new profile's
`persistent.profiles[id].gameId`, the app runs `changeGameMode(oldGameId, newGameId, profileId)`:

1. Reject early if `newGameId` is undefined or `getGame(newGameId)` is unknown.
2. Show a **"Preparing game for modding"** `activity` notification (dismissed in `finally`).
3. **`GameModeManager.setupGameMode(newGameId)`** — the per-game setup:
   - `assertToolDir` + `fs.statAsync(gameDiscovery.path)` confirm the folder still exists.
   - `game.getInstalledVersion(gameDiscovery)` is called **before** `game.setup` (so the
     gameversion-hash extension can read files before `setup` may lock them).
   - `game.setup(gameDiscovery)` runs the extension's setup (typically
     `fs.ensureDirWritableAsync` on the staging dir, requirement downloads, etc.). If a
     `contributed` (third-party) game's setup throws, `allowReport` is forced off.
4. Verify the mod path is still resolvable: `getGame(newGameId).getModPaths(discovery.path)`.
5. **`GameModeManager.setGameMode(oldMode, newMode, profileId)`**:
   - Resolve `modPath` via `game.queryModPath(path)` (made absolute if relative).
   - `assertToolDir` → `fs.statAsync(modPath)` → `ensureWritable(modPath)` → `getNormalizeFunc` →
     `discoverRelativeTools`.
   - **Only if the profile is still the active one** (`activeProfile(state).id === profileId`):
     call the activation callback, which **emits `gamemode-activated`** with the game id, and set
     the default `primaryTool` if one tool is flagged `defaultPrimary` and none is set yet.
6. On failure: `UserCanceled` / `ProcessCanceled` are silent (logged only); `SetupError` /
   `DataInvalid` show a non-reportable error; `ENOENT` shows a "missing file" dialog explaining
   partial-install / store / run-once / unknown-variant causes. **Any failure** ends with
   `setNextProfile(undefined)` — which bounces the user back to the dashboard ("Vortex bounced me
   back" reports trace here).

### `gamemode-activated` — the signal everything waits on

The emit in step 5 is wired in `index.ts` as the callback passed to the `GameModeManager`
constructor (`(gameMode) => events.emit('gamemode-activated', gameMode)`). Nearly every feature
hangs off this event: deployment redeploy/validators, load-order pages, plugin management, health
checks. It fires **after** the profile is already active and the UI is usable again — so handlers
must tolerate the user switching game/profile again immediately.

## Tools & launching

`primaryTool` (`state.settings.interface.primaryTool[gameId]`) is the tool the big play button
runs; `setGameMode` seeds it from a tool's `defaultPrimary` flag. Launching the game/tools and
`requiresLauncher` store-handoff are their own subsystem — see `RUN_EXECUTABLE.md` /
`REQUIRES_LAUNCHER.md` and `Vortex/src/renderer/src/util/StarterInfo.ts`.

## State paths touched

| Path | Role |
| --- | --- |
| `settings.gameMode.discovered[gameId]` | `IDiscoveryResult` per discovered game (path, store, tools, environment, hidden) |
| `settings.gameMode.searchPaths` | Drives to scan in `searchDiscovery` |
| `settings.profiles.activeProfileId` | Drives game activation (watched) |
| `persistent.profiles[id].gameId` | Maps the active profile to its game |
| `settings.interface.primaryTool[gameId]` | Default-launched tool |

## Events (runtime)

| Event | Direction | Purpose |
| --- | --- | --- |
| `gamemode-activated` (gameId) | emitted | Game is now managed — the universal "ready" signal |
| `discover-game` (gameId) | `onAsync` in | Quick-discover a single game on demand |
| `start-quick-discovery` (cb?) | on | Re-run quick discovery (also refreshes tools) |
| `discover-tools` (gameId) | `onAsync` in | Re-run tool discovery for a game |
| `start-discovery` | on | Open the drive-selection dialog, then `searchDiscovery` |
| `cancel-discovery` | on | Abort an in-progress search |
| `refresh-game-info` (gameId, cb) | on | Re-query game metadata |
| `manually-set-game-location` (gameId, cb) | on | User browses to the game folder |

## Gotchas

- Quick discovery is suppressed under `VORTEX_E2E=1`; tests set paths explicitly.
- `setupGameMode` can be called for a game whose discovery was reset between startup and the
  switch (e.g. uninstalled after `--game xyz`) — it rejects with `ProcessCanceled("game not
  discovered")` rather than crashing.
- The profile may change again mid-activation; `setGameMode` re-checks `activeProfile` before
  emitting `gamemode-activated`, and `changeGameMode`'s comment block warns handlers about this.
- A failed activation always clears the next profile (`setNextProfile(undefined)`) — the visible
  symptom is being dropped back to the dashboard.

## See also

Runtime siblings: `VORTEX_MOD_INSTALL.md`, `VORTEX_DEPLOYMENT.md`, `VORTEX_PROFILES.md`,
`VORTEX_EVENT_BUS.md`. Overview: `VORTEX_APP.md`. Authoring contracts: `REGISTER_GAME.md`,
`REQUIRES_LAUNCHER.md`, `RUN_EXECUTABLE.md`.
