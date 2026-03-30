# Final Fantasy VII Rebirth — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////////////
Name: Final Fantasy VII Rebirth Vortex Extension
Structure: UE4 with IO Store
Author: ChemBoy1
Version: 0.5.2
Date: 2026-02-03
//////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `finalfantasy7rebirth` |
| Extension Version | 0.5.2 |
| Steam App ID | 2909400 |
| Epic App ID | 33e6ac38b5a14098b079fd62d71aabc6 |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `ff7rebirth.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/1150 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Final_Fantasy_VII_Rebirth |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `'ue5-pak-installer'` | 29 |
| `UE4SSCOMBO_ID` | 25 |
| `LOGICMODS_ID` | 26 |
| `MODLOADER_ID` | 27 |
| `MODLOADERMOD_ID` | 28 |
| `UE4SS_ID` | 31 |
| `SCRIPTS_ID` | 33 |
| `DLL_ID` | 35 |
| `ROOT_ID` | 37 |
| `CONFIG_ID` | 39 |
| `SAVE_ID` | 41 |
| `BINARIES_ID` | 43 |

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
- **Open Saves Folder (Steam)**
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
