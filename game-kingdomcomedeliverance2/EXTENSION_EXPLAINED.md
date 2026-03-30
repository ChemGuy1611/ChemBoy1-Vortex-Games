# Kingdom Come:\tDeliverance II — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////////////
Name: Kingdom Come Deliverance II Vortex Extension
Structure: Mod Folder and FBLO
Author: ChemBoy1
Version: 0.5.1
Date: 2026-03-03
//////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `kingdomcomedeliverance2` |
| Extension Version | 0.5.1 |
| Steam App ID | 1771300 |
| Epic App ID | 278984b84235407d922da634b9d7d247 |
| GOG App ID | 1248083010 |
| Xbox App ID | DeepSilver.77536C3FE941 |
| Executable | `N/A` |
| Extension Page | https://www.nexusmods.com/site/mods/1146 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Kingdom_Come:_Deliverance_II |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `MOD_ID` | 25 |
| `ROOT_ID` | 30 |
| ``${GAME_ID}-cfg`` | 35 |
| `BINARIES_ID` | 40 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Log - kcd.log**
- **Open LO File - mod_order.txt**
- **Open Settings - attributes.xml**
- **Open Config Folder**
- **Open Saves Folder**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
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
