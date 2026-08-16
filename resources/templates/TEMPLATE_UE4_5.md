# template-ue4-5

Unreal Engine 4 and 5, and by a wide margin the largest template (~4,600 lines). It carries three
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

### Structural toggles

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

### Mod types and installers

| Mod type | Priority | Target |
| --- | --- | --- |
| `UE4SSCOMBO_ID` | spec | `{gamePath}` |
| `LOGICMODS_ID` | spec | `<code>/Content/Paks` |
| `PAK_ALT_ID` | spec | `<code>/Content/Paks` |
| `ROOT_ID` | spec | `{gamePath}` |
| `MODKITMOD_ID` | spec, when `hasModKit` | `<code>/Mods` |
| `UE5_SORTABLE_ID` | 25 | pak mods folder |
| `SCRIPTS_ID` | 50 | `<binaries>/ue4ss/Mods` |
| `DLL_ID` | 52 | `<binaries>/ue4ss/Mods` |
| `BINARIES_ID` | 54 | `<code>/Binaries/Win64` |
| `UE4SS_ID` | 56 | `<code>/Binaries/Win64` |
| `SIGBYPASS_ID` | 58 | binaries folder |
| `CONFIG_ID` | 62 | absolute config path |
| `SAVE_ID` | 64 | absolute save path |

`UE5_SORTABLE_ID` keeps its exact name across every UE4-5 extension on purpose, so pak mods stay
interchangeable between them.

**Installers:** `MODKITMOD` 25 → `UE4SSCOMBO` 26 → `LOGICMODS` 27 → `UE5_SORTABLE` 29 (paks) →
`UE4SS` 31 → `SIGBYPASS` 33 → `SCRIPTS` 35 → `DLL` 37 → `ROOT` 39 → `CONFIG` 41 → `SAVE` 43 →
`BINARIES` 49. There is no separate fallback installer — `BINARIES` at 49 *is* it: `testBinaries`
claims anything that is not a pak and not a FOMOD, and `installBinaries` fires
`fallbackInstallerNotify` unless the `updating_mod` guard says this install is a mod update.

`UE4SSCOMBO` at 26 is **not** gated on `ue4ssLoadOrder`, because besides UE4SS script-plus-blueprint
combos it also handles any mod that ships both a `Binaries` and a `Content` folder.

`chooseFilesToInstall` prompts when a pak archive contains several independent mods.

### Load order surfaces

Three separate ordering systems run side by side, each with its own toggle, storage, and sidecar
file:

| Surface | Toggle | Redux path | Written to |
| --- | --- | --- | --- |
| Pak load order | `PAKMOD_LOADORDER` + `FBLO` | Vortex's own FBLO state | `AAA`/`AAB`/… folder-name prefixes |
| UE4SS Mods | `ue4ssLoadOrder` (default `true`) | `persistent.ue4ssLoadOrder` | `ue4ss/Mods/mods.txt` |
| LogicMods | `logicModsLoadOrder` (default `true`) | `persistent.logicModsLoadOrder` | `BPModLoaderMod/load_order.txt` |

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

**Collections.** `collectionsLoadOrder`, ANDed with the other two toggles, registers
`context.optional.registerCollectionFeature` with `genUe4ssCollectionsData` /
`parseUe4ssCollectionsData` and a `CollectionsDataView`, so both the UE4SS and LogicMods orders
travel with a collection.

### Runtime behavior

**Mod-update load-order guard.** Updating a mod normally looks like removing one mod and installing
a different one, which would drop it to the bottom of the load order. The template keeps an
`updateModIds` Map keyed by Nexus mod ID, holding `{ firstSeen, targetFileId }`:

- `mod-update` records the ID directly. `fileId` matters because it is what distinguishes the
  incoming version from the installed one — without it, every not-yet-updated mod still looks
  "already installed".
- `mods-update` covers the "Update all" button, which emits *local* mod IDs and never emits
  `mod-update`; each is resolved back to its Nexus ID out of state before being tracked.
- `remove-mod` matches on `attributes.modId` from state rather than parsing the local mod ID string,
  because the local naming convention changed over time (older dash-delimited versus current
  space-delimited) and string parsing silently misses old installs.
- `will-install-mod` sets the `updating_mod` flag that suppresses the fallback-installer notification
  on an update.
- `MAX_UPDATE_WAIT_MS` (5 minutes) releases a guard for an update that never lands.

**Partition checks.** When `IO_STORE` is off and `preferHardlinks` is on, `checkPartitions` verifies
that the game folder, staging folder, and the config and save folders all sit on the same volume,
and `partitionCheckNotify` explains it if they do not — hardlinks cannot cross volumes.

**UE4SS acquisition.** `downloadUe4ss` pulls from the RE-UE4SS GitHub releases; `downloadUe4ssNexus`
is used instead when the game has a customised UE4SS build on its own Nexus page
(`UE4SS_PAGE_NO` / `UE4SS_FILE_NO` / `UE4SS_DOMAIN`). `autoDownloadUe4ss` decides whether that
happens unattended during `setup()`. With `writeEngineVersion` on, the `did-deploy` handler writes
`ENGINE_VERSION` into `UE4SS-settings.ini` as `EngineVersionOverride`.

`didDeploy` is wired to `did-deploy`. A `didPurge` function exists but its `did-purge` registration
is commented out by default.

**React layer.** Around fifteen components live in the same file — `StatusPills`,
`LoadOrderStatusFilter`, `LoadOrderItemRenderer`, `PakContextMenu`, `Ue4ssItemRenderer`,
`Ue4ssContextMenu`, `Ue4ssLoadOrderPage`, the LogicMods equivalents, `GameSettings`, and
`CollectionsDataView` — plus shared hooks `usePakLOState`, `useInjectStyleOnce`,
`useDismissOnOutside`, and `useClampedMenuPosition`. All three load-order surfaces carry status
filtering and the same context menus. Full anatomy is in `../UE4_5_REACT_ARCHITECTURE.md`.

**Tools:** Custom Launch, the ModKit when `hasModKit`, and a commented-out Save Editor slot. Toolbar
actions include Open Paks Folder, Open Binaries Folder, Open UE4SS Mods Folder, Open LogicMods
Folder, Download UE4SS, Open UE4SS Settings INI, and Open UE4SS mods.txt.

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
