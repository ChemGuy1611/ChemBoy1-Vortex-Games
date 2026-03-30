# theHunter: Call of the Wild — Vortex Extension Explained

## Overview

```
///////////////////////////////////////////
Name: theHunter: Call of the Wild Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.2.0
Date: 2025-12-11
///////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `thehuntercallofthewild` |
| Extension Version | 0.2.0 |
| Steam App ID | 518790 |
| Epic App ID | 4f0c34d469bb47b2bcf5b377f47ccfe3 |
| GOG App ID | N/A |
| Xbox App ID | AvalancheStudios.theHunterCalloftheWild-Windows10 |
| Executable | `theHunterCotW_F.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `DROPZONE_ID` | 25 |
| `CONFIG_ID` | 48 |
| `SAVE_ID` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Save Data Folder**
- **Open Config Folder**
- **View Changelog**
- **Open Downloads Folder**

## Special Features

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
