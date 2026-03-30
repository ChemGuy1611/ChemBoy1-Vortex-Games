# Lies of P — Vortex Extension Explained

## Overview

```
/////////////////////////////////////////////////
Name: Lies of P Vortex Extension
Structure: UE4 (XBOX Integrated)
Author: ChemBoy1
Version: 0.4.0
Date: 2025-06-17
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `liesofp` |
| Extension Version | 0.4.0 |
| Steam App ID | 1627720 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | Neowiz.3616725F496B |
| Executable | `N/A` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Paks | `?` | low | '{gamePath}', PAK_PATH |
| Root Game Folder | `?` | high | {gamePath} |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `CONFIG_ID` | 27 |
| `SAVE_ID` | 29 |
| `ROOT_ID` | 31 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Paks Mods Folder**
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
