# MechWarrior 5: Clans — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////
Name: MechWarrior 5: Clans Vortex Extension
Structure: UE5 (Xbox-Integrated)
Author: ChemBoy1
Version: 0.3.0
Date: 2026-02-01
////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `mechwarrior5clans` |
| Extension Version | 0.3.0 |
| Steam App ID | 2000890 |
| Epic App ID | d97001f0a24b46afa65b42b2ceb5f1bc |
| GOG App ID | N/A |
| Xbox App ID | PiranhaGamesInc.MechWarrior5Clans |
| Executable | `N/A` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| UE4SS LogicMods (Blueprint) | `?` | high | '{gamePath}', LOGICMODS_PATH |
| UE4SS Script-LogicMod Combo | `?` | high | {gamePath} |
| Root Game Folder | `?` | high | {gamePath} |
| UE5 Paks | `?` | high | '{gamePath}', UE5_PATH |
| UE5 Paks (no | `?` | high | '{gamePath}', UE5_ALT_PATH |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `'ue5-pak-installer'` | 31 |
| `EDITORMOD_ID` | 25 |
| ``${GAME_ID}-ue4ss-logicscriptcombo`` | 27 |
| ``${GAME_ID}-ue4ss-logicmod`` | 29 |
| ``${GAME_ID}-ue4ss`` | 33 |
| ``${GAME_ID}-ue4ss-scripts`` | 35 |
| ``${GAME_ID}-root`` | 37 |
| ``${GAME_ID}-config`` | 39 |
| ``${GAME_ID}-save`` | 41 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Launch Modded Game

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.) from Nexus Mods.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.

## How Mod Installation Works

```
User drops archive into Vortex
  └── Each installer's test() runs in priority order
       └── First supported=true wins
            └── install() returns copy instructions + setmodtype
                 └── Vortex stages files
                      └── User deploys
                           └── Vortex symlinks/copies to game folder
```

## Entry Point

The extension is registered via:

```js
module.exports = { default: main };
```

The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
