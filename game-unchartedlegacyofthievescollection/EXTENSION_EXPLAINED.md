# Uncharted: Legacy of Thieves Collection — Vortex Extension Explained

## Overview

```
Name: Uncharted: Legacy of Thieves Collection Vortex Extension
Structure: 3rd Party Mod Manager (Fluffy)
Author: ChemBoy1
Version: 0.2.0
Date: 03/18/2025
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `unchartedlegacyofthievescollection` |
| Extension Version | 0.2.0 |
| Steam App ID | 1659420 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `u4-l.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries / Game Root Folder | `?` | high | {gamePath} |
| Fluffy Mod Manager | `?` | low | {gamePath} |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `FLUFFY_ID` | 25 |
| `PSARC_ID` | 30 |
| ``${GAME_ID}-mods`` | 40 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Launch Uncharted 4
- Launch Uncharted TLL
- Fluffy Mod Manager

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
