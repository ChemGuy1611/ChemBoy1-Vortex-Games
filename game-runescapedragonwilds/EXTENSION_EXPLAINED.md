# RuneScape: Dragonwilds — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | RuneScape: Dragonwilds Vortex Extension |
| Engine / Structure | UE5 |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `runescapedragonwilds` |
| Executable | `RSDragonwilds.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1273](https://www.nexusmods.com/site/mods/1273) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/RuneScape%3A_Dragonwilds](https://www.pcgamingwiki.com/wiki/RuneScape%3A_Dragonwilds) |

## Supported Stores

- **Steam** — `1374490`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `CHECK_DATA` | `false` | true if game, staging, and save folders are all on the same drive (partition check) |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `runescapedragonwilds-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `runescapedragonwilds-logicmods` | high | `{gamePath}/RSDragonwilds/Content/Paks/LogicMods` |
| UE4SS | `runescapedragonwilds-ue4ss` | high | `{gamePath}/RSDragonwilds/Binaries/Win64` |
| UE4SS Script Mod | `runescapedragonwilds-scripts` | high | `{gamePath}/RSDragonwilds/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `runescapedragonwilds-ue4ssdll` | high | `{gamePath}/RSDragonwilds/Binaries/Win64/ue4ss/Mods` |
| Paks (no ~mods) | `runescapedragonwilds-pak` | low | `{gamePath}/RSDragonwilds/Content/Paks` |
| Root Game Folder | `runescapedragonwilds-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `runescapedragonwilds-binaries` | high | `{gamePath}/RSDragonwilds/Binaries/Win64` |
| UE5 Sortable Mod | `runescapedragonwilds-ue5-sortable-modtype` | 25 | `?` |
| Legacy UE - REINSTALL TO SORT | `ue5-sortable-modtype` | 65 | `?` |
| Config (Documents) | `runescapedragonwilds-config` | 45 | `?` |
| Saves (Documents) | `runescapedragonwilds-save` | 47 | `?` |
| Save Characters | `runescapedragonwilds-savecharacters` | 49 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `runescapedragonwilds-ue4sscombo` | 25 |
| `runescapedragonwilds-logicmods` | 27 |
| `runescapedragonwilds-ue4ss` | 31 |
| `runescapedragonwilds-scripts` | 33 |
| `runescapedragonwilds-ue4ssdll` | 35 |
| `runescapedragonwilds-root` | 37 |
| `runescapedragonwilds-config` | 39 |
| `runescapedragonwilds-save` | 41 |
| `runescapedragonwilds-savecharacters` | 43 |
| `runescapedragonwilds-binaries` | 45 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`RSDragonwilds.exe`)

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

