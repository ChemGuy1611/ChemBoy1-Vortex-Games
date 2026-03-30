# Pathologic 3 — Vortex Extension Explained

## Overview

```
///////////////////////////////////////////
Name: Pathologic 3 Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.1.0
Date: 2025-01-14
///////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `pathologic3` |
| Extension Version | 0.1.0 |
| Steam App ID | 3199650 |
| Epic App ID | N/A |
| GOG App ID | 1567359699 |
| Xbox App ID | XXX |
| Executable | `Pathologic3.exe` |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Pathologic_3 |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|
| `hasLoader` | true | Mod loader required |
| `rootInstaller` | true | Root folder installer active |
| `fallbackInstaller` | true | Catch-all fallback installer active |
| `debug` | false | Debug logging disabled |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `LOADER_ID` | 25 |
| `MOD_ID` | 27 |
| `ROOT_ID` | 29 |
| `CONFIG_ID` | 43 |
| `SAVE_ID` | 45 |
| ``${GAME_ID}-fallback`` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch
- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config Folder**
- **Open Save Folder**
- **Open PCGamingWiki Page**
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
