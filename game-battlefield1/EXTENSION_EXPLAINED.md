# battlefield1 — Vortex Extension Explained

## Overview

```
Name: Battlefield 1 Vortex Extension
Author: ChemBoy1
Version: 0.2.2
Date: 09/13/2024
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `battlefield1` |
| Extension Version | 0.2.2 |
| Steam App ID | 1238840 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `bf1.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries (Engine Injector) | `?` | high | {gamePath} |
| Frosty .fbmod | `?` | high | '{gamePath}', FROSTY_PATH |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `'masseffectandromeda-frostymodmanager'` | 25 |
| `'masseffectandromeda-fbmod'` | 30 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Launch Modded Game
- Frosty Mod Manager

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.) from Nexus Mods.
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
