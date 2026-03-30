# Middle-earth: Shadow of War — Vortex Extension Explained

## Overview

```
///////////////////////////////////////////
Name: Middle-earth: Shadow of War Vortex Extension
Structure: Mod Loaders + Mods folder w/ LO support
Author: ChemBoy1
Version: 2.3.0
Date: 2026-03-24
///////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `middleearthshadowofwar` |
| Extension Version | 2.3.0 |
| Steam App ID | 356190 |
| Epic App ID | N/A |
| GOG App ID | 1324471032 |
| Xbox App ID | WarnerBros.Interactive.WB-Kraken |
| Executable | `ShadowOfWar.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/375 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Middle-earth:_Shadow_of_War |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `PACKETLOADER_ID` | 25 |
| `DLLLOADER_ID` | 27 |
| `MODLOADER_ID` | 29 |
| `MOD_ID` | 31 |
| `PLUGINS_ID` | 33 |
| `ROOT_ID` | 35 |
| `CONFIG_ID` | 43 |
| ``${GAME_ID}-fallback`` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open default.archcfg File**
- **Open ${PACKETLOADER_INI}**
- **Open Config / Save Folder**
- **Download Middle-Earth-Mod-Loader**
- **Get MEML Mods (GitHub)**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Open Downloads Folder**
- **Submit Bug Report**

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
