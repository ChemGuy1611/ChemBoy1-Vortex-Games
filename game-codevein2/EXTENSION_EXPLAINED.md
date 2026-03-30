# CODE VEIN II — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////
Name: CODE VEIN II Vortex Extension
Structure: Unreal Engine Game
Author: ChemBoy1
Version: 0.1.1
Date: 2026-02-04
////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `codevein2` |
| Extension Version | 0.1.1 |
| Steam App ID | 2362060 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `${EPIC_CODE_NAME}.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/1646 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Code_Vein_II |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `'ue5-pak-installer'` | 29 |
| `MODKITMOD_ID` | 25 |
| `RHFF_ID` | 26 |
| `UE4SSCOMBO_ID` | 27 |
| `LOGICMODS_ID` | 28 |
| `UE4SS_ID` | 31 |
| `SIGBYPASS_ID` | 33 |
| `SCRIPTS_ID` | 35 |
| `DLL_ID` | 37 |
| `ROOT_ID` | 39 |
| `CONFIG_ID` | 41 |
| `SAVE_ID` | 43 |
| `BINARIES_ID` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

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
- **Open Downloads Folder**
- **Submit Bug Report**

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
