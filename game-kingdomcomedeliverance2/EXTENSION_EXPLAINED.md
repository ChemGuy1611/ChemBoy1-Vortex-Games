# Kingdom Come: Deliverance II — Vortex Extension Explained

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
| Extension Page | [https://www.nexusmods.com/site/mods/1146](https://www.nexusmods.com/site/mods/1146) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Kingdom_Come:_Deliverance_II](https://www.pcgamingwiki.com/wiki/Kingdom_Come:_Deliverance_II) |

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
| Mod | `?` | high | `{gamePath}/Mods` |
| Root Game Folder | `kingdomcomedeliverance2-root` | high | `{gamePath}` |
| Binaries | `kingdomcomedeliverance2-binaries` | 45 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `` | 25 |
| `kingdomcomedeliverance2-root` | 30 |
| `kingdomcomedeliverance2-cfg` | 35 |
| `kingdomcomedeliverance2-binaries` | 40 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Log - kcd.log
- Open LO File - mod_order.txt
- Open Settings - attributes.xml
- Open Config Folder
- Open Saves Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

