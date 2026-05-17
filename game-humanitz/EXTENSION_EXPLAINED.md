# HumanitZ — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | HumanitZ Vortex Extension |
| Engine / Structure | Unreal Engine Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `humanitz` |
| Executable | `Humanitz.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Humanitz.exe` |
| Executable (Demo) | `Humanitz_Demo.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/691](https://www.nexusmods.com/site/mods/691) |

## Supported Stores

- **Steam** — `1766060`
- **Epic Games Store** — `7553f3b09de045ca9a2e2c30b2321616`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic. |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `hasModKit` | `false` | toggle for UE ModKit mod support |
| `preferHardlinks` | `true` | set true to perform partition checks when IO-STORE=false for Config/Save modtypes so that hardlinks available to more users |
| `autoDownloadUe4ss` | `false` | toggle for auto downloading UE4SS |
| `setupNotification` | `false` | toggle for notifying user of setup progress |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |
| `PAKMOD_LOADORDER` | `true` | set to false if you don't want loadOrder. If must be in "Paks" root, disable loadOrder. |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_CONFIG` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_SAVE` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `humanitz-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `humanitz-logicmods` | high | `{gamePath}/Humanitz/Content/Paks` |
| Paks (no "~mods") | `humanitz-pakalt` | high | `{gamePath}/Humanitz/Content/Paks` |
| Root Game Folder | `humanitz-root` | high | `{gamePath}` |
| Root Sub-Folders | `humanitz-rootsubfolders` | high | `{gamePath}/Humanitz` |
| UE Sortable Pak Mod | `humanitz-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `humanitz-scripts` | 50 | `?` |
| UE4SS DLL Mod | `humanitz-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `humanitz-binaries` | 54 | `?` |
| UE4SS | `humanitz-ue4ss` | 56 | `?` |
| Config (Local AppData) | `humanitz-config` | 62 | `?` |
| Saves (Local AppData) | `humanitz-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `humanitz-ue4sscombo` | 26 |
| `humanitz-logicmods` | 27 |
| `humanitz-ue4ss` | 31 |
| `humanitz-scripts` | 35 |
| `humanitz-ue4ssdll` | 37 |
| `humanitz-root` | 39 |
| `humanitz-config` | 41 |
| `humanitz-save` | 43 |
| `humanitz-binaries` | 49 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
- Open Config Folder
- Open Saves Folder
- Download UE4SS
- Open UE4SS Settings INI
- Open UE4SS mods.json
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
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

