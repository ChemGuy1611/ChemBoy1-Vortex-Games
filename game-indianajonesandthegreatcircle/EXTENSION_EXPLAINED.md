# indianajonesandthegreatcircle — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////
Name: Indiana Jones and the Great Circle Vortex Extension
Structure: Basic Game (with Xbox) - Future Mod Injector
Author: ChemBoy1
Version: 0.2.0
Date: 2025-12-09
////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `indianajonesandthegreatcircle` |
| Extension Version | 0.2.0 |
| Steam App ID | 2677660 |
| Epic App ID | N/A |
| GOG App ID | 1953447949 |
| Xbox App ID | BethesdaSoftworks.ProjectRelic |
| Executable | `TheGreatCircle.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Sounds | `?` | high | '{gamePath}', SOUND_PATH |
| Binaries (Engine Injector) | `?` | high | {gamePath} |
| Mod Injector | `?` | low | {gamePath} |
| Config (Saved Games) | `?` | high | ? |
| Save (Steam) | `?` | high | ? |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `INJECTOR_ID` | 25 |
| `CONFIG_ID` | 30 |
| `SAVE_ID` | 35 |
| `SOUND_ID` | 40 |
| ``${GAME_ID}-zip-mod`` | 45 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch
- Indiana Jones Mod Injector

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config Folder**
- **Open Saves Folder**
- **View Changelog**
- **Open Downloads Folder**

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
