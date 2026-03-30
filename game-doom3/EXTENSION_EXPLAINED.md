# DOOM 3 — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////
Name: DOOM 3 & DOOM 3: BFG Edition Vortex Extension
Structure: Basic multi-game with multiple exes
Author: ChemBoy1
Version: 0.4.1
Date: 2026-01-16
/////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `doom3` |
| Extension Version | 0.4.1 |
| Steam App ID | 9050 |
| Epic App ID | N/A |
| GOG App ID | 1492054092 |
| Xbox App ID | BethesdaSoftworks.Doom32004 |
| Executable | `N/A` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `DHEWM3_ID` | 25 |
| `ROOT_ID` | 27 |
| `ROOT_ID_BFG` | 25 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config Folder**
- **Open Saves Folder**
- **View Changelog**
- **Open Downloads Folder**
- **Open Config Folder**
- **Open Saves Folder**
- **View Changelog**
- **Open Downloads Folder**

## Special Features

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
```

## Entry Point

The extension is registered via:

```js
module.exports = { default: main };
```

The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
