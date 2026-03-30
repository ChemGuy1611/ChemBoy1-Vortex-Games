# Alan Wake 2 — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////////////
Name: Alan Wake 2 Vortex Extension
Structure: Root Folder Mod Loader
Author: ChemBoy1
Version: 1.2.0
Date: 2026-03-22
//////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `alanwake2` |
| Extension Version | 1.2.0 |
| Steam App ID | N/A |
| Epic App ID | dc9d2e595d0e4650b35d659f90d41059 |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `AlanWake2.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/836 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Alan_Wake_2 |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| ``${GAME_ID}-modloader`` | 25 |
| ``${GAME_ID}-folders`` | 27 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- RMDTOC Tool
- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config Folder**
- **Open Save Folder**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
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
