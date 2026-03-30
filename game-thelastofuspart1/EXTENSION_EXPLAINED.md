# The Last of Us Part I — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////
Name: The Last of Us Part I Vortex Extension
Author: ChemBoy1
Structure: Gemeric Game w/ File Extraction
Version: 2.1.0
Date: 2026-02-11
////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `thelastofuspart1` |
| Extension Version | 2.1.0 |
| Steam App ID | 1888930 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `launcher.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/839 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/The_Last_of_Us_Part_I |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| ``${BUILD_ID}pakbin`` | 29 |
| `BIN_ID` | 31 |
| `PAK_ID` | 33 |
| `BUILD_ID` | 35 |
| `SAVE_ID` | 37 |
| `CONFIG_ID` | 39 |
| `PSARCTOOL_ID` | 41 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Extract .psarc Files**
- **Cleanup Extracted .psarc Files**
- **Open **
- **Open Saves Folder**
- **Open Config Folder**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
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
