# How to Fish — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | How to Fish Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader/Custom Loader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `howtofish` |
| Executable | `How To Fish.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `How To Fish.exe` |
| Executable (Demo) | `How To Fish.exe` |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/How_to_Fish](https://www.pcgamingwiki.com/wiki/How_to_Fish) |

## Supported Stores

- **Steam** — `4001890`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
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
| `loaderChoice` | `false` | true if loader choice is enabled |
| `allowBepCfgMan` | `true` | should BepInExConfigManager be downloaded (via notification)? |
| `allowMelPrefMan` | `true` | should MelonPreferencesManager be downloaded (via notification)? |
| `allowBepinexNexus` | `true` | allow Nexus Mods download of BepInEx/MelonLoader |
| `allowMelonNexus` | `true` | allows MelonLoader to be downloaded from Nexus Mods |
| `useMelonNightly` | `false` | use Nightly build of MelonLoader? |
| `customInstalled` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| BepInEx Mod | `howtofish-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `howtofish-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `howtofish-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `howtofish-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `howtofish-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `howtofish-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `howtofish-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `howtofish-melonloader-config` | high | `{gamePath}/UserData` |
| MelonLoader UserLibs | `howtofish-melonloader-userlibs` | high | `{gamePath}/UserLibs` |
| BepInExConfigManager | `howtofish-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferencesManager | `howtofish-melonprefman` | high | `{gamePath}/Mods` |
| Root Folder | `howtofish-root` | high | `{gamePath}` |
| BepInEx Injector | `howtofish-bepinex` | low | `{gamePath}` |
| MelonLoader | `howtofish-melonloader` | low | `{gamePath}` |
| Assembly DLL Mod | `howtofish-assemblydll` | 60 | `?` |
| Assets/Resources File | `howtofish-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `howtofish-bepinex` | 26 |
| `howtofish-melonloader` | 27 |
| `howtofish-root` | 28 |
| `howtofish-bepcfgman` | 29 |
| `howtofish-melonprefman` | 30 |
| `howtofish-assemblydll` | 31 |
| `howtofish-plugin` | 33 |
| `howtofish-assets` | 37 |
| `howtofish-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`How To Fish.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest BepInEx BE
- Download BepInExConfigManager
- Download Latest MelonLoader
- Download MelonPreferencesManager
- Remove MelonPreferencesManager
- Open Data Folder
- Open BepInEx Config
- Open BepInEx Log
- Open MelonLoader Config
- Open MelonLoader Log
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| BepInEx | 5.4.23.5 | mono |

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

