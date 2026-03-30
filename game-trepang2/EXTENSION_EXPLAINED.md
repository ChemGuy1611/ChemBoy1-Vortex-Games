# Trepang2 — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////
Name: Trepang2 Vortex Extension
Structure: UE4
Author: ChemBoy1
Version: 0.1.1
Date: 08/08/2024
////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `trepang2` |
| Extension Version | 0.1.1 |
| Steam App ID | 1164940 |
| Epic App ID | N/A |
| GOG App ID | 1599916752 |
| Xbox App ID | N/A |
| Executable | `CPPFPS.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries (Engine Injector) | `?` | high | "{gamePath}", BINARIES_PATH |
| Config (LocalAppData) | `?` | high | "{localAppData}", CONFIG_PATH |
| Saves (LocalAppData) | `?` | high | "{localAppData}", SAVE_PATH |
| Paks | `?` | low | '{gamePath}', PAK_PATH |
| Root Game Folder | `?` | high | {gamePath} |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| ``${GAME_ID}-config`` | 35 |
| ``${GAME_ID}-root`` | 45 |
| ``${GAME_ID}-save`` | 55 |

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
