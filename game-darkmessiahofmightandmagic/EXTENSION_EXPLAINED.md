# Dark Messiah \tof Might & Magic — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////////////////
Name: Dark Messiah of Might & Magic Vortex Extension
Structure: Basic (Launcher)
Author: ChemBoy1
Version: 0.3.0
Date: 2026-03-25
//////////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `darkmessiahofmightandmagic` |
| Extension Version | 0.3.0 |
| Steam App ID | 2100 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `mm.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/1056 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Dark_Messiah_of_Might_%26_Magic |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `LAUNCHER_ID` | 25 |
| ``${GAME_ID}-unlimited`` | 27 |
| `ROOT_ID` | 29 |
| `LAUNCHERMOD_ID` | 31 |
| `DATA_ID` | 33 |
| `DATASUB_ID` | 35 |
| `VPK_ID` | 37 |
| `MATERIALS_SUB_ID` | 39 |
| `MAPS_ID` | 41 |
| `SAVE_ID` | 43 |
| `CONFIG_ID` | 45 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Launch Game
- RTX Remix Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Download wOS Mod Launcher (Manual)**
- **Open config.cfg**
- **Open Saves Folder**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.) from Nexus Mods.
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
