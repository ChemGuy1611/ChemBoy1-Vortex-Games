# Painkiller — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Painkiller Vortex Extension |
| Engine / Structure | UE5 (static exe) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `painkiller` |
| Executable | `Painkiller.exe` |
| Executable (GOG) | `Painkiller.exe` |
| Executable (Demo) | `Painkiller.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1505](https://www.nexusmods.com/site/mods/1505) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Painkiller](https://www.pcgamingwiki.com/wiki/Painkiller) |

## Supported Stores

- **Steam** — `2300120`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_DATA` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_DOCS` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `painkiller-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `painkiller-logicmods` | high | `{gamePath}/Painkiller/Content/Paks/LogicMods` |
| UE4SS | `painkiller-ue4ss` | high | `{gamePath}/Painkiller/Binaries/Win64` |
| UE4SS Script Mod | `painkiller-scripts` | high | `{gamePath}/Painkiller/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `painkiller-ue4ssdll` | high | `{gamePath}/Painkiller/Binaries/Win64/ue4ss/Mods` |
| Paks (no ~mods) | `painkiller-pakalt` | low | `{gamePath}/Painkiller/Content/Paks` |
| Root Game Folder | `painkiller-root` | high | `{gamePath}` |
| Content Folder | `painkiller-contentfolder` | high | `{gamePath}/Painkiller` |
| Binaries (Engine Injector) | `painkiller-binaries` | high | `{gamePath}/Painkiller/Binaries/Win64` |
| UE Sortable Pak Mod | `painkiller-uesortablepak` | 25 | `?` |
| Config | `painkiller-config` | 45 | `?` |
| Saves | `painkiller-save` | 47 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `painkiller-ue4sscombo` | 25 |
| `painkiller-logicmods` | 27 |
| `painkiller-ue4ss` | 31 |
| `painkiller-scripts` | 33 |
| `painkiller-ue4ssdll` | 35 |
| `painkiller-root` | 37 |
| `painkiller-contentfolder` | 38 |
| `painkiller-config` | 39 |
| `painkiller-save` | 41 |
| `painkiller-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Painkiller.exe`)
- **Demo Launch** (`Painkiller.exe`)

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
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

