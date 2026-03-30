# Dragon Ball: Sparking! Zero — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Dragon Ball: Sparking! Zero Vortex Extension |
| Engine / Structure | UE5 |
| Author | ChemBoy1 |
| Version | 0.5.1 |
| Date | 2026-02-05 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `dragonballsparkingzero` |
| Executable | `SparkingZERO.exe` |

## Supported Stores

- **Steam** — `1790600`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `CHECK_DATA` | `false` |  |
| `SYM_LINKS` | `true` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| UE4SS Scripts | `dragonballsparkingzero-scripts` | high | `{gamePath}/SparkingZERO/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `dragonballsparkingzero-ue4ssdll` | high | `{gamePath}/SparkingZERO/Binaries/Win64/ue4ss/Mods` |
| UE4SS LogicMods (Blueprint) | `dragonballsparkingzero-logicmods` | high | `{gamePath}/SparkingZERO/Content/Paks/LogicMods` |
| UE4SS Script-LogicMod Combo | `dragonballsparkingzero-ue4sscombo` | high | `{gamePath}` |
| SZModLoader Mod | `dragonballsparkingzero-modloadermod` | high | `{gamePath}/SparkingZERO/Mods` |
| SZModLoader JSON | `dragonballsparkingzero-json` | high | `{gamePath}/SparkingZERO/Mods/ZeroSpark/Json` |
| Root Game Folder | `dragonballsparkingzero-root` | high | `{gamePath}` |
| UE5 Paks | `dragonballsparkingzero-ue5` | high | `{gamePath}/SparkingZERO/Content/Paks/~mods` |
| UE5 Paks (no "~mods") | `dragonballsparkingzero-pakalt` | high | `{gamePath}/SparkingZERO/Content/Paks` |
| Binaries (Engine Injector) | `dragonballsparkingzero-binaries` | high | `{gamePath}/SparkingZERO/Binaries/Win64` |
| UE4SS | `dragonballsparkingzero-ue4ss` | low | `{gamePath}/SparkingZERO/Binaries/Win64` |
| Signature Bypass | `dragonballsparkingzero-sigbypass` | low | `{gamePath}/SparkingZERO/Binaries/Win64` |
| SZModLoader | `dragonballsparkingzero-modloader` | low | `{gamePath}/SparkingZERO/Mods` |
| LFSE | `dragonballsparkingzero-lfse` | low | `{gamePath}/SparkingZERO/Mods` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `ue5-pak-installer` | 37 |
| `dragonballsparkingzero-modloader` | 25 |
| `dragonballsparkingzero-lfse` | 27 |
| `dragonballsparkingzero-modloadermod` | 29 |
| `dragonballsparkingzero-json` | 31 |
| `dragonballsparkingzero-ue4ss-logicscriptcombo` | 33 |
| `dragonballsparkingzero-ue4ss-logicmod` | 35 |
| `dragonballsparkingzero-ue4ss` | 39 |
| `dragonballsparkingzero-ue4ss-scripts` | 41 |
| `dragonballsparkingzero-ue4ssdll` | 42 |
| `dragonballsparkingzero-root` | 43 |
| `dragonballsparkingzero-config` | 45 |
| `dragonballsparkingzero-save` | 47 |
| `dragonballsparkingzero-sigbypass` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open JsonFiles.json File
- Open Paks Folder
- Open ModLoader Folder
- Open JSON Folder
- Open Config Folder
- Open Saves Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| UE4SS | — | — |

## Config & Save Paths

| Type | Path |
|---|---|
| Save | `SaveGame` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.

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
