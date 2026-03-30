# NINJA GAIDEN 2 Black — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////
Name: Ninja Gaiden 2 Black Vortex Extension
Structure: UE5 (Xbox-Integrated)
Author: ChemBoy1
Version: 0.4.0
Date: 2026-02-01
////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `ninjagaiden2black` |
| Extension Version | 0.4.0 |
| Steam App ID | 3287520 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | 946B6A6E.NINJAGAIDEN2Black |
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
| `UE4SSCOMBO_ID` | 25 |
| `LOGICMODS_ID` | 28 |
| `UE4SS_ID` | 34 |
| `SCRIPTS_ID` | 37 |
| `ROOT_ID` | 40 |
| ``${GAME_ID}-config`` | 55 |
| ``${GAME_ID}-save`` | 60 |
| `MODLOADER_ID` | 43 |
| `MLMOD_ID` | 47 |
| `BINARIES_ID` | 50 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Launch Modded Game

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Paks Folder**
- **Open Binaries Folder**
- **Open Config Folder**
- **Open Saves Folder (Steam)**
- **Open Saves Folder (Xbox)**

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
