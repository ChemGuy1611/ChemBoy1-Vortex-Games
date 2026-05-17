# NINJA GAIDEN 2 Black — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Ninja Gaiden 2 Black Vortex Extension |
| Engine / Structure | UE5 (Xbox-Integrated) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `ninjagaiden2black` |
| Executable | `NINJAGAIDEN2BLACK.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1159](https://www.nexusmods.com/site/mods/1159) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Ninja_Gaiden_2_Black](https://www.pcgamingwiki.com/wiki/Ninja_Gaiden_2_Black) |

## Supported Stores

- **Steam** — `3287520`
- **Xbox / Microsoft Store** — `946B6A6E.NINJAGAIDEN2Black`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS LogicMods (Blueprint) | `ninjagaiden2black-logicmods` | high | `{gamePath}/NINJAGAIDEN2BLACK/Content/Paks/LogicMods` |
| UE4SS Script-LogicMod Combo | `ninjagaiden2black-ue4sscombo` | high | `{gamePath}` |
| Root Game Folder | `ninjagaiden2black-root` | high | `{gamePath}` |
| UE5 Paks | `ninjagaiden2black-ue5` | high | `{gamePath}/NINJAGAIDEN2BLACK/Content/Paks/~mods` |
| UE5 Paks (no "~mods") | `ninjagaiden2black-pakalt` | high | `{gamePath}/NINJAGAIDEN2BLACK/Content/Paks` |
| UE5 Sortable Mod | `ninjagaiden2black-ue5-sortable-modtype` | 25 | `?` |
| Legacy UE - REINSTALL TO SORT | `ue5-sortable-modtype` | 65 | `?` |
| UE4SS Scripts | `ninjagaiden2black-scripts` | 40 | `?` |
| Mod Loader | `ninjagaiden2black-modloader` | 60 | `?` |
| ML Mod | `ninjagaiden2black-mlmod` | 45 | `?` |
| Binaries (Engine Injector) | `ninjagaiden2black-binaries` | 65 | `?` |
| UE4SS | `ninjagaiden2black-ue4ss` | 70 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 31 |
| `ninjagaiden2black-ue4sscombo` | 25 |
| `ninjagaiden2black-logicmods` | 28 |
| `ninjagaiden2black-ue4ss` | 34 |
| `ninjagaiden2black-scripts` | 37 |
| `ninjagaiden2black-root` | 40 |
| `ninjagaiden2black-modloader` | 43 |
| `ninjagaiden2black-mlmod` | 47 |
| `ninjagaiden2black-binaries` | 50 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game** (`EXEC`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open Config Folder
- Open Saves Folder (Steam)
- Open Saves Folder (Xbox)
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `NINJAGAIDEN2BLACK/Saved/Config/Windows` |
| Save | `NINJAGAIDEN2BLACK/Saved/SaveGames` |
| Save (Xbox) | `Packages/946B6A6E.NINJAGAIDEN2Black_dkffhzhmh6pmy/SystemAppData/wgs` |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

