# Nioh 3 — Vortex Extension Explained

## Overview

```
///////////////////////////////////////////
Name: Nioh 3 Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.3.0
Date: 2026-03-09
///////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `nioh3` |
| Extension Version | 0.3.0 |
| Steam App ID | 3681010 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `Nioh3.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/1676 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Nioh_3 |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|
| `hasLoader` | true | Mod loader required |
| `allowSymlinks` | true | Symlink deployment allowed |
| `rootInstaller` | false | Root installer disabled |
| `fallbackInstaller` | true | Catch-all fallback installer active |
| `setupNotification` | true | Setup notification shown to users |
| `hasUserIdFolder` | false | No user ID subfolder |
| `debug` | false | Debug logging disabled |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `LOADER_ID` | 25 |
| `RDBEXPLORER_ID` | 26 |
| `YUMIA_ID` | 27 |
| `LOOSELOADER_ID` | 28 |
| `MOD_MANAGER_ID` | 29 |
| `MOD_ID` | 31 |
| `MOD_ID` | 31 |
| `LOADER_MOD_ID` | 33 |
| `YUMIA_MOD_ID` | 35 |
| `RDB_MOD_ID` | 35 |
| `CONFIG_ID` | 43 |
| `SAVE_ID` | 45 |
| `ROOT_ID` | 47 |
| ``${GAME_ID}-fallback`` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Run Merge (Yumia)**
- **Reset root.rdb Files (Yumia)**
- **Download ${RDBEXPLORER_NAME}**
- **Open Config Folder**
- **Open Save Folder**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
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
