# Borderlands 2 — Vortex Extension Explained

## Overview

```
/////////////////////////////////////////
Name: Borderlands 2 Vortex Extension
Structure: UE2/3 Game (TFC Installer)
Author: ChemBoy1
Version: 0.3.5
Date: 2025-11-16
/////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `borderlands2` |
| Extension Version | 0.3.5 |
| Steam App ID | 49520 |
| Epic App ID | Dodo |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `Borderlands2.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `TFC_ID` | 25 |
| `BLCMM_ID` | 27 |
| `TFCMOD_ID` | 29 |
| `UPKEXPLORER_ID` | 31 |
| `SDK_ID` | 33 |
| `SDKMOD_ID` | 35 |
| `BLCMFILE_ID` | 37 |
| `ROOT_ID` | 39 |
| `COOKEDSUB_ID` | 41 |
| `MOVIES_ID` | 43 |
| `BINARIES_ID` | 45 |

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
