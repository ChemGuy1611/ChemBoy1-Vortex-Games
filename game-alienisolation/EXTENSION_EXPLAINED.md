# Alien Isolation — Vortex Extension Explained

## Overview

```
//
Name: Alien Isolation Vortex Extension
Author: ChemBoy1
Version: 0.1.2
Date: 01/06/2025
/
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `alienisolation` |
| Extension Version | 0.1.2 |
| Steam App ID | 214490 |
| Epic App ID | 8935bb3e1420443a9789fe01758039a5 |
| GOG App ID | 1744178250 |
| Xbox App ID | N/A |
| Executable | `AI.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Data Files | `?` | high | '{gamePath}', DATA_FOLDER |
| Binaries / Root Game Folder | `?` | high | {gamePath} |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| ``${GAME_ID}-datafolder`` | 25 |
| ``${GAME_ID}-datafiles`` | 30 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

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
