# PC Building Simulator 2 — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////
Name: PC Building Simulator 2 Vortex Extension
Structure: Unity BepinEx (IL2CPP)
Author: ChemBoy1
Version: 0.1.2
Date: 2026-03-22
//////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `pcbuildingsimulator2` |
| Extension Version | 0.1.2 |
| Steam App ID | N/A |
| Epic App ID | 0449f415f5404df093b8d67c31940024 |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `PCBS2.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `ROOT_ID` | 8 |
| `BEPCFGMAN_ID` | 9 |
| `PC_ID` | 25 |
| `ASSEMBLY_ID` | 27 |
| `ASSETS_ID` | 29 |
| `SAVE_ID` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config (Registry)**
- **Download BepInExConfigManager**
- **Open BepInEx.cfg**
- **Open Data Folder**
- **Open Save Folder**
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
