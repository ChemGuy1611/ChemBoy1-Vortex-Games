# Star Wars Outlaws — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Star Wars Outlaws Vortex Extension |
| Engine / Structure | Snowdrop Mod Loader |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `starwarsoutlaws` |
| Executable | `Outlaws.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/970](https://www.nexusmods.com/site/mods/970) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Star_Wars_Outlaws](https://www.pcgamingwiki.com/wiki/Star_Wars_Outlaws) |

## Supported Stores

- **Steam** — `2842040`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Config (Documents) | `starwarsoutlaws-config` | high | `DOCUMENTS/My Games/Outlaws` |
| Game Data Folder | `starwarsoutlaws-data` | high | `{gamePath}` |
| Game Data Subfolder | `starwarsoutlaws-datasub` | high | `{gamePath}/helix` |
| Snowdrop ModLoader | `starwarsoutlaws-modloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `starwarsoutlaws-modloader` | 25 |
| `starwarsoutlaws-data` | 27 |
| `starwarsoutlaws-datasub` | 29 |
| `starwarsoutlaws-config` | 31 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Game Ubisoft Plus** (`Outlaws_Plus.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

