# DOOM Eternal — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////
Name: DOOM Eternal Vortex Extension
Structure: 3rd party mod loader
Author: ChemBoy1
Version: 0.3.4
Date: 2026-03-19
////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `doometernal` |
| Extension Version | 0.3.4 |
| Steam App ID | 782330 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | BethesdaSoftworks.DOOMEternal-PC |
| Executable | `N/A` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `'doometernal-rollback'` | 25 |
| `'doometernal-injector'` | 30 |
| `'doometernal-ktde'` | 35 |
| `'doometernal-meathook'` | 40 |
| `'doometernal-zip-mod'` | 45 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Launch Classic Modded Game

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Download EternalModInjector v${INJ_REV} (${INJ_DL_ID})**
- **Open Config Folder**
- **Open Saves Folder**
- **View Changelog**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.) from Nexus Mods.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.

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
