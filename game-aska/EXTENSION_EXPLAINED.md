# ASKA — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | ASKA Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader/Custom Loader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `aska` |
| Executable | `Aska.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Aska.exe` |
| Executable (Demo) | `Aska.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1549](https://www.nexusmods.com/site/mods/1549) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/ASKA](https://www.pcgamingwiki.com/wiki/ASKA) |

## Supported Stores

- **Steam** — `1898300`

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
| `debug` | `false` | toggle for debug mode |
| `thunderstoreBrowser` | `true` | register the "Browse Thunderstore" page |
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
| BepInEx Mod | `aska-bepinexmod` | high | `{gamePath}/BepInEx` |
| BepInEx Plugins | `aska-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `aska-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `aska-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| BepInExConfigManager | `aska-bepcfgman` | high | `{gamePath}/BepInEx` |
| Root Folder | `aska-root` | high | `{gamePath}` |
| BepInEx Injector | `aska-bepinex-new` | low | `{gamePath}` |
| MelonLoader Mod | `aska-melonmod` | high | `{gamePath}/.` |
| MelonLoader Mods | `aska-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `aska-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `aska-melonloader-config` | high | `{gamePath}/UserData` |
| MelonLoader UserLibs | `aska-melonloader-userlibs` | high | `{gamePath}/UserLibs` |
| MelonPreferencesManager | `aska-melonprefman` | high | `{gamePath}/Mods` |
| MelonLoader | `aska-melonloader` | low | `{gamePath}` |
| Assembly DLL Mod | `aska-assemblydll` | 60 | `?` |
| Assets/Resources File | `aska-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `aska-bepinex-new` | 26 |
| `aska-melonloader` | 27 |
| `aska-root` | 28 |
| `aska-bepcfgman` | 29 |
| `aska-melonprefman` | 30 |
| `aska-assemblydll` | 31 |
| `aska-plugin` | 33 |
| `aska-assets` | 37 |
| `aska-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Aska.exe`)

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
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Sand Sailor Studio\\Aska` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
