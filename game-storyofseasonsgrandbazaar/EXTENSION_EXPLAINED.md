# STORY OF SEASONS: Grand Bazaar — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | STORY OF SEASONS: Grand Bazaar Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader/Custom Loader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `storyofseasonsgrandbazaar` |
| Executable | `SOSGrandBazaar.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `SOSGrandBazaar.exe` |
| Executable (Demo) | `SOSGrandBazaar.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1784](https://www.nexusmods.com/site/mods/1784) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Story_Of_Seasons%3A_Grand_Bazaar](https://www.pcgamingwiki.com/wiki/Story_Of_Seasons%3A_Grand_Bazaar) |

## Supported Stores

- **Steam** — `2508780`

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
| `exeHasGameVersion` | `false` | toggle: true if the game devs stamp the real game version (not just the Unity player version) into the exe ProductVersion |
| `hasVersionFile` | `false` | set to true if there is a Version.info file that contains the game version number |
| `hasUserIdFolder` | `true` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
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
| BepInEx Mod | `storyofseasonsgrandbazaar-bepinexmod` | high | `{gamePath}/BepInEx` |
| BepInEx Plugins | `storyofseasonsgrandbazaar-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `storyofseasonsgrandbazaar-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `storyofseasonsgrandbazaar-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| BepInExConfigManager | `storyofseasonsgrandbazaar-bepcfgman` | high | `{gamePath}/BepInEx` |
| Root Folder | `storyofseasonsgrandbazaar-root` | high | `{gamePath}` |
| BepInEx Injector | `storyofseasonsgrandbazaar-bepinex` | low | `{gamePath}` |
| MelonLoader Mod | `storyofseasonsgrandbazaar-melonmod` | high | `{gamePath}/.` |
| MelonLoader Mods | `storyofseasonsgrandbazaar-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `storyofseasonsgrandbazaar-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `storyofseasonsgrandbazaar-melonloader-config` | high | `{gamePath}/UserData` |
| MelonLoader UserLibs | `storyofseasonsgrandbazaar-melonloader-userlibs` | high | `{gamePath}/UserLibs` |
| MelonPreferencesManager | `storyofseasonsgrandbazaar-melonprefman` | high | `{gamePath}/Mods` |
| MelonLoader | `storyofseasonsgrandbazaar-melonloader` | low | `{gamePath}` |
| Assembly DLL Mod | `storyofseasonsgrandbazaar-assemblydll` | 60 | `?` |
| Assets/Resources File | `storyofseasonsgrandbazaar-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `storyofseasonsgrandbazaar-bepinex` | 26 |
| `storyofseasonsgrandbazaar-melonloader` | 27 |
| `storyofseasonsgrandbazaar-root` | 28 |
| `storyofseasonsgrandbazaar-bepcfgman` | 29 |
| `storyofseasonsgrandbazaar-melonprefman` | 30 |
| `storyofseasonsgrandbazaar-assemblydll` | 31 |
| `storyofseasonsgrandbazaar-plugin` | 33 |
| `storyofseasonsgrandbazaar-assets` | 37 |
| `storyofseasonsgrandbazaar-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`SOSGrandBazaar.exe`)

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
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\\\STORY OF SEASONS Grand Bazaar` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
