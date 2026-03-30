# Tomb Raider (2013) — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////
Name: Tomb Raider (2013) Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.5.0
Date: 2025-10-29
////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `tombraider2013` |
| Extension Version | 0.5.0 |
| Steam App ID | 203160 |
| Epic App ID | d6264d56f5ba434e91d4b0a0b056c83a |
| GOG App ID | 1724969043 |
| Xbox App ID | 39C668CD.TombRaiderDefinitiveEdition |
| Executable | `TombRaider.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `MANAGER_ID` | 25 |
| `TEXMOD_ID` | 27 |
| `TEXMODPACK_ID` | 29 |
| `MANAGERMOD_ID` | 31 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Logs and Crash Dumps Folder**
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
