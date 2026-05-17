# Until Dawn — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Until Dawn Vortex Extension |
| Engine / Structure | UE5 |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `untildawn` |
| Executable | `Windows/Bates.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1049](https://www.nexusmods.com/site/mods/1049) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Until_Dawn](https://www.pcgamingwiki.com/wiki/Until_Dawn) |

## Supported Stores

- **Steam** — `2172010`
- **Epic Games Store** — `05153d489e6843a1b5b53363280cb141`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Scripts | `untildawn-scripts` | high | `{gamePath}/Windows/Bates/Binaries/Win64/ue4ss/Mods` |
| UE4SS LogicMods (Blueprint) | `untildawn-logicmods` | high | `{gamePath}/Windows/Bates/Content/Paks/LogicMods` |
| UE4SS Script-LogicMod Combo | `untildawn-ue4sscombo` | high | `{gamePath}/Windows` |
| Config (My Games) | `untildawn-config` | high | `DOCS_PATH/My Games/Bates/Saved/Config/Windows` |
| Saves (My Games) | `untildawn-save` | high | `DOCS_PATH/My Games/Bates/Saved/SaveGames/USERID_FOLDER/USERID_FOLDER` |
| Root Game Folder | `untildawn-root` | high | `{gamePath}/Windows` |
| UE5 Paks | `untildawn-ue5` | high | `{gamePath}/Windows/Bates/Content/Paks/~mods` |
| UE5 Paks (no "~mods") | `untildawn-pakalt` | high | `{gamePath}/Windows/Bates/Content/Paks` |
| Binaries (Engine Injector) | `untildawn-binaries` | high | `{gamePath}/Windows/Bates/Binaries/Win64` |
| UE4SS | `untildawn-ue4ss` | low | `{gamePath}/Windows/Bates/Binaries/Win64` |
| UE5 Sortable Mod | `untildawn-ue5-sortable-modtype` | 25 | `?` |
| Legacy UE - REINSTALL TO SORT | `ue5-sortable-modtype` | 65 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 35 |
| `untildawn-ue4ss-logicscriptcombo` | 25 |
| `untildawn-ue4ss-logicmod` | 30 |
| `untildawn-ue4ss` | 40 |
| `untildawn-ue4ss-scripts` | 45 |
| `untildawn-root` | 50 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game** (`Windows/Bates.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.

