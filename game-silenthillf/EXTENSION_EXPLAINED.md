# Silent Hill f — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Silent Hill f Vortex Extension |
| Engine / Structure | UE5 (static exe) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `silenthillf` |
| Executable | `SHf.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1458](https://www.nexusmods.com/site/mods/1458) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Silent_Hill_f](https://www.pcgamingwiki.com/wiki/Silent_Hill_f) |

## Supported Stores

- **Steam** — `2947440`
- **Epic Games Store** — `dc2af50022074452a20293a88da9940f`

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
| UE4SS Script-LogicMod Combo | `silenthillf-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `silenthillf-logicmods` | high | `{gamePath}/SHf/Content/Paks/LogicMods` |
| UE4SS | `silenthillf-ue4ss` | high | `{gamePath}/SHf/Binaries/Win64` |
| UE4SS Script Mod | `silenthillf-scripts` | high | `{gamePath}/SHf/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `silenthillf-ue4ssdll` | high | `{gamePath}/SHf/Binaries/Win64/ue4ss/Mods` |
| Paks (no ~mods) | `silenthillf-pak` | low | `{gamePath}/SHf/Content/Paks` |
| Root Game Folder | `silenthillf-root` | high | `{gamePath}` |
| Content Folder | `silenthillf-contentfolder` | high | `{gamePath}/SHf` |
| Binaries (Engine Injector) | `silenthillf-binaries` | high | `{gamePath}/SHf/Binaries/Win64` |
| UE Sortable Pak Mod | `silenthillf-uesortablepak` | 25 | `?` |
| Config | `silenthillf-config` | 45 | `?` |
| Saves | `silenthillf-save` | 47 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `silenthillf-ue4sscombo` | 25 |
| `silenthillf-logicmods` | 27 |
| `silenthillf-ue4ss` | 31 |
| `silenthillf-scripts` | 33 |
| `silenthillf-ue4ssdll` | 35 |
| `silenthillf-root` | 37 |
| `silenthillf-contentfolder` | 38 |
| `silenthillf-config` | 39 |
| `silenthillf-save` | 41 |
| `silenthillf-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`SHf.exe`)

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

