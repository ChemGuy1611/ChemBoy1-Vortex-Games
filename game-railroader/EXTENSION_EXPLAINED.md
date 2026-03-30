# Railroader — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////
Name: Railroader Vortex Extension
Structure: Unity UMM (Unity Mod Manager)
Author: ChemBoy1
Version: 0.1.0
Date: 2026-XX-XX
//////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `railroader` |
| Extension Version | 0.1.0 |
| Steam App ID | 1683150 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `${GAME_STRING}.exe` |
| Extension Page | XXX |
| PCGamingWiki | https://railroader.fandom.com/wiki/Railroader_Wiki |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|
| `allowSymlinks` | true | Symlink deployment allowed |
| `fallbackInstaller` | true | Catch-all fallback installer active |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `ROOT_ID` | 8 |
| `ASSEMBLY_ID` | 25 |
| `ASSETS_ID` | 27 |
| `SAVE_ID` | 49 |
| ``${GAME_ID}-fallback`` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch
- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config (Registry)**
- **Open Data Folder**
- **Open Save Folder**
- **Open Wiki Page**
- **View Changelog**
- **Open Downloads Folder**
- **Submit Bug Report**

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
