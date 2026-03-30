# Horizon Zero Dawn Remastered — Vortex Extension Explained

## Overview

```
Name: Horizon Zero Dawn Remastered Vortex Extension
Author: ChemBoy1
Version: 0.1.2
Date: 11/07/2024
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `horizonzerodawnremastered` |
| Extension Version | 0.1.2 |
| Steam App ID | 2561580 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `HorizonZeroDawnRemastered.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Save Game (Documents) | `?` | high | ? |
| Package (Game Data) | `?` | high | '{gamePath}', PACKAGE_PATH |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| ``${GAME_ID}-save`` | 25 |
| ``${GAME_ID}-package`` | 30 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
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
