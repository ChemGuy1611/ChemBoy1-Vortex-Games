# Far Cry Primal — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Far Cry Primal Vortex Extension |
| Engine / Structure | Far Cry Game (Mod Installer) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `farcryprimal` |
| Executable | `bin/FCPrimal.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1473](https://www.nexusmods.com/site/mods/1473) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Far_Cry_Primal](https://www.pcgamingwiki.com/wiki/Far_Cry_Primal) |

## Supported Stores

- **Steam** — `371660`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Folder | `farcryprimal-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `farcryprimal-binaries` | high | `{gamePath}/bin` |
| Game Data | `farcryprimal-data` | high | `{gamePath}/data_win32` |
| FC Mod Installer | `farcryprimal-modinstaller` | high | `{gamePath}/FCModInstaller` |
| FCMI Mod (.a2/.a3/.a4/.a5/.bin) | `farcryprimal-mimod` | high | `{gamePath}/FCModInstaller/ModifiedFilesFCP` |
| Repacked FCMI Mod | `farcryprimal-mimoda3` | high | `{gamePath}/FCModInstaller/ModifiedFilesFCP` |
| XML Settings Mod | `farcryprimal-xml` | high | `DOCUMENTS/My Games/Far Cry Primal` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `farcryprimal-modinstaller` | 25 |
| `farcryprimal-root` | 27 |
| `farcryprimal-data` | 29 |
| `farcryprimal-binaries` | 31 |
| `farcryprimal-mimoda3` | 33 |
| `farcryprimal-mimod` | 35 |
| `farcryprimal-xml` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`bin/FCPrimal.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Far Cry Mods Site
- Open Far Cry Mod Installer Site
- Open Config Folder
- Open Save Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| FC Mod Installer | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

