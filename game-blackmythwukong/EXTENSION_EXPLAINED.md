# Black Myth: Wukong — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Black Myth Wukong Vortex Extension |
| Engine / Structure | UE5 |
| Author | ChemBoy1 |
| Version | 0.3.2 |
| Date | 2026-02-03 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `blackmythwukong` |
| Executable | `b1.exe` |

## Supported Stores

- **Steam** — `2358720`
- **Epic Games Store** — `f53c5471fd0e47619e72b6d21a527abe`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |
| `CHECK_CONFIG` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| UE4SS Scripts | `blackmythwukong-scripts` | high | `{gamePath}/b1/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `blackmythwukong-ue4ssdll` | high | `{gamePath}/b1/Binaries/Win64/ue4ss/Mods` |
| UE4SS LogicMods (Blueprint) | `blackmythwukong-logicmods` | high | `{gamePath}/b1/Content/Paks/LogicMods` |
| UE4SS Script-LogicMod Combo | `blackmythwukong-ue4sscombo` | high | `{gamePath}` |
| Root Game Folder | `blackmythwukong-root` | high | `{gamePath}` |
| UE5 Paks | `blackmythwukong-ue5` | high | `{gamePath}/b1/Content/Paks/~mods` |
| UE5 Paks (no "~mods") | `blackmythwukong-pakalt` | high | `{gamePath}/b1/Content/Paks` |
| Binaries (Engine Injector) | `blackmythwukong-binaries` | high | `{gamePath}/b1/Binaries/Win64` |
| UE4SS | `blackmythwukong-ue4ss` | low | `{gamePath}/b1/Binaries/Win64` |
| Signature Bypass | `blackmythwukong-sigbypass` | low | `{gamePath}/b1/Binaries/Win64` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `blackmythwukong-ue4ss-logicscriptcombo` | 25 |
| `blackmythwukong-ue4ss-logicmod` | 30 |
| `blackmythwukong-ue4ss` | 40 |
| `blackmythwukong-sigbypass` | 45 |
| `blackmythwukong-ue4ss-scripts` | 50 |
| `blackmythwukong-ue4ssdll` | 53 |
| `blackmythwukong-root` | 55 |
| `blackmythwukong-config` | 60 |
| `blackmythwukong-save` | 65 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
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
| Save | `b1/Saved/SaveGames` |

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
