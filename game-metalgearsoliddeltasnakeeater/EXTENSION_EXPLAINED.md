# Metal Gear Solid Delta: Snake Eater — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Metal Gear Solid Delta: Snake Eater Vortex Extension |
| Engine / Structure | UE5 (static exe) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `metalgearsoliddeltasnakeeater` |
| Executable | `MGSDelta.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1411](https://www.nexusmods.com/site/mods/1411) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Metal_Gear_Solid_%CE%94%3A_Snake_Eater](https://www.pcgamingwiki.com/wiki/Metal_Gear_Solid_%CE%94%3A_Snake_Eater) |

## Supported Stores

- **Steam** — `2417610`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `CHECK_DATA` | `false` | true if game, staging, and save folders are all on the same drive (partition check) |
| `CHECK_DOCS` | `false` |  |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `metalgearsoliddeltasnakeeater-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `metalgearsoliddeltasnakeeater-logicmods` | high | `{gamePath}/MGSDelta/Content/Paks/LogicMods` |
| UE4SS | `metalgearsoliddeltasnakeeater-ue4ss` | high | `{gamePath}/MGSDelta/Binaries/Win64` |
| UE4SS Script Mod | `metalgearsoliddeltasnakeeater-scripts` | high | `{gamePath}/MGSDelta/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `metalgearsoliddeltasnakeeater-ue4ssdll` | high | `{gamePath}/MGSDelta/Binaries/Win64/ue4ss/Mods` |
| Paks (no ~mods) | `metalgearsoliddeltasnakeeater-pak` | low | `{gamePath}/MGSDelta/Content/Paks` |
| Root Game Folder | `metalgearsoliddeltasnakeeater-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `metalgearsoliddeltasnakeeater-binaries` | high | `{gamePath}/MGSDelta/Binaries/Win64` |
| UE Sortable Pak Mod | `metalgearsoliddeltasnakeeater-uesortablepak` | 25 | `?` |
| Config | `metalgearsoliddeltasnakeeater-config` | 45 | `?` |
| Saves | `metalgearsoliddeltasnakeeater-save` | 47 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 35 |
| `metalgearsoliddeltasnakeeater-ue4sscombo` | 25 |
| `metalgearsoliddeltasnakeeater-logicmods` | 27 |
| `metalgearsoliddeltasnakeeater-ue4ss` | 29 |
| `metalgearsoliddeltasnakeeater-scripts` | 31 |
| `metalgearsoliddeltasnakeeater-ue4ssdll` | 33 |
| `metalgearsoliddeltasnakeeater-root` | 37 |
| `metalgearsoliddeltasnakeeater-config` | 39 |
| `metalgearsoliddeltasnakeeater-save` | 41 |
| `metalgearsoliddeltasnakeeater-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`MGSDelta.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
- Open Config Folder
- Open Saves Folder
- Download UE4SS (GitHub)
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

