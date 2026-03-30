# Return to Castle Wolfenstein — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////////////
Name: Return to Castle Wolfenstein Vortex Extension
Structure: Generic Game with Custom Engine Mod (RealRTCW)
Author: ChemBoy1
Version: 0.4.1
Date: 03/20/2025
////////////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `returntocastlewolfenstein` |
| Extension Version | 0.4.1 |
| Steam App ID | 9010 |
| Epic App ID | N/A |
| GOG App ID | 1441704976 |
| Xbox App ID | BethesdaSoftworks.ReturntoCastleWolfenstein |
| Executable | `WolfSP.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `IORTCW_ID` | 25 |
| `REALRTCW_ID` | 30 |
| `MAIN_ID` | 35 |
| `PK3_ID` | 40 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Launch RealRTCW
- Launch ioRTCW

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Download RealRTCW**
- **Download ioRTCW**

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
