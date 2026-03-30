# CloverPit — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////
Name: CloverPit Vortex Extension
Structure: Unity BepinEx/MelonLoader Hybrid (Mono & x64)
Author: ChemBoy1
Version: 0.1.1
Date: 2025-11-24
//////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `cloverpit` |
| Extension Version | 0.1.1 |
| Steam App ID | 3314790 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | FutureFriendsGames.CloverPit |
| Executable | `CloverPit.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `BEPINEX_ID` | 25 |
| `MELON_ID` | 26 |
| `ROOT_ID` | 27 |
| `BEPCFGMAN_ID` | 29 |
| `ASSEMBLY_ID` | 31 |
| ``${GAME_ID}-plugin`` | 33 |
| `ASSETS_ID` | 37 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Saves Folder**
- **Open Data Folder**
- **View Changelog**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
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
