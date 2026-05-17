# Sid Meier's Civilization VI — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Civilization VI Vortex Extension |
| Engine / Structure | User Folder Mod Location |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `civilisationvi` |
| Executable | `Base/Binaries/Win64Steam/CivilizationVI.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1183](https://www.nexusmods.com/site/mods/1183) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Sid_Meier%27s_Civilization_VI](https://www.pcgamingwiki.com/wiki/Sid_Meier%27s_Civilization_VI) |

## Supported Stores

- **Steam** — `289070`
- **Epic Games Store** — `Kinglet`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Game Folder | `civilisationvi-root` | high | `{gamePath}` |
| Mod | `civilisationvi-mod` | 25 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `civilisationvi-mod` | 25 |
| `civilisationvi-root` | 30 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

