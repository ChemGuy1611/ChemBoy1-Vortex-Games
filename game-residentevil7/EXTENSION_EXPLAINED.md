# Resident Evil 7 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Resident Evil 7 Biohazard Vortex Extension |
| Engine / Structure | 3rd Party Mod Manager (Fluffy) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `residentevil7` |
| Executable | `re7.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (Demo) | `re7trial.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/914](https://www.nexusmods.com/site/mods/914) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Resident_Evil_7:_Biohazard](https://www.pcgamingwiki.com/wiki/Resident_Evil_7:_Biohazard) |

## Supported Stores

- **Steam** — `418370`
- **Xbox / Microsoft Store** — `F024294D.RESIDENTEVIL7biohazard`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `re4-root` | high | `{gamePath}` |
| Fluffy Mod Manager | `re7-fluffymodmanager` | low | `{gamePath}` |
| REFramework | `re7-reframework` | low | `{gamePath}` |
| REFramework (RT) | `re7-reframeworkRT` | low | `{gamePath}` |
| Fluffy Mod | `residentevil7-fluffymod` | 25 | `?` |
| Fluffy Preset | `residentevil7-preset` | 40 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `re7-fluffymodmanager` | 25 |
| `re7-reframework` | 30 |
| `residentevil7-looselua` | 29 |
| `re4-root` | 31 |
| `residentevil7-preset` | 33 |
| `residentevil7-fluffymodzip` | 45 |
| `re7-fluffymodmanager` | 25 |
| `re7-reframework` | 30 |
| `residentevil7-looselua` | 29 |
| `re4-root` | 31 |
| `residentevil7-preset` | 33 |
| `residentevil7-fluffymodzip` | 45 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`re7.exe`)
- **Custom Launch (Demo)** (`re7trial.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config File
- Open PCGamingWiki Page
- Open SteamDB Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Fluffy Mod Manager | — | — |
| REFramework | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `.` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
