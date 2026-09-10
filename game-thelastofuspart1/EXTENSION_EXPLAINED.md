# The Last of Us Part I — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | The Last of Us Part I Vortex Extension |
| Engine / Structure | Gemeric Game w/ File Extraction |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `thelastofuspart1` |
| Executable | `launcher.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/839](https://www.nexusmods.com/site/mods/839) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/The_Last_of_Us_Part_I](https://www.pcgamingwiki.com/wiki/The_Last_of_Us_Part_I) |

## Supported Stores

- **Steam** — `1888930`
- **Epic Games Store** — `7e988ba04889404197fdf06c994326ed`

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `thelastofuspart1-buildfolderpakbin` | 29 |
| `thelastofuspart1-binfolder` | 31 |
| `thelastofuspart1-pak` | 33 |
| `thelastofuspart1-buildfolder` | 35 |
| `thelastofuspart1-save` | 37 |
| `thelastofuspart1-config` | 39 |
| `thelastofuspart1-psarctool` | 41 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`launcher.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Extract .psarc Files
- Cleanup Extracted .psarc Files
- Open Saves Folder
- Open Config Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.

