# Avowed — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Avowed Vortex Extension |
| Engine / Structure | UE5 (Xbox-Integrated) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `avowed` |
| Executable | `Avowed.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/965](https://www.nexusmods.com/site/mods/965) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Avowed](https://www.pcgamingwiki.com/wiki/Avowed) |

## Supported Stores

- **Steam** — `2457220`
- **Xbox / Microsoft Store** — `Microsoft.Avowed`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS LogicMods (Blueprint) | `avowed-logicmods` | high | `{gamePath}/Alabama/Content/Paks/LogicMods` |
| UE4SS Script-LogicMod Combo | `avowed-ue4sscombo` | high | `{gamePath}` |
| Root Game Folder | `avowed-root` | high | `{gamePath}` |
| UE5 Paks | `avowed-ue5` | high | `{gamePath}/Alabama/Content/Paks/~mods` |
| UE5 Paks (no "~mods") | `avowed-pakalt` | high | `{gamePath}/Alabama/Content/Paks` |
| UE5 Sortable Mod | `avowed-ue5-sortable-modtype` | 25 | `?` |
| Legacy UE - REINSTALL TO SORT | `ue5-sortable-modtype` | 65 | `?` |
| UE4SS Scripts | `avowed-scripts` | 40 | `?` |
| UE4SS DLL Mod | `avowed-ue4ssdll` | 42 | `?` |
| Binaries (Engine Injector) | `avowed-binaries` | 65 | `?` |
| UE4SS | `avowed-ue4ss` | 70 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 35 |
| `avowed-ue4ss-logicscriptcombo` | 25 |
| `avowed-ue4ss-logicmod` | 30 |
| `avowed-ue4ss` | 40 |
| `avowed-ue4ss-scripts` | 43 |
| `avowed-ue4ssdll` | 45 |
| `avowed-root` | 47 |
| `avowed-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Avowed.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download UE4SS
- Open Paks Folder
- Open Binaries Folder
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

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

