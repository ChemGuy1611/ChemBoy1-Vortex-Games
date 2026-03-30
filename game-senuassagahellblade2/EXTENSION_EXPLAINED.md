# Senua — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////////////
Name: Hellblade 2 Vortex Extension
Structure: UE5 (XBOX Integrated)
Author: ChemBoy1
Version: 0.5.0
Date: 2026-02-01
//////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `senuassagahellblade2` |
| Extension Version | 0.5.0 |
| Steam App ID | 2461850 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | Microsoft.Superb |
| Executable | `N/A` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Save (LocalAppData) | `?` | high | '{localAppData}', SAVE_PATH |
| UE5 Paks | `?` | high | '{gamePath}', UE5_PATH |
| Paks (Alt, no | `?` | high | '{gamePath}', UE5_ALT_PATH |
| Root Game Folder | `?` | high | {gamePath} |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `'ue5-pak-installer'` | 25 |
| ``${GAME_ID}-config`` | 30 |
| ``${GAME_ID}-save`` | 35 |
| ``${GAME_ID}-root`` | 40 |

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
