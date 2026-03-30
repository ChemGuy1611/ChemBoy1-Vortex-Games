# Mewgenics — Vortex Extension Explained

## Overview

```
///////////////////////////////////////////
Name: Mewgenics Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.1.2
Date: 2026-03-25
///////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `mewgenics` |
| Extension Version | 0.1.2 |
| Steam App ID | 686060 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `Mewgenics.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/1691 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Mewgenics |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|
| `hasLoader` | false | No mod loader |
| `allowSymlinks` | true | Symlink deployment allowed |
| `rootInstaller` | false | Root installer disabled |
| `fallbackInstaller` | true | Catch-all fallback installer active |
| `setupNotification` | true | Setup notification shown to users |
| `hasUserIdFolder` | true | Save path includes a user ID subfolder |
| `debug` | false | Debug logging disabled |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `LOADER_ID` | 25 |
| `SAVE_EDITOR_ID` | 26 |
| `MEWJECTOR_ID` | 27 |
| `MOD_ID` | 28 |
| `CONFIG_ID` | 29 |
| `SAVE_ID` | 30 |
| `ROOT_ID` | 31 |
| `MEWJECTOR_MOD_ID` | 33 |
| ``${GAME_ID}-fallback`` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config Folder**
- **Open modlist.txt (Load Order)**
- **Open Save Folder**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
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
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via:

```js
module.exports = { default: main };
```

The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
