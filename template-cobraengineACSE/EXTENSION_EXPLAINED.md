# XXX — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | XXX Vortex Extension |
| Engine / Structure | Cobra Engine (ACSE) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `XXX` |
| Executable | `XXX.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic. |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| ACSE (Script Extender) | `XXX-acse` | high | `{gamePath}/Win64/ovldata` |
| Root Folder | `XXX-root` | high | `{gamePath}` |
| ACSE Mod | `XXX-acsemod` | high | `{gamePath}/Win64/ovldata` |
| ovldata Subfolder | `XXX-ovldata` | high | `{gamePath}/Win64` |
| ACSE Localization | `XXX-localised` | high | `{gamePath}/Win64/ovldata/ACSE` |
| Movies (.webm) | `XXX-movies` | high | `{gamePath}/Movies` |
| Saves | `XXX-save` | high | `USER_HOME/Saved Games/Frontier Developments/XXX/USERID_FOLDER/Saves` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `XXX-acse` | 25 |
| `XXX-root` | 27 |
| `XXX-acsemod` | 28 |
| `XXX-localised` | 29 |
| `XXX-movies` | 31 |
| `XXX-ovldata` | 33 |
| `XXX-save` | 49 |
| `XXX-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`XXX.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Save Folder
- Open Config Folder
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| ACSE (Script Extender) | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

