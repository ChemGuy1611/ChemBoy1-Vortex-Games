# BALL x PIT — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | BALL x PIT Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader/Custom Loader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `ballxpit` |
| Executable | `Balls.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Balls.exe` |
| Executable (Demo) | `Balls.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1545](https://www.nexusmods.com/site/mods/1545) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Ball_X_Pit](https://www.pcgamingwiki.com/wiki/Ball_X_Pit) |

## Supported Stores

- **Steam** — `2062430`
- **Xbox / Microsoft Store** — `DevolverDigital.BallxPit`

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
| BepInEx Mod | `ballxpit-bepinexmod` | high | `{gamePath}/BepInEx` |
| BepInEx Plugins | `ballxpit-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `ballxpit-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `ballxpit-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| BepInExConfigManager | `ballxpit-bepcfgman` | high | `{gamePath}/BepInEx` |
| Root Folder | `ballxpit-root` | high | `{gamePath}` |
| BepInEx Injector | `ballxpit-bepinex` | low | `{gamePath}` |
| MelonLoader Mod | `ballxpit-melonmod` | high | `{gamePath}/.` |
| MelonLoader Mods | `ballxpit-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `ballxpit-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `ballxpit-melonloader-config` | high | `{gamePath}/UserData` |
| MelonLoader UserLibs | `ballxpit-melonloader-userlibs` | high | `{gamePath}/UserLibs` |
| MelonPreferencesManager | `ballxpit-melonprefman` | high | `{gamePath}/Mods` |
| MelonLoader | `ballxpit-melonloader` | low | `{gamePath}` |
| Assembly DLL Mod | `ballxpit-assemblydll` | 60 | `?` |
| Assets/Resources File | `ballxpit-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ballxpit-bepinex` | 26 |
| `ballxpit-melonloader` | 27 |
| `ballxpit-root` | 28 |
| `ballxpit-bepcfgman` | 29 |
| `ballxpit-melonprefman` | 30 |
| `ballxpit-assemblydll` | 31 |
| `ballxpit-plugin` | 33 |
| `ballxpit-assets` | 37 |
| `ballxpit-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Balls.exe`)

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
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Kenny Sun\\BALL x PIT` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
