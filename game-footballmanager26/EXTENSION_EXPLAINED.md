# Football Manager 26 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Football Manager 26 Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader/Custom Loader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `footballmanager26` |
| Executable | `fm.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `fm.exe` |
| Executable (Demo) | `fm.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1523](https://www.nexusmods.com/site/mods/1523) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Football_Manager_26](https://www.pcgamingwiki.com/wiki/Football_Manager_26) |

## Supported Stores

- **Steam** — `3551340`
- **Epic Games Store** — `e54a251079034694b55ab6289707bfa0`
- **Xbox / Microsoft Store** — `SportsInteractive.FootballManager26`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `thunderstoreBrowser` | `true` | register the "Browse Thunderstore" page |
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
| `hasVersionFile` | `false` | set to true if there is a Version.info file that contains the game version number |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `loaderChoice` | `true` | true if loader choice is enabled |
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
| BepInEx Mod | `footballmanager26-bepinexmod` | high | `{gamePath}/BepInEx` |
| BepInEx Plugins | `footballmanager26-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `footballmanager26-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `footballmanager26-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| BepInExConfigManager | `footballmanager26-bepcfgman` | high | `{gamePath}/BepInEx` |
| Root Folder | `footballmanager26-root` | high | `{gamePath}` |
| BepInEx Injector | `footballmanager26-bepinex` | low | `{gamePath}` |
| MelonLoader Mod | `footballmanager26-melonmod` | high | `{gamePath}/.` |
| MelonLoader Mods | `footballmanager26-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `footballmanager26-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `footballmanager26-melonloader-config` | high | `{gamePath}/UserData` |
| MelonLoader UserLibs | `footballmanager26-melonloader-userlibs` | high | `{gamePath}/UserLibs` |
| MelonPreferencesManager | `footballmanager26-melonprefman` | high | `{gamePath}/Mods` |
| MelonLoader | `footballmanager26-melonloader` | low | `{gamePath}` |
| Assembly DLL Mod | `footballmanager26-assemblydll` | 60 | `?` |
| Assets/Resources File | `footballmanager26-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `footballmanager26-bepinex` | 26 |
| `footballmanager26-melonloader` | 27 |
| `footballmanager26-root` | 28 |
| `footballmanager26-bepcfgman` | 29 |
| `footballmanager26-melonprefman` | 30 |
| `footballmanager26-assemblydll` | 31 |
| `footballmanager26-plugin` | 33 |
| `footballmanager26-assets` | 37 |
| `footballmanager26-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`fm.exe`)

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
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Sports Interactive\\Football Manager 26` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
