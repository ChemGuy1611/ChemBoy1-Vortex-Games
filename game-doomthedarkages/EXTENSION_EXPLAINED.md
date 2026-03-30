# DOOM: The Dark Ages — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////
Name: DOOM: The Dark Ages Vortex Extension
Structure: 3rd-Party Mod Loader
Author: ChemBoy1
Version: 0.3.0
Date: 2026-03-11
/////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `doomthedarkages` |
| Extension Version | 0.3.0 |
| Steam App ID | 3017860 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | BethesdaSoftworks.ProjectTitan |
| Executable | `DOOMTheDarkAges.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `INJECTOR_ID` | 25 |
| `ATLAN_ID` | 27 |
| `VALEN_ID` | 28 |
| `PATCHER_ID` | 29 |
| `SOUND_ID` | 31 |
| `CONFIG_ID` | 33 |
| `SAVE_ID` | 35 |
| ``${GAME_ID}-zipmod`` | 37 |
| `BINARIES_ID` | 39 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open autoexec.cfg File**
- **Open Sounds Folder**
- **Open Config Folder (User Profile)**
- **Open Saves Folder**
- **View Changelog**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.) from Nexus Mods.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
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
