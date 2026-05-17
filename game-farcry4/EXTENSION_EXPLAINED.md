# Far Cry 4 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Far Cry 4 Vortex Extension |
| Engine / Structure | Far Cry Game (Mod Installer) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `farcry4` |
| Executable | `bin/FarCry4.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1474](https://www.nexusmods.com/site/mods/1474) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Far_Cry_4](https://www.pcgamingwiki.com/wiki/Far_Cry_4) |

## Supported Stores

- **Steam** — `298110`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Folder | `farcry4-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `farcry4-binaries` | high | `{gamePath}/bin` |
| Game Data | `farcry4-data` | high | `{gamePath}/data_win32` |
| FC Mod Installer | `farcry4-modinstaller` | high | `{gamePath}/FCModInstaller` |
| FCMI Mod (.a2/.a3/.a4/.a5/.bin) | `farcry4-mimod` | high | `{gamePath}/FCModInstaller/ModifiedFilesFC4` |
| Repacked FCMI Mod | `farcry4-mimoda3` | high | `{gamePath}/FCModInstaller/ModifiedFilesFC4` |
| XML Settings Mod | `farcry4-xml` | high | `DOCUMENTS/My Games/Far Cry 4/USERID_FOLDER` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `farcry4-modinstaller` | 25 |
| `farcry4-root` | 27 |
| `farcry4-data` | 29 |
| `farcry4-binaries` | 31 |
| `farcry4-mimoda3` | 33 |
| `farcry4-mimod` | 35 |
| `farcry4-xml` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`bin/FarCry4.exe`)

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

