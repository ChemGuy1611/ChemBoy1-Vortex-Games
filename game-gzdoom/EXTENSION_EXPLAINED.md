# DOOM I & II (UZDoom) — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Doom I & II (UZDoom) Vortex Extension |
| Engine / Structure | Mod Loader (Any Folder) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `gzdoom` |
| Executable | `N/A` |
| Extension Page | [https://www.nexusmods.com/site/mods/1319](https://www.nexusmods.com/site/mods/1319) |

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `moddbBrowser` | `true` | register the "Browse ModDB" pages (moddb.com) - one for Doom, one for Doom II |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `gzdoom-dml` | 25 |
| `gzdoom-gzdoom` | 27 |
| `gzdoom-wad` | 29 |
| `gzdoom-mod` | 31 |
| `gzdoom-zipmod` | 33 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open DML ReadMe
- Download DML (Manual)
- Open UZDoom Save Folder
- Open UZDoom Config Folder
- Open uzdoom.ini
- Open Vortex Downloads Folder
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `DML/CONFIG` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

