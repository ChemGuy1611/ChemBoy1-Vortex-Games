# Rise of the Tomb Raider — Vortex Extension Explained

## Overview

```
///////////////////////////////////////////
Name: Rise of the Tomb Raider Vortex Extension
Structure: 3rd-Party Mod Installer
Author: ChemBoy1
Version: 0.5.0
Date: 2025-10-29
////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `riseofthetombraider` |
| Extension Version | 0.5.0 |
| Steam App ID | 391220 |
| Epic App ID | f7cc1c999ac146f39b356f53e3489514 |
| GOG App ID | 1926077727 |
| Xbox App ID | 39C668CD.RiseoftheTombRaider |
| Executable | `ROTTR.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| ROTTR Mod Manager | `?` | low | {gamePath} |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `MANAGER_ID` | 25 |
| `MANAGERUNIFIED_ID` | 30 |
| `BINARIES_ID` | 35 |
| `MANAGERMOD_ID` | 40 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- ROTTR Mod Manager

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

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
