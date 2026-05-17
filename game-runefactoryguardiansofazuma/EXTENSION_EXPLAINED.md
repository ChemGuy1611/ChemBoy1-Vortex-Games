# Rune Factory: Guardians of Azuma — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Rune Factory: Guardians of Azuma Vortex Extension |
| Engine / Structure | UE5 (static exe) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `runefactoryguardiansofazuma` |
| Executable | `Game.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1431](https://www.nexusmods.com/site/mods/1431) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Rune_Factory%3A_Guardians_of_Azuma](https://www.pcgamingwiki.com/wiki/Rune_Factory%3A_Guardians_of_Azuma) |

## Supported Stores

- **Steam** — `2864560`

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
| UE4SS Script-LogicMod Combo | `runefactoryguardiansofazuma-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `runefactoryguardiansofazuma-logicmods` | high | `{gamePath}/Game/Content/Paks/LogicMods` |
| UE4SS | `runefactoryguardiansofazuma-ue4ss` | high | `{gamePath}/Game/Binaries/Win64` |
| UE4SS Script Mod | `runefactoryguardiansofazuma-scripts` | high | `{gamePath}/Game/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `runefactoryguardiansofazuma-ue4ssdll` | high | `{gamePath}/Game/Binaries/Win64/ue4ss/Mods` |
| Paks (no ~mods) | `runefactoryguardiansofazuma-pak` | low | `{gamePath}/Game/Content/Paks` |
| Root Game Folder | `runefactoryguardiansofazuma-root` | high | `{gamePath}` |
| Content Folder | `runefactoryguardiansofazuma-contentfolder` | high | `{gamePath}/Game` |
| Binaries (Engine Injector) | `runefactoryguardiansofazuma-binaries` | high | `{gamePath}/Game/Binaries/Win64` |
| UE Sortable Pak Mod | `runefactoryguardiansofazuma-uesortablepak` | 25 | `?` |
| Config | `runefactoryguardiansofazuma-config` | 45 | `?` |
| Saves | `runefactoryguardiansofazuma-save` | 47 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `runefactoryguardiansofazuma-ue4sscombo` | 25 |
| `runefactoryguardiansofazuma-logicmods` | 27 |
| `runefactoryguardiansofazuma-ue4ss` | 31 |
| `runefactoryguardiansofazuma-scripts` | 33 |
| `runefactoryguardiansofazuma-ue4ssdll` | 35 |
| `runefactoryguardiansofazuma-root` | 37 |
| `runefactoryguardiansofazuma-contentfolder` | 38 |
| `runefactoryguardiansofazuma-config` | 39 |
| `runefactoryguardiansofazuma-save` | 41 |
| `runefactoryguardiansofazuma-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Game.exe`)

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

