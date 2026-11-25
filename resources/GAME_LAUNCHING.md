# How Vortex Launches Games

What happens between the user clicking Play (or a tool button) and the game process running: how
Vortex builds the launch, when it runs the exe itself, when it hands off to a store (Steam, Epic,
Xbox, GOG, Ubisoft Connect, EA), and how it tracks the running game afterwards.

Checked against Vortex `master`, November 2026 (after v2.12.0-beta.1). Sources, by function:

- `src/renderer/src/util/StarterInfo.ts`: `StarterInfo` constructor (`initFromGame`, `initFromTool`), `run`, `runDirectly`, `runThroughLauncher`
- `src/renderer/src/ExtensionManager.ts`: `runExecutable`, `applyStartHooks`
- `src/renderer/src/extensions/mod_management/preStartDeployHook.ts` (the deploy prompt)
- Store launchers in `src/renderer/src/util/`: `Steam.ts`, `EpicGamesLauncher.ts`, `GOGLauncher.ts`, `xbox/XboxLauncher.ts`, `UplayStore.ts`, `OriginStore.ts`; `storeLookup.ts` and `GameStoreHelper.ts`
- `src/renderer/src/extensions/gamemode_management/util/ProcessMonitor.ts` (running-state tracking)
- `src/renderer/src/views/layout/menu/hooks/useTools.ts`, `src/renderer/src/extensions/starter_dashlet/` (the buttons)

Topic docs this one ties together: `REQUIRES_LAUNCHER.md` (the store hook in depth, including
which launch parameters reach the game on each store) and `RUN_EXECUTABLE.md` (`api.runExecutable`
and its options).

---

## Entry points

Every launch button in the UI ends in the same call, `StarterInfo.run(info, api, onShowError)`:

| Button                                              | What it starts                                 |
| --------------------------------------------------- | ---------------------------------------------- |
| Modern layout Play button (`useTools`, `handlePlay`) | the primary starter                            |
| Modern layout tool buttons, Tools page              | that tool (the game is not listed there)       |
| Classic layout Tools dashlet (`starter_dashlet`)    | that tool (the game is not listed); the starred one is primary |
| Title bar launcher (`titlebar-launcher` extension)  | the primary starter                            |
| Quick launcher (`QuickLauncher.tsx`)                | the primary starter                            |

The **primary starter** is the tool in `settings.interface.primaryTool[gameId]` if that tool has an
exe path, otherwise the game. A tool flagged `defaultPrimary` is picked automatically while the
setting is unset (`VORTEX_GAME_LIFECYCLE.md`, "Tools & launching"). A `primary-tool` health test on
`gamemode-activated` clears the setting and warns when the primary tool or one of its
`requiredFiles` is gone.

An extension can launch through the same pipeline, store hand-off included:

```js
const state = api.getState();
const game = util.getGame(GAME_ID);
const discovery = selectors.discoveryByGame(state, GAME_ID);
const starter = new util.StarterInfo(game, discovery);
await util.StarterInfo.run(starter, api, (message, details, allowReport) =>
    api.showErrorNotification(message, details, { allowReport }),
);
```

`api.runExecutable` on the game exe is **not** equivalent: it is only the direct-launch half of the
pipeline. It never calls `requiresLauncher`, never marks the game as running, and never applies
the starter's `onStart` setting.

---

## What a starter is built from

The `StarterInfo` constructor merges the static definition (`IGame` / `ITool`) with what discovery
and the user stored (`settings.gameMode.discovered[gameId]`, and its `tools` map for tools).

| Field              | Game entry                                                        | Tool entry                                                             |
| ------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `exePath`          | `discovery.path` + (`discovery.executable` or `game.executable`)  | `toolDiscovery.path` (full exe path)                                   |
| `commandLine`      | `discovery.parameters`, else `game.parameters`, else `[]`         | `toolDiscovery.parameters`, else `tool.parameters`                     |
| `workingDirectory` | always the exe's folder                                           | `toolDiscovery.workingDirectory`, else `tool.workingDirectory`, else the exe's folder |
| `environment`      | `discovery.environment` if the user customised it, else `game.environment` | `toolDiscovery.environment`, else `tool.environment`              |
| `shell`            | `discovery.shell` or `game.shell`                                 | `toolDiscovery.shell`, else `tool.shell`                               |
| `detach`           | always `true`                                                     | `toolDiscovery.detach`, else `tool.detach`, else `true`                |
| `onStart`          | never set                                                         | `toolDiscovery.onStart`, else `tool.onStart`                           |
| `exclusive`        | always `true`                                                     | `tool.exclusive`, else `false`                                         |
| `store`            | `discovery.store`                                                 | the game's `discovery.store`                                           |

Two consequences of where the values come from:

- **Users can edit tools, not the game.** Neither the modern layout's Tools page nor the classic
  layout's Tools dashlet lists the game's own starter; both build it only for the Windows jump
  list and render the tool starters alone. So the game's launch settings always come from the
  extension (`game.parameters`, `game.environment`, `game.shell`) and discovery. The edit dialog
  still has a game branch (`setGameParameters`, which would write into the game's discovery entry
  and make `discovery.parameters` override `game.parameters`), but nothing in the current UI opens
  the dialog for the game.
- **The game entry has no `detach` or `onStart`.** The constructor reads both only from the tool
  objects, which are undefined for the game, so a game launch always runs detached and never hides
  or closes Vortex. `onStart` works for tools.

---

## The decision: direct or through a store

`StarterInfo.run` in order:

1. **Ask the extension.** Only for the game entry (never for tools), and only when the game defines
   `requiresLauncher`: Vortex awaits `requiresLauncher(path.dirname(exePath), store)`.
   - Rejects with `UserCanceled`: logged as a warning.
   - Rejects with anything else: error notification "Failed to determine if launcher is required".
     For a community (`contributed`) extension the details are replaced by "Report this to the
     community extension author, not Vortex support!" and the report button is hidden.
   - Either way the result is treated as `undefined` and the launch carries on.
2. **Check there is an exe.** `hasExe` is `game.executable(gameDir) !== ""`. If `executable()`
   throws, Vortex assumes there is one.
3. **No launcher returned:** run the exe directly (next section). With no exe, the launch stops
   with "Failed to start game: Game was not discovered through a supported store and has no
   executable to run".
4. **Launcher returned:** pick the hand-off value `addInfo`, else `game.details`, else the game
   folder path, and call `launchGame(value, api)` on the store registered under `launcher`.
5. **Hand-off succeeded:** mark the game as running and apply `onStart` (see
   [Running state](#running-state)).
6. **Hand-off failed:**

   | Error from the store                     | What the user sees                                                      | Falls back to direct launch |
   | ---------------------------------------- | ----------------------------------------------------------------------- | --------------------------- |
   | `UserCanceled`                           | nothing                                                                 | no                          |
   | `GameEntryNotFound` (id not in that store) | "Failed to start game through launcher" (reportable unless contributed) | yes                         |
   | `GameStoreNotFound`                      | same title, "Game store ... not supported, is the extension disabled?"  | yes                         |
   | unknown `launcher` id, any other error   | same title, reportable                                                  | yes                         |

   The fallback runs only when the game has an exe. It is an ordinary direct launch, so a game
   whose DRM needs the store may then refuse to start.

---

## Direct launch

`runDirectly` calls `api.runExecutable(exePath, commandLine, options)` with:

| Option          | Value                                         |
| --------------- | --------------------------------------------- |
| `cwd`           | the starter's `workingDirectory`, else the exe folder |
| `env`           | the starter's `environment`                   |
| `suggestDeploy` | `true`                                        |
| `shell`         | the starter's `shell`                         |
| `detach`        | `detach`, or `true` when `onStart` is `"close"` |
| `onSpawned`     | marks the game/tool running, applies `onStart` |
| `onExit`        | analytics only                                |

Inside `runExecutable` (`ExtensionManager.ts`), in order:

1. **Empty executable:** rejects with `ProcessCanceled`, which the caller swallows. Nothing runs and
   nothing is shown.
2. **Interpreter.** If an extension registered one for the exe's file extension
   (`registerInterpreter`), it rewrites `executable`, `args` and `options` first.
3. **Working directory and environment are fixed now.** `cwd` = `options.cwd` or the exe folder.
   The environment is Vortex's own process environment, minus a short list of Vortex/Electron
   internals (`NODE_OPTIONS`, `NODE_ENV`, `CHROME_CRASHPAD_PIPE_NAME` and similar), with `PATH`
   restored to its pre-Vortex value, plus `options.env` on top.
4. **Scripts get a shell.** `.ps1`, `.bat`, `.cmd`, `.sh` and `.bash` files run with `shell: true`
   unless the caller set `shell` explicitly.
5. **Start hooks** (`registerStartHook`) run in priority order, each receiving the output of the
   previous one. Built in:
   - 50 `check-unsolved-conflicts` (mod dependency manager), when `suggestDeploy` is not `false`:
     unresolved file conflicts.
   - 100 `check-deployment` (mod management), when `suggestDeploy` is `true`: if a deployment is
     pending, a "Pending deployment" dialog with Cancel / Skip / Deploy. Deploy runs a deployment
     first; Skip launches without it; Cancel aborts. With nothing pending it waits for any
     deployment already in progress.

   A hook can change `executable`, `args`, `shell` and `detach`. It **cannot** change `cwd` or
   `env`: both were captured in step 3, and the spawn uses those copies. A hook that throws
   `UserCanceled` or `ProcessCanceled` aborts the launch.
6. **Tool variables.** Each argument is run through `string-template` with the variables from every
   `registerToolVariables` callback. The built-in set: every environment key upper-cased, plus
   `APPDATA`, `HOME`, `PROFILE_ID`, `PROFILE_NAME`, `PROFILE_PATH`. So an argument
   `--profile={PROFILE_ID}` reaches the game with the active profile's id.
7. **Spawn.** With `shell: true` the exe path is quoted and the arguments are passed untouched;
   without a shell every `"` is stripped from each argument. `detached` is `options.detach`,
   defaulting to `true`.
8. **Exit.** `onExit(code, signal)` fires on `close`. The promise resolves on exit, not on spawn. A
   non-zero exit code is only logged unless `expectSuccess` is set (game launches do not set it),
   with a few codes mapped to specific errors (missing DLL for Fallout 3, .NET crash, Windows
   shutting down).

Errors on the way:

| Error                                    | Result                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `EACCES` (exe demands admin rights), Windows | relaunched elevated through a UAC prompt; `onExit` never fires on this path |
| UAC prompt declined (`ECANCELED`, system code 1223) | `UserCanceled`, nothing shown                                  |
| `ENOENT`                                 | "Executable doesn't exist, please check the configuration..."           |
| `EBUSY`                                  | "The executable is running in the background or is being locked..."   |
| `UNKNOWN`, `EFTYPE`                      | "File is not executable..."                                             |
| `MissingInterpreter`                     | the interpreter's message, plus its download URL if it gave one         |
| `ProcessCanceled`, `UserCanceled`        | nothing shown                                                           |

After the process exits, a starter with `onStart: "hide_recover"` shows the Vortex window again.

On Linux, a Windows exe of a game discovered through Steam runs through Proton with the game's own
prefix (`Steam.runToolWithProton`) instead of plain `runExecutable`; tools of that game do the
same. Such a launch is not marked as running, because process tracking only works on Windows.

---

## Store launch

`runThroughLauncher` looks up the store by the `launcher` id and calls its `launchGame`. The stores
are built into Vortex; `IGameStore` is no longer part of the extension API, so an extension cannot
add one. All except Steam exist only on Windows.

| `launcher` | What `launchGame` does                                                                        | Id it needs                                                                 | Game arguments |
| ---------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------- |
| `steam`    | runs `Steam.exe -applaunch <appId> ...parameters` through `api.runExecutable` (`shell: true`, `suggestDeploy: true`) | `{ appId, parameters }`, a plain app id, `game.details.steamAppId`, or the game folder (matched against Steam library paths) | yes            |
| `steam` with `launchType: "gamestore"` | opens `steam://launch/<appId>/<parameters joined with ",">`                     | `{ appId, parameters, launchType }`; `parameters` must be an array           | one            |
| `epic`     | opens `com.epicgames.launcher://apps/<appId>?action=launch&silent=true`                       | `{ appId }` or a plain id                                                   | no             |
| `xbox`     | runs `explorer.exe shell:appsFolder\<PackageFamilyName>!<appExecName>`                         | `{ appId, parameters: [{ appExecName }] }`, or a plain id (then the package's own execution name) | no |
| `gog`      | runs `GalaxyClient.exe /command=runGame /gameId=<id> path="<gamePath>"` through `api.runExecutable` | a plain GOG id string, nothing else                                        | no             |
| `uplay`    | opens `uplay://launch/<appId>/0`                                                              | a plain id string                                                           | no             |
| `origin`   | opens `origin2://game/launch?offerIds=<offerId>`                                              | a plain offer id string                                                     | no             |

"Opens" means `shell.openUrl`: Windows hands the URL to whichever program registered the protocol,
and Vortex gets no process back.

Notes per store:

- **Steam.** Only an object with an `appId` key is read as launch info. An object without one
  (for example `game.details` lacking `steamAppId`) becomes the app id `"[object Object]"`, the
  lookup throws `GameEntryNotFound`, and Vortex falls back to a direct launch with an error. In the
  `launchType: "gamestore"` form, a missing `parameters` array throws on `.join()`, which lands in
  the generic error row above.
- **Xbox.** The package family name comes from the installed package, found by `appId`. The
  `{ appExecName }` object must come first in `parameters` (`REQUIRES_LAUNCHER.md` explains the
  TypeError otherwise).
- **GOG.** The id is compared as-is against Galaxy's game ids. An object, `game.details` or a folder
  path never matches, so leaving `addInfo` out always fails with `GameEntryNotFound`.
- **Ubisoft Connect.** Vortex hard-codes launch slot `0`. The id in the URL is the launch id, which
  can differ from the install id Ubisoft Connect keeps in the registry (Vortex's own comment cites
  Assassin's Creed Black Flag: installed as `273`, launched as `619`).
- **Epic, Ubisoft Connect, EA.** The id is pasted into a URL without a lookup. A wrong id or an
  object (`"[object Object]"`) raises no Vortex error; the store opens and fails on its own side.

### What a store launch skips

The deploy prompt and the conflict check are start hooks, and start hooks only run inside
`api.runExecutable`. So it depends on the store:

| Launch                                   | Deploy prompt, conflict check | Extension start hooks see       |
| ---------------------------------------- | ----------------------------- | ------------------------------- |
| direct                                   | yes                           | the game exe                    |
| `steam` (`-applaunch`)                   | yes                           | `Steam.exe`, not the game exe   |
| `gog`                                    | yes                           | `GalaxyClient.exe`              |
| `epic`, `xbox`, `uplay`, `origin`, Steam `gamestore` | no                | nothing; no start hook runs     |

A start hook that matches on the game's exe name therefore never fires for a store launch, and an
Epic or Xbox launch with a deployment pending starts the game without deploying.

For Steam, `StarterInfo` waits for the `Steam.exe -applaunch` call to return before it marks the
game running and applies `onStart`. It relies on `Steam.exe` handing the request to the running
client and exiting.

### Starting a store app, not a game

`util.GameStoreHelper.launchGameStore(api, storeId, parameters?)` opens the store itself, for
example to make sure Steam is running before a tool needs it. It returns at once; failures arrive
as notifications. It shows "Game store is not installed" when the store is missing. Epic opens
`com.epicgames.launcher://start`, Xbox opens the Xbox app; every other store has its exe run
detached with `suggestDeploy: false`, unless that exe is already running.

---

## Games with no executable

Since v2.11.0 `game.executable()` may return `""` for a game Vortex can only start through its store.
Such a game depends entirely on `requiresLauncher`: no launcher means the "has no executable to
run" error, and a failed hand-off has no direct launch to fall back to. Vortex's experimental Tier 0
games (synthesized for games without an extension) work this way; see `VORTEX_GAME_LIFECYCLE.md`.

---

## Running state

Once a launch has spawned (direct) or handed off (store), Vortex records it in
`session.base.toolsRunning`, keyed by the lower-cased exe file name: `{ pid, exclusive, started }`.
For a store launch the entry is the game's exe, written right after `launchGame` returns, before
the store has started anything.

While that map is non-empty, `ProcessMonitor` polls the process list: first after 2 seconds, then
every 2 s with the Vortex window focused and every 5 s unfocused.

- The game exe matches any process with that file name, so a game started outside Vortex, or one
  that outlives a Vortex restart, still counts. Tools only match processes Vortex started.
- A poll that finds no process with the name removes the entry. When the map empties, polling
  stops until the next launch adds an entry.

So a store launch whose game exe has not appeared by the first poll (a store still starting up,
an update check, a launcher window in between) is removed after about 2 seconds, and Vortex then
loses track of the game for that session. This follows from the code; the timing depends on the
store.

What reads the running state:

- Deployment and purge refuse to run: "Can't deploy while the game or a tool is running".
- The game entry is always `exclusive`. While any exclusive starter runs, the modern layout's Play
  button is disabled (it is also disabled while the game is running or a deployment is in
  progress).
- File-based load orders re-read and write the order when a game or tool closes.

`onStart` (tools only, see above): `"hide"` minimizes Vortex when the tool starts, `"hide_recover"`
also restores it after the tool exits (direct launches only), and `"close"` quits Vortex (and forces
`detach`).

---

## Checklist for extension authors

- Put launch arguments in `game.parameters` (direct launch) **and** in the Steam branch's
  `addInfo.parameters`. No other store can carry them; `REQUIRES_LAUNCHER.md` has the per-store
  detail and workarounds.
- Give `addInfo` for every store branch. For GOG, Ubisoft Connect and EA pass the plain id string;
  for Steam, Epic and Xbox the object forms in the table above.
- Do not rely on the deploy prompt before an Epic, Xbox, Ubisoft Connect or EA launch: there is
  none.
- To set environment variables for a launch, use `game.environment` or the tool's `environment`
  (or an interpreter). A start hook that changes `options.env` or `options.cwd` has no effect.
- A start hook keyed on the game's exe only sees direct launches. For a Steam or GOG launch it sees
  the store exe instead.
- `store` passed to `requiresLauncher` is `undefined` when the game was found by path, not by store
  (`REQUIRES_LAUNCHER.md`, pattern 3).

---

## See also

`REQUIRES_LAUNCHER.md` (the store hook: signature, patterns, per-store launch parameters).
`RUN_EXECUTABLE.md` (`api.runExecutable`, `IRunOptions`, start hooks and interpreters).
`REGISTER_GAME.md` (the `IGame` and `ITool` fields a starter is built from: `parameters`,
`environment`, `shell`, `exclusive`, `detach`, `onStart`, `defaultPrimary`).
`VORTEX_GAME_LIFECYCLE.md` (discovery, primary tool selection, Tier 0 games).
`ERROR_CLASSES.md` (`UserCanceled`, `ProcessCanceled`, `MissingInterpreter`, `GameEntryNotFound`).
`VORTEX_DEPLOYMENT.md` (the deployment the pre-launch prompt runs).
`UNDERUSED_API_FUNCTIONS.md` (§4, start hooks and interpreters).
