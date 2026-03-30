# The Outer Worlds — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////
Name: The Outer Worlds Vortex Extension
Structure: UE4
Author: ChemBoy1
Version: 0.5.1
Date: 2026-02-07
////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `theouterworlds` |
| Extension Version | 0.5.1 |
| Steam App ID | 578650 |
| Epic App ID | Rosemallow |
| GOG App ID | 1242541569 |
| Xbox App ID | PrivateDivision.TheOuterWorldsWindows10 |
| Executable | `N/A` |
| Extension Page | https://www.nexusmods.com/site/mods/964 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/The_Outer_Worlds |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Paks | `?` | low | "{gamePath}", PAK_PATH |
| Root Game Folder | `?` | high | {gamePath} |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| ``${GAME_ID}-config`` | 30 |
| ``${GAME_ID}-root`` | 35 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch
- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

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
