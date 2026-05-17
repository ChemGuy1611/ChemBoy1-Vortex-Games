# Sid Meier's Civilization VII — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Civilization VII Vortex Extension |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `civilizationvii` |
| Executable | `Base/Binaries/Win64/Civ7_Win64_DX12_FinalRelease.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1182](https://www.nexusmods.com/site/mods/1182) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Sid_Meier%27s_Civilization_VII](https://www.pcgamingwiki.com/wiki/Sid_Meier%27s_Civilization_VII) |

## Supported Stores

- **Steam** — `1295660`
- **Epic Games Store** — `3f0b68b4d67e4b128030024dae4e3c77`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod | `civilizationvii-mod` | high | `LOCALAPPDATA/Firaxis Games/Sid Meier\'s Civilization VII/Mods` |
| Root Game Folder | `civilizationvii-root` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `civilizationvii-mod` | 25 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

