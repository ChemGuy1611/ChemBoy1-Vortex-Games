# Kingdom Come:\tDeliverance II — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Kingdom Come Deliverance II Vortex Extension |
| Engine / Structure | Mod Folder and FBLO |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `kingdomcomedeliverance2` |
| Executable | `N/A` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Bin/Win64MasterMasterGogPGO/KingdomCome.exe` |

## Supported Stores

- **Steam** — `1771300`
- **Epic Games Store** — `278984b84235407d922da634b9d7d247`
- **GOG** — `1248083010`
- **Xbox / Microsoft Store** — `DeepSilver.77536C3FE941`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `LOAD_ORDER_ENABLED` | `true` | enables load order sorting |
| `mod_update_all_profile` | `false` |  |
| `updating_mod` | `false` | used to see if it's a mod update or not |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod | `MOD_ID` | high | `{gamePath}/Mods` |
| Root Game Folder | `kingdomcomedeliverance2-root` | high | `{gamePath}` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
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
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
