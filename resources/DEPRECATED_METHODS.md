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
| `open` / `util.opn` | `util.*` | `window.api.shell.openUrl` / `window.api.shell.openFile` | This doc, § below; `EMBEDDED_BROWSER.md` |
| `toPromise` | `util.*` | Wrap the call in a plain `new Promise` — this repo is fully migrated | This doc, § below |
| `makeRemoteCall` | `util.*` | `window.api` (IPC from renderer to main) | This doc, § below |
| `IExtension` | type | `ExtensionInfo` | This doc, § below |

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

Deprecated in favor of `window.api.shell.openUrl(url)` / `window.api.shell.openFile(path)`, part of the newer preload-based IPC surface (`src/shared/types/preload.ts` upstream). This repo has not adopted `window.api` yet — `util.opn` remains what `EMBEDDED_BROWSER.md` documents for handing a URL to the system browser from an embedded webview's `onNewWindow` handler.

```js
const { util } = require("vortex-api");
util.opn(url).catch(() => null); // deprecated, still current practice in this repo
```

---

## `util.makeRemoteCall` — renderer-to-main IPC

Formerly a generic RPC bridge from the renderer to Electron's main process. The current implementation is a stub that throws unconditionally, directing callers to `window.api` instead. No extension in this repo calls it.

---

## `IExtension` type

`IExtension` (the extension-manager's own metadata shape — install state, bundled flag, path) is deprecated in favor of `ExtensionInfo`. This describes Vortex's *own* extension bookkeeping (the Extensions page), not anything a game extension's `index.js` reads or writes, so it has no practical effect on this repo's code.

---

## Not deprecated — common false positives

The `fs.*` `*Async` family this repo actually calls constantly — `readdirAsync`, `statAsync`, `mkdirAsync`, `writeFileAsync`, `appendFileAsync`, `chmodAsync`, `closeAsync`, `fsyncAsync`, `lstatAsync`, `mkdirsAsync`, `moveAsync`, `openAsync`, `readAsync`, `readFileAsync`, `statSilentAsync`, `symlinkAsync`, `utimesAsync`, `writeAsync` — is **not** deprecated in the published API, even though Vortex's internal renderer source (`src/renderer/src/util/fs.ts`) groups them under one export block carrying a single `@deprecated use node:fs directly` comment. Only the two lists in the table above (the raw sync passthroughs, and the nine custom async wrappers with no retry logic worth keeping) actually carry the tag through to `api.d.ts`. The rest keep Vortex's retry-on-transient-error and elevation-prompt behavior, which has no native equivalent — see `NODE_FS.md` for the full per-function mapping and rationale.

---

## See also

`ERROR_CLASSES.md` (the ten `VortexError` subclasses, cancel semantics, kind catalog). `STATE_HELPERS.md` (immutable state helpers, the native-JS replacement patterns). `NODE_FS.md` (full `fs` → native mapping, the three wrapper calls kept for elevation, verified semantics). `LOAD_ORDER_REGISTRATION.md` (legacy `registerLoadOrderPage` vs. `registerLoadOrder`, full migration guidance). `VORTEX_EXTENSION_LOADING.md` and `VORTEX_EVENT_BUS.md` (`onceMain` vs. `once`). `EMBEDDED_BROWSER.md` (`util.opn` used from an embedded webview). `DOWNLOADER.md` and `BROWSER_MODULES.md` (the shared modules that wrap callback-based download events in `new Promise`).
