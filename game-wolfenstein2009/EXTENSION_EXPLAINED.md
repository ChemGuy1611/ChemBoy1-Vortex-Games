# Wolfenstein (2009) — Vortex Extension Explained

## Overview

```
/////////////////////////////////////////
Name: Wolfenstein (2009) Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.2.2
Date: 08/07/2024
//////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `wolfenstein2009` |
| Extension Version | 0.2.2 |
| Steam App ID | 10170 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `N/A` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| SinglePlayer base Folder | `?` | high | '{gamePath}', "SP", "base" |
| MultiPlayer base Folder | `?` | high | '{gamePath}', "MP", "base" |
| SP Folder | `?` | high | '{gamePath}', "SP" |
| MP Folder | `?` | high | '{gamePath}', "MP" |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| ``${GAME_ID}-base`` | 25 |
| ``${GAME_ID}-maps`` | 30 |
| ``${GAME_ID}-streampacks`` | 35 |
| ``${GAME_ID}-videos`` | 40 |
| ``${GAME_ID}-pk4`` | 45 |
| ``${GAME_ID}-exe`` | 50 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Launch SP Game
- Launch MP Game

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.

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
