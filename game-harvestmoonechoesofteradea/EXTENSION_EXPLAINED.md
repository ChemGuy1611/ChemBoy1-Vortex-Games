# Harvest Moon: Echoes of Teradea — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Harvest Moon: Echoes of Teradea Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader/Custom Loader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `harvestmoonechoesofteradea` |
| Executable | `Harvest Moon Echoes of Teradea.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Harvest Moon Echoes of Teradea.exe` |
| Executable (Demo) | `Harvest Moon Echoes of Teradea.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/2592](https://www.nexusmods.com/site/mods/2592) |

## Supported Stores

- **Steam** — `3591180`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `isXna` | `false` | set to true if game is XNA engine |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `multiExe` | `false` | set to true if there are multiple executables (typically for Xbox/EGS) |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `preventPluginInstall` | `true` | set to true if you want to prevent plugins not for the current mod loader from installing. Disable if using cross-compatibility plugins. |
| `loaderSwitchRestart` | `false` | set to true if you need to restart the extension after switching mod loaders |
| `enableSaveInstaller` | `false` | set to true if you want to enable the save installer (only recommended if saves are stored in the game's folder) |
| `hasCustomMods` | `false` | set to true if there are modTypes with folder paths dependent on which mod loader is installed |
| `hasCustomLoader` | `false` | set to true if there is a custom mod loader |
| `customLoaderInstaller` | `false` | set true if the custom loader uses an installer |
| `hasTextureReplacer` | `false` | set to true if the game has a Texture Replacer BepInEx plugin that loads .png textures from BepInEx/plugins/TextureReplacer (set TEXTURES_STRING below) |
| `debug` | `false` | toggle for debug mode |
| `exeHasGameVersion` | `false` | toggle: true if the game devs stamp the real game version (not just the Unity player version) into the exe ProductVersion |
| `hasVersionFile` | `false` | set to true if there is a Version.info file that contains the game version number |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `loaderChoice` | `false` | true if loader choice is enabled |
| `allowBepCfgMan` | `true` | should BepInExConfigManager be downloaded (via notification)? |
| `allowMelPrefMan` | `false` | should MelonPreferencesManager be downloaded (via notification)? disabled 2026-09-14 - plugin causes in-game errors when loaded |
| `allowBepinexNexus` | `true` | allow Nexus Mods download of BepInEx/MelonLoader |
| `allowMelonNexus` | `true` | allows MelonLoader to be downloaded from Nexus Mods |
| `useMelonNightly` | `false` | use Nightly build of MelonLoader? |
| `customInstalled` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| BepInEx Mod | `harvestmoonechoesofteradea-bepinexmod` | high | `{gamePath}/BepInEx` |
| BepInEx Plugins | `harvestmoonechoesofteradea-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `harvestmoonechoesofteradea-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `harvestmoonechoesofteradea-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| BepInExConfigManager | `harvestmoonechoesofteradea-bepcfgman` | high | `{gamePath}/BepInEx` |
| Root Folder | `harvestmoonechoesofteradea-root` | high | `{gamePath}` |
| BepInEx Injector | `harvestmoonechoesofteradea-bepinex` | low | `{gamePath}` |
| MelonLoader Mod | `harvestmoonechoesofteradea-melonmod` | high | `{gamePath}/.` |
| MelonLoader Mods | `harvestmoonechoesofteradea-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `harvestmoonechoesofteradea-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `harvestmoonechoesofteradea-melonloader-config` | high | `{gamePath}/UserData` |
| MelonLoader UserLibs | `harvestmoonechoesofteradea-melonloader-userlibs` | high | `{gamePath}/UserLibs` |
| MelonPreferencesManager | `harvestmoonechoesofteradea-melonprefman` | high | `{gamePath}/Mods` |
| MelonLoader | `harvestmoonechoesofteradea-melonloader` | low | `{gamePath}` |
| Assembly DLL Mod | `harvestmoonechoesofteradea-assemblydll` | 60 | `{gamePath}` |
| Assets/Resources File | `harvestmoonechoesofteradea-assets` | 62 | `{gamePath}/Harvest Moon Echoes of Teradea_Data` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `harvestmoonechoesofteradea-bepinex` | 26 |
| `harvestmoonechoesofteradea-melonloader` | 27 |
| `harvestmoonechoesofteradea-root` | 28 |
| `harvestmoonechoesofteradea-bepcfgman` | 29 |
| `harvestmoonechoesofteradea-melonprefman` | 30 |
| `harvestmoonechoesofteradea-assemblydll` | 31 |
| `harvestmoonechoesofteradea-plugin` | 33 |
| `harvestmoonechoesofteradea-assets` | 37 |
| `harvestmoonechoesofteradea-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Harvest Moon Echoes of Teradea.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest BepInEx BE
- Download BepInExConfigManager
- Download Latest MelonLoader
- Open Data Folder
- Open Save Folder
- Open BepInEx Config
- Open BepInEx Log
- Open MelonLoader Config
- Open MelonLoader Log
- Open PCGamingWiki Page
- Open Nexus Mods Page
- Open SteamDB Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| BepInEx | 5.4.23.5 | il2cpp |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\XXX\\XXX` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
