# Voidtrain — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Voidtrain Vortex Extension |
| Engine / Structure | Unreal Engine Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `voidtrain` |
| Executable | `VoidTrain.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `VoidTrain.exe` |
| Executable (Demo) | `VoidTrain.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1540](https://www.nexusmods.com/site/mods/1540) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Voidtrain](https://www.pcgamingwiki.com/wiki/Voidtrain) |

## Supported Stores

- **Steam** — `1159690`
- **Epic Games Store** — `a0c3344c008d4475a9a29a7a0b6189b8`
- **Xbox / Microsoft Store** — `HypeTrainDigital.VoidTrain`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `true` | toggle for Xbox version logic (to unify templates) |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo) |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_DATA` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_DOCS` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `voidtrain-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `voidtrain-logicmods` | high | `{gamePath}/VoidTrain/Content/Paks` |
| Paks (no "~mods") | `voidtrain-pakalt` | high | `{gamePath}/VoidTrain/Content/Paks` |
| Root Game Folder | `voidtrain-root` | high | `{gamePath}` |
| Root Sub-Folders | `voidtrain-rootsubfolders` | high | `{gamePath}/VoidTrain` |
| UE Sortable Pak Mod | `voidtrain-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `voidtrain-scripts` | 50 | `?` |
| UE4SS DLL Mod | `voidtrain-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `voidtrain-binaries` | 54 | `?` |
| UE4SS | `voidtrain-ue4ss` | 56 | `?` |
| Config (Local AppData) | `voidtrain-config` | 60 | `?` |
| Saves (Local AppData) | `voidtrain-save` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `voidtrain-ue4sscombo` | 25 |
| `voidtrain-logicmods` | 27 |
| `voidtrain-ue4ss` | 31 |
| `voidtrain-scripts` | 33 |
| `voidtrain-ue4ssdll` | 35 |
| `voidtrain-root` | 37 |
| `voidtrain-config` | 39 |
| `voidtrain-save` | 41 |
| `voidtrain-binaries` | 49 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
- Open Config Folder
- Open Saves Folder
- Download UE4SS
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

