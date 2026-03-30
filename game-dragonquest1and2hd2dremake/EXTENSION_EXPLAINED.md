# DRAGON QUEST I & II HD-2D Remake — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////////////
Name: DRAGON QUEST I & II HD-2D Remake Vortex Extension
Structure: UE5 (static exe)
Author: ChemBoy1
Version: 0.2.1
Date: 2026-03-27
//////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `dragonquest1and2hd2dremake` |
| Extension Version | 0.2.1 |
| Steam App ID | 2893570 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `DQIandIIHD2DRemake.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/1514 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Dragon_Quest_I_%26_II_HD-2D_Remake |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `'ue5-pak-installer'` | 29 |
| `UE4SSCOMBO_ID` | 25 |
| `LOGICMODS_ID` | 27 |
| `UE4SS_ID` | 31 |
| `SIGBYPASS_ID` | 32 |
| `SCRIPTS_ID` | 33 |
| `DLL_ID` | 35 |
| `ROOT_ID` | 37 |
| `CONTENT_ID` | 38 |
| `CONFIG_ID` | 39 |
| `SAVE_ID` | 41 |
| `BINARIES_ID` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch
- Demo Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Paks Folder**
- **Open Binaries Folder**
- **Open UE4SS Mods Folder**
- **Open LogicMods Folder**
- **Open Config Folder**
- **Open Saves Folder**
- **Download UE4SS**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.) from Nexus Mods.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
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
