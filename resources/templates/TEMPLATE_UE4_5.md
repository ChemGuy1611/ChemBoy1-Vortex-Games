# template-ue4-5

Unreal Engine 4 and 5, and by a wide margin the largest template (~6,600 lines). It carries three
independent load-order surfaces, a React UI layer, collections support, and a mod-update guard, on
top of the usual pak handling.

---

**Constants:** `EPIC_CODE_NAME` (the project folder, and `REQ_FILE`), `PAKMOD_PATH`
`<code>/Content/Paks/~mods`, `PAK_ALT_PATH` `<code>/Content/Paks`, `LOGICMODS_PATH`
`<code>/Content/Paks` with the `LogicMods` subfolder, `BINARIES_PATH` `<code>/Binaries/Win64`
(`WinGDK` on Xbox), `CONFIG_PATH_DEFAULT`
`%LOCALAPPDATA%/<data>/Saved/Config/<CONFIG_FOLDERNAME>` where `CONFIG_FOLDERNAME` is `Windows`,
`WindowsNoEditor`, or `WinGDK`, `SAVE_PATH_DEFAULT` `%LOCALAPPDATA%/<data>/Saved/SaveGames` with an
Xbox `Packages/<appId>_<pubId>/SystemAppData/wgs` variant, `MODKITMOD_PATH` `<code>/Mods` keyed on
`mod.json` / `.uplugin`, and the sig-bypass pair `dsound.dll` + `UniversalSigBypasser.asi` from the
Nexus `site` page.

## Structural toggles

`IO_STORE` (default `true`) is the highest-consequence toggle. When on, it forces `SYM_LINKS` off
and expands `PAKMOD_EXTS` to `['.pak', '.ucas', '.utoc']`, raising `PAK_FILE_MIN` to 3 — the pak
installer then expects a complete triplet, because IO Store paks carry internal cross-references
that a symlink or a partial file set breaks.

`PAKMOD_LOADORDER` (default `true`) swaps two paths when disabled: `PAKMOD_PATH` collapses to the
`Paks` root and `PAK_ALT_PATH` becomes `Paks/~mods`, since a game that cannot load from `~mods`
cannot have a prefix-based load order either. `FBLO` (default `true`) picks `registerLoadOrder`
over the legacy `registerLoadOrderPage`.

Others: `SIGBYPASS_REQUIRED` (games that validate `.sig` files), `hasModKit`, `hasServer`,
`preferHardlinks` (default `true`), `autoDownloadUe4ss`, `writeEngineVersion`, `ENGINE_VERSION`,
`LO_IMAGE_WIDTH`, `SPECIAL_LO_INSTRUCTIONS`, `PAKMOD_EXTRA_EXTS` (extra extensions to treat as part
of a pak mod, for custom frameworks that add `.toml` or `.json` sidecars).

## Mod types and installers

The mod types from `spec` register at 30 plus their position in the list (`high` is 30 in this
template, not the 25 other templates use). The rest use the explicit priorities below.

| Mod type          | Priority               | Target                  |
| ----------------- | ---------------------- | ----------------------- |
| `UE4SSCOMBO_ID`   | spec                   | `{gamePath}`            |
| `LOGICMODS_ID`    | spec                   | `<code>/Content/Paks`   |
| `PAK_ALT_ID`      | spec                   | `<code>/Content/Paks`   |
| `ROOT_ID`         | spec                   | `{gamePath}`            |
| `MODKITMOD_ID`    | spec, when `hasModKit` | `<code>/Mods`           |
| `UE5_SORTABLE_ID` | 25                     | pak mods folder         |
| `SCRIPTS_ID`      | 50                     | `<binaries>/ue4ss/Mods` |
| `DLL_ID`          | 52                     | `<binaries>/ue4ss/Mods` |
| `BINARIES_ID`     | 54                     | `<code>/Binaries/Win64` |
| `UE4SS_ID`        | 56                     | `<code>/Binaries/Win64` |
| `SIGBYPASS_ID`    | 58                     | binaries folder         |
| `CONFIG_ID`       | 62                     | absolute config path    |
| `SAVE_ID`         | 64                     | absolute save path      |

`UE5_SORTABLE_ID` keeps its exact name across every UE4-5 extension on purpose, so pak mods stay
interchangeable between them.

`SCRIPTS_ID`, `DLL_ID` and `UE4SS_ID` register only with `ue4ssLoadOrder`, which also removes
`LOGICMODS_ID` from the spec. `SIGBYPASS_ID` needs `SIGBYPASS_REQUIRED`. `CONFIG_ID` is offered
only when the partition check below passes for the config folder, and `SAVE_ID` only when it
passes for the save folder and the game version is listed in `SAVE_COMPAT_VERSIONS`.

**Installers:** `MODKITMOD` 25 → `UE4SSCOMBO` 26 → `LOGICMODS` 27 → `UE5_SORTABLE` 29 (paks) →
`UE4SS` 31 → `SIGBYPASS` 33 → `SCRIPTS` 35 → `DLL` 37 → `ROOT` 39 → `CONFIG` 41 → `SAVE` 43 →
`BINARIES` 49. There is no separate fallback installer — `BINARIES` at 49 _is_ it: `testBinaries`
claims anything that is not a pak and not a FOMOD, and `installBinaries` fires
`fallbackInstallerNotify` unless the `updating_mod` guard says this install is a mod update.

`MODKITMOD` needs `hasModKit`. `LOGICMODS`, `UE4SS`, `SCRIPTS` and `DLL` need `ue4ssLoadOrder`
(`logicModsLoadOrder` does not gate the LogicMods installer, only its load-order page).
`SIGBYPASS` needs `SIGBYPASS_REQUIRED`.

`UE4SSCOMBO` at 26 is **not** gated on `ue4ssLoadOrder`, because besides UE4SS script-plus-blueprint
combos it also handles any mod that ships both a `Binaries` and a `Content` folder.

`chooseFilesToInstall` prompts when a pak archive contains several independent mods.

## Load order surfaces

Three separate ordering systems run side by side, each with its own toggle, storage, and sidecar
file:

| Surface        | Toggle                                | Redux path                      | Written to                         |
| -------------- | ------------------------------------- | ------------------------------- | ---------------------------------- |
| Pak load order | `PAKMOD_LOADORDER` + `FBLO`           | Vortex's own FBLO state         | `AAA`/`AAB`/… folder-name prefixes |
| UE4SS Mods     | `ue4ssLoadOrder` (default `true`)     | `persistent.ue4ssLoadOrder`     | `ue4ss/Mods/mods.txt`              |
| LogicMods      | `logicModsLoadOrder` (default `true`) | `persistent.logicModsLoadOrder` | `BPModLoaderMod/load_order.txt`    |

The pak order is registered through `registerLoadOrder` with `toggleableEntries: false`, a custom
`LoadOrderItemRenderer`, and `LoadOrderInstructions`; `preSort` / `makePrefix` / `loadOrderPrefix`
turn the ordered list into the alphanumeric folder prefixes the engine actually honours.

The UE4SS and LogicMods orders are full `registerMainPage` entries in the `unreal` group —
priority 31 hotkey `U` and priority 32 hotkey `L` respectively, each with its own MDI icon — backed
by their own reducers and their own persisted JSON (`ue4ss_loadOrder.json`,
`logicMods_loadOrder.json`, both profile-prefixed). Mods are tracked by install attribute:
`ue4ssModFolder` for UE4SS mods, `logicModFiles` (an array of pak base names) for LogicMods.
`reconcileEnabledTxt` keeps UE4SS's per-mod `enabled.txt` markers in step with the page.

`ue4ssLoadOrder` is the master switch for UE4SS support generally: the UE4SS, Scripts, DLL, and
LogicMods mod types and installers, the UE4SS toolbar buttons, the load-order page, and `mods.txt`
writing all hang off it. It also registers a `settings.<gameId>.ue4ssLoEnabled` reducer and a
`registerSettings('Mods', GameSettings, …, 150)` panel. The page stays visible even when the user
turns the load order off in settings, so it can be turned back on.

**Collections.** `collectionsLoadOrder` registers `context.optional.registerCollectionFeature`
when at least one of `ue4ssLoadOrder` and `logicModsLoadOrder` is on, with
`genUe4ssCollectionsData` / `parseUe4ssCollectionsData` and a `CollectionsDataView`. Each order
travels with a collection only if its own toggle is on.

## Runtime behavior

**Mod-update load-order guard.** Updating a mod normally looks like removing one mod and installing
a different one, which would drop it to the bottom of the load order. The template keeps an
`updateModIds` Map keyed by Nexus mod ID, holding `{ firstSeen, targetFileId }`:

- `mod-update` records the ID directly. `fileId` matters because it is what distinguishes the
  incoming version from the installed one — without it, every not-yet-updated mod still looks
  "already installed".
- `mods-update` covers the "Update all" button, which emits _local_ mod IDs and never emits
  `mod-update`; each is resolved back to its Nexus ID out of state before being tracked.
- `remove-mod` matches on `attributes.modId` from state rather than parsing the local mod ID string,
  because the local naming convention changed over time (older dash-delimited versus current
  space-delimited) and string parsing silently misses old installs.
- `will-install-mod` sets the `updating_mod` flag that suppresses the fallback-installer notification
  on an update.
- `MAX_UPDATE_WAIT_MS` (5 minutes) releases a guard for an update that never lands.

**FOMOD pak retag.** Vortex's built-in FOMOD installer never emits a `setmodtype` instruction, so a
pak mod packaged with a FOMOD checkbox wizard (offering optional components) keeps modtype `''`
forever and never shows up in the pak load order, which filters strictly on `UE5_SORTABLE_ID`. A
`did-install-mod` handler (`retagFomodPakMod`) retags such a mod after the fact: it reruns the
marker checks for every installer registered above the pak installer's priority — Mod Kit (25,
when `hasModKit`), UE4SS Combo (26), LogicMods (27, counted only when `ue4ssLoadOrder` is on, the toggle the LogicMods installer registers under)
— against the mod's staged files via `beatsPakInstaller()`/`pathSegments()`, and only retags when
none of them would have claimed the archive first. The handler does nothing when
`PAKMOD_LOADORDER` is off. It skips mods staged in full game-root layout (the pak installer only ever
flattens a shallow-staged archive), and while a collection install is in progress it retags but
skips the load-order refresh and deployment request, since core's own post-install deserialize
picks up the corrected type once the collection finishes.

**Partition checks.** `checkPartitions` is skipped only when both `preferHardlinks` and `IO_STORE`
are off. Otherwise it verifies that the game folder, the staging folder and the config (or save)
folder sit on the same volume, and `partitionCheckNotify` explains it if they do not — hardlinks
cannot cross volumes. A failed check switches off the Config or Save mod type and installer.

**UE4SS acquisition.** `downloadUe4ss` pulls from the RE-UE4SS GitHub releases; `downloadUe4ssNexus`
is used instead when the game has a customised UE4SS build on its own Nexus page
(`UE4SS_PAGE_NO` / `UE4SS_FILE_NO` / `UE4SS_DOMAIN`). `autoDownloadUe4ss` decides whether that
happens unattended during `setup()`. With `writeEngineVersion` on, the `did-deploy` handler writes
the engine version into `UE4SS-settings.ini` as `EngineVersionOverride`: the shipping executable's
ProductVersion when its major part is `4` or `5`, otherwise `ENGINE_VERSION`. Some games stamp their
own version into the executable (`1.0.0.0`), which is why any other major is ignored; with
`exeHasGameVersion` on, the executable is not read at all. The `check-mods-version`
listener tests the UE4SS GitHub requirement for an update, but only when `ue4ssLoadOrder` is on
and the game has no customised Nexus UE4SS page (`UE4SS_PAGE_NO` is 0), so a curated build is never
replaced by an upstream one.

`didDeploy` is wired to `did-deploy`. A `didPurge` function exists but its `did-purge` registration
is commented out by default.

**React layer.** Around fifteen components live in the same file — `StatusPills`,
`LoadOrderStatusFilter`, `LoadOrderItemRenderer`, `PakContextMenu`, `Ue4ssItemRenderer`,
`Ue4ssContextMenu`, `Ue4ssLoadOrderPage`, the LogicMods equivalents, `GameSettings`, and
`CollectionsDataView` — plus shared hooks `usePakLOState`, `useInjectStyleOnce`,
`useDismissOnOutside`, and `useClampedMenuPosition`. All three load-order surfaces carry status
filtering and the same context menus. Full anatomy is in `../UE4_5_REACT_ARCHITECTURE.md`.

**Tools:** Custom Launch, the ModKit when `hasModKit`, and a commented-out Save Editor slot. There
are fifteen toolbar actions, all hidden unless the game is active: folder openers (Paks,
Binaries, Config, Saves, Downloads, plus UE4SS Mods and LogicMods with `ue4ssLoadOrder`), the
UE4SS actions (Download UE4SS, Open UE4SS Settings INI, Open UE4SS mods.txt, also with
`ue4ssLoadOrder`), and links (PCGamingWiki, Nexus Mods, SteamDB, View Changelog, Submit Bug
Report).

**One project folder for every store.** `EPIC_CODE_NAME` is the game's project folder, and almost
every path constant, mod type target, installer destination and `getExecutable` branch is built from
it. The template has no way to give one store a different folder. A few games ship a different
project folder per store (`game-keeper`: `Keeper` on Steam and GOG, `PaganIdol` on Xbox), and also
keep Config and Save in a LocalAppData folder named differently from either. For those, read the
install tree of each store, not just one, and set `DATA_FOLDER` from the real LocalAppData folder
(the Config and Save mod types deploy there, so a wrong name deploys to a folder the game never
reads). `game-keeper` carries a game-only shim for the project folder: a `PROJECT_FOLDER` variable
and a `setProjectFolder()` function that swaps the leading folder of each project-relative path to
the active store's, called from `getExecutable` and `setup()`. Every site is marked `KEEPER ONLY`.

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../LOAD_ORDER_REGISTRATION.md` (`registerLoadOrder` and the legacy page).
`../UE4_5_REACT_ARCHITECTURE.md` (the React layer in full).
`../LOAD_ORDER_ITEM_RENDERER.md` (row anatomy of the three renderers).
`../RE-UE4SS_MODS_CONFIG.md` (`mods.txt`, `mods.json`, and `enabled.txt` semantics).
`../COLLECTIONS_FEATURE.md` (`registerCollectionFeature`, behind `collectionsLoadOrder`).
`../NTFS_LINKS.md` (the same-volume constraint behind `checkPartitions`).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
`../DOWNLOADER.md` (the shared downloader module behind the GitHub `UE4SS_REQUIREMENTS` set).
