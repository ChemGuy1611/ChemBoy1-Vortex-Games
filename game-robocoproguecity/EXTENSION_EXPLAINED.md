# RoboCop: Rogue City — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////
Name: RoboCop Rogue City and Unfinished Business Vortex Extension
Structure: UE5
Author: ChemBoy1
Version: 0.7.0
Date: 2026-02-01
////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `robocoproguecity` |
| Extension Version | 0.7.0 |
| Steam App ID | 1681430 |
| Epic App ID | N/A |
| GOG App ID | 1950574400 |
| Xbox App ID | BigbenInteractiveSA.RoboCopRogueCity |
| Executable | `N/A` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `UE5_SORTABLE_ID` | 29 |
| `UE5_SORTABLE_ID_UNFINISHED` | 29 |
| `UE4SSCOMBO_ID` | 25 |
| `LOGICMODS_ID` | 27 |
| `UE4SS_ID` | 31 |
| `SCRIPTS_ID` | 33 |
| `DLL_ID` | 35 |
| `ROOT_ID` | 37 |
| `CONTENT_ID` | 39 |
| `CONFIG_ID` | 41 |
| `SAVE_ID` | 43 |
| `BINARIES_ID` | 45 |
| `UE4SSCOMBO_ID_UNFINISHED` | 25 |
| `LOGICMODS_ID_UNFINISHED` | 27 |
| `UE4SS_ID_UNFINISHED` | 31 |
| `SCRIPTS_ID_UNFINISHED` | 33 |
| `DLL_ID_UNFINISHED` | 35 |
| `ROOT_ID_UNFINISHED` | 37 |
| `CONTENT_ID_UNFINISHED` | 39 |
| `CONFIG_ID_UNFINISHED` | 41 |
| `SAVE_ID_UNFINISHED` | 43 |
| `BINARIES_ID_UNFINISHED` | 45 |

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
- **Open Paks Folder**
- **Open Binaries Folder**
- **Open UE4SS Mods Folder**
- **Open Config Folder**
- **Open Saves Folder**
- **Download UE4SS**
- **View Changelog**
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
