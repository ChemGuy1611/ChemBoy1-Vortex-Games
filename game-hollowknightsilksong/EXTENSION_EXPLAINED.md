# Hollow Knight: Silksong — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////
Name: Hollow Knight: Silksong Vortex Extension
Structure: Unity BepinEx
Author: ChemBoy1
Version: 0.3.0
Date: 2026-03-29
//////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `hollowknightsilksong` |
| Extension Version | 0.3.0 |
| Steam App ID | 1030300 |
| Epic App ID | N/A |
| GOG App ID | 1558393671 |
| Xbox App ID | TeamCherry.HollowKnightSilksong |
| Executable | `Hollow Knight Silksong.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/1420 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Hollow_Knight:_Silksong |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `ROOT_ID` | 8 |
| `BEPCFGMAN_ID` | 9 |
| `BEPINEX_ID` | 25 |
| `MELON_ID` | 27 |
| `BEPMOD_ID` | 29 |
| `MELONMOD_ID` | 31 |
| `ASSEMBLY_ID` | 33 |
| `SKIN_ID` | 35 |
| `SAVE_ID` | 47 |
| ``${GAME_ID}-fallback`` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Download BepInExConfigManager**
- **Open BepInEx.cfg**
- **Open Data Folder**
- **Open Save Folder**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
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
