# Slay the Spire 2 — Vortex Extension Explained

## Overview

```
///////////////////////////////////////////
Name: Slay the Spire 2 Vortex Extension
Structure: Basic Game - GODOT Engine
Author: ChemBoy1
Version: 0.1.1
Date: 2026-03-16
Notes:
- Game is GODOT Engine with a built-in mod loader
- Separate save folders for vanilla and modded saves
///////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `slaythespire2` |
| Extension Version | 0.1.1 |
| Steam App ID | 2868840 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `SlayTheSpire2.exe` |
| Extension Page | XXX |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Slay_the_Spire_2 |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|
| `hasLoader` | false | No mod loader |
| `allowSymlinks` | true | Symlink deployment allowed |
| `rootInstaller` | true | Root folder installer active |
| `fallbackInstaller` | true | Catch-all fallback installer active |
| `setupNotification` | false | No setup notification |
| `hasUserIdFolder` | true | Save path includes a user ID subfolder |
| `debug` | false | Debug logging disabled |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `LOADER_ID` | 25 |
| `ROOT_ID` | 27 |
| `MOD_ID` | 29 |
| ``${GAME_ID}-fallback`` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch
- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config Folder**
- **Open Save Folder (Modded)**
- **Open Save Folder (Vanilla)**
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
