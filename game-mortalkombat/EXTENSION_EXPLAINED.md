# Mortal Kombat 1 — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////////////
Name: Mortal Kombat 1 Vortex Extension
Structure: UE5 (Sig Bypass)
Author: ChemBoy1
Version: 0.2.0
Date: 2026-01-07
//////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `mortalkombat` |
| Extension Version | 0.2.0 |
| Steam App ID | 1971870 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | WarnerBros.Interactive.K1Codename |
| Executable | `MK12.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| UE4SS LogicMods (Blueprint) | `?` | high | '{gamePath}', LOGICMODS_PATH |
| UE4SS Script-LogicMod Combo | `?` | high | {gamePath} |
| Saves (Game Directory) | `?` | high | {gamePath} |
| UE5 Paks | `?` | high | '{gamePath}', UE5_PATH |
| UE5 Paks (no | `?` | high | '{gamePath}', UE5_ALT_PATH |
| UE4SS | `?` | low | '{gamePath}', BINARIES_PATH |
| UE4SS Scripts | `?` | high | '{gamePath}', SCRIPTS_PATH |
| Signature Bypass | `?` | low | '{gamePath}', BINARIES_PATH |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `'ue5-pak-installer'` | 35 |
| ``${GAME_ID}-ue4ss-logicscriptcombo`` | 25 |
| ``${GAME_ID}-ue4ss-logicmod`` | 30 |
| ``${GAME_ID}-ue4ss`` | 40 |
| ``${GAME_ID}-sigbypass`` | 45 |
| ``${GAME_ID}-ue4ss-scripts`` | 50 |
| ``${GAME_ID}-root`` | 55 |
| ``${GAME_ID}-config`` | 60 |
| ``${GAME_ID}-save`` | 65 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Launch Modded Game
- Launch Modded Game
- Sig Bypass Patch

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
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
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via:

```js
module.exports = { default: main };
```

The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
