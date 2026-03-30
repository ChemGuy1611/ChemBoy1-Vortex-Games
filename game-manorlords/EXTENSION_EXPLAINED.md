# Manor Lords — Vortex Extension Explained

## Overview

```
/////////////////////////////////////////////////////
Name: Manor Lords Vortex Extension
Structure: UE4 (XBOX Integrated)
Author: ChemBoy1
Version: 0.5.2
Date: 2026-02-03
/////////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `manorlords` |
| Extension Version | 0.5.2 |
| Steam App ID | 1363080 |
| Epic App ID | N/A |
| GOG App ID | 1361243432 |
| Xbox App ID | HoodedHorse.ManorLords |
| Executable | `N/A` |
| Extension Page | https://www.nexusmods.com/site/mods/868 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Manor_Lords |

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
| Paks | `?` | high | '{gamePath}', PAK_PATH |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `MLUE4SS_ID` | 20 |
| ``${GAME_ID}-ue4ss-logicscriptcombo`` | 21 |
| ``${GAME_ID}-ue4ss-logicmod`` | 23 |
| ``${GAME_ID}-ue4ss`` | 30 |
| ``${GAME_ID}-ue4ss-scripts`` | 35 |
| `DLL_ID` | 37 |
| ``${GAME_ID}-root`` | 40 |
| ``${GAME_ID}-config`` | 45 |
| ``${GAME_ID}-save`` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch
- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Paks Folder**
- **Open Binaries Folder**
- **Open UE4SS Mods Folder**
- **Open UE4SS Settings INI**
- **Open UE4SS mods.json**
- **Open LogicMods Folder**
- **Open Config Folder**
- **Open Saves Folder**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

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
