# Disco Elysium — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////
Name: Disco Elysium Vortex Extension
Structure: Unity BepinEx
Author: ChemBoy1
Version: 0.1.4
Date: 2026-03-22
//////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `discoelysium` |
| Extension Version | 0.1.4 |
| Steam App ID | 632470 |
| Epic App ID | 7334aba246154b63857435cb9c7eecd5 |
| GOG App ID | 1771589310 |
| Xbox App ID | ZAUMStudioDiscoElysiumUKL.DiscoElysium-TheFinalCut |
| Executable | `disco.exe` |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Disco_Elysium |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|
| `allowSymlinks` | true | Symlink deployment allowed |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `ROOT_ID` | 8 |
| `BEPCFGMAN_ID` | 9 |
| `ASSEMBLY_ID` | 25 |
| `ASSETS_ID` | 27 |
| `SAVE_ID` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch
- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open BepInEx.cfg**
- **Download BepInExConfigManager**
- **Open Data Folder**
- **Open Config Folder**
- **Open Save Folder**
- **Open PCGamingWiki Page**
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
