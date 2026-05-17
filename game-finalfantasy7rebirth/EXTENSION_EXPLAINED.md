# Final Fantasy VII Rebirth — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Final Fantasy VII Rebirth Vortex Extension |
| Engine / Structure | UE4 with IO Store |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `finalfantasy7rebirth` |
| Executable | `ff7rebirth.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1150](https://www.nexusmods.com/site/mods/1150) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Final_Fantasy_VII_Rebirth](https://www.pcgamingwiki.com/wiki/Final_Fantasy_VII_Rebirth) |

## Supported Stores

- **Steam** — `2909400`
- **Epic Games Store** — `33e6ac38b5a14098b079fd62d71aabc6`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `CHECK_DOCS` | `false` |  |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| FF7RML Mod | `finalfantasy7rebirth-modloadermod` | high | `{gamePath}/End/Mods` |
| UE4SS Script-LogicMod Combo | `finalfantasy7rebirth-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `finalfantasy7rebirth-logicmods` | high | `{gamePath}/End/Content/Paks/LogicMods` |
| UE4SS | `finalfantasy7rebirth-ue4ss` | high | `{gamePath}/End/Binaries/Win64` |
| UE4SS Script Mod | `finalfantasy7rebirth-scripts` | high | `{gamePath}/End/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `finalfantasy7rebirth-ue4ssdll` | high | `{gamePath}/End/Binaries/Win64/ue4ss/Mods` |
| Paks (no ~mods) | `finalfantasy7rebirth-pak` | low | `{gamePath}/End/Content/Paks` |
| Root Folder | `finalfantasy7rebirth-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `finalfantasy7rebirth-binaries` | high | `{gamePath}/End/Binaries/Win64` |
| FF7R Mod Loader | `finalfantasy7rebirth-modloader` | low | `{gamePath}/End/Mods` |
| UE5 Sortable Mod | `finalfantasy7rebirth-ue5-sortable-modtype` | 25 | `?` |
| Legacy UE - REINSTALL TO SORT | `ue5-sortable-modtype` | 65 | `?` |
| Config (Documents) | `finalfantasy7rebirth-config` | 45 | `?` |
| Saves (Documents) | `finalfantasy7rebirth-save` | 47 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `finalfantasy7rebirth-ue4sscombo` | 25 |
| `finalfantasy7rebirth-logicmods` | 26 |
| `finalfantasy7rebirth-modloader` | 27 |
| `finalfantasy7rebirth-modloadermod` | 28 |
| `finalfantasy7rebirth-ue4ss` | 31 |
| `finalfantasy7rebirth-scripts` | 33 |
| `finalfantasy7rebirth-ue4ssdll` | 35 |
| `finalfantasy7rebirth-root` | 37 |
| `finalfantasy7rebirth-config` | 39 |
| `finalfantasy7rebirth-save` | 41 |
| `finalfantasy7rebirth-binaries` | 43 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`ff7rebirth.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
- Open Config Folder
- Open Saves Folder (Steam)
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

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.

