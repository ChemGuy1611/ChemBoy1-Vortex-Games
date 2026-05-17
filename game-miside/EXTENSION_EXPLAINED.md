# MiSide — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | MiSide Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader/Custom Loader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `miside` |
| Executable | `MiSideFull.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `MiSideFull.exe` |
| Executable (Demo) | `MiSideFull.exe` |
| Extension Page | [XXX](XXX) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/MiSide](https://www.pcgamingwiki.com/wiki/MiSide) |

## Supported Stores

- **Steam** — `2527500`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `multiExe` | `true` | set to true if there are multiple executables (typically for Xbox/EGS) |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `preventPluginInstall` | `true` | set to true if you want to prevent plugins not for the current mod loader from installing. Disable if using cross-compatibility plugins. |
| `loaderSwitchRestart` | `false` | set to true if you need to restart the extension after switching mod loaders |
| `enableSaveInstaller` | `false` | set to true if you want to enable the save installer (only recommended if saves are stored in the game's folder) |
| `hasCustomMods` | `false` | set to true if there are modTypes with folder paths dependent on which mod loader is installed |
| `hasCustomLoader` | `false` | set to true if there is a custom mod loader |
| `customLoaderInstaller` | `false` | set true if the custom loader uses an installer |
| `hasVersionFile` | `false` | set to true if there is a Version.info file that contains the game version number |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `loaderChoice` | `false` | true if loader choice is enabled |
| `allowBepCfgMan` | `true` | should BepInExConfigManager be downloaded (via notification)? |
| `allowMelPrefMan` | `false` | should MelonPreferencesManager be downloaded (via notification)? |
| `allowBepinexNexus` | `true` | allow Nexus Mods download of BepInEx/MelonLoader |
| `allowMelonNexus` | `true` | allows MelonLoader to be downloaded from Nexus Mods |
| `useMelonNightly` | `false` | use Nightly build of MelonLoader? |
| `customInstalled` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| BepInEx Mod | `miside-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `miside-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `miside-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `miside-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `miside-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `miside-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `miside-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `miside-melonloader-config` | high | `{gamePath}/UserData` |
| MelonLoader UserLibs | `miside-melonloader-userlibs` | high | `{gamePath}/UserLibs` |
| BepInExConfigManager | `miside-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferencesManager | `miside-melonprefman` | high | `{gamePath}/Mods` |
| Root Game Folder | `miside-root` | high | `{gamePath}` |
| BepInEx Injector | `miside-bepinex` | low | `{gamePath}` |
| MelonLoader | `miside-melonloader` | low | `{gamePath}` |
| Assembly DLL Mod | `miside-assemblydll` | 60 | `?` |
| Assets/Resources File | `miside-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `miside-bepinex` | 26 |
| `miside-melonloader` | 27 |
| `miside-root` | 28 |
| `miside-bepcfgman` | 29 |
| `miside-melonprefman` | 30 |
| `miside-assemblydll` | 31 |
| `miside-plugin` | 33 |
| `miside-assets` | 37 |
| `miside-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`MiSideFull.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest BepInEx BE (Browse)
- Download BepInExConfigManager
- Download Latest MelonLoader
- Download MelonPreferencesManager
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
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\AIHASTO\\MiSideFull` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

