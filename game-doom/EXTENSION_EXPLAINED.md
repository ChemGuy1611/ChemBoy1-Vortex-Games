# doom — Vortex Extension Explained

## Overview

```
////////////////////////////////////
Name: DOOM (2016) Vortex Extension
Structure: 3rd party mod loader
Author: ChemBoy1
Version: 0.5.1
Date: 2025-05-28
////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `doom` |
| Extension Version | 0.5.1 |
| Steam App ID | 379720 |
| Epic App ID | N/A |
| GOG App ID | 1390579243 |
| Xbox App ID | N/A |
| Executable | `DOOMx64vk.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `LOADER_ID` | 25 |
| `LAUNCHER_ID` | 27 |
| `LEGACY_ID` | 29 |
| `ROLLBACK_ID` | 31 |
| ``${GAME_ID}-zipmod`` | 33 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Launch Modded DOOM
- DOOMLauncher

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config Folder**
- **Open Saves Folder**
- **View Changelog**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.) from Nexus Mods.

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
