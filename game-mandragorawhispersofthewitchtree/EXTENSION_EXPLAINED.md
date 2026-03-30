# Mandragora: Whispers of the Witch Tree — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Mandragora: Whispers of the Witch Tree Vortex Extension |
| Engine / Structure | UE + Sigbypass |
| Author | ChemBoy1 |
| Version | 0.1.0 |
| Date | 2025-04-28 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `mandragorawhispersofthewitchtree` |
| Executable | `man.exe` |

## Supported Stores

- **Steam** — `1721060`
- **Epic Games Store** — `ed2feac9c1de4248a6d297959d1da411`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `CHECK_DATA` | `false` |  |
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| UE4SSCOMBO_NAME | `UE4SSCOMBO_ID` | high | `{gamePath}` |
| LOGICMODS_NAME | `LOGICMODS_ID` | high | `{gamePath}/LOGICMODS_PATH` |
| UE4SS_NAME | `UE4SS_ID` | high | `{gamePath}/man/Binaries/Win64` |
| SCRIPTS_NAME | `SCRIPTS_ID` | high | `{gamePath}/SCRIPTS_PATH` |
| DLL_NAME | `DLL_ID` | high | `{gamePath}/DLL_PATH` |
| Paks (no ~mods) | `mandragorawhispersofthewitchtree-pak` | low | `{gamePath}/man/Content/Paks` |
| Root Game Folder | `mandragorawhispersofthewitchtree-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `mandragorawhispersofthewitchtree-binaries` | high | `{gamePath}/man/Binaries/Win64` |
| SIGBYPASS_NAME | `SIGBYPASS_ID` | high | `{gamePath}/man/Binaries/Win64` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `ue5-pak-installer` | 29 |
| `UE4SSCOMBO_ID` | 25 |
| `LOGICMODS_ID` | 27 |
| `UE4SS_ID` | 31 |
| `SIGBYPASS_ID` | 32 |
| `SCRIPTS_ID` | 33 |
| `DLL_ID` | 35 |
| `mandragorawhispersofthewitchtree-root` | 37 |
| `mandragorawhispersofthewitchtree-config` | 39 |
| `mandragorawhispersofthewitchtree-save` | 41 |
| `mandragorawhispersofthewitchtree-binaries` | 45 |

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
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
