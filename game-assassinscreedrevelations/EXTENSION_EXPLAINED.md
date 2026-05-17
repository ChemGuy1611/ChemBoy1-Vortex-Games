# Assassin's Creed Revelations — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | AC Revelations Vortex Extension |
| Engine / Structure | Ubisoft AnvilToolkit |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `assassinscreedrevelations` |
| Executable | `ACRSP.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/990](https://www.nexusmods.com/site/mods/990) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Assassin%27s_Creed%3A_Revelations](https://www.pcgamingwiki.com/wiki/Assassin%27s_Creed%3A_Revelations) |

## Supported Stores

- **Steam** — `201870`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Game Folder | `assassinscreediii-binaries` | high | `{gamePath}` |
| AnvilToolKit | `assassinscreedrevelations-atk` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `assassinscreedrevelations-atk` | 25 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **AnvilToolkit** (`anviltoolkit.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

