# Titan Quest 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Titan Quest 2 Vortex Extension |
| Engine / Structure | UE5 (static exe) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `titanquest2` |
| Executable | `TQ2.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1430](https://www.nexusmods.com/site/mods/1430) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Titan_Quest_II](https://www.pcgamingwiki.com/wiki/Titan_Quest_II) |

## Supported Stores

- **Steam** — `1154030`
- **Epic Games Store** — `84f9595192cb492dbf122e014a6b33f4`

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
| UE4SS Script-LogicMod Combo | `titanquest2-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `titanquest2-logicmods` | high | `{gamePath}/TQ2/Content/Paks/LogicMods` |
| UE4SS | `titanquest2-ue4ss` | high | `{gamePath}/TQ2/Binaries/Win64` |
| UE4SS Script Mod | `titanquest2-scripts` | high | `{gamePath}/TQ2/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `titanquest2-ue4ssdll` | high | `{gamePath}/TQ2/Binaries/Win64/ue4ss/Mods` |
| Paks (no ~mods) | `titanquest2-pak` | low | `{gamePath}/TQ2/Content/Paks` |
| Root Game Folder | `titanquest2-root` | high | `{gamePath}` |
| Content Folder | `titanquest2-contentfolder` | high | `{gamePath}/TQ2` |
| Binaries (Engine Injector) | `titanquest2-binaries` | high | `{gamePath}/TQ2/Binaries/Win64` |
| UE Sortable Pak Mod | `titanquest2-uesortablepak` | 25 | `?` |
| Config | `titanquest2-config` | 45 | `?` |
| Saves | `titanquest2-save` | 47 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `titanquest2-ue4sscombo` | 25 |
| `titanquest2-logicmods` | 27 |
| `titanquest2-ue4ss` | 31 |
| `titanquest2-scripts` | 33 |
| `titanquest2-ue4ssdll` | 35 |
| `titanquest2-root` | 37 |
| `titanquest2-contentfolder` | 38 |
| `titanquest2-config` | 39 |
| `titanquest2-save` | 41 |
| `titanquest2-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`TQ2.exe`)

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

