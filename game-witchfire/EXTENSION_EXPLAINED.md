# Witchfire — Vortex Extension Explained

## Overview

```
//////////////////////////////////////
Name: Witchfire Vortex Extension
Structure: UE4
Author: ChemBoy1
Version: 0.4.0
Date: 2026-01-31
//////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `witchfire` |
| Extension Version | 0.4.0 |
| Steam App ID | 3156770 |
| Epic App ID | 8764f82381f5436f99e97172df06af35 |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `Witchfire.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/1647 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Witchfire |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries (Engine Injector) | `?` | high | "{gamePath}", BINARIES_PATH |
| Config (LocalAppData) | `?` | high | "{localAppData}", CONFIG_PATH |
| Save Game | `?` | high | "{localAppData}", SAVE_PATH |
| Paks | `?` | low | "{gamePath}", PAK_PATH |
| Root Game Folder | `?` | high | {gamePath} |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `UE4SSCOMBO_ID` | 21 |
| `LOGICMODS_ID` | 23 |
| `UE4SS_ID` | 27 |
| `SCRIPTS_ID` | 29 |
| `DLL_ID` | 31 |
| `CONFIG_ID` | 33 |
| `ROOT_ID` | 35 |
| `SAVE_ID` | 37 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

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
- **Open UE4SS Settings INI**
- **Open UE4SS mods.json**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
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
