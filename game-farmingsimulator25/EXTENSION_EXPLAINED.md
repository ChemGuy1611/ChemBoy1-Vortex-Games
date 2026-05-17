# Farming Simulator 25 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Farming Simulator 25 Vortex Extension |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `farmingsimulator25` |
| Executable | `FarmingSimulator2025.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1102](https://www.nexusmods.com/site/mods/1102) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Farming_Simulator_25](https://www.pcgamingwiki.com/wiki/Farming_Simulator_25) |

## Supported Stores

- **Steam** — `2300320`
- **Epic Games Store** — `53a95f209c1141b1be19b1a6d8c3ef5c`
- **Xbox / Microsoft Store** — `GIANTSSoftware.FarmingSimulator25PC`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Map Mod (Game Folder) | `farmingsimulator25-i3d` | high | `{gamePath}/data/maps/mapUS` |
| PDLC (Game Folder) | `farmingsimulator25-pdlc` | high | `{gamePath}/pdlc` |
| Root Game Folder | `farmingsimulator25-root` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `farmingsimulator25-zip` | 30 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

