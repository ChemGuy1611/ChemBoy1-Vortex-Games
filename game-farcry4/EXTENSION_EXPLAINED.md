# Far Cry 4 — Vortex Extension Explained

## Overview

```
///////////////////////////////////////////
Name: Far Cry 4 Vortex Extension
Structure: Far Cry Game (Mod Installer)
Author: ChemBoy1
Version: 0.1.1
Date: 2025-10-24
///////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `farcry4` |
| Extension Version | 0.1.1 |
| Steam App ID | 298110 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `FarCry4.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `MI_ID` | 25 |
| ``${ROOT_ID}files`` | 26 |
| `ROOT_ID` | 27 |
| `DATA_ID` | 29 |
| `BIN_ID` | 31 |
| `MIMODA3_ID` | 33 |
| `MIMOD_ID` | 35 |
| `XML_ID` | 37 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Far Cry Mods Site**
- **Open Far Cry Mod Installer Site**
- **Open Config Folder**
- **Open Save Folder**
- **View Changelog**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.) from Nexus Mods.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.

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
