# horizonforbiddenwest — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////
Name: Horizon Forbidden West Vortex Extension
Author: ChemBoy1
Version: 0.2.4
Date: 2026-01-27
////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `horizonforbiddenwest` |
| Extension Version | 0.2.4 |
| Steam App ID | 2420110 |
| Epic App ID | 2efe99166b8847e9bcd80c571b05e1b6 |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `HorizonForbiddenWest.exe` |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Horizon_Forbidden_West |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Save Game (Documents) | `?` | low | ? |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `REPACKER_ID` | 25 |
| `MANAGERMOD_ID` | 27 |
| `SAVE_ID` | 25 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Download HFW Mod Manager**
- **Download Repacker**
- **Open HFW Mod Manager Page**
- **Open Saves Folder**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
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
