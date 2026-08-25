# XXX — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | XXX Vortex Extension |
| Engine / Structure | Reloaded-II Game (Mod Installer) |
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
| `hasXbox` | `false` | toggle for Xbox version logic |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `true` | enable to show the user a notification with special instructions (specify below) - default true: Reloaded-II Mod Manager setup instructions are always relevant |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Reloaded Mod | `XXX-reloadedmod` | high | `{gamePath}/Reloaded/Mods` |
| Mod Loader | `XXX-reloadedmodloader` | low | `{gamePath}/Reloaded/Mods/XXX_Mod_Loader` |
| Reloaded-II Mod Manager | `XXX-reloadedmanager` | low | `{gamePath}` |
| Save File | `XXX-save` | high | `{gamePath}/gamedata/savedata/` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `XXX-reloadedmanager` | 25 |
| `XXX-reloadedmodloader` | 27 |
| `XXX-reloadedmod` | 29 |
| `XXX-fallback` | 49 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Reloaded Mod Manager
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Reloaded-II | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Save | `gamedata/savedata/` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

