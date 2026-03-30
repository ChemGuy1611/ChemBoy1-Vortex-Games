# State of Decay 2 — Vortex Extension Explained

## Overview

```
/////////////////////////////////////////////////////
Name: State of Decay 2 Vortex Extension
Structure: UE4 (Local AppData)
Author: ChemBoy1
Version: 2.2.0
Date: 2026-01-31
/////////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `stateofdecay2` |
| Extension Version | 2.2.0 |
| Steam App ID | 495420 |
| Epic App ID | Snoek |
| GOG App ID | N/A |
| Xbox App ID | Microsoft.Dayton |
| Executable | `StateOfDecay2.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/946 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/State_of_Decay_2 |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Config (LocalAppData) | `?` | high | "{localAppData}", CONFIG_PATH |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `MANAGER_ID` | 30 |
| `CONFIG_ID` | 35 |
| `COOKED_ID` | 40 |
| `ROOT_ID` | 45 |
| `BINARIES_ID` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- SoD2 Mod Manager
- Custom Launch
- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Download SoD2 Mod Manager**
- **Open Paks Folder**
- **Open Config Folder**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
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
