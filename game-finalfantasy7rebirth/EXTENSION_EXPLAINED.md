# Final Fantasy VII Rebirth — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Final Fantasy VII Rebirth Vortex Extension |
| Engine / Structure | UE4 with IO Store |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `finalfantasy7rebirth` |
| Executable | `ff7rebirth.exe` |

## Supported Stores

- **Steam** — `2909400`
- **Epic Games Store** — `33e6ac38b5a14098b079fd62d71aabc6`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `CHECK_DOCS` | `false` |  |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| MODLOADERMOD_NAME | `MODLOADERMOD_ID` | high | `{gamePath}/MODLOADERMOD_PATH` |
| UE4SSCOMBO_NAME | `UE4SSCOMBO_ID` | high | `{gamePath}` |
| LOGICMODS_NAME | `LOGICMODS_ID` | high | `{gamePath}/LOGICMODS_PATH` |
| UE4SS_NAME | `UE4SS_ID` | high | `{gamePath}/End/Binaries/Win64` |
| SCRIPTS_NAME | `SCRIPTS_ID` | high | `{gamePath}/SCRIPTS_PATH` |
| DLL_NAME | `DLL_ID` | high | `{gamePath}/DLL_PATH` |
| Paks (no ~mods) | `finalfantasy7rebirth-pak` | low | `{gamePath}/End/Content/Paks` |
| Root Folder | `finalfantasy7rebirth-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `finalfantasy7rebirth-binaries` | high | `{gamePath}/End/Binaries/Win64` |
| MODLOADER_NAME | `MODLOADER_ID` | low | `{gamePath}/MODLOADER_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `UE4SSCOMBO_ID` | 25 |
| `LOGICMODS_ID` | 26 |
| `MODLOADER_ID` | 27 |
| `MODLOADERMOD_ID` | 28 |
| `UE4SS_ID` | 31 |
| `SCRIPTS_ID` | 33 |
| `DLL_ID` | 35 |
| `finalfantasy7rebirth-root` | 37 |
| `finalfantasy7rebirth-config` | 39 |
| `finalfantasy7rebirth-save` | 41 |
| `finalfantasy7rebirth-binaries` | 43 |

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
- Open Saves Folder (Steam)
- Download UE4SS
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
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.

## How Mod Installation Works

```
User drops archive into Vortex
  └── Each installer's test() runs in priority order
       └── First supported=true wins
            └── install() returns copy instructions + setmodtype
                 └── Vortex stages files
                      └── User deploys
                           └── Vortex links/copies to game folder
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
