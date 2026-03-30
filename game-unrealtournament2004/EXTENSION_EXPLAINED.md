# Unreal Tournament 2004 — Vortex Extension Explained

## Overview

```
///////////////////////////////////////////
Name: Unreal Tournament 2004 Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.1.1
Date: 2026-03-27
///////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `unrealtournament2004` |
| Extension Version | 0.1.1 |
| Steam App ID | N/A |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `UT2004.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/1703 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Unreal_Tournament_2004 |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|
| `hasLoader` | false | No mod loader |
| `allowSymlinks` | true | Symlink deployment allowed |
| `fallbackInstaller` | true | Catch-all fallback installer active |
| `setupNotification` | false | No setup notification |
| `debug` | false | Debug logging disabled |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `MOD_ID` | 27 |
| ``${GAME_ID}-fallback`` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Download OldUnreal Patches (Browse)**
- **Open OldUnreal Page**
- **Open Engine Settings File**
- **Open User Settings File**
- **Open Save Folder**
- **Open PCGamingWiki Page**
- **Open Unreal Wiki Page**
- **Open OldUnreal Page**
- **Open ModDB Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

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
