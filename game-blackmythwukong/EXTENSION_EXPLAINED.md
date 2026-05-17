# Black Myth: Wukong — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Black Myth Wukong Vortex Extension |
| Engine / Structure | UE5 |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `blackmythwukong` |
| Executable | `b1.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/957](https://www.nexusmods.com/site/mods/957) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Black_Myth:_Wukong](https://www.pcgamingwiki.com/wiki/Black_Myth:_Wukong) |

## Supported Stores

- **Steam** — `2358720`
- **Epic Games Store** — `f53c5471fd0e47619e72b6d21a527abe`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |
| `CHECK_CONFIG` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Scripts | `blackmythwukong-scripts` | high | `{gamePath}/b1/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `blackmythwukong-ue4ssdll` | high | `{gamePath}/b1/Binaries/Win64/ue4ss/Mods` |
| UE4SS LogicMods (Blueprint) | `blackmythwukong-logicmods` | high | `{gamePath}/b1/Content/Paks/LogicMods` |
| UE4SS Script-LogicMod Combo | `blackmythwukong-ue4sscombo` | high | `{gamePath}` |
| Root Game Folder | `blackmythwukong-root` | high | `{gamePath}` |
| UE5 Paks | `blackmythwukong-ue5` | high | `{gamePath}/b1/Content/Paks/~mods` |
| UE5 Paks (no "~mods") | `blackmythwukong-pakalt` | high | `{gamePath}/b1/Content/Paks` |
| Binaries (Engine Injector) | `blackmythwukong-binaries` | high | `{gamePath}/b1/Binaries/Win64` |
| UE4SS | `blackmythwukong-ue4ss` | low | `{gamePath}/b1/Binaries/Win64` |
| Signature Bypass | `blackmythwukong-sigbypass` | low | `{gamePath}/b1/Binaries/Win64` |
| UE5 Sortable Mod | `blackmythwukong-ue5-sortable-modtype` | 25 | `?` |
| Legacy UE - REINSTALL TO SORT | `ue5-sortable-modtype` | 65 | `?` |
| Config (Local AppData) | `blackmythwukong-config` | 62 | `?` |
| Saves (Game Directory) | `blackmythwukong-save` | 60 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 35 |
| `blackmythwukong-ue4ss-logicscriptcombo` | 25 |
| `blackmythwukong-ue4ss-logicmod` | 30 |
| `blackmythwukong-ue4ss` | 40 |
| `blackmythwukong-sigbypass` | 45 |
| `blackmythwukong-ue4ss-scripts` | 50 |
| `blackmythwukong-ue4ssdll` | 53 |
| `blackmythwukong-root` | 55 |
| `blackmythwukong-config` | 60 |
| `blackmythwukong-save` | 65 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game** (`b1.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
- Open Config Folder
- Open Saves Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Save | `b1/Saved/SaveGames` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.

