# WUCHANG: Fallen Feathers — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////
Name: WUCHANG: Fallen Feathers Vortex Extension
Structure: UE5 (Xbox-Integrated)
Author: ChemBoy1
Version: 0.1.2
Date: 2025-07-28
////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `wuchangfallenfeathers` |
| Extension Version | 0.1.2 |
| Steam App ID | 2277560 |
| Epic App ID | ebfa14ea910a4e55a48ccf5daf6c2607 |
| GOG App ID | N/A |
| Xbox App ID | 505GAMESS.P.A.WuchangPCGP |
| Executable | `N/A` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `'ue5-pak-installer'` | 29 |
| `UE4SSCOMBO_ID` | 25 |
| `LOGICMODS_ID` | 27 |
| `UE4SS_ID` | 31 |
| `SIGBYPASS_ID` | 32 |
| `SCRIPTS_ID` | 33 |
| `DLL_ID` | 35 |
| `ROOT_ID` | 37 |
| `CONTENT_ID` | 39 |
| `CONFIG_ID` | 41 |
| `SAVE_ID` | 43 |
| `BINARIES_ID` | 45 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Paks Folder**
- **Open Binaries Folder**
- **Open UE4SS Mods Folder**
- **Open Config Folder**
- **Open Saves Folder**
- **Download UE4SS**
- **View Changelog**
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
