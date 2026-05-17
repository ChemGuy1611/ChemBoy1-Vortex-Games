# TEKKEN 8 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | TEKKEN 8 Vortex Extension |
| Engine / Structure | Unreal Engine 4-5 Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `tekken8` |
| Executable | `TEKKEN 8.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `TEKKEN 8.exe` |
| Executable (Demo) | `TEKKEN 8 Demo.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1833](https://www.nexusmods.com/site/mods/1833) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Tekken_8](https://www.pcgamingwiki.com/wiki/Tekken_8) |

## Supported Stores

- **Steam** — `1778820`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic. |
| `multiExe` | `true` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `hasModKit` | `false` | toggle for UE ModKit mod support |
| `preferHardlinks` | `true` | set true to perform partition checks when IO-STORE=false for Config/Save modtypes so that hardlinks available to more users |
| `autoDownloadUe4ss` | `false` | toggle for auto downloading UE4SS |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `debug` | `false` | toggle for debug mode |
| `PAKMOD_LOADORDER` | `true` | set to false if you don't want loadOrder. If must be in "Paks" root, disable loadOrder. |
| `FBLO` | `true` | set to false to use legacy load order page |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_CONFIG` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_SAVE` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `tekken8-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `tekken8-logicmods` | high | `{gamePath}/Polaris/Content/Paks` |
| Paks (no "~mods") | `tekken8-pakalt` | high | `{gamePath}/Polaris/Content/Paks` |
| Root Game Folder | `tekken8-root` | high | `{gamePath}` |
| Root Sub-Folders | `tekken8-rootsubfolders` | high | `{gamePath}/Polaris` |
| UE Sortable Pak Mod | `tekken8-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `tekken8-scripts` | 50 | `?` |
| UE4SS DLL Mod | `tekken8-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `tekken8-binaries` | 54 | `?` |
| UE4SS | `tekken8-ue4ss` | 56 | `?` |
| Config (Local AppData) | `tekken8-config` | 62 | `?` |
| Saves (Local AppData) | `tekken8-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `tekken8-ue4sscombo` | 26 |
| `tekken8-uesortablepak` | 29 |
| `tekken8-ue4ss` | 31 |
| `tekken8-scripts` | 35 |
| `tekken8-ue4ssdll` | 37 |
| `tekken8-root` | 39 |
| `tekken8-config` | 41 |
| `tekken8-save` | 43 |
| `tekken8-binaries` | 49 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open Config Folder
- Open Saves Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Special Features

- **Load Order** — mods are assigned numbered folder names or sorted based on their position in the load order.
- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

