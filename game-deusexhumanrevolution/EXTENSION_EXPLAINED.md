# Deus Ex: Human Revolution — Vortex Extension Explained

## Overview

```
///////////////////////////////////////////
Name: Deus Ex: Human Revolution Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.1.1
Date: 2025-12-03
///////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `deusexhumanrevolution` |
| Extension Version | 0.1.1 |
| Steam App ID | 238010 |
| Epic App ID | N/A |
| GOG App ID | 1370227705 |
| Xbox App ID | N/A |
| Executable | `DXHRDC.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `MOD_ID` | 25 |
| `PATCHER_ID` | 27 |
| `HOOK_ID` | 29 |
| `CONFIG_ID` | 43 |
| `SAVE_ID` | 45 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Save Folder (GOG)**
- **View Changelog**
- **Open Downloads Folder**

## Special Features

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
```

## Entry Point

The extension is registered via:

```js
module.exports = { default: main };
```

The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
