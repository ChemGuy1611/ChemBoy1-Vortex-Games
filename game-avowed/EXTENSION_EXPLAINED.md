# Avowed — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////////////
Name: Avowed Vortex Extension
Structure: UE5 (Xbox-Integrated)
Author: ChemBoy1
Version: 0.2.1
Date: 2026-02-06
//////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `avowed` |
| Extension Version | 0.2.1 |
| Steam App ID | 2457220 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | Microsoft.Avowed |
| Executable | `N/A` |
| Extension Page | https://www.nexusmods.com/site/mods/965 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Avowed |

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
| `'ue5-pak-installer'` | 35 |
| ``${GAME_ID}-ue4ss-logicscriptcombo`` | 25 |
| ``${GAME_ID}-ue4ss-logicmod`` | 30 |
| ``${GAME_ID}-ue4ss`` | 40 |
| ``${GAME_ID}-ue4ss-scripts`` | 43 |
| `DLL_ID` | 45 |
| ``${GAME_ID}-root`` | 47 |
| ``${GAME_ID}-config`` | 55 |
| ``${GAME_ID}-save`` | 60 |
| `BINARIES_ID` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch
- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Download UE4SS**
- **Open Paks Folder**
- **Open Binaries Folder**
- **Open Config Folder**
- **Open Saves Folder**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
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
