# Warhammer 40,000: Space Marine 2 — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////
Name: WH40K Space Marine 2 Vortex Extension
Structure: Mods Folder w/ LO
Author: ChemBoy1
Version: 0.5.2
Date: 2025-02-08
////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `warhammer40000spacemarine2` |
| Extension Version | 0.5.2 |
| Steam App ID | 2183900 |
| Epic App ID | bb6054d614284c39bb203ebe134e5d79 |
| GOG App ID | N/A |
| Xbox App ID | FocusHomeInteractiveSA.Magnus |
| Executable | `Warhammer 40000 Space Marine 2.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/961 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Warhammer_40,000:_Space_Marine_II |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Config (LocalAppData) | `?` | high | "{gamePath}", BINARIES_PATH |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `INTEGRATION_STUDIO_ID` | 25 |
| `PAK_ID` | 27 |
| `ROOT_ID` | 29 |
| `LOCAL_ID` | 31 |
| `LOCALSUB_ID` | 33 |
| `BINARIES_ID` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **=== BACKUP SAVES ===**
- **=== RESTORE SAVES ===**
- **Open Saves (Profile) Folder**
- **Open ${LO_FILE} (Load Order)**
- **Download Integration Studio**
- **Download Custom Stratagems**
- **Open Custom Stratagems Folder**
- **Copy Custom Strat to mods**
- **Download Index V2**
- **Open Binaries Folder**
- **Open Loose Mods Folder**
- **Open Pak Mods Folder**
- **Open Local AppData Folder**
- **Open Crash Reports Folder**
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
