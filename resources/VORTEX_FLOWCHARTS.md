# Vortex Operation Flowcharts

Visual companions to the Vortex runtime docs in this folder. Each diagram traces one operation end
to end, using the real function, file, state-path, and event names from the corresponding prose
doc. The diagrams are a map, not a substitute — the prose docs carry the detail, the gotchas, and
the tables.

Diagrams are Mermaid, which renders natively on GitHub and in most Markdown viewers.

## Contents

| Diagram | Source doc |
| --- | --- |
| [1. Mod install pipeline](#1-mod-install-pipeline) | `VORTEX_MOD_INSTALL.md` |
| [2. Mod update / version check](#2-mod-update--version-check) | `VORTEX_NEXUS_INTEGRATION.md`, `NEXUS_FILE_PROPERTIES.md` |
| [3. Load order handling (FBLO)](#3-load-order-handling-fblo) | `VORTEX_LOAD_ORDER.md` |
| [4. Deployment and purge](#4-deployment-and-purge) | `VORTEX_DEPLOYMENT.md` |
| [5. Game discovery and activation](#5-game-discovery-and-activation) | `VORTEX_GAME_LIFECYCLE.md` |
| [6. Profile switch](#6-profile-switch) | `VORTEX_PROFILES.md` |
| [7. Extension loading and init](#7-extension-loading-and-init) | `VORTEX_EXTENSION_LOADING.md` |

## How to read these

- **Solid arrows** are the main path; **dotted arrows** are notes, warnings, or side effects.
- Diamonds are decision points — the branch labels are the actual conditions the code tests.
- Names in nodes are literal identifiers. Grep them in the Vortex source or in the source doc.
- State paths are written with dots (`persistent.mods.gameId.modId`) rather than bracket
  subscripts, purely so every Mermaid renderer parses them.

## 1. Mod install pipeline

Turning a downloaded archive into an installed mod in the staging folder. Installed is **not**
deployed — see [diagram 4](#4-deployment-and-purge).

```mermaid
flowchart TD
    T1["start-install (archive path)<br/>after download-finished, drag-drop, Install from file"] --> GID
    T2["InstallManager.install(...) called directly"] --> GID
    T3["installDependencies / installRecommendations<br/>collection or dependency tree walk"] --> GID

    GID["1. Determine game id — util/queryGameId.ts<br/>downloadGameId -> convertGameIdReverse(games, gameId)<br/>fallback activeProfile(state).gameId, else prompt user"]
    GID --> PICK["2. getInstaller(fileList, gameId, archivePath)<br/>walks mInstallers, sorted ASCENDING by priority<br/>lower number = higher priority"]

    PICK --> TEST{"testSupported(...) resolves<br/>supported: true?"}
    TEST -- "false — recurse to next offset" --> PICK
    TEST -- "undefined — logged as Buggy installer, not selected" --> PICK
    TEST -- "true" --> RUN["3. Chosen install() -> IInstallResult<br/>a list of IInstruction"]

    PICK -.-> LADDER["Priority ladder:<br/>installer_fomod_native / _ipc / _shared / nested — archives with ModuleConfig.xml<br/>...game extension installers...<br/>basicInstaller — low-priority catch-all, copies everything"]

    RUN --> OVR["processInstructions builds overrideMap<br/>keyed by source ?? type, upper-cased<br/>rewrites matching base instructions"]
    OVR -.-> OVRN["Overrides SUPPRESSED during collection installs<br/>while the installing_dependencies activity runs.<br/>A setmodtype override is dropped if that<br/>modtype does not exist for the game."]

    OVR --> EMPTY{"instruction result?"}
    EMPTY -- "null / empty — installer already reported" --> UC["UserCanceled"]
    EMPTY -- "empty array" --> PCAN["ProcessCanceled:<br/>Empty archive or no options selected"]
    EMPTY -- "populated" --> BUCKET

    BUCKET["transformInstructions(...) -> InstructionGroups<br/>one array per type: copy, mkdir, generatefile, iniedit,<br/>setmodtype, attribute, rule, submodule,<br/>enableallplugins, unsupported, error"]
    BUCKET -. "submodule — install nested archive as its own mod" .-> PICK

    BUCKET --> STAGE["4. extractArchive, then apply buckets into staging<br/>util/getInstallPath.ts + stagingDirectory.ts give the per-game root<br/>each mod lands in its own installationPath subfolder<br/>variant installs append +variant — util/modName.ts"]

    STAGE --> MTYPE["5. Mod type routing<br/>setmodtype instructions, or determineModType<br/>which sorts candidate modtypes by priority"]
    MTYPE -.-> MTN["Modtype supplies a destination other than the game data dir<br/>BepInEx, ENB, dinput — the modtype-* extensions"]

    MTYPE --> ST["persistent.mods.gameId.modId exists, state: installed<br/>NOTHING is in the game folder yet"]
    ST --> EV["did-install-mod (gameId, archiveId, modId, modInfo)"]
    EV --> NEXT["Enable + deploy is what puts files in the game<br/>see diagram 4"]

    SIM["InstallManager.simulate(...)"] -.-> SIMN["Same installer selection + instruction generation,<br/>WITHOUT committing. Used for previews<br/>and conflict detection."]
```

Collection installs additionally run phased:

```mermaid
flowchart LR
    P0["Phase 0 — framework mods<br/>e.g. SMAPI"] --> G0{"phase fully downloaded<br/>AND deployed?"}
    G0 -- "no" --> G0
    G0 -- "yes" --> P1["Phase 1 — content"]
    P1 --> G1{"phase fully downloaded<br/>AND deployed?"}
    G1 -- "no" --> G1
    G1 -- "yes" --> PN["Phase 2+ ..."]
    P0 -.-> ST["Tracked in mInstallPhaseState (InstallManager)"]
```

**Key branch points**

- Installer selection is *first match wins* on an ascending-priority list, so a low number
  pre-empts everything below it.
- A `testSupported` returning `undefined` is a bug — it is logged and the installer is skipped.
- Override instructions are intentionally disabled inside collection installs.

Detail: `VORTEX_MOD_INSTALL.md`. Authoring contracts: `INSTALLER_SYSTEM.md`, `FOMOD_INSTALLER.md`.
Phasing: `COLLECTIONS_FEATURE.md`.

## 2. Mod update / version check

How Vortex learns a managed mod has a newer file, and what happens when the user acts on it.

```mermaid
flowchart TD
    T1["gamemode-activated (gameId)"] --> BULK
    T2["mods-update event"] --> BULK
    T3["mod-update event — single mod"] --> ONE

    BULK["Bulk check across managed mods for the game"] --> ONE
    ONE["checkModVersion(store, nexus, gameId, mod)<br/>util/checkModsVersion.ts"]

    ONE --> API["Nexus API lookup for the mod<br/>read the file list + file_updates records"]
    API -.-> IDN["Use attributes.modId from state.<br/>Do NOT parse the archive filename — the naming<br/>convention is stamped per-mod at download time<br/>and both the dash-era and space-era forms coexist."]

    API --> CHAIN["Walk the update chain:<br/>find record where old_file_id = known id,<br/>follow new_file_id, repeat until no successor<br/>= latest file id"]

    CHAIN --> CMP{"latest newer than<br/>the installed version?"}
    CMP -- "no" --> UTD["Mod List version column groups the row as Up-to-date"]
    CMP -- "yes" --> MARK["Newest-version attributes written onto the mod<br/>Mod List shows Update available<br/>VersionFilter preset token: has-update"]

    MARK --> USER["User triggers the update"]
    USER --> NXM["nexus_integration resolves an nxm:// mod/file link<br/>into a real, TIME-LIMITED CDN URL"]
    NXM -.-> EXP["Sitting on a resolved URL too long can 403 —<br/>the link may need re-resolution"]

    NXM --> DL["Enqueued in the main-process DownloadManager<br/>chunked transfer, progress mirrored to<br/>persistent.downloads.files.id"]
    DL --> FIN["state: finished -> download-finished"]
    FIN --> INST["start-install-download -> InstallManager<br/>see diagram 1"]
    INST --> RES["New version installed into staging as its own mod entry"]
    RES --> DEP["Deploy to put the new files in the game folder<br/>see diagram 4"]
```

**Key branch points**

- The version check runs automatically on `gamemode-activated`, so simply activating a game kicks
  a round of update checks.
- The update chain is walked, not read as a single "latest" field — a mod with several superseded
  files resolves transitively through `old_file_id` -> `new_file_id`.
- An update is a full download-plus-install cycle; it reuses diagram 1 verbatim.

Detail: `VORTEX_NEXUS_INTEGRATION.md`, `NEXUS_FILE_PROPERTIES.md` (file update records, category
ids), `VORTEX_DOWNLOAD_MGMT.md` (the transfer), `VORTEX_MOD_LIST.md` (the version column and
filter).

## 3. Load order handling (FBLO)

The file-based load order system in the `file_based_loadorder` core extension. Gamebryo plugin
management is a **separate, parallel** system — see `GAMEBRYO_PLUGIN_SYSTEM.md`.

```mermaid
flowchart TD
    subgraph SEED["Seed — on activation or profile change"]
        A["gamemode-activated / profile change"] --> B["findGameEntry(gameId)<br/>the entry registered via registerLoadOrder"]
        B --> C["gameEntry.deserializeLoadOrder()<br/>reads the game's order file, e.g. mods.txt"]
        C --> D["updateSet.init(gameId, ...)"]
        D --> E["dispatch setFBLoadOrder(profile.id, loadOrder)"]
    end

    E --> S["persistent.loadOrder.profileId<br/>a LoadOrder = list of ILoadOrderEntry<br/>PER PROFILE"]

    S --> UI["FileBasedLoadOrderPage<br/>registerMainPage sort-none, priority 30,<br/>id file-based-loadorder, group per-game, hotkey E<br/>drag-and-drop list via ItemRenderer.tsx"]
    UI -.-> VIS["visible() only when the active game has a<br/>registered FBLO entry and its condition() passes"]

    UI --> RE["User drags items -> setFBLoadOrder"]
    RE --> S

    S --> WATCH["onStateChange on persistent.loadOrder<br/>computes prev vs new -> applyNewLoadOrder"]
    WATCH -.-> LOOP["applyNewLoadOrder must NEVER dispatch<br/>setFBLoadOrder itself — infinite loop"]

    WATCH --> FIND{"findGameEntry(profile.gameId)<br/>registered?"}
    FIND -- "no" --> WARN["warn — game not registered"]
    FIND -- "yes" --> SER["gameEntry.serializeLoadOrder(newLO, prev)<br/>THE ONLY place the on-disk order file is written<br/>receives both orders so extensions can diff"]

    SER --> VAL{"gameEntry.validateLoadOrder(api, profile, newLO)"}
    VAL -- "invalid" --> ERR["errorHandler"]
    VAL -- "valid" --> OK["Order committed"]

    SORT["Page action: onSortByDeployOrder"] --> SORT1["resolve mods referenced by the load order<br/>-> util.sortMods(gameId, mods, api)<br/>the mod-rules topological sort"]
    SORT1 --> SORT2{"CycleError?"}
    SORT2 -- "yes" --> SORT3["non-reportable error — circular mod rules"]
    SORT2 -- "no" --> RE
```

Re-sync around deployment:

```mermaid
flowchart TD
    E1["did-deploy"] --> GEN
    E2["will-purge"] --> GEN
    E3["did-purge"] --> GEN
    GEN["genDeploymentEvent(api, profileId, type)"] --> RD["re-run deserializeLoadOrder() and re-seed state"]
    RD --> BR{"which event?"}
    BR -- "did-deploy" --> RESTORE["updateSet.restore(...)<br/>reconcile externally-introduced entries<br/>against the known set"]
    BR -- "will-purge / did-purge" --> PLAIN["seed state as read"]
    RESTORE --> S["persistent.loadOrder.profileId"]
    PLAIN --> S
```

**Key branch points**

- Reorders flow *through Redux*: the UI writes state, and a state watcher — not the UI — performs
  serialization and validation.
- `serializeLoadOrder` is the single write point for the on-disk order file.
- `UpdateSet` exists because the order file can gain or lose entries outside the page (a mod added
  elsewhere); `restore` merges those in predictably after a deploy.

Detail: `VORTEX_LOAD_ORDER.md`. Authoring: `LOAD_ORDER_REGISTRATION.md`,
`LOAD_ORDER_ITEM_RENDERER.md`. Collections capture: `COLLECTIONS_FEATURE.md`.

## 4. Deployment and purge

Making staged mods present in the game folder, and removing them again.

```mermaid
flowchart TD
    TR["Triggers:<br/>mods-enabled / mod-enabled (debounced)<br/>gamemode-activated<br/>profile switch<br/>manual deploy"] --> LOCK["Acquire the ACTIVATION LOCK<br/>two deployments can never overlap"]

    LOCK --> S1["1. Load the previous deployment manifest<br/>per modtype -> lastDeployment.typeId"]
    S1 --> S2["2. will-deploy (emitAndAwait)<br/>profileId, lastDeployment, deployOptions<br/>handlers may disable mods or adjust state"]
    S2 --> S3["3. RE-READ the profile<br/>a will-deploy handler may have changed enablement"]
    S3 --> S4["4. dealWithExternalChanges — util/externalChanges.ts<br/>files changed/added in the game folder outside Vortex,<br/>compared against the manifest, user asked how to reconcile"]
    S4 --> S5["5. checkIncompatibilities — warn on known-incompatible mods"]
    S5 --> S6["6. doSortMods — order mods by mod rules / load order<br/>so conflict winners are deterministic"]
    S6 --> S7["7. doMergeMods — run registerMerge producers,<br/>writing outputs into the merged folder"]
    S7 --> S8["8. validateDeploymentTarget + deployAllModTypes"]
    S8 --> DM["deployMods, once per modtype"]
    DM --> S9["9. Activation lock released"]
    S9 --> S10["10. did-deploy (emitAndAwait) + mods-did-deploy (emit)"]
    S10 --> S11["11. bakeSettings (game settings / INI)<br/>then setDeploymentNecessary(gameId, false)"]
```

`deployMods` per modtype — `mod_management/modActivation.ts`:

```mermaid
flowchart TD
    D1["ensureWritable(api, destinationPath)<br/>-> getNormalizeFunc(destinationPath)"] --> D2["method.prepare(destinationPath, true, lastActivation, normalize)"]
    D2 --> D3["For each ENABLED mod — progress 0 to 50 percent"]
    D3 --> D3A["add the mod's fileOverrides to skipFiles"]
    D3A --> D3B["method.activate(modPath, mod.installationPath, subDir(mod), skipFiles)"]
    D3B --> D3
    D3 --> D4["Activate the MERGED folder<br/>MERGED_PATH, or MERGED_PATH.typeId<br/>holding registerMerge outputs — empty skip set"]
    D4 --> D5["method.finalize(gameId, destinationPath, installationPath, cb)<br/>progress 50 to 100 percent<br/>returns the new manifest: a list of IDeployedFile"]
    D5 -- "error" --> D6["method.cancel(...) if defined"]
    D3A -.-> CONF["This IS conflict resolution:<br/>once a higher-priority mod places a file,<br/>lower-priority mods skip it"]
```

Choosing the activator:

```mermaid
flowchart TD
    A["getCurrentActivator(state, gameId, allowDefault)"] --> B{"game discovered?"}
    B -- "no" --> U["undefined"]
    B -- "yes" --> C{"getSelectedActivator(state, gameId)<br/>settings.mods.activator.gameId<br/>set AND still supported?"}
    C -- "yes" --> USE["use it"]
    C -- "no" --> D{"allowDefault?"}
    D -- "no" --> U
    D -- "yes" --> E["Lowest priority NUMBER among getSupportedActivators(state)<br/>— those whose allTypesSupported returns no errors —<br/>PREFERRING one with no warnings over one with warnings"]
    E --> USE

    USE -.-> LAD["null_activator 3 — no-op, staging-read games, opt-in only<br/>hardlink_activator 5 — usual default, SAME VOLUME required<br/>symlink_activator 10 — plus _elevate variant<br/>move_activator 50 — cross-volume, no links"]
```

Purge:

```mermaid
flowchart TD
    P1["purge-mods (allowFallback, cb)"] --> PL
    P2["purge-mods-in-path (gameId, modType, modPath)"] --> PL
    PL["purgeMods / purgeModsInPath — util/deploy.ts<br/>both run under withActivationLock"]
    PL --> PM["loadAllManifests — read the manifest(s)"]
    PM --> PR["Remove everything Vortex deployed,<br/>restoring the game folder<br/>genSubDirFunc(game, modType) maps mods to subdirs"]
    PR -.-> WARN["ALWAYS purge before switching activators or profiles"]
```

**Key branch points**

- Step 3 exists because step 2 can mutate state — skipping the re-read deploys a stale enabled set.
- The manifest is the source of truth for "what Vortex owns"; hand-editing the game folder shows up
  as an external change at step 4.
- `null_activator` has the lowest priority number but only reports supported for opt-in games, so
  it does not pre-empt hardlink in normal cases.

Detail: `VORTEX_DEPLOYMENT.md`. Authoring: `DEPLOYMENT_MANIFEST.md`, `REGISTER_MERGE.md`.

## 5. Game discovery and activation

Two separate things: finding the game on disk, and making it the actively managed game.

Discovery — `gamemode_management/util/discovery.ts`:

```mermaid
flowchart TD
    S["App startup"] --> E2E{"VORTEX_E2E = 1?"}
    E2E -- "yes" --> SKIP["quick discovery suppressed<br/>tests set paths deterministically"]
    E2E -- "no" --> QD["quickDiscovery(knownGames, discoveredGames,<br/>onDiscoveredGame, onDiscoveredTool)"]

    QD --> Q1["a. previously manually-configured paths<br/>updateManuallyConfigured"]
    Q1 --> Q2["b. each registered game store<br/>findByAppId / store lookups"]
    Q2 --> Q3["c. the game's own queryPath()"]
    Q3 --> F{"found?"}

    F -- "no" --> MISS["not discovered"]
    MISS --> SD["User-triggered Scan:<br/>searchDiscovery(searchPaths, knownGames, onDiscoveredGame,<br/>onDiscoveredTool, progressCB)<br/>full turbowalk of the chosen drives, cancellable"]
    SD --> F2{"matched expected files?"}
    F2 -- "no" --> NONE["stays undiscovered"]
    F2 -- "yes" --> WRITE
    F -- "yes" --> WRITE

    WRITE["onDiscoveredGame -> settings.gameMode.discovered.gameId<br/>an IDiscoveryResult: path, store, tools, environment"]
    WRITE --> TOOLS["quickDiscoveryTools(gameId, supportedTools, onDiscoveredTool)<br/>discoverRelativeTools(game, gamePath, ...)<br/>suggestStagingPath(api, gameId)"]

    CLR["onDiscoveredGame(gameId, undefined)"] -.-> CLR2["clears a discovery — game disappeared.<br/>removeDisappearedGames reconciles on startup."]

    WRITE -.-> MANAGE["Manageable = known game AND discovered with a valid path<br/>isValidGame. mKnownGames answers can we support it,<br/>discovered answers do we know where it is."]
```

Activation — driven by the **active profile**, not selected directly:

```mermaid
flowchart TD
    A["settings.profiles.activeProfileId changes<br/>watched in gamemode_management/index.ts"] --> B["changeGameMode(oldGameId, newGameId, profileId)<br/>gameId read from persistent.profiles.id.gameId"]

    B --> C{"newGameId defined AND<br/>getGame(newGameId) known?"}
    C -- "no" --> REJ["reject early"]
    C -- "yes" --> N["Show Preparing game for modding activity notification<br/>dismissed in finally"]

    N --> SG["GameModeManager.setupGameMode(newGameId)"]
    SG --> SG1["assertToolDir + fs.statAsync(gameDiscovery.path)<br/>confirm the folder still exists"]
    SG1 --> SG2["game.getInstalledVersion(gameDiscovery)<br/>called BEFORE setup, so the gameversion-hash ext<br/>can read files before setup may lock them"]
    SG2 --> SG3["game.setup(gameDiscovery)<br/>typically fs.ensureDirWritableAsync on staging,<br/>requirement downloads, etc."]

    SG3 -- "throws" --> FAIL{"error class?"}
    FAIL -- "UserCanceled / ProcessCanceled" --> F1["silent — logged only"]
    FAIL -- "SetupError / DataInvalid" --> F2["non-reportable error shown"]
    FAIL -- "ENOENT" --> F3["missing-file dialog:<br/>partial install / store / run-once / unknown variant"]
    F1 --> BOUNCE
    F2 --> BOUNCE
    F3 --> BOUNCE
    BOUNCE["setNextProfile(undefined)<br/>user is bounced back to the dashboard"]

    SG3 -- "ok" --> MP["Verify getGame(newGameId).getModPaths(discovery.path)<br/>still resolves"]
    MP --> SM["GameModeManager.setGameMode(oldMode, newMode, profileId)"]
    SM --> SM1["game.queryModPath(path) -> made absolute if relative"]
    SM1 --> SM2["assertToolDir -> fs.statAsync(modPath) -> ensureWritable(modPath)<br/>-> getNormalizeFunc -> discoverRelativeTools"]

    SM2 --> STILL{"activeProfile(state).id still equals profileId?"}
    STILL -- "no" --> ABORT["skip the emit — the user switched again mid-activation"]
    STILL -- "yes" --> EMIT["emit gamemode-activated (gameId)<br/>+ set default primaryTool if a tool is flagged<br/>defaultPrimary and none is set yet"]

    EMIT --> DOWN["Downstream handlers:<br/>deployment redeploy + validators, FBLO pages,<br/>plugin management, health checks, Nexus version checks"]
    DOWN -.-> TOL["Fires AFTER the profile is active and the UI is usable —<br/>handlers must tolerate the user switching again immediately"]
```

**Key branch points**

- `getInstalledVersion` deliberately runs *before* `setup`.
- The profile can change again mid-activation, so `setGameMode` re-checks before emitting.
- Any activation failure ends in `setNextProfile(undefined)` — "Vortex bounced me back to the
  dashboard" traces to exactly this.

Detail: `VORTEX_GAME_LIFECYCLE.md`. Authoring: `REGISTER_GAME.md`, `REQUIRES_LAUNCHER.md`,
`RUN_EXECUTABLE.md`.

## 6. Profile switch

A profile owns which mods are enabled (`modState`), the load order, and Gamebryo plugin state — so
switching profiles changes what deploys.

```mermaid
flowchart TD
    A["setNextProfile(gameId, profileId)<br/>writes settings.profiles.nextProfileId"] --> W["onStateChange watcher on nextProfileId"]

    W --> S1["1. Wait for any in-flight switch<br/>finishProfileSwitchPromise"]
    S1 --> B1{"superseded by a newer switch,<br/>or just resetting to the current profile?"}
    B1 -- "yes" --> BAIL["bail"]
    B1 -- "no" --> S2

    S2{"2. Validate the target"}
    S2 -- "game extension no longer installed" --> PC1["ProcessCanceled:<br/>Game no longer supported"]
    S2 -- "game no longer discovered" --> PC2["ProcessCanceled:<br/>Game is no longer discoverable"]
    S2 -- "valid" --> S3

    S3["3. Arm a new finishProfileSwitchPromise<br/>waits for an EXTERNAL onFinishProfileSwitch signal"]
    S3 -.-> BLOCK["The next switch is blocked until that signal.<br/>An erroring handler MUST cancel this promise<br/>or switching is permanently blocked."]

    S3 --> S4["4. refreshProfile(oldProfile, import)<br/>-> syncToProfile: copy live files INTO the profile folder<br/>copyFileAtomic; EBADF treated as empty, not an error"]

    S4 --> S5["5. profile-will-change (current, enqueue)<br/>listeners call enqueue(cb) to add async work to a serial queue,<br/>awaited before continuing — errors logged, not fatal"]

    S5 --> S6{"6. switching to NO profile?<br/>current === undefined"}
    S6 -- "yes" --> STOP["confirmProfile(undefined) and stop"]
    S6 -- "no" --> S7["7. sanitizeProfile<br/>then wrap the rest in the tracked activity profile.switch"]

    S7 --> S7A["refreshProfile(profile, export)<br/>-> syncFromProfile: copy the profile's stored files BACK OUT<br/>EPERM -> write protected, non-reportable; ENOENT ignored"]
    S7A --> S7B["deploy(prev) — flush the previous profile's enabled set"]
    S7B --> S7C["deploy(current) — see diagram 4"]
    S7C --> S8["8. confirmProfile(gameId, current) -> setCurrentProfile(...)"]

    S8 --> AP["settings.profiles.activeProfileId changes"]
    AP --> E1["profile-did-change (profileId) emitted"]
    AP --> E2["gamemode_management -> changeGameMode<br/>see diagram 5"]
    AP -.-> DUTY["activeProfileId does DOUBLE DUTY.<br/>There is no switch profile without re-activating the game."]
```

**Key branch points**

- `nextProfileId` is the *request*, `activeProfileId` is the *fact* — two separate state paths.
- The switch is cancellable: another `nextProfileId` change mid-flight makes the older switch bail.
- Both the outgoing and incoming profile deploy, in that order.

Detail: `VORTEX_PROFILES.md`. Profile features: `SETTINGS_REDUCER.md`.

## 7. Extension loading and init

Why nothing you write in `init(context)` actually runs when you write it.

```mermaid
flowchart TD
    A["ExtensionManager.getExtensionPaths()<br/>userData/plugins — bundled false<br/>+ getVortexPath(bundledPlugins) — bundled true"] --> B["prepareExtensions()<br/>builds mExtensions, a list of IRegisteredExtension"]

    B --> DUP{"user copy vs bundled copy?"}
    DUP -- "user copy NEWER" --> SHADOW["user copy replaces the bundled one"]
    DUP -- "user copy OLDER" --> PRUNE["removed:<br/>extension older than bundled version, will be removed"]
    DUP -- "no conflict" --> LOAD
    SHADOW --> LOAD

    LOAD["loadDynamicExtension(extensionPath, ..., bundled)<br/>read info.json<br/>namespace = info.namespace ?? info.id ?? folder-derived id<br/>require the index file, trying known formats"]
    LOAD --> INITF["getExtensionInitFunc(mod)<br/>extracts the DEFAULT EXPORT — the init(context) function"]
    INITF --> INCOMP["unloadIncompatible(sUIAPIs, mExtensions)<br/>drops extensions calling APIs they are not compatible with"]

    INCOMP --> P1["PHASE 1 — run every extension's init(context)"]
    P1 --> PROXY["context is a recording Proxy — ContextProxyHandler.<br/>setExtension(name, path) marks the current extension,<br/>then registerGame / registerReducer / once / ...<br/>are RECORDED with extensionPath + extInfo, NOT executed"]
    PROXY -.-> RULE["Registration is DEFERRED.<br/>init only declares intent.<br/>Do not expect side effects during init."]

    PROXY --> P2["PHASE 2 — applyExtensionsOfExtensions / invokeAdditions<br/>extensions that ADD new context methods for other extensions<br/>are applied FIRST, so those methods exist during replay"]
    P2 -.-> EXAMPLES["The extend-API pattern:<br/>download_management/util/extendApi.ts,<br/>mod_management/util/extendAPI.ts,<br/>nexusRequestNexusLogin, nexusRetrieveCategoryList"]

    P2 --> P3["PHASE 3 — apply(funcName, realHandler, addExtInfo)<br/>replay recorded calls into the REAL handler<br/>realHandler(...call.arguments), prefixed with extInfo when requested"]
    P3 -- "a handler throws" --> ERRN["showErrorNotification:<br/>Extension failed to initialize...<br/>report to the respective author.<br/>OTHER EXTENSIONS CONTINUE."]

    P3 --> P4["PHASE 4 — initExtensionPersistors(store)<br/>attach registered persistors to the Redux store"]
    P4 --> P5["PHASE 5 — doOnce()<br/>run every once / onceMain callback IN SERIES via mapSeries"]
    P5 --> WORK["This is where extensions attach event handlers<br/>and do startup work — everything is registered by now"]
    P5 -.-> DEP["onceMain is DEPRECATED in the renderer — logs a warning. Use once."]
```

**Key branch points**

- The recording Proxy is the whole design: `init` declares, the manager replays.
- API-extending extensions apply before the general replay, which is why downstream extensions can
  call their added methods.
- Failures are isolated per extension at every phase.

Detail: `VORTEX_EXTENSION_LOADING.md`. Event handlers in `once`: `VORTEX_EVENT_BUS.md`.

## See also

Runtime docs these diagrams derive from: `VORTEX_MOD_INSTALL.md`, `VORTEX_DEPLOYMENT.md`,
`VORTEX_LOAD_ORDER.md`, `VORTEX_PROFILES.md`, `VORTEX_GAME_LIFECYCLE.md`,
`VORTEX_EXTENSION_LOADING.md`, `VORTEX_NEXUS_INTEGRATION.md`, `VORTEX_DOWNLOAD_MGMT.md`,
`VORTEX_EVENT_BUS.md`, `VORTEX_MOD_LIST.md`. Overview: `VORTEX_APP.md`.
