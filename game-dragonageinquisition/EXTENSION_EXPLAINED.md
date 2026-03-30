# Dragon Age: Inquisition — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////
Name: Dragon Age Inquisition Vortex Extension
Structure: 3rd-Party Mod Manager (Frosty)
Author: ChemBoy1
Version: 0.2.4
Date: 2026-01-30
/////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `dragonageinquisition` |
| Extension Version | 0.2.4 |
| Steam App ID | 1222690 |
| Epic App ID | verdi |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `DragonAgeInquisition.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/876 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Dragon_Age:_Inquisition |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries / Root Game Folder | `?` | high | {gamePath} |
| Frosty Mod .fbmod | `?` | high | '{gamePath}', FROSTY_PATH |
| DAIMod .daimod | `?` | high | '{gamePath}', DAI_PATH |
| Config / Save File | `?` | high | '{gamePath}', FROSTYPLUGIN_PATH |
| Update Folder | `?` | high | '{gamePath}', UPDATE_PATH |
| DAI Mod Manager | `?` | low | {gamePath} |
| Frosty Mod Manager | `?` | low | {gamePath} |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `'dragonageinquisition-daimodmanager'` | 25 |
| `'dragonageinquisition-frostymodmanager'` | 30 |
| `'dragonageinquisition-fbmod'` | 35 |
| `'dragonageinquisition-daimod'` | 45 |
| `'dragonageinquisition-config'` | 50 |
| `'dragonageinquisition-save'` | 55 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Launch Modded Game
- Frosty Mod Manager
- DAI Mod Manager

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config/Save Folder**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

## Special Features

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
```

## Entry Point

The extension is registered via:

```js
module.exports = { default: main };
```

The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
