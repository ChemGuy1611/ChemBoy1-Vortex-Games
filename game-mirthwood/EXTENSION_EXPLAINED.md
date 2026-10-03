# Mirthwood — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Mirthwood Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader/Custom Loader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `mirthwood` |
| Executable | `Mirthwood.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Mirthwood.exe` |
| Executable (Demo) | `Mirthwood.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1272](https://www.nexusmods.com/site/mods/1272) |

## Supported Stores

- **Steam** — `2272900`

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
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `loaderChoice` | `false` | true if loader choice is enabled |
| `allowBepCfgMan` | `false` | should BepInExConfigManager be downloaded (via notification)? |
| `allowMelPrefMan` | `false` | should MelonPreferencesManager be downloaded (via notification)? disabled 2026-09-14 - plugin causes in-game errors when loaded |
| `allowBepinexNexus` | `true` | allow Nexus Mods download of BepInEx/MelonLoader |
| `allowMelonNexus` | `true` | allows MelonLoader to be downloaded from Nexus Mods |
| `useMelonNightly` | `false` | use Nightly build of MelonLoader? |
| `customInstalled` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| BepInEx Mod | `mirthwood-bepinexmod` | high | `{gamePath}/BepInEx` |
| BepInEx Plugins | `mirthwood-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `mirthwood-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `mirthwood-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| BepInExConfigManager | `mirthwood-bepcfgman` | high | `{gamePath}/BepInEx` |
| Root Folder | `mirthwood-root` | high | `{gamePath}` |
| BepInEx Injector | `mirthwood-bepinex` | low | `{gamePath}` |
| MelonLoader Mod | `mirthwood-melonmod` | high | `{gamePath}/.` |
| MelonLoader Mods | `mirthwood-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `mirthwood-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `mirthwood-melonloader-config` | high | `{gamePath}/UserData` |
| MelonLoader UserLibs | `mirthwood-melonloader-userlibs` | high | `{gamePath}/UserLibs` |
| MelonPreferencesManager | `mirthwood-melonprefman` | high | `{gamePath}/Mods` |
| MelonLoader | `mirthwood-melonloader` | low | `{gamePath}` |
| Assembly DLL Mod | `mirthwood-assemblydll` | 60 | `?` |
| Assets/Resources File | `mirthwood-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `mirthwood-bepinex` | 26 |
| `mirthwood-melonloader` | 27 |
| `mirthwood-root` | 28 |
| `mirthwood-bepcfgman` | 29 |
| `mirthwood-melonprefman` | 30 |
| `mirthwood-assemblydll` | 31 |
| `mirthwood-plugin` | 33 |
| `mirthwood-assets` | 37 |
| `mirthwood-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Mirthwood.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest BepInEx BE
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
