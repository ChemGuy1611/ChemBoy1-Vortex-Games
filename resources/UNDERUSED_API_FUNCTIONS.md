# Underused Vortex API Functions

Functions available in the Vortex API that are **not used by any of the 16 templates** in this repo, but are genuinely useful for building richer extensions. Organized by use case.

For the exhaustive API reference see memory files `reference_vortex_api_core.md`, `reference_vortex_api_helpers.md`, and `reference_vortex_api_types.md`. Line numbers refer to `vortex-api/lib/api.d.ts` (9295-line build).

---

## 1. UI Extension Points

### `context.registerControlWrapper(group, priority, wrapper)` — line 3545
**Why useful:** Injects a HOC around an existing Vortex control group without forking it. Add badges, tooltips, or overlay icons to existing table rows or toolbar buttons.

**Use case:** Wrap the mods-table row renderer to add a "Needs Patch" badge on specific mods without replacing the entire row component.

---

### `context.registerOverlay(id, element, props?)` — line 3539
**Why useful:** Renders a component that floats above the main Vortex window in a managed layer. Visibility is controlled by the extension.

**Use case:** Show a post-install README panel ("Quick Start Guide") after a required mod is installed, triggered by an `api.events` listener. See `src/extensions/instructions_overlay/index.ts` for the first-party implementation.

---

### `context.registerToDo(id, type, props, icon, text, action, condition, value, priority)` — line 3557
**Why useful:** Shows a one-time onboarding item on the Vortex dashboard that auto-dismisses when its condition is met.

**Use case:** "Set your game executable path" or "Install the required runtime before deploying" — visible only until the user completes the action, without needing a persistent notification.

---

### `context.registerDashlet(title, width, height, position, component, isVisible, props, opts)` — line 3570
**Why useful:** Add a tile to the Vortex dashboard (grid layout; width 1-3, height 1-6).

**Use case:** A "Mod Stats" dashlet showing total enabled mods, last deploy time, and a "Deploy Now" button for the active game — visible only when your game is active via `isVisible`.

---

### `context.registerBanner(group, component, opts)` — line 3564
**Why useful:** A cycling banner shown at the top of a Vortex page group.

**Use case:** "This game has a new compatible patch — update your mods" shown in the Mods page banner group after fetching upstream version info.

---

### `context.registerFooter(id, element, props?)` — line 3548
**Why useful:** Persistent status element in the bottom status bar.

**Use case:** "Load order valid" / "3 conflicts detected" live status derived from `api.onStateChange`.

---

### `context.registerDialog(id, element, props?)` — line 3536
**Why useful:** Self-controlled modal with full React component (unlike `api.showDialog` which is declarative). Manages its own show/hide state via `actions.setDialogVisible`.

**Use case:** Multi-step installation wizard (choose variant -> confirm files -> set options) where `showDialog` is too rigid.

---

### `context.registerSettings(title, element, props?, visible?, priority?)` — line 3509
**Why useful:** Adds a tab to Vortex's Settings dialog. Pair with `context.registerReducer(['settings', 'myExtId'], spec)` to persist the values.

**Use case:** "Skyrim Tools Settings" page letting users toggle auto-LOOT, set output paths, choose merge strategy.

---

### `api.highlightControl(selector, durationMS, text?, altStyle?)` — line 3117
**Why useful:** Briefly pulse-highlights a DOM element by CSS selector to onboard users to a button or control you just added.

**Use case:** After registering a new toolbar action, call `api.highlightControl('[data-id="my-action"]', 3000, 'New!')` on first launch to draw attention to it.

---

### `api.awaitUI()` — line 3121
**Why useful:** Returns a Promise that resolves once the Vortex UI is fully mounted. Gate event emissions or notifications that must appear on screen.

**Use case:** Inside `context.once()`, `await api.awaitUI()` before sending a startup notification — avoids notifications appearing before the UI is ready and being lost.

---

## 2. State & Reducers

### `context.registerReducer(path, spec)` — line 3624
**Why useful:** Adds a typed Redux state slice to Vortex's store. Data at `window.*` or `settings.*` or `persistent.*` paths is persisted between sessions; `session.*` is not.

**Use case:** Store per-game extension config at `persistent.myExtension[gameId]` — auto-persisted, accessible via `selectors` patterns, triggers React re-renders automatically.

```js
context.registerReducer(['persistent', 'myExt'], {
  defaultState: { enabled: true, outputDir: '' },
  reducers: {
    ['SET_MY_EXT_OPTION']: (state, payload) => util.setSafe(state, ['enabled'], payload),
  },
});
```

---

### `context.registerSettingsHive(type, hive)` — line 3632
**Why useful:** Declares that a top-level state hive should be scoped to `'global' | 'game' | 'profile'` for persistence. Game-scoped hives automatically switch content when the active game changes.

**Use case:** Store load-order overrides scoped per-game so switching games auto-loads the right overrides without manual cleanup.

---

### `context.registerPersistor(hive, persistor, debounce?)` — line 3640
**Why useful:** Back a state hive with a custom file format (e.g., YAML, INI, or a game-native config). Vortex treats it like any other state slice — React re-renders, onStateChange, etc.

**Use case:** Read/write a game's native `mods.txt` as a Vortex state slice so in-app edits are reflected on disk in real time.

---

### `context.registerActionCheck(actionType, check)` — line 3657
**Why useful:** Pre-dispatch guard on any Redux action type. Throw or return an error string to block bad dispatches before they corrupt state.

**Use case:** Guard `setLoadOrder` to reject load orders where a required master is missing — better error UX than catching the downstream deploy failure.

---

### `util.makeReactive(obj)` — line 7017
**Why useful:** Wraps a plain JS object so property assignments trigger React re-renders in components that reference it — without Redux. Useful for ephemeral UI state that doesn't need to persist.

**Use case:** A "scan in progress" flag that a dashlet component reads from — no action/reducer needed, just assign `state.scanning = true`.

---

### `util.setDefaultArray(state, path, fallback)` — line 7901
**Why useful:** Like `setdefault` but initializes the path with `fallback` (an array) if missing. Safe for use inside reducers.

**Use case:** Ensure `state.loadOrder` exists before pushing a new entry in a reducer — `util.setDefaultArray(state, ['loadOrder'], [])`.

---

## 3. Mod Metadata & Lookup

### `api.lookupModReference(ref, opts?)` — line 3206
**Why useful:** Resolves an `IModReference` (by md5, repo id, or expression) to candidate download entries. Use in complex installers that need to verify or find dependencies.

**Use case:** Before auto-installing a required DLC, call `lookupModReference` to confirm the file is already downloaded — skip the Nexus fetch if it is.

---

### `api.lookupModMeta(details, ignoreCache?)` — line 3215
**Why useful:** Hash+size lookup against the mod metadata database. Enriches mod attributes (name, version, author) from just the file.

**Use case:** When a user drops an archive into the download folder manually, trigger a lookup to auto-populate mod metadata instead of showing "Unknown Mod".

---

### `api.genMd5Hash(data, progressCb?)` — line 3197
**Why useful:** Streamed MD5 hash with a progress callback — preferable to a custom implementation for large archives.

**Use case:** Pre-hash a staged file before uploading a mod to a custom server, or verify a download's integrity against a known hash.

---

### `context.registerAttributeExtractor(priority, extractor)` — line 3755
**Why useful:** Inject extra attributes into any mod at install time by parsing its files. Default meta-db extractor runs at priority 100 — use 90 or lower to run first.

**Use case:** Parse a mod's `manifest.json` at install time and surface `engineVersion`, `requiredDLC`, or `patchTarget` as searchable/sortable mod table columns.

---

### `context.registerGameInfoProvider(id, priority, expireMS, keys, query)` — line 3741
**Why useful:** Cache per-game info (fetched from any source) and expose it in Vortex's game info panel. Auto-refreshed after `expireMS` milliseconds.

**Use case:** Show the current Steam Workshop item count or the latest game patch version in the game info panel, fetched from an API and cached for 1 hour.

---

### `util.coerceToSemver(version)` vs `util.semverCoerce(version, opts?)` — lines 831 / 7812
**Why useful:** Game versions are rarely strict semver. `coerceToSemver` returns a string; `semverCoerce` returns a `SemVer` object (access `.major`, `.minor`, `.patch`).

**Use case:** Compare a game's reported version against a minimum required version — `semver.gte(util.semverCoerce(gameVersion), '1.6.0')`.

---

### `util.isFuzzyVersion(input)` — line 6026
**Why useful:** Returns `true` if a version string is not strict semver (e.g. `"1.2"`, `"latest"`, `"beta"`). Gate strict semver operations on this check to avoid crashes.

**Use case:** Before calling `semver.satisfies`, check `util.isFuzzyVersion(modVersion)` and fall back to a simple string comparison if true.

---

## 4. Install / Launch Hooks

### `context.registerStartHook(priority, id, hook)` — line 3833
**Why useful:** Intercept any tool launch. The hook receives `IRunParameters` and can mutate args, environment, or cancel the launch by throwing `UserCanceled` / `ProcessCanceled`.

**Use case:** Before launching the game, verify all required prerequisite mods are deployed; if not, show a dialog and cancel the launch (`throw new util.ProcessCanceled('Deploy first')`).

Priority guide: first-party check-deployment hook runs at 100. Use 50-90 for extension hooks that must run before it, or 110+ to run after.

---

### `context.registerInterpreter(extension, apply)` — line 3827
**Why useful:** Map a file extension (e.g. `.py`, `.jar`, `.bat`) to an actual interpreter when Vortex tries to launch it. Throw `util.MissingInterpreter(msg, url)` for a nice error UI.

**Use case:** Register `.jar` files to launch via `java -jar` so modders can ship Java-based tools that Vortex can auto-launch.

---

### `context.registerMerge(test, merge, modType)` — line 3821
**Why useful:** Merge files across mods of a given type during deployment. Use for text-format configs that need combining rather than overwriting.

**Use case:** Merge all mods' `plugins.txt` entries into one combined file during deployment for games that use a plugin load-order text file.

---

### `context.registerArchiveType(extension, handler)` — line 3808
**Why useful:** Teach Vortex to open and list contents of a non-7z archive format — then installers and preview panels can read it.

**Use case:** Register `.pak` archives for a game engine so the installer can inspect their contents and apply the correct mod type.

---

### `context.registerDownloadProtocol(scheme, handler)` — IExtensionContext.ts:1173
**Why useful:** Register a custom URI scheme that resolves to direct download URLs. When a URL starting with your scheme arrives, Vortex calls your handler to resolve it to `{ urls: string[], updatedUrl?, meta }`.

**Why not in api.d.ts yet:** Added to Vortex source but not yet published in the vortex-api bundle. Fully functional.

**Use case:** Handle `mygame://mod/12345` deep links by resolving them to CDN download URLs — enabling Nexus-like one-click install for a custom mod portal.

---

## 5. File Operations Beyond fs Basics

### `util.walk(target, cb, opts?)` — line 9105
**Why useful:** Async recursive directory walk with `{ ignoreErrors?: boolean }`. Cleaner than manual `readdirAsync` recursion when you need per-entry `Stats`.

```js
await util.walk(stagingPath, async (root, entries) => {
  for (const entry of entries) {
    if (entry.name.endsWith('.cfg')) { /* process */ }
  }
});
```

---

### `fs.forcePerm(t, op, filePath?, maxTries?)` — line 1258 (fs namespace)
**Why useful:** Retries a file operation while temporarily granting write permissions (read-only files, protected directories). Falls back to elevation if needed.

**Use case:** Before unlinking or renaming a file in a game's protected directory, wrap the operation in `fs.forcePerm(t, () => fs.unlinkAsync(path), path)` instead of failing silently.

---

### `util.withTmpDir` / `fs.withTmpFile` — util line 9256, fs namespace
**Why useful:** Scoped temporary directory/file that is auto-deleted when the callback resolves or rejects. No manual cleanup.

```js
await util.withTmpDir(async (tmpPath) => {
  await someExtractOperation(archive, tmpPath);
  // tmpPath auto-deleted after return
});
```

---

### `util.copyFileAtomic(src, dest)` / `util.writeFileAtomic(path, data)` — lines 9012 / 9108
**Why useful:** Write-via-temp-then-rename pattern — crash-safe for config files. If the process dies mid-write, the original file is unaffected.

**Use case:** Any extension config or state file written to disk should use `writeFileAtomic` rather than `fs.writeFileAsync` directly.

---

### `util.calculateFolderSize(dirPath)` — line 9008
**Why useful:** Async total size of a directory tree in bytes. No wheel to reinvent.

**Use case:** Show staging folder disk usage in a dashlet or before a large deployment operation.

---

### `util.ConcurrencyLimiter` — line 9014
**Why useful:** Caps how many async operations run in parallel. Prevents I/O floods when processing hundreds of mod files.

```js
const limiter = new util.ConcurrencyLimiter(5); // max 5 concurrent
await Promise.all(modFiles.map(f => limiter.do(() => processFile(f))));
```

---

## 6. Inter-Extension API

### `context.registerAPI(name, func, opts)` — line 3855
**Why useful:** Exposes a function on `api.ext.<name>` for other extensions to call. The standard way to build an extension that others can integrate with.

**Use case:** A "game server integration" extension exposes `api.ext.getCurrentServerStatus()` so a dashlet in another extension can display it.

---

### `context.requireExtension(extId, version?, optional?)` — line 3862
**Why useful:** Declare a hard or soft dependency on another Vortex extension. Vortex will show an error if a required extension is missing or out of range.

**Use case:** If your extension requires the Nexus Integration extension, call `context.requireExtension('nexus_integration')` so Vortex reports a clean error instead of a runtime crash.

---

### `context.optional.*` — line 3882
**Why useful:** A Proxy around `context` that silently no-ops any `registerXyz` call for APIs that don't exist. Use for truly optional integrations where missing the extension is fine.

**Use case:** `context.optional.registerLoadOrder(gameInfo)` — gracefully degrades if the Collections extension isn't installed without try/catch boilerplate.

---

### `api.getLoadedExtensions()` — line 3125
**Why useful:** Returns the list of all currently loaded extensions at runtime. Use to detect optional peer extensions and enable conditional behavior.

**Use case:** At startup, check if `api.getLoadedExtensions().some(e => e.name === 'collections')` to decide whether to register collection-related features.

---

## 7. Events Worth Subscribing

### Key `api.events` event names

All are sync (NodeJS.EventEmitter). Subscribe in `context.once()`.

| Event | Args | When fired |
| --- | --- | --- |
| `'gamemode-activated'` | `(gameId: string)` | User switches active game |
| `'profile-did-change'` | `(profileId: string)` | Profile switch completed |
| `'will-deploy'` | `(profileId, deployment)` | Before deployment starts |
| `'did-deploy'` | `(profileId, deployment, setProgress)` | After deployment completes |
| `'will-purge'` | `(profileId)` | Before purge |
| `'did-purge'` | `(profileId)` | After purge |
| `'mod-enabled'` | `(profileId, modId)` | Mod enabled by user |
| `'mod-disabled'` | `(profileId, modId)` | Mod disabled by user |
| `'startup-complete'` | — | Vortex fully started |
| `'check-mods-version'` | `(gameId, mods, forced)` | Version check triggered |

---

### `api.onAsync(event, listener)` — line 3103
**Why useful:** Async variant of `api.events.on`. Vortex awaits all registered `onAsync` listeners before proceeding. Use for pre-flight checks that need to resolve before the triggering action continues.

**Use case:** Register an `onAsync('will-deploy', ...)` listener that validates the load order and throws `UserCanceled` to abort deployment if validation fails — Vortex will show your error and not proceed.

---

### `api.emitAndAwait(event, ...args)` — line 3099
**Why useful:** Emit to all `onAsync` listeners and collect their return values as an array. Use when an extension needs to aggregate input from multiple loaded extensions.

**Use case:** Emit `'get-load-order-constraints'` and collect constraint objects from all loaded game-specific extensions to build a unified sort order.

---

### `api.withPrePost(event, cb)` — line 3108
**Why useful:** Wraps a function so it automatically emits `will-<event>` before and `did-<event>` after — a cheap way to make your extension's operations hookable by others.

**Use case:** Wrap your `installPrerequisite()` function so other extensions can `onAsync('will-install-prereq', ...)` to do pre-work or cancel it.

---

### `api.onStateChange(path, callback)` — line 3088
**Why useful:** Subscribe to a specific Redux state path with `(prev, cur) => void`. Much cheaper than `store.subscribe` + manual diffing.

**Use case:** Watch `['persistent', 'mods', gameId]` to trigger a re-check of load-order validity whenever any mod is installed or removed — without polling.

---

## 8. Profile, Tools & Load Order

### `context.registerProfileFile(gameId, filePath)` — line 3878
**Why useful:** Mark a file as "profile-specific" — Vortex backs it up when switching profiles and restores the right version per profile.

**Use case:** Register a game's `plugins.txt` as a profile file so each profile maintains its own independent load order with zero extra code.

---

### `context.registerProfileFeature(featureId, type, icon, label, desc, supported)` — line 3879
**Why useful:** Add a toggleable per-profile feature (stored at `state.persistent.profiles[id].features[featureId]`). Appears as a checkbox in the profile management UI.

**Use case:** "Auto-sort load order on deploy" toggle stored per-profile — users who prefer manual ordering on one profile still get auto-sort on another.

---

### `context.registerToolVariables(cb)` — line 3880
**Why useful:** Inject `${MY_VARIABLE}` token substitutions into tool command line arguments. Keys must be `UPPERCASE_UNDERSCORE`.

**Use case:** Expose `${GAME_MOD_STAGING_PATH}` and `${ACTIVE_PROFILE_ID}` as tool variables so power users can use them in custom tool launch args without hardcoding paths.

---

### `context.registerHistoryStack(id, opts)` — line 3881
**Why useful:** Add a named undo/redo lane to Vortex's history system. Provide `describe`, `describeRevert`, `canRevert`, and `revert` callbacks.

**Use case:** Track load-order changes with undo support — each reorder pushes an entry; users can undo to the last known-good order from the History panel.

---

### `context.registerGameVersionProvider(id, priority, supported, getVersion, opts?)` — line 3875
**Why useful:** Override how Vortex detects the installed game version. Use when the default exe-header approach gives wrong results.

**Use case:** Read a game's `build_id.txt` or Steam `appmanifest.acf` to report the real version — many games report `1.0.0` in their PE header regardless of actual version.

---

## 9. Useful `util.*` Helpers

### `util.deBOM(str)` — line 9019
Strip a UTF-8 or UTF-16 BOM before parsing JSON/text files written by game tools. Many game-generated files include a BOM that breaks `JSON.parse`.

```js
const data = JSON.parse(util.deBOM(await fs.readFileAsync(cfgPath, 'utf8')));
```

---

### `util.sanitizeFilename(input)` / `util.isFilenameValid(input)` / `util.isPathValid(input, allowRelative?)` — lines 9088 / 9049 / 9051
Cross-platform filename/path safety. `isFilenameValid` checks the name component; `isPathValid` checks the full path; `sanitizeFilename` strips illegal characters. Use before any user-provided path reaches the filesystem.

---

### `util.isChildPath(child, parent, normalize?)` — line 9048
Reliable Windows-aware child-path check (case-insensitive by default). Never use string `.startsWith()` for path containment on Windows — drive letter casing and trailing-slash differences will break it.

---

### `util.makeQueue()` — line 9060
Returns a serial async queue. Enqueue functions that return Promises; they run one at a time, in order. Useful for IPC-with-game-server style operations that must not overlap.

```js
const queue = util.makeQueue();
queue(() => writeConfigFile(data1));
queue(() => writeConfigFile(data2)); // waits for the first to finish
```

---

### `util.objDiff(lhs, rhs, skip?)` — line 7276
Shallow diff of two objects; returns `{ key: { lhs, rhs } }` for changed keys. Use for state-change debugging or change-log generation.

---

### `util.Debouncer` — line 9018
Class with `schedule(delay, cb)`, `runNow()`, `wait()`, `clear()`. Debounce expensive reactions to rapid state changes (e.g., user typing in a search box, rapid mod enable/disable toggles).

---

### Custom error classes — lines 9002/9076/9017/9092/9066/9069/9070/9071/9016
Throw these instead of generic `Error` to get the right Vortex error UI:

| Class | When to throw |
| --- | --- |
| `util.UserCanceled(skipped?)` | User explicitly cancelled — no error report shown |
| `util.ProcessCanceled(msg)` | Programmatic cancel — no error report |
| `util.DataInvalid(msg)` | Bad/corrupt data — report shown |
| `util.SetupError(msg, component?)` | Misconfiguration — report shown with setup guidance |
| `util.MissingInterpreter(msg, url?)` | Required tool not found — links to download URL |
| `util.NotFound(what)` | Expected resource missing |
| `util.ArgumentInvalid(argument)` | Bad argument to an API call |
| `util.CycleError` | Circular dependency detected |
| `util.NotSupportedError()` | Feature not supported in this context |
