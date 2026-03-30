# Resident Evil 4 (2023) — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////
Name: Resident Evil 4 (2023) + Chainsaw Demo Vortex Extension
Structure: 3rd Party Mod Manager (Fluffy)
Author: ChemBoy1
Version: 0.4.1
Date: 2026-03-11
///////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `residentevil42023` |
| Extension Version | 0.4.1 |
| Steam App ID | 2050650 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `re4.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/913 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Resident_Evil_4_(2023) |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `FLUFFY_ID` | 25 |
| `REF_ID` | 27 |
| `LOOSELUA_ID` | 29 |
| `ROOT_ID` | 31 |
| `UPSCALER_ID` | 33 |
| `PRESET_ID` | 35 |
| `FLUFFYMOD_ID` | 45 |
| ``${FLUFFYMOD_ID}zip`` | 45 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch
- Steam Demo Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config File**
- **Open Save Folder**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.) from Nexus Mods.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
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
