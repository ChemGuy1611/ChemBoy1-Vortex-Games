# XXX — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | XXX Vortex Extension |
| Engine / Structure | UE 2-3 Game + TFC Installer |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `XXX` |
| Executable | `Binaries/Win32/XXX.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `has64Bit` | `false` | toggle for 64-bit version logic |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| TFC Mod | `XXX-tfcmod` | high | `{gamePath}/TFCInstaller/Mods` |
| Root Folder | `XXX-root` | high | `{gamePath}` |
| Cooked Sub Folder | `XXX-cookedsub` | high | `{gamePath}/XXX/CookedPC` |
| Binaries (Engine Injector) | `XXX-binaries` | high | `{gamePath}/Binaries/Win32` |
| Movies Mod | `XXX-movies` | high | `{gamePath}/XXX/Movies` |
| TFC Installer | `XXX-tfcinstaller` | low | `{gamePath}/.` |
| UPK Explorer | `XXX-tfcexplorer` | low | `{gamePath}/.` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `XXX-tfcinstaller` | 25 |
| `XXX-tfcexplorer` | 27 |
| `XXX-tfcmod` | 29 |
| `XXX-root` | 31 |
| `XXX-cookedsub` | 33 |
| `XXX-movies` | 35 |
| `XXX-binaries` | 37 |
| `XXX-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Binaries/Win32/XXX.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

