# Warhammer 40,000: Rogue Trader — Vortex Extension Explained

## Overview

```
///////////////////////////////////////////
Name: Warhammer 40,000: Rogue Trader Vortex Extension
Structure: Game with Integrated Mod Loader (UnityModManager)
Author: ChemBoy1
Version: 0.2.1
Date: 2026-02-13
///////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `warhammer40kroguetrader` |
| Extension Version | 0.2.1 |
| Steam App ID | 2186680 |
| Epic App ID | N/A |
| GOG App ID | 1347700224 |
| Xbox App ID | OwlcatGames.3387926822CE4 |
| Executable | `WH40KRT.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/1627 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Warhammer_40,000:_Rogue_Trader |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|
| `debug` | false | Debug logging disabled |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `MICROPATCHES_ID` | 25 |
| `MODFINDER_ID` | 27 |
| `SAVEEDITOR_ID` | 28 |
| `PORTMAN_ID` | 29 |
| `MOD_ID` | 31 |
| `PLUGIN_ID` | 33 |
| `PORTRAIT_ID` | 35 |
| `SAVE_ID` | 47 |
| ``${GAME_ID}-fallback`` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch
- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open OwlcatModificationManagerSettings.json File**
- **Open Owlcat Mod Folder**
- **Open UMM Plugin Folder**
- **Open Portraits Folder**
- **Open Save Folder**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
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
