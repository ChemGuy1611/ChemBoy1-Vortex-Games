# Frostpunk 2 — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Frostpunk 2 Vortex Extension |
| Engine / Structure | UE5 (Xbox-Integrated) |
| Author | ChemBoy1 |
| Version | 0.2.0 |
| Date | 2026-02-01 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `frostpunk2` |
| Executable | `N/A` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `1601580`
- **GOG** — `1728870436`
- **Xbox / Microsoft Store** — `4063811bitstudios.Frostpunk2ConsoleEdition`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| UE4SS LogicMods (Blueprint) | `frostpunk2-logicmods` | high | `{gamePath}/Frostpunk2/Content/Paks/LogicMods` |
| UE4SS Script-LogicMod Combo | `frostpunk2-ue4sscombo` | high | `{gamePath}` |
| Root Game Folder | `frostpunk2-root` | high | `{gamePath}` |
| UE5 Paks | `frostpunk2-ue5` | high | `{gamePath}/Frostpunk2/Content/Paks/~mods` |
| UE5 Paks (no "~mods") | `frostpunk2-pakalt` | high | `{gamePath}/Frostpunk2/Content/Paks` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `ue5-pak-installer` | 35 |
| `frostpunk2-ue4ss-logicscriptcombo` | 25 |
| `frostpunk2-ue4ss-logicmod` | 30 |
| `frostpunk2-ue4ss` | 40 |
| `frostpunk2-sigbypass` | 45 |
| `frostpunk2-ue4ss-scripts` | 50 |
| `frostpunk2-root` | 55 |
| `frostpunk2-config` | 60 |
| `frostpunk2-save` | 65 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game**

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| UE4SS | — | — |

## Config & Save Paths

| Type | Path |
|---|---|
| Config | `11bitstudios/Frostpunk2/Steam/Saved/Config/Windows` |
| Save | `11bitstudios/Frostpunk2/Steam/Saved/SaveGames` |
| Save (Xbox) | `11bitstudios/Frostpunk2/MS/Saved/SaveGames` |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
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
