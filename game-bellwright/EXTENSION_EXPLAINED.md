# Bellwright — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Bellwright Vortex Extension |
| Engine / Structure | UE4 + IO Store (Sig Bypass) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `bellwright` |
| Executable | `BellwrightGame.exe` |
| PCGamingWiki | XXX |

## Supported Stores

- **Steam** — `1812450`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `CHECK_DATA` | `false` | true if game, staging, and save folders are all on the same drive (partition check) |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script Mod | `bellwright-scripts` | high | `{gamePath}/Bellwright/Binaries/Win64/Mods` |
| UE4SS DLL Mod | `bellwright-ue4ssdll` | high | `{gamePath}/Bellwright/Binaries/Win64/Mods` |
| UE4SS LogicMods (Blueprint) | `bellwright-logicmods` | high | `{gamePath}/Bellwright/Content/Paks/LogicMods` |
| UE4SS Script-LogicMod Combo | `bellwright-ue4sscombo` | high | `{gamePath}` |
| Root Game Folder | `bellwright-root` | high | `{gamePath}` |
| UE5 ModKit Pak Mod | `bellwright-ue5modkitpak` | high | `{gamePath}/Bellwright/Content/Mods` |
| UE5 Paks (Legacy ~mods) | `bellwright-ue5` | high | `{gamePath}/Bellwright/Content/Paks/~mods` |
| UE5 Paks (Legacy, no ~mods) | `bellwright-pakalt` | high | `{gamePath}/Bellwright/Content/Paks` |
| Binaries (Engine Injector) | `bellwright-binaries` | high | `{gamePath}/Bellwright/Binaries/Win64` |
| UE4SS | `bellwright-ue4ss` | low | `{gamePath}/Bellwright/Binaries/Win64` |
| Signature Bypass | `bellwright-sigbypass` | low | `{gamePath}/Bellwright/Binaries/Win64` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `bellwright-ue4sscombo` | 25 |
| `bellwright-logicmods` | 27 |
| `bellwright-ue5modkitpak` | 29 |
| `bellwright-ue4ss` | 31 |
| `bellwright-sigbypass` | 33 |
| `bellwright-scripts` | 35 |
| `bellwright-ue4ssdll` | 37 |
| `bellwright-root` | 39 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open ModKit Pak Mods Folder
- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
- Download UE4SS
- View Changelog
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `Bellwright/Saved/Config/Windows` |
| Save | `Bellwright/Saved/SaveGames` |

## Special Features

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
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
