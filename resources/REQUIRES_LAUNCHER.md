# requiresLauncher Reference

Sources:

- `Vortex/src/renderer/src/types/IGame.ts` (`requiresLauncher`)
- `Vortex/src/renderer/src/util/StarterInfo.ts` (`run`, `runThroughLauncher`)
- Store launchers in `Vortex/src/renderer/src/util/` (each store's `launchGame`)

The whole launch pipeline this hook sits in (direct launch, deploy prompt, start hooks, what each
store's hand-off skips, running-state tracking): `GAME_LAUNCHING.md`.

---

## Overview

`requiresLauncher` is an optional function on `IGame`. When the user clicks Play, Vortex calls it to determine whether to launch the game directly or route through a game store launcher (Steam, Epic, Xbox, GOG). If the function returns `undefined`, Vortex launches the executable directly. If it returns a launcher config object, Vortex hands off to the appropriate store.

Only called when launching the game itself — not for tools registered via `supportedTools`.

---

## Type Signature

```typescript
requiresLauncher?: (
  gamePath: string,   // directory containing the game executable
  store?: string,     // store ID from discovery: 'steam' | 'epic' | 'xbox' | 'gog' | 'uplay' | 'origin' | undefined
) => PromiseBB<{ launcher: string; addInfo?: any }>;
```

Return `undefined` (or resolve to `undefined`) to launch directly. Return `{ launcher, addInfo }` to route through a store.

---

## Runtime Flow

Called in `StarterInfo.run()` in `StarterInfo.ts`:

1. Vortex resolves `game.requiresLauncher(path.dirname(info.exePath), info.store)`.
2. If the promise rejects with `UserCanceled`, Vortex logs a warning and falls back to direct launch.
3. If the promise rejects with any other error, Vortex shows an error notification (with report option if it's an official extension) and falls back to direct launch.
4. If the result is non-`undefined`, Vortex calls `StarterInfo.runThroughLauncher(res.launcher, info, api, infoObj)`.
    - `infoObj` = `res.addInfo` if present, otherwise `game.details`, otherwise the game directory path.
    - If the store throws `GameEntryNotFound` or `GameStoreNotFound`, or anything else, Vortex shows a "Failed to start game through launcher" error notification and then falls back to direct launch.
    - If the store throws `UserCanceled`, the launch just stops: no notification, no fallback.
5. If the result is `undefined`, Vortex calls `StarterInfo.runDirectly()`.

The fallback needs an exe: a game whose `executable()` returns `""` (allowed since v2.11.0) gets the error and nothing else.

The `store` parameter comes from `IDiscoveryResult.store` — the store ID that Vortex used during game discovery. It can be `undefined` if discovery was path-based rather than store-based.

---

## Return Value by Store

| Store            | `launcher` | `addInfo`                                                  |
| ---------------- | ---------- | ---------------------------------------------------------- |
| Steam            | `'steam'`  | omit or `undefined`                                        |
| Epic Games Store | `'epic'`   | `{ appId: string }` — the Epic catalog item ID             |
| Xbox / MS Store  | `'xbox'`   | `{ appId: string, parameters: [{ appExecName: string }] }` |
| GOG              | `'gog'`    | the GOG game id as a plain string                          |
| Ubisoft Connect  | `'uplay'`  | the Ubisoft Connect launch id as a plain string            |
| EA app (Origin)  | `'origin'` | the offer id as a plain string                             |

**GOG id** — Galaxy's lookup compares `addInfo` as-is with its game ids. If `addInfo` is left out, Vortex passes `game.details` or the game folder instead, which never match: the launch fails with `GameEntryNotFound` and falls back to a direct launch. GOG games are DRM-free, so most extensions skip the GOG launcher and launch directly.

**Ubisoft Connect id** — Vortex opens `uplay://launch/<id>/0`. The launch id can differ from the install id in the registry under `Ubisoft\Launcher\Installs`.

**Ubisoft Connect and EA** — Vortex pastes the value into a URL without checking it, so an object or a wrong id gives no Vortex error; the store opens and fails on its own. `GAME_LAUNCHING.md` has the exact command each store runs.

**Xbox `appId`** — the Microsoft Store application ID (same one used in `GameStoreHelper.findByAppId()`).

**Xbox `appExecName`** — the `Id` attribute on the `<Application>` tag in the game's `appxmanifest.xml`. If the manifest has multiple `<Application>` tags, pick the one that actually starts the game.

**Epic `appId`** — the catalog item ID, same as used in discovery. The JSDoc in `IGame.ts` notes it may be passed as a plain string instead of an object; the object form `{ appId }` is the safe, consistent pattern.

---

## Implementation Patterns

### Pattern 1 — Steam via DLL detection

Use when the game supports both Steam and non-Steam installs. Check for `steam_api64.dll` or `steam_api.dll` in the game directory.

```js
const STEAM_DLL = "steam_api64.dll";

async function requiresLauncher(gamePath) {
    const files = await fsp.readdir(gamePath).catch(() => []);
    return files.some((f) => f.toLowerCase() === STEAM_DLL)
        ? Promise.resolve({ launcher: "steam" })
        : Promise.resolve(undefined);
}
```

---

### Pattern 2 — Store parameter check (single store)

Use when the game is only on one non-Steam store (e.g., Xbox only). Trust the `store` parameter from discovery.

```js
async function requiresLauncher(gamePath, store) {
    if (store === "xbox") {
        return Promise.resolve({
            launcher: "xbox",
            addInfo: {
                appId: XBOXAPP_ID,
                parameters: [{ appExecName: XBOXEXECNAME }],
            },
        });
    }
    return Promise.resolve(undefined);
}
```

---

### Pattern 3 — Multi-store with fallback detection

Use when the game is on multiple stores. If `store` is set from discovery, use it directly. If not (path-based discovery), try to match the game path against known store app IDs.

```js
async function requiresLauncher(gamePath, store) {
    const xboxConfig = {
        launcher: "xbox",
        addInfo: {
            appId: XBOXAPP_ID,
            parameters: [{ appExecName: XBOXEXECNAME }],
        },
    };

    const epicConfig = {
        launcher: "epic",
        addInfo: { appId: EPIC_ID },
    };

    if (store !== undefined) {
        if (store === "xbox") return xboxConfig;
        if (store === "epic") return epicConfig;
        return undefined; // 'steam' or 'gog' — launch directly
    }

    // No store from discovery — try matching the game path against Xbox
    try {
        const game = await util.GameStoreHelper.findByAppId([XBOXAPP_ID], "xbox");
        const normalize = await util.getNormalizeFunc(gamePath);
        if (normalize(game.gamePath) === normalize(gamePath)) return xboxConfig;
    } catch (err) {
        // Xbox not installed or game not found — fall through
    }

    return undefined;
}
```

---

### Pattern 4 — Epic only

```js
async function requiresLauncher(gamePath, store) {
    if (store === "epic") {
        return Promise.resolve({
            launcher: "epic",
            addInfo: { appId: EPIC_ID },
        });
    }
    return Promise.resolve(undefined);
}
```

---

### Pattern 5 — GOG

`addInfo` must be the GOG game id as a **plain string**: the same id discovery matches (the key under `SOFTWARE\WOW6432Node\GOG.com\Games`). An object or no `addInfo` fails the lookup and drops to a direct launch with an error notice. Galaxy's `/command=runGame` takes no game arguments, so a game that needs launch options should launch directly instead.

```js
const GOGAPP_ID = "1234567890";

async function requiresLauncher(gamePath, store) {
    if (store === "gog") {
        return Promise.resolve({
            launcher: "gog",
            addInfo: GOGAPP_ID, // plain string, not { appId }
        });
    }
    return Promise.resolve(undefined);
}
```

Most GOG games are DRM-free and start fine without Galaxy, so leaving `gog` out of `requiresLauncher` (launching directly, with `game.parameters`) is usually the better choice. Route through Galaxy only when the game needs it running, for example for Galaxy achievements or multiplayer.

---

### Pattern 6 — Ubisoft Connect

`addInfo` is a **plain string** that Vortex puts into `uplay://launch/<id>/0`. Discovery uses the install id from the registry (`SOFTWARE\WOW6432Node\Ubisoft\Launcher\Installs\<id>`), but the launch id can be different for some games (Vortex's own comment cites Assassin's Creed Black Flag: installed as `273`, launched as `619`). To check, create a desktop shortcut for the game in Ubisoft Connect and read the `uplay://launch/...` URL it contains. Vortex always uses launch slot `0`, which is normally the main (single-player) executable.

```js
const UPLAYAPP_ID = "1234"; // install id, used for discovery
const UPLAY_LAUNCH_ID = UPLAYAPP_ID; // change only if the game's uplay:// launch id differs

async function requiresLauncher(gamePath, store) {
    if (store === "uplay") {
        return Promise.resolve({
            launcher: "uplay",
            addInfo: UPLAY_LAUNCH_ID, // plain string
        });
    }
    return Promise.resolve(undefined);
}
```

Vortex does not check the id. A wrong one gives no Vortex error: Ubisoft Connect opens and fails to start the game.

---

### Pattern 7 — EA app (store id `origin`)

`addInfo` is the EA offer id as a **plain string**, which Vortex puts into `origin2://game/launch?offerIds=<id>`. It is the same id discovery matches: the `id` field of the game's `.mfst` manifest under `%ProgramData%\Origin\LocalContent`, which Vortex's EA store reads.

```js
const EAAPP_ID = "Origin.OFR.50.0001234";

async function requiresLauncher(gamePath, store) {
    if (store === "origin") {
        return Promise.resolve({
            launcher: "origin",
            addInfo: EAAPP_ID, // plain string
        });
    }
    return Promise.resolve(undefined);
}
```

As with Ubisoft Connect, the id goes into the URL unchecked, and the URL has no room for game arguments.

Pattern 3 combines with these: add one `if (store === ...)` branch per store the game is sold on.

---

## Registration in applyGame()

Pass `requiresLauncher` as a property when building the game object:

```js
function applyGame(context, gameSpec) {
    const game = {
        ...gameSpec.game,
        executable: getExecutable,
        queryModPath: () => MOD_PATH,
        requiredFiles,
        setup: async (discovery) => setup(discovery, context.api, gameSpec),
        requiresLauncher,
    };
    context.registerGame(game);
}
```

Or inline in `context.registerGame()` — both work identically.

---

## Gotchas

- **`store` can be `undefined`** even on Steam if the game was discovered via path rather than store lookup. Don't assume `store === undefined` means non-Steam.
- **`util.toBlue()`** — if the function is defined as a class method, wrap it: `requiresLauncher: util.toBlue((path, store) => this.checkLauncher(path, store))`. Standalone `async function` declarations do not need this wrapper — Vortex accepts native Promises.
- **Fallback is always direct launch** — a store error (`GameEntryNotFound`, `GameStoreNotFound`, anything but `UserCanceled`) shows a "Failed to start game through launcher" notification, then Vortex runs the exe directly. If the launcher is required for DRM, a failed `requiresLauncher` will result in a launch that the game itself rejects.
- **No deploy prompt on most store launches** — the "Pending deployment" prompt is a start hook inside `api.runExecutable`. Steam (`-applaunch`) and GOG launch through `runExecutable` and get it; Epic, Xbox, Ubisoft Connect, EA and Steam's `launchType: 'gamestore'` open a URL or `explorer.exe` and skip it. Start hooks of other extensions see `Steam.exe` / `GalaxyClient.exe` on those two stores, and nothing on the rest. Detail: `GAME_LAUNCHING.md`.
- **Tools are excluded** — `requiresLauncher` is not called for items in `supportedTools`, only for the game entry itself.
- **`addInfo` vs `game.details`** — if `addInfo` is omitted, Vortex passes `game.details` to the launcher instead. For Steam this is fine (Steam reads `details.steamAppId`). For Epic and Xbox, always provide `addInfo` explicitly.
- **Launch parameters on a store launch** — `game.parameters` reach only a DIRECT exe launch. Through a launcher, only Steam passes `addInfo.parameters`; every other store drops them:
  - **Steam**: `steam -applaunch <appId> ...parameters`. Needs `addInfo: { appId, parameters }`. With `launchType: 'gamestore'` the parameters go into a `steam://launch/<appId>/<params>` URL joined with `,`, so pass at most one there.
    - `appId` is required in an object `addInfo`. Steam only treats the object as launch info when it has an `appId` key; without one it uses `String(addInfo)` (`"[object Object]"`) as the app id, the lookup throws `GameEntryNotFound`, and Vortex shows an error and falls back to a direct launch.
    - Steam is spawned with `shell: true`, so the arguments are joined with spaces and not quoted. One entry holding several space-separated options (`"+a 1 +b 2"`) reaches the game exactly like separate entries (`["+a 1", "+b 2"]`).
    - The template test suite's `steam-launch-parameters` contract check (see `TEMPLATE_TESTING.md`) flags a Steam branch that drops any `game.parameters` token or omits `appId`.
  - **Epic**: `launchGame` reads only `appId` and opens `com.epicgames.launcher://apps/<appId>?action=launch&silent=true`. That URI has no slot for game arguments. The launcher's own per-game "Additional command line arguments" setting is the only way to get them to the game. That setting is stored in `%LOCALAPPDATA%\EpicGamesLauncher\Saved\Config\WindowsEditor\GameUserSettings.ini`, section `[<EpicAccountId>_Settings]`, as two keys: `<CatalogNamespace>:<CatalogItemId>:<AppName>_AdditionalCommandsEnabled=True` and `<CatalogNamespace>:<CatalogItemId>:<AppName>_AdditionalCommands=<args>` (all three ids are in the game's `.item` manifest). The file can hold one `_Settings` section per Epic account that has signed in on the PC; the launcher writes `<CatalogNamespace>:<CatalogItemId>:<AppName>_AutoUpdate` into the section of the account that installed the game, which is how to tell which section belongs to it. The launcher reads the file only at startup and rewrites it from memory while running, so an outside edit only takes effect when written while the launcher is fully closed; written then, it reaches the game and the launcher keeps it.
  - **Xbox**: `launchGame` reads only the `{ appExecName }` object from `parameters` and starts `explorer.exe shell:appsFolder\<PFN>!<appExecName>`, which cannot carry arguments. String entries in `parameters` are ignored. Keep the `{ appExecName }` object FIRST in the array: the lookup uses `"appExecName" in arg`, which throws a TypeError on a string entry it reaches before finding the object. The limit is explorer, not the store: opening the same `shell:appsFolder\<PFN>!<AppId>` target through ShellExecute with arguments (for example PowerShell `Start-Process <target> -ArgumentList <args>`) does pass them, and `GameLaunchHelper.exe` forwards them to the real game exe.
  - **GOG**: Galaxy's `/command=runGame` has no argument forwarding. `launchGame` also expects a plain app id string. An object `addInfo` (`{ appId }`), or no `addInfo` at all, makes its lookup throw `GameEntryNotFound`, and Vortex falls back to a direct launch with an error notification. So pass the plain id string, or skip the GOG launcher; GOG games are DRM-free and a direct launch passes `game.parameters`.
  - **Ubisoft Connect, EA**: the `uplay://` and `origin2://` URLs carry only the id, no arguments.

  A game that needs a launch option on every store therefore sets it in both `game.parameters` and the Steam `addInfo`, and accepts that Epic and Xbox launches go without it.

---

## See also

`GAME_LAUNCHING.md` (the full launch pipeline around this hook, and what each store's hand-off
runs and skips). `REGISTER_GAME.md` (the `IGame` spec `requiresLauncher` hangs off). `RUN_EXECUTABLE.md`
(`api.runExecutable`/`IRunOptions` — the actual launch path this hook gates). `VORTEX_GAME_LIFECYCLE.md`
(where launcher resolution fits in the discovery-to-launch flow). `TEMPLATES_OVERVIEW.md` (the
`requiresLauncher` implementation every template ships). `templates/TEMPLATE_ANVILENGINE.md`,
`templates/TEMPLATE_FARCRY.md`, `templates/TEMPLATE_SNOWDROPENGINE.md`, and
`templates/TEMPLATE_FROSTBITE.md` (the storefront-locked families — Ubisoft Connect and EA App —
that need a non-default hand-off).
`MICROSOFT_STORE_CATALOG_API.md` (resolving the xbox branch's `appId`/`appExecName` values from a
Store product ID without an installed Game Pass copy).
`USER_CONFIGURABLE_MOD_PATHS.md` (a Steam launch option that moves the mod folder: reading it from
Steam's `localconfig.vdf`, and why the game has to start through Steam for it to apply).
