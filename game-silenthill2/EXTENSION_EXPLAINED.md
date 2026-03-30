# Silent Hill 2 (2024) — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////////////
Name: Silent Hill 2 Remake Vortex Extension
Structure: UE5
Author: ChemBoy1
Version: 0.3.1
Date: 2026-02-07
//////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `silenthill2` |
| Extension Version | 0.3.1 |
| Steam App ID | 2124490 |
| Epic App ID | c4dc308a1b69492aba4d47f7feaa1083 |
| GOG App ID | 2051029707 |
| Xbox App ID | KonamiDigitalEntertainmen.SILENTHILL2 |
| Executable | `SHProto.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/963 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Silent_Hill_2 |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| UE4SS Scripts | `?` | high | '{gamePath}', SCRIPTS_PATH |
| UE4SS LogicMods (Blueprint) | `?` | high | '{gamePath}', LOGICMODS_PATH |
| UE4SS Script-LogicMod Combo | `?` | high | {gamePath} |
| Saves (LocalAppData) | `?` | high | {gamePath} |
| UE5 Paks | `?` | high | '{gamePath}', UE5_PATH |
| UE5 Paks (no | `?` | high | '{gamePath}', UE5_ALT_PATH |
| Binaries (Engine Injector) | `?` | high | '{gamePath}', BINARIES_PATH |
| UE4SS | `?` | low | '{gamePath}', BINARIES_PATH |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `'ue5-pak-installer'` | 35 |
| ``${GAME_ID}-ue4ss-logicscriptcombo`` | 25 |
| ``${GAME_ID}-ue4ss-logicmod`` | 30 |
| ``${GAME_ID}-ue4ss`` | 40 |
| ``${GAME_ID}-ue4ss-scripts`` | 45 |
| `DLL_ID` | 47 |
| ``${GAME_ID}-root`` | 49 |
| ``${GAME_ID}-config`` | 55 |
| ``${GAME_ID}-save`` | 60 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Paks Folder**
- **Open Binaries Folder**
- **Open UE4SS Mods Folder**
- **Open LogicMods Folder**
- **Open Config Folder**
- **Open Saves Folder**
- **Download UE4SS**
- **Open UE4SS Settings INI**
- **Open UE4SS mods.json**
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
