# inZOI — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | inZOI Vortex Extension |
| Engine / Structure | UE5 |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `inzoi` |
| Executable | `inZOI.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1241](https://www.nexusmods.com/site/mods/1241) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/InZOI](https://www.pcgamingwiki.com/wiki/InZOI) |

## Supported Stores

- **Steam** — `2456740`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `CHECK_CONFIG` | `false` |  |
| `CHECK_DOCS` | `false` |  |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE5 MODKit Pak Mod | `inzoi-ue5modkitpak` | high | `DOCUMENTS/inZOI/Mods` |
| Save | `inzoi-save` | high | `DOCUMENTS/inZOI/SaveGames/USERID_FOLDER` |
| Creations (Documents) | `inzoi-creations` | high | `DOCUMENTS/inZOI` |
| AIGenerated (Documents) | `inzoi-aigenerated` | high | `DOCUMENTS/inZOI` |
| Canvas (Documents) | `inzoi-canvas` | high | `DOCUMENTS/inZOI` |
| My3DPrinter (Documents) | `inzoi-my3dprinter` | high | `DOCUMENTS/inZOI/AIGenerated/My3DPrinter` |
| MyAppearances (Documents) | `inzoi-myappearances` | high | `DOCUMENTS/inZOI/Creations/MyAppearances` |
| Animations (Documents) | `inzoi-animations` | high | `DOCUMENTS/inZOI/AIGenerated/MyAIMotions` |
| Textures (Documents) | `inzoi-textures` | high | `DOCUMENTS/inZOI/Creations/MyTextures` |
| UE5 Sortable Mod | `inzoi-ue5-sortable-modtype` | 25 | `?` |
| Legacy UE - REINSTALL TO SORT | `ue5-sortable-modtype` | 65 | `?` |
| inzoi-config | `inzoi-config` | 50 | `?` |
| UE4SS Script-LogicMod Combo | `inzoi-ue4sscombo` | 51 | `?` |
| UE4SS LogicMods (Blueprint) | `inzoi-logicmods` | 52 | `?` |
| UE4SS | `inzoi-ue4ss` | 53 | `?` |
| UE4SS Script Mod | `inzoi-scripts` | 54 | `?` |
| UE4SS DLL Mod | `inzoi-ue4ssdll` | 54 | `?` |
| Paks (no ~mods) | `inzoi-pak` | 55 | `?` |
| Mod Enabler | `inzoi-modenabler` | 56 | `?` |
| Root Game Folder | `inzoi-root` | 57 | `?` |
| Binaries (Engine Injector) | `inzoi-binaries` | 58 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 28 |
| `inzoi-ue4sscombo` | 25 |
| `inzoi-logicmods` | 26 |
| `inzoi-ue5modkitpak` | 27 |
| `inzoi-ue4ss` | 29 |
| `inzoi-modenabler` | 30 |
| `inzoi-scripts` | 31 |
| `inzoi-ue4ssdll` | 32 |
| `inzoi-creations` | 33 |
| `inzoi-aigenerated` | 24 |
| `inzoi-canvas` | 35 |
| `inzoi-my3dprinter` | 36 |
| `inzoi-myappearances` | 37 |
| `inzoi-animations` | 38 |
| `inzoi-textures` | 39 |
| `inzoi-root` | 40 |
| `inzoi-config` | 41 |
| `inzoi-save` | 42 |
| `inzoi-binaries` | 43 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Mod Enabler (Legacy)
- Open MODKit Mods Folder (Documents)
- Open MODKit Folder (Epic)
- Open Legacy Pak Mods Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
- Open Config Folder (Local AppData)
- Open Saves Folder (Documents)
- Open inZOI Documents Folder
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
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

