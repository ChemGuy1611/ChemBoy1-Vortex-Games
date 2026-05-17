# Hell is Us — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Hell is Us Vortex Extension |
| Engine / Structure | UE5 (static exe) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `hellisus` |
| Executable | `HellIsUs.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1417](https://www.nexusmods.com/site/mods/1417) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Hell_is_Us](https://www.pcgamingwiki.com/wiki/Hell_is_Us) |

## Supported Stores

- **Steam** — `1620730`
- **Epic Games Store** — `14ce1acff0db4cf8bf59533318058c7c`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_DATA` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_DOCS` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `hellisus-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `hellisus-logicmods` | high | `{gamePath}/HellIsUs/Content/Paks/LogicMods` |
| UE4SS | `hellisus-ue4ss` | high | `{gamePath}/HellIsUs/Binaries/Win64` |
| UE4SS Script Mod | `hellisus-scripts` | high | `{gamePath}/HellIsUs/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `hellisus-ue4ssdll` | high | `{gamePath}/HellIsUs/Binaries/Win64/ue4ss/Mods` |
| Paks (no ~mods) | `hellisus-pak` | low | `{gamePath}/HellIsUs/Content/Paks` |
| Root Game Folder | `hellisus-root` | high | `{gamePath}` |
| Content Folder | `hellisus-contentfolder` | high | `{gamePath}/HellIsUs` |
| Binaries (Engine Injector) | `hellisus-binaries` | high | `{gamePath}/HellIsUs/Binaries/Win64` |
| UE Sortable Pak Mod | `hellisus-uesortablepak` | 25 | `?` |
| Sig Bypass | `hellisus-sigbypass` | 60 | `?` |
| Config | `hellisus-config` | 45 | `?` |
| Saves | `hellisus-save` | 47 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `hellisus-ue4sscombo` | 25 |
| `hellisus-logicmods` | 27 |
| `hellisus-ue4ss` | 31 |
| `hellisus-sigbypass` | 32 |
| `hellisus-scripts` | 33 |
| `hellisus-ue4ssdll` | 35 |
| `hellisus-root` | 37 |
| `hellisus-contentfolder` | 38 |
| `hellisus-config` | 39 |
| `hellisus-save` | 41 |
| `hellisus-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`HellIsUs.exe`)

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

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

