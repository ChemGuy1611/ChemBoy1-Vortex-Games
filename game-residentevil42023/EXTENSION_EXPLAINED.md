# Resident Evil 4 (2023) — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Resident Evil 4 (2023) + Chainsaw Demo Vortex Extension |
| Engine / Structure | 3rd Party Mod Manager (Fluffy) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `residentevil42023` |
| Executable | `re4.exe` |
| Executable (Demo) | `re4demo.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/913](https://www.nexusmods.com/site/mods/913) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Resident_Evil_4_(2023)](https://www.pcgamingwiki.com/wiki/Resident_Evil_4_(2023)) |

## Supported Stores

- **Steam** — `2050650`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `reZip` | `true` | NOT WORKING YET - KEEP AS TRUE FOR NOW - set to true to re-zip Fluffy Mods (possibly not necessary for FLUFFY v3.069+) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `re4-root` | high | `{gamePath}` |
| Loose Lua (REFramework) | `residentevil42023-looselua` | high | `{gamePath}/.` |
| Fluffy Pak Mod | `residentevil42023-fluffypakmod` | high | `{gamePath}/Games/RE4R/Mods` |
| Fluffy Mod Manager | `re4-fluffymodmanager` | low | `{gamePath}` |
| REFramework | `re4-reframework` | low | `{gamePath}` |
| Upscaler | `residentevil42023-upscaler` | low | `{gamePath}/reframework/plugins` |
| Fluffy Mod | `residentevil42023-fluffymod` | 25 | `?` |
| Fluffy Preset | `residentevil42023-preset` | 40 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `re4-fluffymodmanager` | 25 |
| `re4-reframework` | 27 |
| `residentevil42023-looselua` | 29 |
| `re4-root` | 31 |
| `residentevil42023-upscaler` | 33 |
| `residentevil42023-preset` | 35 |
| `residentevil42023-fluffymod` | 45 |
| `residentevil42023-fluffymodzip` | 45 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`re4.exe`)
- **Steam Demo Launch** (`re4demo.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config File
- Open PCGamingWiki Page
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

