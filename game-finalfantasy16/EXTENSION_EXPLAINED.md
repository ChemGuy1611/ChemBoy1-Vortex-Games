# finalfantasy16 — Vortex Extension Explained

## Overview

```
Name: Final Fantasy XVI Vortex Extension
Structure: 3rd-Party Mod Installer
Author: ChemBoy1
Version: 0.1.1
Date: 09/18/2024
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `finalfantasy16` |
| Extension Version | 0.1.1 |
| Steam App ID | 2515020 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `ffxvi.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Reloaded Mod | `?` | high | '{gamePath}', RELOADED_PATH |
| Reloaded Mod Manager | `?` | low | {gamePath} |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| ``${GAME_ID}-reloadedmanager`` | 25 |
| ``${GAME_ID}-reloadedmod`` | 30 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.) from Nexus Mods.
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
