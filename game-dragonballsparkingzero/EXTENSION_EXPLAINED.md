# Dragon Ball: Sparking! Zero — Vortex Extension Explained

## Overview

```
/////////////////////////////////////////////////////
Name: Dragon Ball: Sparking! Zero Vortex Extension
Structure: UE5
Author: ChemBoy1
Version: 0.5.1
Date: 2026-02-05
/////////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `dragonballsparkingzero` |
| Extension Version | 0.5.1 |
| Steam App ID | 1790600 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `SparkingZERO.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/1055 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Dragon_Ball:_Sparking!_Zero |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| UE4SS Scripts | `?` | high | `{gamePath}`, SCRIPTS_PATH |
| UE4SS LogicMods (Blueprint) | `?` | high | `{gamePath}`, LOGICMODS_PATH |
| UE4SS Script-LogicMod Combo | `?` | high | {gamePath} |
| SZModLoader Mod | `?` | high | `{gamePath}`, MODLOADERMOD_PATH |
| SZModLoader JSON | `?` | high | `{gamePath}`, JSON_PATH |
| Root Game Folder | `?` | high | {gamePath} |
| UE5 Paks | `?` | high | `{gamePath}`, UE5_PATH |
| UE5 Paks (no | `?` | high | `{gamePath}`, UE5_ALT_PATH |
| Binaries (Engine Injector) | `?` | high | `{gamePath}`, BINARIES_PATH |
| UE4SS | `?` | low | `{gamePath}`, BINARIES_PATH |
| LFSE | `?` | low | `{gamePath}`, LFSE_PATH |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `'ue5-pak-installer'` | 37 |
| `MODLOADER_ID` | 25 |
| `LFSE_ID` | 27 |
| `MODLOADERMOD_ID` | 29 |
| `JSON_ID` | 31 |
| ``${GAME_ID}-ue4ss-logicscriptcombo`` | 33 |
| ``${GAME_ID}-ue4ss-logicmod`` | 35 |
| ``${GAME_ID}-ue4ss`` | 39 |
| ``${GAME_ID}-ue4ss-scripts`` | 41 |
| `DLL_ID` | 42 |
| ``${GAME_ID}-root`` | 43 |
| ``${GAME_ID}-config`` | 45 |
| ``${GAME_ID}-save`` | 47 |
| ``${GAME_ID}-sigbypass`` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open JsonFiles.json File**
- **Open Paks Folder**
- **Open ModLoader Folder**
- **Open JSON Folder**
- **Open Config Folder**
- **Open Saves Folder**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
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
