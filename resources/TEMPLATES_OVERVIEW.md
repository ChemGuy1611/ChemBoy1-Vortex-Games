# Extension Templates Overview

All 16 templates live in `template-*/`. Use `new_extension.py <short-name> <game>` to scaffold a new extension.

**Changelogs:** each template's own `CHANGELOG.md` is scaffold boilerplate copied verbatim into every new extension by `new_extension.py` — never edit it. Real changes to a template's `index.js`/`info.json`/etc. are logged in `resources/template-changelogs/<template-folder>.md` instead. Update that file in the same session as any template edit.

**index.js header:** never reformat the `/*////.../*` header block (Name/Structure/Author/Version/Date/Notes). `new_extension.py`'s `update_index_header()` parses it with a fixed regex — changing its shape breaks scaffolding for every template.

---

## Template Selection Guide

| Short name (CLI) | Template folder | Engine / Framework | Stores |
| --- | --- | --- | --- |
| `basic` | template-basic | Generic / proprietary engines | S E G X |
| `cobraengineACSE` | template-cobraengineACSE | Cobra Engine + ACSE script extender | S E |
| `anvilengine` | template-anvilengine | Ubisoft Anvil Engine (AC series, Ghost Recon) | S Uplay |
| `frostbite` | template-frostbite | Frostbite Engine (EA games, Frosty Mod Manager) | S EA |
| `farcry` | template-farcry | Far Cry / Dunia Engine | S Uplay |
| `godot` | template-godot | Godot 3 & 4 | S E G X |
| `reframework-fluffy` | template-reframework-fluffy | RE Engine (RE7/RE8/DD2 etc.) | S only |
| `reloaded2` | template-reloaded2 | Reloaded-II framework | S E G X |
| `shinryu` | template-shinryu | Shin Ryu Mod Manager (SRMM) | S X |
| `rpgmaker` | template-rpgmaker | RPG Maker MV/MZ | S E G X |
| `snowdropengine` | template-snowdropengine | Snowdrop Engine (Division, Avatar) | S Uplay |
| `tfcinstaller-ue2-3` | template-tfcinstaller-ue2-3 | Unreal Engine 2/3 + TFC Installer | S E G X |
| `ue4-5` | template-ue4-5 | Unreal Engine 4/5 | S E G X |
| `unity-umm` | template-unity-umm | Unity + Unity Mod Manager | S E G X |
| `unitybepinex` | template-unitybepinex | Unity + BepInEx 5/6 | S E G X |
| `unitymelonloaderbepinex-hybrid` | template-unitymelonloaderbepinex-hybrid | Unity + BepInEx AND MelonLoader (user-selectable) | S E G X |

**Stores legend:** S=Steam, E=Epic, G=GOG, X=Xbox, Uplay=Ubisoft Connect, EA=EA App

---

## Per-Template Details

### template-ue4-5

**Toggles:** `IO_STORE`, `autoDownloadUe4ss`, `SIGBYPASS_REQUIRED`, `PAKMOD_LOADORDER`/`FBLO`, `hasModKit`, `hasXbox`/`multiExe`/`hasUserIdFolder`, `preferHardlinks` (default true), `ue4ssLoadOrder` (default false — enables UE4SS custom LO page + mods.txt + `GameSettings` toggle)

**Constants:** `EPIC_CODE_NAME` (root subfolder), `PAKMOD_PATH` = `EPIC_CODE_NAME/Content/Paks/~mods`, `CONFIG_FOLDERNAME` = `Windows` (UE5) or `WindowsNoEditor` (UE4), `ENGINE_VERSION`, `REQ_FILE`

**Mod types:** `BINARIES_ID` → `LOOSELUA_ID` → `UE4SS_ID` → pak types → `CONFIG_ID` → `SAVE_ID` → `ROOT_ID`/`ROOTSUB_ID` → fallback

**Setup:** Reads store-specific files to set `BINARIES_PATH` (Epic uses `EPIC_CODE_NAME/Binaries/Win64`).

---

### template-unitybepinex

**Toggles:** `BEPINEX_BUILD` (`'mono'`/`'il2cpp'`), `bleedingEdge`, `allowBepinexNexus`, `downloadCfgMan`, `BEPINEX_VERSION`

**Constants:** `GAME_STRING`, `DATA_FOLDER_DEFAULT`, `ASSEMBLY_PATH`, `BEPINEX_ARCH`

**Mod types:** `BEPCFGMAN_ID` → `BEPMOD_ID` (BepInEx/plugins) → `ASSEMBLY_ID` → `ASSETS_ID` → `ROOT_ID` → fallback

**requireExtension:** `'modtype-bepinex'`. Auto-download: BepInEx (Nexus or GitHub) + ConfigurationManager (GitHub).

---

### template-unitymelonloaderbepinex-hybrid

**Toggles:** `recommendedLoader` (`''`/`'bepinex'`/`'melon'`), `preventPluginInstall`, `loaderSwitchRestart`, `enableSaveInstaller`, `hasCustomMods`/`hasCustomLoader`/`customLoaderInstaller`, `allowBepCfgMan`/`allowMelPrefMan`, `useMelonNightly`, `BEPINEX_BUILD`/`MELON_STRING`

**Behavior:** Loader switching mutually exclusive. `preventPluginInstall` blocks mismatched loader plugins. Downloads both loaders' utilities as needed.

---

### template-unity-umm

**Constants:** `GAME_STRING`, `UNITY_ARCH`, `UNITY_BUILD` (`'mono'`/`'il2cpp'`), `DEV_REGSTRING`/`GAME_REGSTRING` (registry paths), `UMM_FOLDER`, `PLUGIN_FOLDER`, `ASSEMBLY_FILES`

**Mod types:** `UMM_ID` → `PLUGIN_ID` → `ASSEMBLY_ID` → `ASSETS_ID` → `ROOT_ID` → fallback

---

### template-basic

**Toggles:** `hasLoader`, `multiModPath`, `needsModInstaller`, `rootInstaller`, `hasUserIdFolder`, `binariesInstaller`

**Constants:** `MOD_PATH`, `BINARIES_PATH`, `INSTALL_HIVE`/`INSTALL_KEY`/`INSTALL_VALUE` (registry discovery), `EXEC_EPIC`/`EXEC_GOG`/`EXEC_DEMO`

**Discovery:** `winapi.RegGetValue()` fallback before `GameStoreHelper`.

---

### template-reframework-fluffy

Steam only. RE Engine games.

**Toggles:** `reZip` (default true), `multiExe`

**Constants:** `FLUFFY_FOLDER`, `ROOT_FILES`, `REF_PAGE_NO`/`REF_FILE_NO`, `CONFIG_FILE`

**Mod types:** `ROOT_ID` → `LOOSELUA_ID` → `FLUFFY_ID` → `FLUFFYMOD_ID` → `FLUFFYPAK_ID` → `PRESET_ID` → `CONFIG_ID`

**Auto-download:** Fluffy + REFramework from Nexus. Save: Registry → `Steam/userdata/{userid}/{appid}/remote`.

---

### template-cobraengineACSE

Frontier games (Planet Zoo/Coaster). Cobra Engine + ACSE.

**Constants:** `DEV_FOLDER`, `ROOT_FOLDERS`, `MOD_PATH` = `Win64/ovldata`, `MOD_EXT` = `'.ovl'`, `GAME_FOLDER`

**Mod types:** `ACSE_ID` → `ROOT_ID` → `OVLDATA_ID` → `LOCALISED_ID` → `MOVIES_ID` → `SAVE_ID` → `CONFIG_ID`

**Save/Config:** `Saved Games/Frontier Developments/GAME_FOLDER/USERID`. Auto-download ACSE from Nexus.

---

### template-tfcinstaller-ue2-3

Older UE2/3 games with TFC Installer.

**Constants:** `EPIC_CODE_NAME`, `COOKED_FOLDER` = `'CookedPC'`, `BITS`, `ROOTSUB_FOLDERS`, `TFCMOD_EXTS`. Tools: TFC Installer + UPK Explorer.

**Mod types:** `TFCMOD_ID` → `ROOT_ID` → `ROOTSUB_ID` → `COOKEDSUB_ID` → `BINARIES_ID` → `MOVIES_ID` → `TFC_ID` → `UPKEXPLORER_ID`

**Auto-download:** TFC Installer from Nexus.

---

### template-reloaded2

Reloaded-II framework games.

**Constants:** `MOD_LOADER_FOLDER`, `RELOADEDMODLOADER_FILE`, `RELOADEDMODLOADER_PAGE_NO`/`RELOADEDMODLOADER_FILE_NO`

**Mod types:** `RELOADEDMOD_ID` → `RELOADEDMODLOADER_ID` → `RELOADED_ID` → optional `SAVE_ID`

**Detection:** `modconfig.json`. Symlinks disabled (hardlinks only). Uses `elevate.exe` for elevated launches.

---

### template-rpgmaker

RPG Maker MV/MZ with `plugins.js` auto-update.

**Constants:** `NAME_FOLDER`, `ROOT_FOLDERS`, `JSFILE_PATH` = `'js/plugins'`, `JSLIST_FILE` = `'plugins.js'`

**Mod types:** `JSFOLDER_ID` → `JSFILE_ID` → `ROOT_ID` → `JSON_ID`

**Auto-update:** On JS install, appends new entries to `plugins.js` with `"status": true`.

---

### template-godot

Godot 3/4 with Godot Mod Loader.

**Toggles:** `ENGINE_VERSION` (`'3'`/`'4'`), `customLoader`, `keepZips`

**Constants:** `LOADER_FILE`, `LOADER_VERSION`, `LOADER_URL_API` (GitHub), `DATA_FOLDER`

**Mod types:** `LOADER_ID` → `MOD_ID` → optional `CONFIG_ID`/`SAVE_ID`

**downloader.js required** — see the shared downloader notes below.

---

### Shared: downloader.js (requirements auto-downloader)

A shared module copied into each extension that auto-downloads/installs a modding
requirement (loader, framework) from its **GitHub releases**. The canonical copy lives at
`resources/downloader/downloader.js`; each adopter carries its own copy (propagate changes
manually to every extension that bundles a `downloader.js`).

Full reference — architecture, exports, the requirement-object fields, the three
version-resolve strategies, and the `template_downloader.js` wiring — lives in
`resources/DOWNLOADER.md`.

---

### template-snowdropengine

Ubisoft Snowdrop Engine (Division, Avatar).

**Constants:** `DATA_FILE`, `CONFIG_FOLDER`, `DATASUB_FOLDERS`, `MODLOADER_FILE` = `'version.dll'`

**Mod types:** `MODLOADER_ID` → `DATA_ID` → `DATASUB_ID` → `CONFIG_ID`

**Discovery:** Ubisoft registry (`WOW6432Node\Ubisoft\Launcher\Installs\{UPLAYAPP_ID}`), then `GameStoreHelper`. Auto-download Snowdrop ModLoader from Nexus.

---

### template-anvilengine

Ubisoft Anvil Engine (AC series, Ghost Recon). Steam + Ubisoft Connect.

**Toggles:** `hasAtk` (AnvilToolkit), `hasForger` (.forger2, older AC games), `setupNotification`, `allowSymlinks` (default true)

**Constants:** `UPLAYAPP_ID`, `ROOT_FOLDERS`, `EXTRACTED_FOLDER`, `RENAME_FOLDER`, `ATK_PAGE`/`ATK_FILE`, `MOD_PATH_DEFAULT`

**Mod types (hasAtk):** `EXTRACTED_ID` → `FORGEFOLDER_ID` → `DATAFOLDER_ID` → `LOOSE_ID` → `FORGE_ID` → `ROOT_ID` → `ATK_ID`

**Discovery:** Ubisoft registry → `GameStoreHelper`. Auto-download ATK + Forger. deployNotify reminds user to run ATK.

---

### template-farcry

Far Cry / Dunia Engine with FC Mod Installer.

**Constants:** `FC` (code string), `BIN_PATH`, `DATA_PATH` = `'data_win32'`, `MI_EXEC`, `MIMOD_FOLDER`

**Mod types:** `ROOT_ID` → `BIN_ID` → `DATA_ID` → `MI_ID` → `MIMOD_ID` → `XML_ID`

**User ID folder** for save/config paths, detected at `setup()`.

---

### template-frostbite

EA Frostbite Engine with Frosty Mod Manager. Steam + EA App.

**Toggles:** `allowSymlinks` (default false)

**Constants:** `EAAPP_ID`, `FROSTYMOD_FOLDER`, `FROSTYMOD_EXTS` = `[".fbmod", ".archive"]`, `FROSTY_EXEC`

**Mod types:** `BINARIES_ID` → `FROSTYMOD_ID` → `FROSTY_ID`

**Tools:** `FrostyModManagerLaunch` (primary, `-launch Default`) + `FrostyModManager` (UI)

**Auto-download:** Frosty from GitHub. deployNotify active. `EPICAPP_ID`/`gogAppId` = null.

---

### template-shinryu

Shin Ryu Mod Manager (SRMM). Steam + Xbox.

**Toggles:** `needsModInstaller`, `rootInstaller`/`fallbackInstaller`, `hasXbox`, `allowSymlinks`

**Constants:** `TOPLEVEL_FOLDER`, `MODMANAGER_EXEC` = `"shinryumodmanager.exe"`, `MODMANAGERMOD_FILE` = `"modinfo.ini"`, `DATAMOD_EXTS` = `[".par"]`

**Mod types:** `ROOT_ID` → `MODMANAGERMOD_ID` → `DATAMOD_ID` → `MODMANAGER_ID`

**Tools:** `Launch Modded Game` (SRMM `--run --silent`) + `Shin Ryu MM` (UI). Auto-download SRMM from Nexus. deployNotify with "Run SRMM" button.
