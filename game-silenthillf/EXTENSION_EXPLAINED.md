# Silent Hill f — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Silent Hill f Vortex Extension |
| Engine / Structure | UE5 (static exe) |
| Author | ChemBoy1 |
| Version | 0.1.0 |
| Date | 2025-09-23 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `silenthillf` |
| Executable | `SHf.exe` |

## Supported Stores

- **Steam** — `2947440`
- **Epic Games Store** — `dc2af50022074452a20293a88da9940f`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` |  |
| `CHECK_DATA` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_DOCS` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| UE4SSCOMBO_NAME | `UE4SSCOMBO_ID` | high | `{gamePath}` |
| LOGICMODS_NAME | `LOGICMODS_ID` | high | `{gamePath}/LOGICMODS_PATH` |
| UE4SS_NAME | `UE4SS_ID` | high | `{gamePath}/SHf/Binaries/Win64` |
| SCRIPTS_NAME | `SCRIPTS_ID` | high | `{gamePath}/SCRIPTS_PATH` |
| DLL_NAME | `DLL_ID` | high | `{gamePath}/DLL_PATH` |
| Paks (no ~mods) | `silenthillf-pak` | low | `{gamePath}/SHf/Content/Paks` |
| Root Game Folder | `silenthillf-root` | high | `{gamePath}` |
| Content Folder | `silenthillf-contentfolder` | high | `{gamePath}/SHf` |
| Binaries (Engine Injector) | `silenthillf-binaries` | high | `{gamePath}/SHf/Binaries/Win64` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `UE4SSCOMBO_ID` | 25 |
| `LOGICMODS_ID` | 27 |
| `UE4SS_ID` | 31 |
| `SIGBYPASS_ID` | 32 |
| `SCRIPTS_ID` | 33 |
| `DLL_ID` | 35 |
| `silenthillf-root` | 37 |
| `silenthillf-contentfolder` | 38 |
| `silenthillf-config` | 39 |
| `silenthillf-save` | 41 |
| `silenthillf-binaries` | 49 |

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
- Download UE4SS
- View Changelog
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
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
