# Batman: Arkham Asylum — Vortex Extension Explained

## Overview

```
/////////////////////////////////////////
Name: Batman: Arkham Asylum Vortex Extension
Structure: UE2/3 Game (TFC Installer)
Author: ChemBoy1
Version: 0.1.1
Date: 2026-01-30
/////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `batmanarkhamasylum` |
| Extension Version | 0.1.1 |
| Steam App ID | 35140 |
| Epic App ID | Godwit |
| GOG App ID | 1482504285 |
| Xbox App ID | N/A |
| Executable | `BmLauncher.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `TFC_ID` | 25 |
| `UPKEXPLORER_ID` | 27 |
| `TFCMOD_ID` | 29 |
| `ROOT_ID` | 31 |
| `COOKEDSUB_ID` | 33 |
| `MOVIES_ID` | 35 |
| `BINARIES_ID` | 37 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config Folder**
- **Open Save Folder**
- **View Changelog**
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
