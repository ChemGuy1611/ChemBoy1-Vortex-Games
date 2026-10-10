# Deprecated Methods (Vortex Extension API)

Every symbol in the published `@nexusmods/vortex-api` surface (`node_modules/vortex-api/lib/api.d.ts`, mirrored in this repo's `resources/api.d.ts`) that currently carries a `@deprecated` JSDoc tag, what to use instead, and where the full migration guidance lives.

---

## Why this list exists, and where it came from

Deprecation notices are scattered across many independent JSDoc comments in the Vortex source — there is no single upstream page that lists them. This doc is built by grepping `@deprecated` in `resources/api.d.ts` (the published surface extensions actually see), cross-checked against the individual topic docs that already cover several of these families in depth.

**Source matters.** Vortex's own repo (`src/renderer/src/util/*.ts`) over-tags relative to what actually ships: a whole grouped re-export block gets one `@deprecated` comment that does not carry through to every name in the published `.d.ts`. The clearest case is `fs` — see the fs section below and `NODE_FS.md`. Always check `api.d.ts`, not the internal renderer source, before treating something as deprecated.

---

## Full index

| Symbol | Namespace | Replacement | Guidance |
| --- | --- | --- | --- |
| `UserCanceled`, `ProcessCanceled`, `DataInvalid`, `SetupError`, `MissingInterpreter`, `NotFound`, `NotSupportedError`, `ArgumentInvalid`, `CycleError`, `GameNotFound` | `util.*` (error classes) | `VortexError` directly (stable since v2.5.0), and `err?.data?.kind` checks in place of `instanceof` — this repo is fully migrated | `ERROR_CLASSES.md` |
| `getSafe`, `getSafeCI`, `mutateSafe`, `setSafe`, `setOrNop`, `changeOrNop`, `deleteOrNop`, `setDefaultArray`, `pushSafe`, `addUniqueSafe`, `removeValue`, `removeValueIf`, `merge`, `rehydrate` | `util.*` (state helpers) | Optional chaining / nullish coalescing for reads; spread syntax for writes | `STATE_HELPERS.md` |
| `isDirectoryAsync`, `ensureDirSync`, `ensureFileAsync`, `ensureDirAsync`, `copyAsync`, `linkAsync`, `renameAsync`, `removeAsync`, `readlinkAsync` | `fs.*` (vortex-api wrapper) | `node:fs` / `node:fs/promises` directly | `NODE_FS.md` |
| `accessSync`, `appendFileSync`, `closeSync`, `createReadStream`, `createWriteStream`, `linkSync`, `openSync`, `readdirSync`, `readFileSync`, `statSync`, `symlinkSync`, `watch`, `writeFileSync`, `writeSync`, `constants`, `Stats`, `WriteStream`, `FSWatcher` | `fs.*` (raw Node passthrough) | `node:fs` directly (these are 1:1 re-exports already) | `NODE_FS.md` |
| `registerLoadOrderPage` | `IExtensionContext` | `registerLoadOrder` (File-Based Load Order) | `LOAD_ORDER_REGISTRATION.md` |
| `onceMain` | `IExtensionContext` | `once` (runs in the renderer); a separate NodeJS process + IPC if you truly need the main process | `VORTEX_EXTENSION_LOADING.md`, `VORTEX_EVENT_BUS.md` |
| `open` / `util.opn` | `util.*` | `window.api.shell.openUrl` / `window.api.shell.openFile` — this repo is fully migrated | This doc, § below; `EMBEDDED_BROWSER.md` |
| `toPromise` | `util.*` | Wrap the call in a plain `new Promise` — this repo has one call left, the `remove-download` emit in the shared `resources/browsers/base_browser.js` and its bundled copies | This doc, § below |
| `makeRemoteCall` | `util.*` | `window.api` (IPC from renderer to main) | This doc, § below |
| `steamShim`, `epicGamesLauncherShim` (exposed as `util.steam`, `util.epicGamesLauncher`) | `util.*` | `util.GameStoreHelper.findByAppId(id, "steam" \| "epic")` / `.findByName(name, store)`. Deprecated in Vortex 2.8, removed in 2.10 | This doc, § below |
| `IExtension` | type | `ExtensionInfo` | This doc, § below |
| `ExtensionInfo.type`, `.bundled`, `.path`, `.modId`, `.fileId`, `.issueTrackerURL` | type fields | Nothing — Vortex no longer reads them from `info.json` (since 2.7.0) | This doc, § below |

---

## `util.toPromise` — wrap a callback-style call

`toPromise(func)` takes a function that calls a Node-style `(err, result) => {}` callback and returns a Promise. It predates Vortex's typed `ApiEvents` registry, so the callback signature — and therefore the emitted event's actual arguments and result — go unchecked. It is deprecated in favor of wrapping the same call in a plain `new Promise`.

Most of Vortex's download-pipeline events (`start-download`, `start-install-download`, `remove-download`) are callback-based, so the shared downloader and browser modules wrap them constantly. Every call site in this repo now uses the plain `new Promise` form:

```js
// Deprecated form (no longer used anywhere in this repo):
const dlId = await util.toPromise((cb) =>
    api.events.emit("start-download", [url], dlInfo, undefined, cb, undefined, {
        allowInstall: false,
    }),
);

// Current form:
const dlId = await new Promise((resolve, reject) =>
    api.events.emit(
        "start-download",
        [url],
        dlInfo,
        undefined,
        (err, result) => (err ? reject(err) : resolve(result)),
        undefined,
        { allowInstall: false },
    ),
);
```

**One event cannot go through either form the same way.** `import-downloads` calls back with `(dlIds)` and no error argument — unlike every other event in this family — so wrapping it in `toPromise` (or a `new Promise` that treats the first callback argument as an error) reads the id array as the error and rejects. `resources/downloader/downloader.js` and `resources/browsers/base_browser.js` resolve it directly from `(dlIds)` instead.

---

## `util.opn` / `open` — open a URL or file externally

Deprecated in favor of `window.api.shell.openUrl(url)` / `window.api.shell.openFile(path)`, part of the newer preload-based IPC surface (`src/shared/types/preload.ts` upstream). Every template and game in this repo now uses the `window.api.shell` form, including the shared downloader and browser modules and the embedded webview's `onNewWindow` hand-off described in `EMBEDDED_BROWSER.md`. The preload `Shell` type returns `void` (there is no promise to `.catch()`), so the call is wrapped in `try/catch`:

```js
try {
  window.api.shell.openUrl(url);
} catch (err) {
  api.showErrorNotification("Failed to open the URL", err, { allowReport: false });
}
```

---

## `util.makeRemoteCall` — renderer-to-main IPC

Formerly a generic RPC bridge from the renderer to Electron's main process. The current implementation is a stub that throws unconditionally, directing callers to `window.api` instead. No extension in this repo calls it.

---

## `util.steam` and `util.epicGamesLauncher` — use `GameStoreHelper`

In Vortex 2.8 both exports became thin shims over `util.GameStoreHelper`; they keep working until **2.10**, when `util.steam` becomes `undefined` and a call throws a `TypeError` (usually inside `findGame` or `queryPath`, so the game stops being discovered). The published typings expose the shims as `steamShim` and `epicGamesLauncherShim`, both tagged `@deprecated`. Vortex 2.7.x still has the full `Steam` / `EpicGamesLauncher` classes behind those names.

| Deprecated | Replacement |
| --- | --- |
| `util.steam.findByAppId(id)` | `util.GameStoreHelper.findByAppId(id, "steam")` |
| `util.steam.findByName(name)` | `util.GameStoreHelper.findByName(name, "steam")` |
| `util.steam.id` | the literal string `"steam"` |
| `util.epicGamesLauncher.findByAppId(id)` / `.findByName(name)` | the same calls with `"epic"` |
| `util.epicGamesLauncher.isGameInstalled(name)` | no drop-in; inline `util.GameStoreHelper.findByAppId(id, "epic").then(() => true).catch(() => false)` |

Lookup behaviour is identical: same matchers, `^name$`-anchored name matching, same `GameEntryNotFound` rejection. Only the members listed above exist on the shims; any other member access warns and returns `undefined`. The old Epic `isGameInstalled` also fell back to a name lookup when the app id missed — Vortex's own Epic extensions dropped that fallback, so add it back only if you are passing a display name. Prefer `findByAppId`: display names change between editions and localisations, app ids do not. Call the new API unconditionally rather than guarding with `util.GameStoreHelper !== undefined` — it has accepted a store id since 2019 and extensions cannot declare a minimum Vortex version.

Vortex also watches these exports at run time: reading any member of a deprecated export logs `"<method>" is deprecated` once per session and sends an analytics event once per extension and method (extension name, version, Nexus mod and file id). The mechanism is generic, so any later deprecation can use it.

The rest of the game-store surface changed in 2.8 too: `registerGameStore` and the `IGameStore` export were removed, and `GameStoreHelper` shrank to `findByAppId`, `findByName`, `isGameInstalled` and `launchGameStore(api, storeId, params?)`. This repo only calls `findByAppId`.

---

## `IExtension` type

`IExtension` (the extension-manager's own metadata shape — install state, bundled flag, path) is deprecated in favor of `ExtensionInfo`. This describes Vortex's *own* extension bookkeeping (the Extensions page), not anything a game extension's `index.js` reads or writes, so it has no practical effect on this repo's code.

Since Vortex 2.7.0 six fields on `ExtensionInfo` itself — `type`, `bundled`, `path`, `modId`, `fileId`, `issueTrackerURL` — are tagged `@deprecated` ("not read from info.json anymore"). The fields the `ExtensionInfo` type still treats as live are `name`, `author`, `description`, `version`, and optionally `id` and `namespace`.

---

## Not deprecated — common false positives

The `fs.*` `*Async` family this repo actually calls constantly — `readdirAsync`, `statAsync`, `mkdirAsync`, `writeFileAsync`, `appendFileAsync`, `chmodAsync`, `closeAsync`, `fsyncAsync`, `lstatAsync`, `mkdirsAsync`, `moveAsync`, `openAsync`, `readAsync`, `readFileAsync`, `statSilentAsync`, `symlinkAsync`, `utimesAsync`, `writeAsync` — is **not** deprecated in the published API, even though Vortex's internal renderer source (`src/renderer/src/util/fs.ts`) groups them under one export block carrying a single `@deprecated use node:fs directly` comment. Only the nine custom async wrappers with no retry logic worth keeping actually carry the tag through to `api.d.ts`. The raw sync passthroughs in the second `fs` row of the table are tagged `@deprecated` in Vortex's source, but that tag is lost when the typings are bundled: none of the 46 `@deprecated` tags in the 2.7.2, 2.8.0 and 2.9.0-beta.2 typings belongs to a passthrough, so an editor will not strike them through. Replacing them with `node:fs` is still the right direction. The rest keep Vortex's retry-on-transient-error and elevation-prompt behavior, which has no native equivalent — see `NODE_FS.md` for the full per-function mapping and rationale.

---

## See also

`ERROR_CLASSES.md` (the ten `VortexError` subclasses, cancel semantics, kind catalog). `STATE_HELPERS.md` (immutable state helpers, the native-JS replacement patterns). `NODE_FS.md` (full `fs` → native mapping, the three wrapper calls kept for elevation, verified semantics). `LOAD_ORDER_REGISTRATION.md` (legacy `registerLoadOrderPage` vs. `registerLoadOrder`, full migration guidance). `VORTEX_EXTENSION_LOADING.md` and `VORTEX_EVENT_BUS.md` (`onceMain` vs. `once`). `EMBEDDED_BROWSER.md` (`util.opn` used from an embedded webview). `DOWNLOADER.md` and `BROWSER_MODULES.md` (the shared modules that wrap callback-based download events in `new Promise`).
