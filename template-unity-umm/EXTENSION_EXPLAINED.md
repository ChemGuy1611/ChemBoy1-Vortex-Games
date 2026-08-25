# XXX — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | XXX Vortex Extension |
| Engine / Structure | Unity UMM (Unity Mod Manager) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `XXX` |
| Executable | `XXX.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `XXX.exe` |

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `multiExe` | `false` | set to true if there are multiple executables (and conseq. DATA_FOLDERs) (typically for Xbox/EGS) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `autoDownloadUmm` | `true` | download Unity Mod Manager from Nexus during setup |
| `railloaderSupport` | `false` | Railroader only - install Railloader mods, and a user-supplied Railloader archive |
| `seedUmmParams` | `true` | pre-seed UMM's Params.xml and registry values so the tool opens pointed at this game |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Folder | `XXX-root` | high | `{gamePath}` |
| Unity Mod Manager | `XXX-umm` | 8 | `?` |
| Mod | `XXX-mods` | 10 | `?` |
| Assembly DLL Mod | `XXX-assemblydll` | 60 | `?` |
| Assets/Resources File | `XXX-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `XXX-root` | 8 |
| `XXX-umm` | 25 |
| `XXX-ummmod` | 27 |
| `XXX-assemblydll` | 31 |
| `XXX-assets` | 33 |
| `XXX-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`XXX.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Run Unity Mod Manager
- Get Railloader
- Open Mods Folder
- Open Data Folder
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\XXX\\XXX` |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

