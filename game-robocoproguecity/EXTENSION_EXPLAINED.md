# RoboCop: Rogue City — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | RoboCop Rogue City and Unfinished Business Vortex Extension |
| Engine / Structure | UE5 |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `robocoproguecity` |
| Executable | `RoboCop.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/892](https://www.nexusmods.com/site/mods/892) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/RoboCop%3A_Rogue_City](https://www.pcgamingwiki.com/wiki/RoboCop%3A_Rogue_City) |

## Supported Stores

- **Steam** — `1681430`
- **Epic Games Store** — `d6ab0d70d3c842b7a13beec125a02ecc`
- **GOG** — `1950574400`
- **Xbox / Microsoft Store** — `BigbenInteractiveSA.RoboCopRogueCity`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `CHECK_DATA` | `false` | true if game, staging, and save folders are all on the same drive (partition check) |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `CHECK_DATA_UNFINISHED` | `false` |  |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `robocoproguecity-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `robocoproguecity-logicmods` | high | `{gamePath}/Game/Content/Paks/LogicMods` |
| Root Game Folder | `robocoproguecity-root` | high | `{gamePath}` |
| Content Folder | `robocoproguecity-contentfolder` | high | `{gamePath}/Game` |
| UE5 Paks (no "~mods") | `robocoproguecity-pakalt` | high | `{gamePath}/Game/Content/Paks` |
| UE5 Sortable Mod | `robocoproguecity-ue5-sortable-modtype` | 25 | `?` |
| Legacy UE - REINSTALL TO SORT | `ue5-sortable-modtype` | 65 | `?` |
| UE5 Sortable Mod | `robocoproguecityunfinishedbusiness-ue5-sortable-modtype` | 25 | `?` |
| UE4SS Script Mod | `robocoproguecity-scripts` | 50 | `?` |
| UE4SS DLL Mod | `robocoproguecity-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `robocoproguecity-binaries` | 54 | `?` |
| UE4SS | `robocoproguecity-ue4ss` | 56 | `?` |
| Config | `robocoproguecity-config` | 58 | `?` |
| Saves | `robocoproguecity-save` | 60 | `?` |
| Config | `robocoproguecityunfinishedbusiness-config` | 60 | `?` |
| Saves | `robocoproguecityunfinishedbusiness-save` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `robocoproguecity-ue5-sortable-modtype` | 29 |
| `robocoproguecityunfinishedbusiness-ue5-sortable-modtype` | 29 |
| `robocoproguecity-ue4sscombo` | 25 |
| `robocoproguecity-logicmods` | 27 |
| `robocoproguecity-ue4ss` | 31 |
| `robocoproguecity-scripts` | 33 |
| `robocoproguecity-ue4ssdll` | 35 |
| `robocoproguecity-root` | 37 |
| `robocoproguecity-contentfolder` | 39 |
| `robocoproguecity-config` | 41 |
| `robocoproguecity-save` | 43 |
| `robocoproguecity-binaries` | 45 |
| `robocoproguecityunfinishedbusiness-ue4sscombo` | 25 |
| `robocoproguecityunfinishedbusiness-logicmods` | 27 |
| `robocoproguecityunfinishedbusiness-ue4ss` | 31 |
| `robocoproguecityunfinishedbusiness-scripts` | 33 |
| `robocoproguecityunfinishedbusiness-ue4ssdll` | 35 |
| `robocoproguecityunfinishedbusiness-root` | 37 |
| `robocoproguecityunfinishedbusiness-contentfolder` | 39 |
| `robocoproguecityunfinishedbusiness-config` | 41 |
| `robocoproguecityunfinishedbusiness-save` | 43 |
| `robocoproguecityunfinishedbusiness-binaries` | 45 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open Config Folder
- Open Saves Folder
- Download UE4SS
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report
- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open Config Folder
- Open Saves Folder
- Download UE4SS
- View Changelog
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

