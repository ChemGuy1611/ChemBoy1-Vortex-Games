# Farming Simulator 25 — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////
Name: Farming Simulator 25 Vortex Extension
Author: ChemBoy1
Version: 0.2.0
Date: 2026-01-27
////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `farmingsimulator25` |
| Extension Version | 0.2.0 |
| Steam App ID | 2300320 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | GIANTSSoftware.FarmingSimulator25PC |
| Executable | `FarmingSimulator2025.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Map Mod (Game Folder) | `?` | high | '{gamePath}', I3D_PATH |
| PDLC (Game Folder) | `?` | high | '{gamePath}', PDLC_PATH |
| Root Game Folder | `?` | high | {gamePath} |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `I3D_ID` | 25 |
| `ZIP_ID` | 30 |

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
