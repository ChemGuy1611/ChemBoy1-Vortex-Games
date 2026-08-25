# Far Cry XXX — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Far Cry XXX Vortex Extension |
| Engine / Structure | Far Cry Game (Mod Installer) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `XXX` |
| Executable | `bin/XXX.exe` |

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `true` | enable to show the user a notification with special instructions (specify below) - default true: FC Mod Installer usage instructions are always relevant |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Folder | `XXX-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `XXX-binaries` | high | `{gamePath}/bin` |
| Game Data | `XXX-data` | high | `{gamePath}/data_win32` |
| FC Mod Installer | `XXX-modinstaller` | high | `{gamePath}/FCModInstaller` |
| FCMI Mod (.a2/.a3/.a4/.a5/.bin) | `XXX-mimod` | high | `{gamePath}/FCModInstaller/ModifiedFilesFCXXX` |
| Repacked FCMI Mod | `XXX-mimoda3` | high | `{gamePath}/FCModInstaller/ModifiedFilesFCXXX` |
| XML Settings Mod | `XXX-xml` | high | `DOCUMENTS/My Games/Far Cry XXX/USERID_FOLDER` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `XXX-modinstaller` | 25 |
| `XXX-root` | 27 |
| `XXX-data` | 29 |
| `XXX-binaries` | 31 |
| `XXX-mimoda3` | 33 |
| `XXX-mimod` | 35 |
| `XXX-xml` | 37 |
| `XXX-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`bin/XXX.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Far Cry Mods Site
- Open Far Cry Mod Installer Site
- Download Latest FC Mod Installer
- Open Config Folder
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
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

