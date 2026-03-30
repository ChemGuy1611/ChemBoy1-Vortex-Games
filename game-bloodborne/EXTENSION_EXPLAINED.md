# Bloodborne — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////////
Name: Bloodborne Vortex Extension
Structure: Emulation Game
Author: ChemBoy1
Version: 0.3.0
Date: 2026-02-16
////////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `bloodborne` |
| Extension Version | 0.3.0 |
| Steam App ID | N/A |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `N/A` |
| Extension Page | https://www.nexusmods.com/bloodborne/mods/64 |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| ``${GAME_ID}-shadps4`` | 25 |
| ``${GAME_ID}-shadlauncher`` | 27 |
| ``${GAME_ID}-smithbox`` | 29 |
| ``${GAME_ID}-flver`` | 31 |
| ``${GAME_ID}-dvdroot_ps4`` | 33 |
| ``${GAME_ID}-save`` | 35 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- shadPS4 (No-GUI)
- shadPS4QtLauncher
- Smithbox
- Flver Editor

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Download ${SHADLAUNCHER_NAME}**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

## Special Features

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
```

## Entry Point

The extension is registered via:

```js
module.exports = { default: main };
```

The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
