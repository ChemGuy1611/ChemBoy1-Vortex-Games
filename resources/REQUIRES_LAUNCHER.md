# requiresLauncher Reference

Sources:
- `Vortex/src/renderer/src/types/IGame.ts` lines 74-101
- `Vortex/src/renderer/src/util/StarterInfo.ts` lines 146-252

---

## Overview

`requiresLauncher` is an optional function on `IGame`. When the user clicks Play, Vortex calls it to determine whether to launch the game directly or route through a game store launcher (Steam, Epic, Xbox, GOG). If the function returns `undefined`, Vortex launches the executable directly. If it returns a launcher config object, Vortex hands off to the appropriate store.

Only called when launching the game itself — not for tools registered via `supportedTools`.

---

## Type Signature

```typescript
requiresLauncher?: (
  gamePath: string,   // directory containing the game executable
  store?: string,     // store ID from discovery: 'steam' | 'epic' | 'xbox' | 'gog' | undefined
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
   - If the store extension throws `GameEntryNotFound` or `GameStoreNotFound`, Vortex silently falls back to direct launch.
5. If the result is `undefined`, Vortex calls `StarterInfo.runDirectly()`.

The `store` parameter comes from `IDiscoveryResult.store` — the store ID that Vortex used during game discovery. It can be `undefined` if discovery was path-based rather than store-based.

---

## Return Value by Store

| Store | `launcher` | `addInfo` |
| --- | --- | --- |
| Steam | `'steam'` | omit or `undefined` |
| Epic Games Store | `'epic'` | `{ appId: string }` — the Epic catalog item ID |
| Xbox / MS Store | `'xbox'` | `{ appId: string, parameters: [{ appExecName: string }] }` |
| GOG | `'gog'` | omit or `undefined` |

**Xbox `appId`** — the Microsoft Store application ID (same one used in `GameStoreHelper.findByAppId()`).

**Xbox `appExecName`** — the `Id` attribute on the `<Application>` tag in the game's `appxmanifest.xml`. If the manifest has multiple `<Application>` tags, pick the one that actually starts the game.

**Epic `appId`** — the catalog item ID, same as used in discovery. The JSDoc in `IGame.ts` notes it may be passed as a plain string instead of an object; the object form `{ appId }` is the safe, consistent pattern.

---

## Implementation Patterns

### Pattern 1 — Steam via DLL detection

Use when the game supports both Steam and non-Steam installs. Check for `steam_api64.dll` or `steam_api.dll` in the game directory.

```js
const STEAM_DLL = 'steam_api64.dll';

async function requiresLauncher(gamePath) {
  const files = await fs.readdirAsync(gamePath).catch(() => []);
  return files.some(f => f.toLowerCase() === STEAM_DLL)
    ? Promise.resolve({ launcher: 'steam' })
    : Promise.resolve(undefined);
}
```

---

### Pattern 2 — Store parameter check (single store)

Use when the game is only on one non-Steam store (e.g., Xbox only). Trust the `store` parameter from discovery.

```js
async function requiresLauncher(gamePath, store) {
  if (store === 'xbox') {
    return Promise.resolve({
      launcher: 'xbox',
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
    launcher: 'xbox',
    addInfo: {
      appId: XBOXAPP_ID,
      parameters: [{ appExecName: XBOXEXECNAME }],
    },
  };

  const epicConfig = {
    launcher: 'epic',
    addInfo: { appId: EPIC_ID },
  };

  if (store !== undefined) {
    if (store === 'xbox') return xboxConfig;
    if (store === 'epic') return epicConfig;
    return undefined;  // 'steam' or 'gog' — launch directly
  }

  // No store from discovery — try matching the game path against Xbox
  try {
    const game = await util.GameStoreHelper.findByAppId([XBOXAPP_ID], 'xbox');
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
  if (store === 'epic') {
    return Promise.resolve({
      launcher: 'epic',
      addInfo: { appId: EPIC_ID },
    });
  }
  return Promise.resolve(undefined);
}
```

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
- **Fallback is always direct launch** — any uncaught error or `GameStoreNotFound` causes Vortex to silently run the exe directly. If the launcher is required for DRM, a failed `requiresLauncher` will result in a launch that the game itself rejects.
- **Tools are excluded** — `requiresLauncher` is not called for items in `supportedTools`, only for the game entry itself.
- **`addInfo` vs `game.details`** — if `addInfo` is omitted, Vortex passes `game.details` to the launcher instead. For Steam this is fine (Steam reads `details.steamAppId`). For Epic and Xbox, always provide `addInfo` explicitly.
