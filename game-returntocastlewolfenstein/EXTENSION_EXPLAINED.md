# Return to Castle Wolfenstein — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Return to Castle Wolfenstein Vortex Extension |
| Engine / Structure | Generic Game with Custom Engine Mod (RealRTCW) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `returntocastlewolfenstein` |
| Executable | `WolfSP.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `9010`
- **GOG** — `1441704976`
- **Xbox / Microsoft Store** — `BethesdaSoftworks.ReturntoCastleWolfenstein`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| .pk3 Data (Main) | `returntocastlewolfenstein-main` | high | `{gamePath}/Main` |
| Main Folder | `returntocastlewolfenstein-mainfolder` | high | `{gamePath}/.` |
| RealRTCW | `returntocastlewolfenstein-realrtcw` | low | `{gamePath}` |
| ioRTCW | `returntocastlewolfenstein-iortcw` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `returntocastlewolfenstein-iortcw` | 25 |
| `returntocastlewolfenstein-realrtcw` | 30 |
| `returntocastlewolfenstein-mainfolder` | 35 |
| `returntocastlewolfenstein-main` | 40 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch RealRTCW**
- **Launch ioRTCW**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download RealRTCW
- Download ioRTCW

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

## How Mod Installation Works

```
User drops archive into Vortex
  └── Each installer's test() runs in priority order
       └── First supported=true wins
            └── install() returns copy instructions + setmodtype
                 └── Vortex stages files
                      └── User deploys
                           └── Vortex links/copies to game folder
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
