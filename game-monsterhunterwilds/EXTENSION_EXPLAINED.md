# Monster Hunter Wilds — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////
Name: Monster Hunter Wilds Vortex Extension
Structure: Fluffy + REFramework (RE Engine)
Author: ChemBoy1
Version: 0.3.0
Date: 2026-03-05
///////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `monsterhunterwilds` |
| Extension Version | 0.3.0 |
| Steam App ID | 2246340 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `MonsterHunterWilds.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/1149 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Monster_Hunter_Wilds |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `FLUFFY_ID` | 25 |
| `REF_ID` | 27 |
| ``${FLUFFYMOD_ID}pak`` | 31 |
| `LOOSELUA_ID` | 33 |
| `ROOT_ID` | 35 |
| `PRESET_ID` | 37 |
| ``${FLUFFYMOD_ID}zip`` | 45 |
| `FLUFFYMOD_ID` | 45 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config File**
- **Open Save Folder**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
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
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via:

```js
module.exports = { default: main };
```

The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
