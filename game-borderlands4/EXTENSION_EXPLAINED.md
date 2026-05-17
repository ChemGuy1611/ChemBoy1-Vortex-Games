# Borderlands 4 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Borderlands 4 Vortex Extension |
| Engine / Structure | UE5 (static exe) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `borderlands4` |
| Executable | `Borderlands4.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1428](https://www.nexusmods.com/site/mods/1428) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Borderlands_4](https://www.pcgamingwiki.com/wiki/Borderlands_4) |

## Supported Stores

- **Steam** — `1285190`
- **Epic Games Store** — `ea5f9a88243c48908d0205c245fddea0`

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
| UE4SS Script-LogicMod Combo | `borderlands4-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `borderlands4-logicmods` | high | `{gamePath}/OakGame/Content/Paks/LogicMods` |
| UE4SS | `borderlands4-ue4ss` | high | `{gamePath}/OakGame/Binaries/Win64` |
| UE4SS Script Mod | `borderlands4-scripts` | high | `{gamePath}/OakGame/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `borderlands4-ue4ssdll` | high | `{gamePath}/OakGame/Binaries/Win64/ue4ss/Mods` |
| Python SDK | `borderlands4-pysdk` | high | `{gamePath}/.` |
| SDK Mod | `borderlands4-pysdkmod` | high | `{gamePath}/sdk_mods` |
| Paks (no ~mods) | `borderlands4-pak` | low | `{gamePath}/OakGame/Content/Paks` |
| Root Game Folder | `borderlands4-root` | high | `{gamePath}` |
| Content Folder | `borderlands4-contentfolder` | high | `{gamePath}/OakGame` |
| Binaries (Engine Injector) | `borderlands4-binaries` | high | `{gamePath}/OakGame/Binaries/Win64` |
| UE Sortable Pak Mod | `borderlands4-uesortablepak` | 25 | `?` |
| Config | `borderlands4-config` | 45 | `?` |
| Saves | `borderlands4-save` | 47 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `borderlands4-ue4sscombo` | 25 |
| `borderlands4-pysdk` | 26 |
| `borderlands4-pysdkmod` | 27 |
| `borderlands4-logicmods` | 28 |
| `borderlands4-ue4ss` | 31 |
| `borderlands4-scripts` | 33 |
| `borderlands4-ue4ssdll` | 35 |
| `borderlands4-root` | 37 |
| `borderlands4-contentfolder` | 38 |
| `borderlands4-config` | 39 |
| `borderlands4-save` | 41 |
| `borderlands4-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Borderlands4.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download ${SDK_NAME} Latest
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

