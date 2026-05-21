# The Long Dark — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | The Long Dark Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader/Custom Loader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `thelongdark` |
| Executable | `tld.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `tld.exe` |
| Executable (Demo) | `tld.exe` |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/The_Long_Dark](https://www.pcgamingwiki.com/wiki/The_Long_Dark) |

## Supported Stores

- **Steam** — `305620`
- **Epic Games Store** — `ed93b18355a84230938c705121c63661`
- **GOG** — `1447763046`
- **Xbox / Microsoft Store** — `27620HinterlandStudio.30233944AADE4`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `hasXbox` | `true` | toggle for Xbox version logic |
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
| BepInEx Mod | `thelongdark-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `thelongdark-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `thelongdark-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `thelongdark-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `thelongdark-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `thelongdark-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `thelongdark-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `thelongdark-melonloader-config` | high | `{gamePath}/UserData` |
| BepInExConfigManager | `thelongdark-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferencesManager | `thelongdark-melonprefman` | high | `{gamePath}/Mods` |
| Root Game Folder | `thelongdark-root` | high | `{gamePath}` |
| BepInEx Injector | `thelongdark-bepinex` | low | `{gamePath}` |
| MelonLoader | `thelongdark-melonloader` | low | `{gamePath}` |
| Assembly DLL Mod | `thelongdark-assemblydll` | 60 | `?` |
| Assets/Resources File | `thelongdark-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `thelongdark-bepinex` | 26 |
| `thelongdark-melonloader` | 27 |
| `thelongdark-root` | 28 |
| `thelongdark-bepcfgman` | 29 |
| `thelongdark-melonprefman` | 30 |
| `thelongdark-assemblydll` | 31 |
| `thelongdark-plugin` | 33 |
| `thelongdark-assets` | 37 |
| `thelongdark-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`tld.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest BepInEx BE (Browse)
- Download BepInExConfigManager
- Download Latest MelonLoader
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
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

