# Far Cry New Dawn — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Far Cry New Dawn Vortex Extension |
| Engine / Structure | Far Cry Game (Mod Installer) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `farcrynewdawn` |
| Executable | `bin/FarCryNewDawn.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1478](https://www.nexusmods.com/site/mods/1478) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Far_Cry_New_Dawn](https://www.pcgamingwiki.com/wiki/Far_Cry_New_Dawn) |

## Supported Stores

- **Steam** — `939960`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Folder | `farcrynewdawn-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `farcrynewdawn-binaries` | high | `{gamePath}/bin` |
| Game Data | `farcrynewdawn-data` | high | `{gamePath}/data_final/pc` |
| FC Mod Installer | `farcrynewdawn-modinstaller` | high | `{gamePath}/FCModInstaller` |
| FCMI Mod (.a2/.a3/.a4/.a5/.bin) | `farcrynewdawn-mimod` | high | `{gamePath}/FCModInstaller/ModifiedFilesFCND` |
| Repacked FCMI Mod | `farcrynewdawn-mimoda3` | high | `{gamePath}/FCModInstaller/ModifiedFilesFCND` |
| XML Settings Mod | `farcrynewdawn-xml` | high | `DOCUMENTS/My Games/Far Cry New Dawn/USERID_FOLDER` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `farcrynewdawn-modinstaller` | 25 |
| `farcrynewdawn-root` | 27 |
| `farcrynewdawn-data` | 29 |
| `farcrynewdawn-binaries` | 31 |
| `farcrynewdawn-mimoda3` | 33 |
| `farcrynewdawn-mimod` | 35 |
| `farcrynewdawn-xml` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`bin/FarCryNewDawn.exe`)

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

