# DRAGON QUEST I & II HD-2D Remake — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | DRAGON QUEST I & II HD-2D Remake Vortex Extension |
| Engine / Structure | UE5 (static exe) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `dragonquest1and2hd2dremake` |
| Executable | `DQIandIIHD2DRemake.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1514](https://www.nexusmods.com/site/mods/1514) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Dragon_Quest_I_%26_II_HD-2D_Remake](https://www.pcgamingwiki.com/wiki/Dragon_Quest_I_%26_II_HD-2D_Remake) |

## Supported Stores

- **Steam** — `2893570`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_DATA` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_DOCS` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `dragonquest1and2hd2dremake-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `dragonquest1and2hd2dremake-logicmods` | high | `{gamePath}/Game/Content/Paks/LogicMods` |
| UE4SS | `dragonquest1and2hd2dremake-ue4ss` | high | `{gamePath}/Game/Binaries/Win64` |
| UE4SS Script Mod | `dragonquest1and2hd2dremake-scripts` | high | `{gamePath}/Game/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `dragonquest1and2hd2dremake-ue4ssdll` | high | `{gamePath}/Game/Binaries/Win64/ue4ss/Mods` |
| Paks (no ~mods) | `dragonquest1and2hd2dremake-pakalt` | low | `{gamePath}/Game/Content/Paks` |
| Root Game Folder | `dragonquest1and2hd2dremake-root` | high | `{gamePath}` |
| Content Folder | `dragonquest1and2hd2dremake-contentfolder` | high | `{gamePath}/Game` |
| Binaries (Engine Injector) | `dragonquest1and2hd2dremake-binaries` | high | `{gamePath}/Game/Binaries/Win64` |
| UE Sortable Pak Mod | `dragonquest1and2hd2dremake-uesortablepak` | 25 | `?` |
| Config | `dragonquest1and2hd2dremake-config` | 45 | `?` |
| Saves | `dragonquest1and2hd2dremake-save` | 47 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `dragonquest1and2hd2dremake-ue4sscombo` | 25 |
| `dragonquest1and2hd2dremake-logicmods` | 27 |
| `dragonquest1and2hd2dremake-ue4ss` | 31 |
| `dragonquest1and2hd2dremake-scripts` | 33 |
| `dragonquest1and2hd2dremake-ue4ssdll` | 35 |
| `dragonquest1and2hd2dremake-root` | 37 |
| `dragonquest1and2hd2dremake-contentfolder` | 38 |
| `dragonquest1and2hd2dremake-config` | 39 |
| `dragonquest1and2hd2dremake-save` | 41 |
| `dragonquest1and2hd2dremake-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`DQIandIIHD2DRemake.exe`)
- **Demo Launch** (`EXEC_DEMO`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
- Open Config Folder
- Open Saves Folder
- Download UE4SS
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.

