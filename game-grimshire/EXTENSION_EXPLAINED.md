# Grimshire — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Grimshire Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader/Custom Loader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `grimshire` |
| Executable | `Grimshire.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Grimshire.exe` |
| Executable (Demo) | `Grimshire.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1797](https://www.nexusmods.com/site/mods/1797) |
| PCGamingWiki | [XXX](XXX) |

## Supported Stores

- **Steam** — `2238470`

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
| `hasVersionFile` | `false` | set to true if there is a Version.info file that contains the game version number |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `allowBepCfgMan` | `true` | should BepInExConfigManager be downloaded? |
| `allowMelPrefMan` | `false` | should MelonPreferencesManager be downloaded? False until figure out UniverseLib dependency |
| `allowBepinexNexus` | `true` | allow Nexus Mods download of BepInEx/MelonLoader |
| `allowMelonNexus` | `true` | allows MelonLoader to be downloaded from Nexus Mods |
| `useMelonNightly` | `false` | use Nightly build of MelonLoader? |
| `customInstalled` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| BepInEx Mod | `grimshire-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `grimshire-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `grimshire-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `grimshire-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `grimshire-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `grimshire-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `grimshire-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `grimshire-melonloader-config` | high | `{gamePath}/UserData` |
| BepInExConfigManager | `grimshire-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferencesManager | `grimshire-melonprefman` | high | `{gamePath}/Mods` |
| Root Game Folder | `grimshire-root` | high | `{gamePath}` |
| BepInEx Injector | `grimshire-bepinex` | low | `{gamePath}` |
| MelonLoader | `grimshire-melonloader` | low | `{gamePath}` |
| Assembly DLL Mod | `grimshire-assemblydll` | 60 | `?` |
| Assets/Resources File | `grimshire-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `grimshire-bepinex` | 26 |
| `grimshire-melonloader` | 27 |
| `grimshire-root` | 28 |
| `grimshire-bepcfgman` | 29 |
| `grimshire-melonprefman` | 30 |
| `grimshire-assemblydll` | 31 |
| `grimshire-plugin` | 33 |
| `grimshire-assets` | 37 |
| `grimshire-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Grimshire.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest BepInEx BE (Browse)
- Download BepInExConfigManager
- Download Latest MelonLoader
- Open Data Folder
- Open Config/Save Folder
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
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\AcuteOwlStudio\\Grimshire` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

