# Metal Gear Solid Delta: Snake Eater — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Metal Gear Solid Delta: Snake Eater Vortex Extension |
| Engine / Structure | UE5 (static exe) |
| Author | ChemBoy1 |
| Version | 0.1.0 |
| Date | 2025-08-26 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `metalgearsoliddeltasnakeeater` |
| Executable | `MGSDelta.exe` |

## Supported Stores

- **Steam** — `2417610`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `CHECK_DATA` | `false` |  |
| `CHECK_DOCS` | `false` |  |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| UE4SSCOMBO_NAME | `UE4SSCOMBO_ID` | high | `{gamePath}` |
| LOGICMODS_NAME | `LOGICMODS_ID` | high | `{gamePath}/LOGICMODS_PATH` |
| UE4SS_NAME | `UE4SS_ID` | high | `{gamePath}/MGSDelta/Binaries/Win64` |
| SCRIPTS_NAME | `SCRIPTS_ID` | high | `{gamePath}/SCRIPTS_PATH` |
| DLL_NAME | `DLL_ID` | high | `{gamePath}/DLL_PATH` |
| Paks (no ~mods) | `metalgearsoliddeltasnakeeater-pak` | low | `{gamePath}/MGSDelta/Content/Paks` |
| Root Game Folder | `metalgearsoliddeltasnakeeater-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `metalgearsoliddeltasnakeeater-binaries` | high | `{gamePath}/MGSDelta/Binaries/Win64` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `ue5-pak-installer` | 35 |
| `UE4SSCOMBO_ID` | 25 |
| `LOGICMODS_ID` | 27 |
| `UE4SS_ID` | 29 |
| `SCRIPTS_ID` | 31 |
| `DLL_ID` | 33 |
| `metalgearsoliddeltasnakeeater-root` | 37 |
| `metalgearsoliddeltasnakeeater-config` | 39 |
| `metalgearsoliddeltasnakeeater-save` | 41 |
| `metalgearsoliddeltasnakeeater-binaries` | 49 |

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
- View Changelog
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| UE4SS | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
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
