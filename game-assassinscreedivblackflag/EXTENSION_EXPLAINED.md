# Assassin — Vortex Extension Explained

## Overview

```
Name: AC IV Black Flag Vortex Extension
Structure: Ubisoft AnvilToolkit
Author: ChemBoy1
Version: 0.4.3
Date: 03/18/2025
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `assassinscreedivblackflag` |
| Extension Version | 0.4.3 |
| Steam App ID | 242050 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `AC4BFSP.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `ATK_ID` | 25 |
| `DLC_ID` | 30 |
| `EXTRACTED_ID` | 35 |
| `FORGEFOLDER_ID` | 40 |
| `DATAFOLDER_ID` | 45 |
| `LOOSE_ID` | 50 |
| `FIXES_ID` | 55 |
| `RESOREP_ID` | 57 |
| `FORGE_ID` | 60 |
| `ROOT_ID` | 65 |
| `RESOREP_TEXTURES_ID` | 70 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
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
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via:

```js
module.exports = { default: main };
```

The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
