# Ghost Recon Breakpoint — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////////////////////
Name: Ghost Recon Breakpoint Vortex Extension
Structure: Ubisoft AnvilToolkit
Author: ChemBoy1
Version: 0.2.7
Date: 2026-03-28
//////////////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `ghostreconbreakpoint` |
| Extension Version | 0.2.7 |
| Steam App ID | 2231380 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `GRB.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/972 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Tom_Clancy%27s_Ghost_Recon_Breakpoint |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `ATK_ID` | 25 |
| `SOUND_ID` | 27 |
| `BUILDTABLE_ID` | 29 |
| `EXTRACTED_ID` | 31 |
| `FORGEFOLDER_ID` | 33 |
| `DATAFOLDER_ID` | 35 |
| `LOOSE_ID` | 37 |
| `FORGE_ID` | 39 |
| `ROOT_ID` | 41 |
| ``${GAME_ID}-fallback`` | 43 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Launch Game Ubisoft Plus
- Launch Vulkan Game
- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Settings INI**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.

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
