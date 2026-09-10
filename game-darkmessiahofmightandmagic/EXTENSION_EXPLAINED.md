# Dark Messiah of Might & Magic — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Dark Messiah of Might & Magic Vortex Extension |
| Engine / Structure | Basic (Launcher) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `darkmessiahofmightandmagic` |
| Executable | `mm.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1056](https://www.nexusmods.com/site/mods/1056) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Dark_Messiah_of_Might_%26_Magic](https://www.pcgamingwiki.com/wiki/Dark_Messiah_of_Might_%26_Magic) |

## Supported Stores

- **Steam** — `2100`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `moddbBrowser` | `true` | register the "Browse ModDB" page (moddb.com) |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `darkmessiahofmightandmagic-launcher` | 25 |
| `darkmessiahofmightandmagic-unlimited` | 27 |
| `darkmessiahofmightandmagic-root` | 29 |
| `darkmessiahofmightandmagic-launchermod` | 31 |
| `darkmessiahofmightandmagic-data` | 33 |
| `darkmessiahofmightandmagic-datasub` | 35 |
| `darkmessiahofmightandmagic-vpk` | 37 |
| `darkmessiahofmightandmagic-materialssub` | 39 |
| `darkmessiahofmightandmagic-maps` | 41 |
| `darkmessiahofmightandmagic-save` | 43 |
| `darkmessiahofmightandmagic-config` | 45 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Game** (`mm.exe`)
- **RTX Remix Launch** (`mm.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest wiltOS Mod Launcher
- Open config.cfg
- Open Saves Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `mm/cfg` |
| Save | `mm/SAVE` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.

