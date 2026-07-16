# Underused Vortex API Functions

Functions available in the Vortex API that are **not used by any of the 16 templates** in this repo, but are genuinely useful for building richer extensions. Organized by use case.

For the exhaustive API reference see the bundled type declarations in `node_modules/vortex-api/lib/api.d.ts`. Line numbers below refer to that file and drift between builds — grep by symbol name instead of trusting them.

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

### `api.highlightControl(selector, durationMS, text?, altStyle?)` — line 3117

**Why useful:** Briefly pulse-highlights a DOM element by CSS selector to onboard users to a button or control you just added.

**Use case:** After registering a new toolbar action, call `api.highlightControl('[data-id="my-action"]', 3000, 'New!')` on first launch to draw attention to it.

---

### `api.awaitUI()` — line 3121

**Why useful:** Returns a Promise that resolves once the Vortex UI is fully mounted. Gate event emissions or notifications that must appear on screen.

**Use case:** Inside `context.once()`, `await api.awaitUI()` before sending a startup notification — avoids notifications appearing before the UI is ready and being lost.

---

### `api.setStylesheet(key, filePath)` — line 3350

**Why useful:** Injects a SASS stylesheet into Vortex's styling pipeline. Three built-in keys: `'variables'` (colors/sizes/margins), `'details'` (controls), `'style'` (component-specific). A custom key inserts before `'style'`. Call `api.clearStylesheet()` to force the cache to rebuild.

**Use case:** Ship a `.scss` file alongside your extension to re-skin controls in your registered pages without forking any Vortex component.

```js
context.once(() => {
  api.setStylesheet('my-ext-style', path.join(__dirname, 'style.scss'));
});
```

---

### `api.closeDialog(id, actionKey?, input?)` — line 3153

**Why useful:** Programmatically close a dialog that was opened with `api.showDialog`. Optionally simulate clicking an action button by passing its `action` key.

**Use case:** Show a progress dialog (no actions, just a spinner), then close it when async work completes — without requiring the user to dismiss it manually.

---

### `context.registerPreview(priority, handler)` — line 3883

**Why useful:** Registers a handler that can show a preview or diff of files. Vortex calls handlers in priority order, skipping any that reject with `ProcessCanceled`. Priority guide: 0–100 = diff + pick, 100–200 = diff only, 300+ = view-only.

**Signature:** `handler(files: IPreviewFile[], allowPick: boolean) => Promise<IPreviewFile>`

**Use case:** Show a custom diff view for game-specific binary config files that Vortex's default text differ can't handle.

---

## 2. State & Reducers

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

### `api.saveModMeta(modInfo)` — line 3316

**Why useful:** Persists a manually computed or scraped `IModInfo` record to Vortex's local meta database. The meta DB is the backing store for `lookupModMeta` — saving here means subsequent lookups will find your data without hitting the network.

**Use case:** After a custom installer parses a mod's bundled `manifest.json`, call `saveModMeta` to store the name/version/author so the mod table populates correctly even without a Nexus lookup.

---

### `api.addMetaServer(id, server?)` — line 3292

**Why useful:** Registers an additional metadata lookup server. Vortex queries all registered servers and merges results. Pass `undefined` as the server argument to remove a previously added server with the same `id`.

**Use case:** Point Vortex at an internal or community-run metadata server for games that aren't on Nexus — add a server, and `lookupModMeta` calls will hit it automatically.

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

### `context.registerDownloadProtocol(scheme, handler)` — line 3621

**Why useful:** Register a custom URI scheme that resolves to direct download URLs. When a URL starting with your scheme arrives, Vortex calls your handler to resolve it to `{ urls: string[], updatedUrl?, meta }`.

**Use case:** Handle `mygame://mod/12345` deep links by resolving them to CDN download URLs — enabling Nexus-like one-click install for a custom mod portal.

---

## 5. File Operations Beyond fs Basics

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

### `api.openArchive(archivePath, options?, extension?)` — line 3320

**Why useful:** Opens an archive through Vortex's archive subsystem (7z + any registered `registerArchiveType` handlers) and returns an `Archive` object. The `extension` parameter overrides file extension detection — useful for archives without conventional extensions.

```js
const archive = await api.openArchive(downloadPath);
const entries = await archive.list();
const data = await archive.extractFile('data/config.json');
```

**Use case:** Inspect mod archive contents during installation without extracting everything — preview what files a mod contains before committing to a mod type.

---

## 6. Inter-Extension API

### `context.registerAPI(name, func, opts)` — line 3855

**Why useful:** Exposes a function on `api.ext.<name>` for other extensions to call. The standard way to build an extension that others can integrate with.

**Use case:** A "game server integration" extension exposes `api.ext.getCurrentServerStatus()` so a dashlet in another extension can display it.

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

### `context.requireVersion(versionRange)` — line 3922

**Why useful:** Declares a semver version range that the running Vortex must satisfy. Vortex will show a clear error if the constraint isn't met rather than crashing at runtime. Multiple calls are ANDed together.

**Use case:** If your extension uses an API introduced in Vortex 1.9.0, call `context.requireVersion('^1.9.0')` so users on older versions see a clean "please update Vortex" message.

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

---

## 10. Table Attributes

### `context.registerTableAttribute(tableId, attribute)` — line 3653

**Why useful:** Adds a new column or detail-pane field to any existing Vortex table without touching the table component itself. The mods table id is `'mods'`; download table is `'downloads'`.

**Key `ITableAttribute` fields:**

| Field | Purpose |
| --- | --- |
| `id` | Unique attribute id |
| `name` | Column header text |
| `placement` | `'table'` (column), `'detail'` (side panel), or `'both'` |
| `calc(mod, t)` | Returns the display value from a mod object |
| `customRenderer(mod, detailCell, t)` | Optional React component renderer |
| `isSortable` | Allow column sort |
| `isToggleable` | Allow user to hide column |
| `isGroupable` | Allow grouping rows by this attribute |
| `isDefaultVisible` | Whether column is visible by default (default `true`) |
| `filter` | `ITableFilter` instance for column filter UI |
| `position` | Default column order (lower = further left; default 100) |

```js
context.registerTableAttribute('mods', {
  id: 'my-game-version',
  name: 'Game Version',
  description: 'Minimum game version required by this mod',
  placement: 'both',
  calc: (mod) => mod.attributes?.['minGameVersion'] ?? '',
  isSortable: true,
  isToggleable: true,
  isDefaultVisible: false,
});
```

---

## 11. Diagnostics & Health Checks

### `context.registerTest(id, event, check)` — line 3661

**Why useful:** Attaches an automated integrity check to a Vortex event. The check function receives `api` and must return `Promise<ITestResult>` — an object with `severity` and `description`.

**Note:** Prefer `registerHealthCheck` for new code. `registerTest` is the legacy system and maps to `HealthCheckTrigger` internally via `ILegacyTestAdapter`.

---

### `context.registerHealthCheck(healthCheck)` — line 3671

**Why useful:** The modern check system. Pass an `IHealthCheck` for whole-game checks or an `IModHealthCheck` for per-mod checks (Vortex iterates installed mods and calls `checkMod` per mod).

**`IHealthCheck` shape:**

```js
{
  id: 'my-game-check',
  name: 'My Game Integrity Check',
  description: 'Verifies the game directory is intact',
  category: types.HealthCheckCategory.Game,        // 'system'|'game'|'mods'|'requirements'|'tools'|'performance'|'legacy'
  severity: types.HealthCheckSeverity.Warning,     // 'info'|'warning'|'error'|'critical'
  triggers: [types.HealthCheckTrigger.GameChanged, types.HealthCheckTrigger.Startup],
  cacheDuration: 60_000,   // ms; omit to re-run every time
  check: async (api) => ({
    checkId: 'my-game-check',
    status: 'passed',            // 'passed'|'failed'|'warning'|'error'
    severity: types.HealthCheckSeverity.Warning,
    message: 'Game directory OK',
    executionTime: 0,
    timestamp: new Date(),
  }),
  fix: async (api) => { /* optional auto-fix */ },
}
```

**`IModHealthCheck`** is the same shape with `checkMod(api, mod)` replacing `check`.

**`HealthCheckTrigger` values:** `Manual`, `Startup`, `GameChanged`, `ProfileChanged`, `ModsChanged`, `ResultsChanged`, `SettingsChanged`, `PluginsChanged`, `LootUpdated`, `Scheduled`.

---

## 12. OS File Dialogs

### `api.selectFile(options)` / `api.saveFile(options)` / `api.selectDir(options)` / `api.selectExecutable(options)` — lines 3172–3190

**Why useful:** Native OS file/directory picker dialogs. These return a `Promise<string>` resolving to the selected path (or `undefined` if the user cancels).

**`IOpenOptions` / `ISaveOptions` fields:**

| Field | Purpose |
| --- | --- |
| `title` | Dialog window title |
| `defaultPath` | Initial directory or file path |
| `filters` | `IFileFilter[]` — each `{ name, extensions: string[] }` |

```js
const filePath = await api.selectFile({
  title: 'Select mod config',
  defaultPath: util.getVortexPath('userData'),
  filters: [{ name: 'JSON', extensions: ['json'] }],
});
if (filePath !== undefined) {
  // user selected a file
}

const savePath = await api.saveFile({
  title: 'Save merged config',
  filters: [{ name: 'INI', extensions: ['ini'] }],
});

const dir = await api.selectDir({ title: 'Select game folder' });

const exe = await api.selectExecutable({ title: 'Select launcher' });
```

**Use case:** Any settings page that needs a user-picked path should use these rather than a free-text input — avoids typos and normalizes path format.
