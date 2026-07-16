# Vortex Extension Loading & Init (runtime)

How the app discovers, loads, sandboxes, and runs extensions — the plugin runtime itself. The
**authoring** side (what your `init(context)` looks like, which `context.register*` calls exist,
the API you receive) is covered by the `vortex-api` type declarations
(`node_modules/vortex-api/lib/api.d.ts`) and the authoring docs in this folder.
This doc is how the manager drives them.

Driver: `Vortex/src/renderer/src/ExtensionManager.ts` (+ `ExtensionProvider.ts`).

## Kinds of extension

| Kind | Location | Loaded |
| --- | --- | --- |
| **Core** | `src/renderer/src/extensions/` | Compiled into the renderer; registered from a static list |
| **Bundled plugins** | `getVortexPath('bundledPlugins')` | Shipped with the app, loaded from disk |
| **Dynamic / user** | `getVortexPath('userData')/plugins` | User-installed third-party extensions |

`ExtensionManager.getExtensionPaths()` returns the user `plugins` dir (`bundled: false`) plus the
bundled-plugins dir (`bundled: true`). A user copy of an extension can **replace** a bundled one;
a user copy **older than** the bundled version is removed ("extension older than bundled version,
will be removed").

## Discovery & load

1. **`prepareExtensions()`** builds `mExtensions` (`IRegisteredExtension[]`) from those paths.
2. For each, **`loadDynamicExtension(extensionPath, …, bundled)`** reads `info.json`, computes a
   **namespace** (`info.namespace ?? info.id ?? (bundled ? folderName : idify(name, folderName))`),
   `require`s the extension's index file (trying known formats), and returns its `ExtensionInit`.
   `getExtensionInitFunc(mod)` extracts the **default export** — the `init(context)` function.

## The context is a recording Proxy

The `IExtensionContext` passed to every `init(context)` is **not** the live API — it's a Proxy
(`ContextProxyHandler`). Before an extension's `init` runs, `setExtension(name, path)` sets the
"current" extension; then each call the extension makes —
`context.registerGame(...)`, `context.registerReducer(...)`, `context.once(...)`, … — is
**recorded** (with the extension's `extensionPath` + extInfo) rather than executed immediately.

This is the key design: **registration is deferred**. `init` just declares intent; nothing
actually happens until the manager replays the recorded calls.

## Init phases

1. **Run inits** — every extension's `init(context)` runs, populating the proxy with recorded
   calls. Loading callbacks fire per extension.
2. **`applyExtensionsOfExtensions()` / `invokeAdditions`** — extensions that **add new context
   methods for other extensions** (the API-extension pattern) are applied first, so those methods
   exist when other calls replay.
3. **`apply(funcName, realHandler, addExtInfo?)`** — for each registration type, replay the
   recorded calls into the **real** handler (`realHandler(...call.arguments)`, prefixed with
   `extInfo` when requested). A throw here → `showErrorNotification("Extension failed to
   initialize. If this isn't an official extension, please report the error to the respective
   author.")`, and other extensions continue.
4. **`initExtensionPersistors(store)`** — attach each extension's registered persistors to the
   Redux store.
5. **`doOnce()`** — run every `once` / `onceMain` callback **in series** (`mapSeries`), now that
   everything is registered. This is where extensions attach event handlers and do startup work.
   `onceMain` is **deprecated in the renderer** (logs a warning).

The `api` object (`getApi()`, built once with `events`, `emitAndAwait`, `onAsync`, `store`,
`sendNotification`, …) is what the context exposes as `context.api`.

## Compatibility & isolation

- `unloadIncompatible(sUIAPIs, mExtensions)` drops extensions that call APIs they're not compatible
  with; `getOptionalExtensions` tracks optional ones.
- Each extension's failures are isolated: a bad `init`, `apply`, or `once` surfaces as a
  per-extension error notification ("report to the respective author") without taking down the rest.

## The extend-API pattern

Core extensions add methods other extensions call, via the recorded-additions mechanism. Examples:
`download_management/util/extendApi.ts`, `mod_management/util/extendAPI.ts`, and the nexus methods
(`nexusRequestNexusLogin`, `nexusRetrieveCategoryList`). Because additions are applied before the
replay, downstream extensions can call them in their own `register*`/`once`.

## Gotchas

- **Don't expect side effects during `init`** — calls are recorded, not executed. Anything that
  must run immediately is wrong; use `once()`.
- Register event handlers and cross-extension wiring inside `once()`; by then all extensions are
  loaded (`VORTEX_EVENT_BUS.md`).
- `onceMain` doesn't work as expected in the renderer — it's deprecated; use `once`.
- A newer user-installed copy shadows the bundled extension; an older one is pruned.
- `namespace` (not folder name) is the stable identity used for i18n and call attribution.

## See also

Runtime siblings: `VORTEX_EVENT_BUS.md` (once + handlers), `VORTEX_APP.md` (overview). Authoring:
`REGISTER_GAME.md`, `INSTALLER_SYSTEM.md`, and the `vortex-api` type declarations.
