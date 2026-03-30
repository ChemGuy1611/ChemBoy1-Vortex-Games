# God of War: Ragnarok — Vortex Extension Explained

## Overview

```
/////////////////////////////////////////
Name: God of War: Ragnarok Vortex Extension
Structure: Sony Port, Custom Game Data
Author: ChemBoy1
Version: 0.2.2
Date: 2025-04-10
/////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `godofwarragnarok` |
| Extension Version | 0.2.2 |
| Steam App ID | 2322010 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `GoWR.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/959 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/God_of_War_Ragnar%C3%B6k |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `LOADER_ID` | 25 |
| `DATA_ID` | 27 |
| `PATCH_ID` | 29 |
| `EXECSUB_ID` | 31 |
| `PACK_ID` | 33 |
| `LUAMOD_ID` | 35 |
| `SAVE_ID` | 37 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Download ${LOADER_NAME}**
- **Open Settings INI**
- **Open boot-options.json**
- **Open GoWR-Script-Loader Config**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.) from Nexus Mods.
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
