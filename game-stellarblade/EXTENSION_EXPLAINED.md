# Stellar Blade — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Stellar Blade Vortex Extension |
| Engine / Structure | UE5 (static exe) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `stellarblade` |
| Executable | `SB.exe` |

## Supported Stores

- **Steam** — `3489700`
- **Epic Games Store** — `4013d48a20c1403282fc9d1453ec8f5a`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `CHECK_DATA` | `false` | true if game, staging, and save folders are all on the same drive (partition check) |
| `CHECK_DOCS` | `false` |  |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `isPak` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SSCOMBO_NAME | `UE4SSCOMBO_ID` | high | `{gamePath}` |
| LOGICMODS_NAME | `LOGICMODS_ID` | high | `{gamePath}/LOGICMODS_PATH` |
| UE4SS_NAME | `UE4SS_ID` | high | `{gamePath}/SB/Binaries/Win64` |
| SCRIPTS_NAME | `SCRIPTS_ID` | high | `{gamePath}/SCRIPTS_PATH` |
| DLL_NAME | `DLL_ID` | high | `{gamePath}/DLL_PATH` |
| Paks (no ~mods) | `stellarblade-pak` | low | `{gamePath}/SB/Content/Paks` |
| Root Game Folder | `stellarblade-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `stellarblade-binaries` | high | `{gamePath}/SB/Binaries/Win64` |
| MOVIE_NAME | `MOVIE_ID` | high | `{gamePath}/MOVIE_PATH` |
| MENU_NAME | `MENU_ID` | high | `{gamePath}/MENU_PATH` |
| SPLASH_NAME | `SPLASH_ID` | high | `{gamePath}/SPLASH_PATH` |
| CNSJSON_NAME | `CNSJSON_ID` | high | `{gamePath}/CNSJSON_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 35 |
| `UE4SSCOMBO_ID` | 25 |
| `LOGICMODS_ID` | 27 |
| `UE4SS_ID` | 29 |
| `SCRIPTS_ID` | 31 |
| `DLL_ID` | 33 |
| `stellarblade-root` | 37 |
| `stellarblade-config` | 39 |
| `stellarblade-save` | 41 |
| `MENU_ID` | 43 |
| `MOVIE_ID` | 45 |
| `SPLASH_ID` | 47 |
| `CNSJSON_ID` | 48 |
| `stellarblade-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
- Open Config Folder
- Open Saves Folder
- Download UE4SS (GitHub)
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

## How Mod Installation Works

```
User drops archive into Vortex
  └── Each installer's test() runs in priority order
       └── First supported=true wins
            └── install() returns copy instructions + setmodtype
                 └── Vortex stages files
                      └── User deploys
                           └── Vortex links/copies to game folder
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
