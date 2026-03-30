# Lost Soul Aside — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////////////
Name: Lost Soul Aside Vortex Extension
Structure: UE5
Author: ChemBoy1
Version: 0.1.0
Date: 2025-08-29
//////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `lostsoulaside` |
| Extension Version | 0.1.0 |
| Steam App ID | 3378960 |
| Epic App ID | 8fe50ab7cb6b4ec586c8558036ecbbba |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `LostSoulAside.exe` |

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
| `CONTENT_ID` | 38 |
| `CONFIG_ID` | 39 |
| `SAVE_ID` | 41 |
| `BINARIES_ID` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Demo Launch
- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Paks Folder**
- **Open Binaries Folder**
- **Open UE4SS Mods Folder**
- **Open LogicMods Folder**
- **Open Config Folder**
- **Open Saves Folder**
- **Download UE4SS**
- **View Changelog**
- **Open Downloads Folder**

## Special Features

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
```

## Entry Point

The extension is registered via:

```js
module.exports = { default: main };
```

The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
