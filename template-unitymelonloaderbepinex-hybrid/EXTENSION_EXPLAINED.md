# XXX — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | XXX Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader/Custom Loader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `XXX` |
| Executable | `XXX.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `XXX.exe` |
| Executable (Demo) | `XXX.exe` |

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
| `loaderChoice` | `true` | true if loader choice is enabled |
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
| BepInEx Mod | `XXX-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `XXX-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `XXX-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `XXX-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `XXX-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `XXX-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `XXX-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `XXX-melonloader-config` | high | `{gamePath}/UserData` |
| MelonLoader UserLibs | `XXX-melonloader-userlibs` | high | `{gamePath}/UserLibs` |
| BepInExConfigManager | `XXX-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferencesManager | `XXX-melonprefman` | high | `{gamePath}/Mods` |
| Root Folder | `XXX-root` | high | `{gamePath}` |
| BepInEx Injector | `XXX-bepinex` | low | `{gamePath}` |
| MelonLoader | `XXX-melonloader` | low | `{gamePath}` |
| Assembly DLL Mod | `XXX-assemblydll` | 60 | `?` |
| Assets/Resources File | `XXX-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `XXX-bepinex` | 26 |
| `XXX-melonloader` | 27 |
| `XXX-root` | 28 |
| `XXX-bepcfgman` | 29 |
| `XXX-melonprefman` | 30 |
| `XXX-assemblydll` | 31 |
| `XXX-plugin` | 33 |
| `XXX-assets` | 37 |
| `XXX-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`XXX.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest BepInEx BE
- Download BepInExConfigManager
- Download Latest MelonLoader
- Download MelonPreferencesManager
- Remove MelonPreferencesManager
- Open Data Folder
- Open Save Folder
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

