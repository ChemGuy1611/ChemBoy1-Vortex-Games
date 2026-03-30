# XXX — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////
Name: XXX Vortex Extension
Structure: Fluffy + REFramework (RE Engine)
Author: ChemBoy1
Version: 0.1.0
Date: 2026-XX-XX
Notes:
-
///////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `XXX` |
| Extension Version | 0.1.0 |
| Steam App ID | XXX |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `XXX.exe` |
| Extension Page | XXX |
| PCGamingWiki | XXX |

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
| `FLUFFYMOD_ID` | 49 |
| ``${FLUFFYMOD_ID}zip`` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch
- Custom Launch (Demo)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config File**
- **Open Save Folder (Steam)**
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
