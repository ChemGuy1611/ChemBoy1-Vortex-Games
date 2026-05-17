# RV There Yet? — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | RV There Yet? Vortex Extension |
| Engine / Structure | UE5 (static exe) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `rvthereyet` |
| Executable | `Ride.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1509](https://www.nexusmods.com/site/mods/1509) |
| PCGamingWiki | [XXX](XXX) |

## Supported Stores

- **Steam** — `3949040`

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
| UE4SS Script-LogicMod Combo | `rvthereyet-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `rvthereyet-logicmods` | high | `{gamePath}/Ride/Content/Paks/LogicMods` |
| UE4SS | `rvthereyet-ue4ss` | high | `{gamePath}/Ride/Binaries/Win64` |
| UE4SS Script Mod | `rvthereyet-scripts` | high | `{gamePath}/Ride/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `rvthereyet-ue4ssdll` | high | `{gamePath}/Ride/Binaries/Win64/ue4ss/Mods` |
| Paks (no ~mods) | `rvthereyet-pakalt` | low | `{gamePath}/Ride/Content/Paks` |
| Root Game Folder | `rvthereyet-root` | high | `{gamePath}` |
| Content Folder | `rvthereyet-contentfolder` | high | `{gamePath}/Ride` |
| Binaries (Engine Injector) | `rvthereyet-binaries` | high | `{gamePath}/Ride/Binaries/Win64` |
| UE Sortable Pak Mod | `rvthereyet-uesortablepak` | 25 | `?` |
| Config | `rvthereyet-config` | 45 | `?` |
| Saves | `rvthereyet-save` | 47 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `rvthereyet-ue4sscombo` | 25 |
| `rvthereyet-logicmods` | 27 |
| `rvthereyet-ue4ss` | 31 |
| `rvthereyet-scripts` | 33 |
| `rvthereyet-ue4ssdll` | 35 |
| `rvthereyet-root` | 37 |
| `rvthereyet-contentfolder` | 38 |
| `rvthereyet-config` | 39 |
| `rvthereyet-save` | 41 |
| `rvthereyet-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Ride.exe`)
- **Demo Launch** (`EXEC_DEMO`)

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

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

