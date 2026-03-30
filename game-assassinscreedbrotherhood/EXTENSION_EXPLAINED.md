# Assassin — Vortex Extension Explained

## Overview

```
Name: AC Brotherhood Vortex Extension
Structure: Ubisoft AnvilToolkit
Author: ChemBoy1
Version: 0.1.0
Date: 07/29/2024
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `assassinscreedbrotherhood` |
| Extension Version | 0.1.0 |
| Steam App ID | 48190 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `ACBSP.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries / Root Game Folder | `assassinscreediii-binaries` | high | {gamePath} |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `'assassinscreedivblackflag-mod'` | 25 |
| ``${GAME_ID}-atk`` | 25 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- AnvilToolkit

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.) from Nexus Mods.

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
