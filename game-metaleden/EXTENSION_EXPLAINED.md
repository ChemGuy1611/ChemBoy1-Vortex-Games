# METAL EDEN — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | METAL EDEN Vortex Extension |
| Engine / Structure | UE5 (static exe) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `metaleden` |
| Executable | `MetalEden.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1425](https://www.nexusmods.com/site/mods/1425) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Metal_Eden](https://www.pcgamingwiki.com/wiki/Metal_Eden) |

## Supported Stores

- **Steam** — `990380`
- **GOG** — `1253025084`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `SIGBYPASS_REQUIRED` | `true` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_DATA` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_DOCS` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `metaleden-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `metaleden-logicmods` | high | `{gamePath}/MetalEden/Content/Paks/LogicMods` |
| UE4SS | `metaleden-ue4ss` | high | `{gamePath}/MetalEden/Binaries/Win64` |
| UE4SS Script Mod | `metaleden-scripts` | high | `{gamePath}/MetalEden/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `metaleden-ue4ssdll` | high | `{gamePath}/MetalEden/Binaries/Win64/ue4ss/Mods` |
| Paks (no ~mods) | `metaleden-pak` | low | `{gamePath}/MetalEden/Content/Paks` |
| Root Game Folder | `metaleden-root` | high | `{gamePath}` |
| Content Folder | `metaleden-contentfolder` | high | `{gamePath}/MetalEden` |
| Binaries (Engine Injector) | `metaleden-binaries` | high | `{gamePath}/MetalEden/Binaries/Win64` |
| UE Sortable Pak Mod | `metaleden-uesortablepak` | 25 | `?` |
| Sig Bypass | `metaleden-sigbypass` | 60 | `?` |
| Config | `metaleden-config` | 45 | `?` |
| Saves | `metaleden-save` | 47 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `metaleden-ue4sscombo` | 25 |
| `metaleden-logicmods` | 27 |
| `metaleden-ue4ss` | 31 |
| `metaleden-sigbypass` | 32 |
| `metaleden-scripts` | 33 |
| `metaleden-ue4ssdll` | 35 |
| `metaleden-root` | 37 |
| `metaleden-contentfolder` | 38 |
| `metaleden-config` | 39 |
| `metaleden-save` | 41 |
| `metaleden-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`MetalEden.exe`)

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
- **Signature Bypass** — .sig file bypass is required for pak mods.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

