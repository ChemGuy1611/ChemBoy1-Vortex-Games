# S.T.A.L.K.E.R. 2 \tHeart of Chornobyl — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////////////////////
Name: S.T.A.L.K.E.R. 2: Heart of Chornobyl Vortex Extension
Structure: UE5 (Xbox-Integrated)
Author: ChemBoy1
Version: 0.5.4
Date: 2026-02-04
//////////////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `stalker2heartofchornobyl` |
| Extension Version | 0.5.4 |
| Steam App ID | 1643320 |
| Epic App ID | c04ba25a0e674b1ab3ea79e50c24a722 |
| GOG App ID | 1529799785 |
| Xbox App ID | GSCGameWorld.S.T.A.L.K.E.R.2HeartofChernobyl |
| Executable | `N/A` |
| Extension Page | https://www.nexusmods.com/site/mods/958 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/S.T.A.L.K.E.R._2:_Heart_of_Chornobyl |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `MERGER_ID` | 25 |
| `HERBATA_ID` | 27 |
| `UE4SSCOMBO_ID` | 29 |
| `LOGICMODS_ID` | 31 |
| `HERBATAMOD_ID` | 33 |
| `UE4SS_ID` | 37 |
| `SCRIPTS_ID` | 39 |
| `DLL_ID` | 41 |
| `ROOT_ID` | 43 |
| `CONFIG_ID` | 45 |
| `SAVE_ID` | 47 |
| `BINARIES_ID` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch
- Custom Launch
- Simple Mod Merger
- Herbata

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Steam Workshop Mods Folder**
- **Open Paks Folder**
- **Open Binaries Folder**
- **Open UE4SS Mods Folder**
- **Open LogicMods Folder**
- **Open GameLite (Herbata) Folder**
- **Open Config Folder**
- **Open Saves Folder**
- **Download UE4SS**
- **Download Simple Mod Merger**
- **Open UE4SS Settings INI**
- **Open UE4SS mods.json**
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
