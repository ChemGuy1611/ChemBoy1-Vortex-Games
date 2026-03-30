# inZOI — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////
Name: inZOI Vortex Extension
Structure: UE5
Author: ChemBoy1
Version: 0.6.0
Date: 2026-02-03
////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `inzoi` |
| Extension Version | 0.6.0 |
| Steam App ID | 2456740 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `inZOI.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/1241 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/InZOI |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `'ue5-pak-installer'` | 28 |
| `UE4SSCOMBO_ID` | 25 |
| `LOGICMODS_ID` | 26 |
| `UE5KITMOD_ID` | 27 |
| `UE4SS_ID` | 29 |
| `MODENABLER_ID` | 30 |
| `SCRIPTS_ID` | 31 |
| `DLL_ID` | 32 |
| `CREATIONS_ID` | 33 |
| `AIGENERATED_ID` | 24 |
| `CANVAS_ID` | 35 |
| `MY3DPRINTER_ID` | 36 |
| `MYAPPEARANCES_ID` | 37 |
| `ANIMATIONS_ID` | 38 |
| `TEXTURES_ID` | 39 |
| `ROOT_ID` | 40 |
| `CONFIG_ID` | 41 |
| `SAVE_ID` | 42 |
| `BINARIES_ID` | 43 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Download Mod Enabler (Legacy)**
- **Open MODKit Mods Folder (Documents)**
- **Open MODKit Folder (Epic)**
- **Open Legacy Pak Mods Folder**
- **Open Binaries Folder**
- **Open UE4SS Mods Folder**
- **Open LogicMods Folder**
- **Open Config Folder (Local AppData)**
- **Open Saves Folder (Documents)**
- **Open inZOI Documents Folder**
- **Download UE4SS**
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
