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

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Build Folder | `thelastofuspart1-buildfolder` | high | `{gamePath}/.` |
| bin Folder | `thelastofuspart1-binfolder` | high | `{gamePath}/build/pc/main` |
| Pak (actor97) | `thelastofuspart1-pak` | high | `{gamePath}/build/pc/main` |
| Save | `thelastofuspart1-save` | high | `USER_HOME/Saved Games/The Last of Us Part I/users/USERID_FOLDER/savedata` |
| Config | `thelastofuspart1-config` | high | `USER_HOME/Saved Games/The Last of Us Part I/users/USERID_FOLDER` |
| UnPSARC Tool | `thelastofuspart1-psarctool` | low | `{gamePath}/build/pc/main` |

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
- Open 
- Open Saves Folder
- Open Config Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.

