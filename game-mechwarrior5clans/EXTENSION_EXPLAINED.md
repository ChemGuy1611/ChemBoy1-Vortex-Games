# MechWarrior 5: Clans — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | MechWarrior 5: Clans Vortex Extension |
| Engine / Structure | UE5 (Xbox-Integrated) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `mechwarrior5clans` |
| Executable | `MechWarrior.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `2000890`
- **Epic Games Store** — `d97001f0a24b46afa65b42b2ceb5f1bc`
- **Xbox / Microsoft Store** — `PiranhaGamesInc.MechWarrior5Clans`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Modding Editor Mod | `mechwarrior5clans-moddingeditormod` | high | `{gamePath}/MW5Clans/Mods` |
| UE4SS LogicMods (Blueprint) | `mechwarrior5clans-logicmods` | high | `{gamePath}/MW5Clans/Content/Paks/LogicMods` |
| UE4SS Script-LogicMod Combo | `mechwarrior5clans-ue4sscombo` | high | `{gamePath}` |
| Root Game Folder | `mechwarrior5clans-root` | high | `{gamePath}` |
| UE5 Paks | `mechwarrior5clans-ue5` | high | `{gamePath}/MW5Clans/Content/Paks/~mods` |
| UE5 Paks (no "~mods") | `mechwarrior5clans-pakalt` | high | `{gamePath}/MW5Clans/Content/Paks` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 31 |
| `mechwarrior5clans-moddingeditormod` | 25 |
| `mechwarrior5clans-ue4ss-logicscriptcombo` | 27 |
| `mechwarrior5clans-ue4ss-logicmod` | 29 |
| `mechwarrior5clans-ue4ss` | 33 |
| `mechwarrior5clans-ue4ss-scripts` | 35 |
| `mechwarrior5clans-root` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
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
