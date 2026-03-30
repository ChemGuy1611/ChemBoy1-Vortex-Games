# Age of Mythology: Retold — Vortex Extension Explained

## Overview

```
Name: Age of Mythology: Retold Vortex Extension
Structure: Generic Game
Author: ChemBoy1
Version: 0.1.6
Date: 11/07/2024
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `ageofmythologyretold` |
| Extension Version | 0.1.6 |
| Steam App ID | 1934680 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | Microsoft.AthensStandardEdition |
| Executable | `N/A` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Game Data Folder | `?` | high | '{gamePath}', DATA_FOLDER |
| Binaries / Root Game Folder | `?` | high | {gamePath} |
| Config (UserGames) | `?` | high | ? |
| Save (UserGames) | `?` | high | ? |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| ``${GAME_ID}-data`` | 25 |
| ``${GAME_ID}-save`` | 30 |
| ``${GAME_ID}-config`` | 35 |
| ``${GAME_ID}-reshade`` | 40 |
| ``${GAME_ID}-binaries`` | 45 |

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
