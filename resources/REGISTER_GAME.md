# context.registerGame()

Registers a game with Vortex. Must be called synchronously inside `main()` (or inside `applyGame()` called from `main()`). Called once per game extension.

```js
context.registerGame(game);  // game: IGame
```

---

## IGame shape

IGame extends ITool. Fields marked **required** will cause discovery or deployment to break if omitted.

### From ITool (required)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | **Required.** Unique game id; must match `GAME_ID` constant. Lowercase slug. |
| `name` | `string` | **Required.** Full display name. |
| `executable` | `(discoveredPath?) => string` | **Required.** Returns exe path relative to game dir. Must be sync. |
| `requiredFiles` | `string[]` | **Required.** Files used to verify game discovery; relative to game dir. |

### From ITool (optional)

| Field | Type | Notes |
| --- | --- | --- |
| `shortName` | `string` | Up to ~8 chars; used in tight UI spaces. |
| `logo` | `string` | Image path. Conventionally `${GAME_ID}.jpg`. 3:4 portrait ratio recommended. |
| `queryPath` | `() => string \| Promise<string \| IGameStoreEntry>` | Auto-resolve install path. In templates this is built by `makeFindGame()`. |
| `parameters` | `string[]` | CLI args passed at launch. Omit (not empty array) to avoid sending blank arg. |
| `environment` | `{ [key: string]: string }` | Extra env vars set at launch. Commonly contains store app IDs. |
| `detach` | `boolean` | Launch outside Vortex process tree. |
| `shell` | `boolean` | Launch via shell. |
| `exclusive` | `boolean` | Blocks other Vortex-launched apps until done. |
| `onStart` | `"hide" \| "hide_recover" \| "close"` | What Vortex does when this game launches. |
| `supportedTools` | `ITool[]` | Additional launchable tools shown in Vortex. |

### IGame-specific (required)

| Field | Type | Notes |
| --- | --- | --- |
| `queryModPath` | `(gamePath: string) => string` | **Required.** Where mods live. Use `.` for in-place (game root). In templates built by `makeGetModPath()`. |
| `mergeMods` | `boolean \| ((mod: IMod) => string)` | **Required.** `true` = all mods share one dir. `false` = each mod gets its own subdir. Function = custom subdir name per mod. |

### IGame-specific (optional)

| Field | Type | Notes |
| --- | --- | --- |
| `setup` | `async (discovery: IDiscoveryResult) => Promise<void>` | Runs every time game mode activates. Use to ensure directories exist (`fs.ensureDirWritableAsync`). |
| `requiresLauncher` | `(gamePath, store?) => Promise<{ launcher, addInfo? }>` | Force launch via Steam / Epic / Xbox. See `REQUIRES_LAUNCHER.md` for full reference. |
| `details` | `{ [key: string]: any }` | Freeform bag. Standard keys below. |
| `compatible` | `{ [key: string]: boolean }` | Feature flags: `{ dinput, enb, symlinks }`. |
| `queryArgs` | `{ [storeId]: IStoreQuery[] }` | Declarative store-based discovery alternative to `queryPath`. Store ids: `steam gog xbox epic registry`. |
| `mergeArchive` | `(filePath) => boolean` | Which archives get content-merged on deploy. |
| `requiresCleanup` | `boolean` | If `true`, empty dirs are cleaned up on deploy. |
| `directoryCleaning` | `"tag" \| "all"` | `"tag"` (default) = only tagged dirs. `"all"` = any empty dir. |
| `contributed` | `string` | Community contributor name. Leave `undefined` for official games. |
| `final` | `boolean` | Mark extension as fully tested. |
| `version` | `string` | Extension version string. |
| `overrides` | `string[]` | Game ids to disable when this is discovered in the same location. |
| `deploymentGate` | `() => Promise<void>` | Delay auto-deployment until this resolves. |

### Standard `details` keys

```js
details: {
  steamAppId:       +STEAMAPP_ID,     // number — coerce with unary +
  gogAppId:         GOGAPP_ID,        // string
  epicAppId:        EPICAPP_ID,       // string
  xboxAppId:        XBOXAPP_ID,       // string
  nexusPageId:      'nexus-slug',     // if different from GAME_ID
  supportsSymlinks: true,             // boolean
  hashFiles:        ['file.pak'],     // files to hash for update detection
  ignoreConflicts:  [],               // file patterns to skip conflict check
  ignoreDeploy:     [],               // file patterns to skip deployment
}
```

### Standard `environment` keys

```js
environment: {
  SteamAPPId: STEAMAPP_ID,
  GogAPPId:   GOGAPP_ID,
  EpicAPPId:  EPICAPP_ID,
  XboxAPPId:  XBOXAPP_ID,
}
```

---

## The spec / applyGame pattern

Templates split the game object into a static `spec.game` data block and a runtime `applyGame()` function that merges in the function fields before calling `registerGame`.

```js
// --- SPEC (data, defined near constants) ---
const spec = {
  game: {
    id: GAME_ID,
    name: GAME_NAME,
    shortName: GAME_NAME_SHORT,
    logo: `${GAME_ID}.jpg`,
    mergeMods: true,
    requiresCleanup: true,
    modPath: MOD_PATH_DEFAULT,
    modPathIsRelative: true,
    requiredFiles: [REQ_FILE],
    compatible: { dinput: false, enb: false },
    details: {
      steamAppId: +STEAMAPP_ID,
      gogAppId: GOGAPP_ID,
      epicAppId: EPICAPP_ID,
      xboxAppId: XBOXAPP_ID,
      supportsSymlinks: SYM_LINKS,
    },
    environment: {
      SteamAPPId: STEAMAPP_ID,
    },
  },
  modTypes: [...],
  discovery: { ids: DISCOVERY_IDS_ACTIVE, names: [] },
};

// --- applyGame (runtime, builds the live IGame object) ---
function applyGame(context, gameSpec) {
  const game = {
    ...gameSpec.game,                                          // spread static fields
    queryPath: makeFindGame(context.api, gameSpec),           // discovery function
    executable: getExecutable,                                 // exe resolver
    queryModPath: makeGetModPath(context.api, gameSpec),      // mod path resolver
    setup: async (discovery) => setup(discovery, context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    supportedTools: [...],
  };
  context.registerGame(game);
  // mod types, installers registered after this
}

// --- main() ---
function main(context) {
  applyGame(context, spec);
  // ...
}
```

---

## Discovery

`queryPath` should use `util.GameStoreHelper.findByAppId()` first, falling back to `winapi.RegGetValue()` in a try/catch. Never hardcode absolute paths; use the `spec.discovery.ids` list.

```js
// typical makeFindGame pattern
function makeFindGame(api, gameSpec) {
  return async () => {
    try {
      const game = await util.GameStoreHelper.findByAppId(gameSpec.discovery.ids);
      return game.gamePath;
    } catch (err) {
      return winapi.RegGetValue('HKEY_LOCAL_MACHINE', REG_KEY, 'InstallLocation');
    }
  };
}
```

---

## setup()

Runs every time the user activates this game in Vortex. Typical uses:

- Create mod subdirectories with `fs.ensureDirWritableAsync()`
- Copy default config files if missing
- Write `mods.txt` for UE4SS mods

```js
async function setup(discovery, api, gameSpec) {
  await fs.ensureDirWritableAsync(path.join(discovery.path, MOD_PATH_DEFAULT));
}
```

---

## supportedTools

Tool entries in `supportedTools` appear in the Vortex toolbar for the game. Common pattern:

```js
supportedTools: [
  {
    id: `${GAME_ID}-customlaunch`,
    name: 'Custom Launch',
    logo: 'exec.png',
    executable: () => EXEC,
    requiredFiles: [EXEC],
    detach: true,
    relative: true,   // path is relative to game dir
    exclusive: true,
    shell: true,
  },
]
```

`queryPath` on a tool is used when the tool lives outside the game dir (e.g. a separate ModKit install).

---

## Gotchas

- `getModPaths` and `getInstalledVersion` are populated BY Vortex — do NOT implement on the IGame object.
- `onGameModeActivated` does NOT exist on IGame. Use `setup` or `api.events.on('gamemode-activated', ...)`.
- `modTypes` on IGame is populated by Vortex after `registerModType` calls — do not set it yourself.
- `steamAppId` in `details` must be a **number** (`+STEAMAPP_ID`). The `environment` copy stays a string.
- `parameters` field: omit it entirely (or comment it out) when empty — sending `[]` or `['']` passes a blank arg to the exe.
- `logo` must match the actual filename in the extension folder (conventionally `${GAME_ID}.jpg`).
- `queryPath` and `executable` are always functions even though IGameStored stores them as strings.
- `IDiscoveryResult` is the type for discovered game state — there is no `IDiscoveredGame`.
