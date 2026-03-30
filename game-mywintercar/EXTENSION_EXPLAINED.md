# My Winter Car — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////
Name: My Winter Car Vortex Extension
Structure: Unity BepinEx/MelonLoader Hybrid + Custom Mod Loader (MSCLoader)
Author: ChemBoy1
Version: 0.2.2
Date: 2026-01-12
//////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `mywintercar` |
| Extension Version | 0.2.2 |
| Steam App ID | 4164420 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `${GAME_STRING}.exe` |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/My_Winter_Car |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `MSCLOADER_ID` | 25 |
| `BEPINEX_ID` | 26 |
| `MELON_ID` | 27 |
| `ROOT_ID` | 28 |
| `BEPCFGMAN_ID` | 29 |
| `MELONPREFMAN_ID` | 30 |
| `ASSEMBLY_ID` | 31 |
| ``${GAME_ID}-plugin`` | 33 |
| `ASSETS_ID` | 37 |
| `CUSTOM_ID` | 39 |
| `SAVE_ID` | 47 |
| `TEXTUREPACK_ID` | 48 |
| ``${GAME_ID}-fallback`` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch
- ${MSCLOADER_NAME} Installer

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Delete **
- **Restore **
- **Open Data Folder**
- **Open Save Folder**
- **Open BepInEx Config**
- **Open BepInEx Log**
- **Download BepInExConfigManager**
- **Open MelonLoader Config**
- **Open MelonLoader Log**
- **Download MelonPreferencesManager**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
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
