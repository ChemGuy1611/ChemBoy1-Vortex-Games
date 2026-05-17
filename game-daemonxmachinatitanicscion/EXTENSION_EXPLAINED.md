# Daemon X Machina: Titanic Scion — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Daemon X Machina: Titanic Scion Vortex Extension |
| Engine / Structure | UE5 (static exe) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `daemonxmachinatitanicscion` |
| Executable | `Game.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1429](https://www.nexusmods.com/site/mods/1429) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Daemon_X_Machina%3A_Titanic_Scion](https://www.pcgamingwiki.com/wiki/Daemon_X_Machina%3A_Titanic_Scion) |

## Supported Stores

- **Steam** — `1342490`

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
| UE4SS Script-LogicMod Combo | `daemonxmachinatitanicscion-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `daemonxmachinatitanicscion-logicmods` | high | `{gamePath}/Game/Content/Paks/LogicMods` |
| UE4SS | `daemonxmachinatitanicscion-ue4ss` | high | `{gamePath}/Game/Binaries/Win64` |
| UE4SS Script Mod | `daemonxmachinatitanicscion-scripts` | high | `{gamePath}/Game/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `daemonxmachinatitanicscion-ue4ssdll` | high | `{gamePath}/Game/Binaries/Win64/ue4ss/Mods` |
| Paks (no ~mods) | `daemonxmachinatitanicscion-pak` | low | `{gamePath}/Game/Content/Paks` |
| Root Game Folder | `daemonxmachinatitanicscion-root` | high | `{gamePath}` |
| Content Folder | `daemonxmachinatitanicscion-contentfolder` | high | `{gamePath}/Game` |
| Binaries (Engine Injector) | `daemonxmachinatitanicscion-binaries` | high | `{gamePath}/Game/Binaries/Win64` |
| UE Sortable Pak Mod | `daemonxmachinatitanicscion-uesortablepak` | 25 | `?` |
| Config | `daemonxmachinatitanicscion-config` | 45 | `?` |
| Saves | `daemonxmachinatitanicscion-save` | 47 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `daemonxmachinatitanicscion-ue4sscombo` | 25 |
| `daemonxmachinatitanicscion-logicmods` | 27 |
| `daemonxmachinatitanicscion-ue4ss` | 31 |
| `daemonxmachinatitanicscion-scripts` | 33 |
| `daemonxmachinatitanicscion-ue4ssdll` | 35 |
| `daemonxmachinatitanicscion-root` | 37 |
| `daemonxmachinatitanicscion-contentfolder` | 38 |
| `daemonxmachinatitanicscion-config` | 39 |
| `daemonxmachinatitanicscion-save` | 41 |
| `daemonxmachinatitanicscion-binaries` | 49 |

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

