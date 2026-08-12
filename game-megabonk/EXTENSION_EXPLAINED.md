# Megabonk — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Megabonk Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader Hybrid (IL2CPP & x64) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `megabonk` |
| Executable | `Megabonk.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Megabonk.exe` |
| Executable (Demo) | `Megabonk.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1495](https://www.nexusmods.com/site/mods/1495) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Megabonk](https://www.pcgamingwiki.com/wiki/Megabonk) |

## Supported Stores

- **Steam** — `3405340`

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
| `hasCustomMods` | `true` | set to true if there are modTypes with folder paths dependent on which mod loader is installed |
| `hasCustomLoader` | `false` | set to true if there is a custom mod loader |
| `customLoaderInstaller` | `false` | set true if the custom loader uses an installer |
| `debug` | `false` | toggle for debug mode |
| `hasVersionFile` | `false` | set to true if there is a Version.info file that contains the game version number |
| `hasUserIdFolder` | `true` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
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
| BepInEx Mod | `megabonk-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `megabonk-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `megabonk-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `megabonk-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `megabonk-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `megabonk-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `megabonk-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `megabonk-melonloader-config` | high | `{gamePath}/UserData` |
| MelonLoader UserLibs | `megabonk-melonloader-userlibs` | high | `{gamePath}/UserLibs` |
| BepInExConfigManager | `megabonk-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferencesManager | `megabonk-melonprefman` | high | `{gamePath}/Mods` |
| Root Folder | `megabonk-root` | high | `{gamePath}` |
| BepInEx Injector | `megabonk-bepinex` | low | `{gamePath}` |
| MelonLoader | `megabonk-melonloader` | low | `{gamePath}` |
| Custom Characters | `megabonk-customcharacters` | 58 | `?` |
| Assembly DLL Mod | `megabonk-assemblydll` | 60 | `?` |
| Assets/Resources File | `megabonk-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `megabonk-bepinex` | 26 |
| `megabonk-melonloader` | 27 |
| `megabonk-root` | 28 |
| `megabonk-bepcfgman` | 29 |
| `megabonk-melonprefman` | 30 |
| `megabonk-assemblydll` | 31 |
| `megabonk-plugin` | 33 |
| `megabonk-assets` | 37 |
| `megabonk-customcharacters` | 39 |
| `megabonk-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Megabonk.exe`)

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
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Ved\\Megabonk` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

