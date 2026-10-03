# PC Building Simulator 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | PC Building Simulator 2 Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader/Custom Loader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `pcbuildingsimulator2` |
| Executable | `PCBS2.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `PCBS2.exe` |
| Executable (Demo) | `PCBS2.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1494](https://www.nexusmods.com/site/mods/1494) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/PC_Building_Simulator_2](https://www.pcgamingwiki.com/wiki/PC_Building_Simulator_2) |

## Supported Stores

- **Epic Games Store** — `0449f415f5404df093b8d67c31940024`

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
| `enableSaveInstaller` | `true` | set to true if you want to enable the save installer (only recommended if saves are stored in the game's folder) |
| `hasCustomMods` | `false` | set to true if there are modTypes with folder paths dependent on which mod loader is installed |
| `hasCustomLoader` | `false` | set to true if there is a custom mod loader |
| `customLoaderInstaller` | `false` | set true if the custom loader uses an installer |
| `debug` | `false` | toggle for debug mode |
| `exeHasGameVersion` | `false` | toggle: true if the game devs stamp the real game version (not just the Unity player version) into the exe ProductVersion |
| `hasVersionFile` | `false` | set to true if there is a Version.info file that contains the game version number |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
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
| BepInEx Mod | `pcbuildingsimulator2-bepinexmod` | high | `{gamePath}/BepInEx` |
| BepInEx Plugins | `pcbuildingsimulator2-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `pcbuildingsimulator2-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `pcbuildingsimulator2-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| BepInExConfigManager | `pcbuildingsimulator2-bepcfgman` | high | `{gamePath}/BepInEx` |
| Root Folder | `pcbuildingsimulator2-root` | high | `{gamePath}` |
| BepInEx Injector | `pcbuildingsimulator2-bepinex` | low | `{gamePath}` |
| MelonLoader Mod | `pcbuildingsimulator2-melonmod` | high | `{gamePath}/.` |
| MelonLoader Mods | `pcbuildingsimulator2-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `pcbuildingsimulator2-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `pcbuildingsimulator2-melonloader-config` | high | `{gamePath}/UserData` |
| MelonLoader UserLibs | `pcbuildingsimulator2-melonloader-userlibs` | high | `{gamePath}/UserLibs` |
| MelonPreferencesManager | `pcbuildingsimulator2-melonprefman` | high | `{gamePath}/Mods` |
| MelonLoader | `pcbuildingsimulator2-melonloader` | low | `{gamePath}` |
| Save | `pcbuildingsimulator2-save` | high | `{gamePath}/Saves` |
| PC Build | `pcbuildingsimulator2-pcbuild` | high | `{gamePath}/PCs` |
| Assembly DLL Mod | `pcbuildingsimulator2-assemblydll` | 60 | `?` |
| Assets/Resources File | `pcbuildingsimulator2-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `pcbuildingsimulator2-bepinex` | 26 |
| `pcbuildingsimulator2-melonloader` | 27 |
| `pcbuildingsimulator2-root` | 28 |
| `pcbuildingsimulator2-bepcfgman` | 29 |
| `pcbuildingsimulator2-melonprefman` | 30 |
| `pcbuildingsimulator2-assemblydll` | 31 |
| `pcbuildingsimulator2-plugin` | 33 |
| `pcbuildingsimulator2-pcbuild` | 35 |
| `pcbuildingsimulator2-assets` | 37 |
| `pcbuildingsimulator2-save` | 47 |
| `pcbuildingsimulator2-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`PCBS2.exe`)

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
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Epic Games Publishing\\PCBS2` |
| Save | `Saves` |
| Save (Xbox) | `Saves` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
