# Marvel Rivals — Vortex Extension Explained

## Overview

```
////////////////////////////////////////
Name: Marvel Rivals Vortex Extension
Structure: UE5
Author: ChemBoy1
Version: 0.5.2
Date: 2026-03-16
////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `marvelrivals` |
| Extension Version | 0.5.2 |
| Steam App ID | 2767030 |
| Epic App ID | 575efd0b5dd54429b035ffc8fe2d36d0 |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `N/A` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `'ue5-pak-installer'` | 35 |
| `ROOT_ID` | 30 |
| `SIGBYPASS_ID` | 37 |
| `CONFIG_ID` | 40 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config Folder (LocalAppData)**
- **View Changelog**
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
