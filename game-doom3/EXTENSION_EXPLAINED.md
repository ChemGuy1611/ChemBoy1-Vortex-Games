# DOOM 3 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | DOOM 3 & DOOM 3: BFG Edition Vortex Extension |
| Engine / Structure | Basic multi-game with multiple exes |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `doom3` |
| Executable | `N/A` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/686](https://www.nexusmods.com/site/mods/686) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Doom_3](https://www.pcgamingwiki.com/wiki/Doom_3) |

## Supported Stores

- **Steam** — `9050`
- **GOG** — `1492054092`
- **Xbox / Microsoft Store** — `BethesdaSoftworks.Doom32004`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `doom3-binaries` | high | `{gamePath}` |
| "base" Data | `doom3-base` | high | `{gamePath}/base` |
| d3xp (RoE) Folder | `doom3-d3xp` | high | `{gamePath}//d3xp` |
| d3le (Lost Mission) Folder | `doom3-d3le` | high | `{gamePath}//d3le` |
| Dhewm3 | `doom3-dhewm3` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `doom3-dhewm3` | 25 |
| `doom3-binaries` | 27 |
| `doom3bfgedition-root` | 25 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report
- View Changelog
- Open Downloads Folder

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

