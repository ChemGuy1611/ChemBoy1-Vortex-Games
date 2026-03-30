# Marvel — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////
Name: Marvel's Spider-Man 2 Vortex Extension
Structure: 3rd-Party Mod Manager (Overstrike)
Author: ChemBoy1
Version: 0.2.0
Date: 2026-03-06
////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `marvelsspiderman2` |
| Extension Version | 0.2.0 |
| Steam App ID | 2651280 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `Spider-Man2.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/1166 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Marvel |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `OVERSTRIKE_ID` | 25 |
| `OSMOD_ID` | 30 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **TOC Reset (After Update)**
- **.NET 7 Download Page**
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
