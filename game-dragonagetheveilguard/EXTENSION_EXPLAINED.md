# Dragon Age: The Veilguard — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////////
Name: Dragon Age: The Veilguard Vortex Extension
Structure: 3rd Party Mod Manager (Frosty)
Author: ChemBoy1
Version: 0.3.0
Date: 2026-02-26
////////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `dragonagetheveilguard` |
| Extension Version | 0.3.0 |
| Steam App ID | 1845910 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `Dragon Age The Veilguard.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/1075 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Dragon_Age:_The_Veilguard |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `FROSTYMANAGER_ID` | 25 |
| `DAVEX_ID` | 27 |
| `SDKPATCH_ID` | 29 |
| `FROSTYPATCH` | 31 |
| `FROSTYMOD_ID` | 33 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Launch Modded Game
- Direct Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Download DAVExtender**
- **Download SDK Patch Latest (EA/Epic)**
- **Delete ModData Folder**
- **Open FMM GitHub Page**
- **Open Config Folder**
- **Open Saves Folder**
- **Open Frosty Mods Folder**
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
