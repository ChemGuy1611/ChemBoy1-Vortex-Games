# Resident Evil Requiem — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////
Name: Resident Evil Requiem Vortex Extension
Structure: Fluffy + REFramework (RE Engine)
Author: ChemBoy1
Version: 0.1.3
Date: 2026-03-05
///////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `residentevilrequiem` |
| Extension Version | 0.1.3 |
| Steam App ID | 3764200 |
| Epic App ID | d9b9a31471634f69916e07cd5e5d2fc3 |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `re9.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/1653 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Resident_Evil_Requiem |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|
| `allowSymlinks` | true | Symlink deployment allowed |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `FLUFFY_ID` | 25 |
| `REF_ID` | 27 |
| `LOOSELUA_ID` | 29 |
| `ROOT_ID` | 31 |
| `PRESET_ID` | 33 |
| `FLUFFYMOD_ID` | 45 |
| ``${FLUFFYMOD_ID}zip`` | 45 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch
- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Download Latest REFramework Nightly**
- **Download EMV Engine (Modding Tools)**
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
